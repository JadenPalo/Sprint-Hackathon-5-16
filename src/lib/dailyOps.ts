import type { ActivityEntry, InventoryItem, UsageEvent } from "../types/inventory";
import type { ProcurementRecommendation } from "./procurement";

export interface DailyOpsSummaryOverview {
  totalOrdersProcessed: number;
  totalInventoryConsumed: number;
  fastestGrowingItem: string;
  slowestMovingItem: string;
}

export interface DailyOpsReport {
  overview: DailyOpsSummaryOverview;
  anomalies: string[];
  operationalRisks: string[];
  actionItems: string[];
}

function round(value: number, digits = 1): number {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

function isLastNDays(timestamp: string, days: number): boolean {
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) {
    return false;
  }
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

function usageByItem(events: UsageEvent[], days: number): Map<string, number> {
  const map = new Map<string, number>();
  for (const event of events) {
    if (!isLastNDays(event.timestamp, days)) {
      continue;
    }
    const used = Math.max(0, -event.delta);
    if (used <= 0) {
      continue;
    }
    map.set(event.itemId, (map.get(event.itemId) ?? 0) + used);
  }
  return map;
}

export function buildDailyOpsReport(
  inventory: InventoryItem[],
  usageEvents: UsageEvent[],
  activity: ActivityEntry[],
  recommendations: ProcurementRecommendation[]
): DailyOpsReport {
  const usage7d = usageByItem(usageEvents, 7);
  const usage14d = usageByItem(usageEvents, 14);

  const itemById = new Map(inventory.map((item) => [item.id, item]));
  const growthScores = inventory.map((item) => {
    const last7 = usage7d.get(item.id) ?? 0;
    const prev7 = Math.max(0, (usage14d.get(item.id) ?? 0) - last7);
    const wow = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : 0;
    return { item, wow };
  });

  const fastestGrowing = [...growthScores].sort((a, b) => b.wow - a.wow)[0]?.item?.name ?? "N/A";
  const slowestMoving =
    [...growthScores].sort((a, b) => (usage7d.get(a.item.id) ?? 0) - (usage7d.get(b.item.id) ?? 0))[0]?.item?.name ??
    "N/A";

  const totalInventoryConsumed = round(
    usageEvents
      .filter((event) => isLastNDays(event.timestamp, 1))
      .reduce((sum, event) => sum + Math.max(0, -event.delta), 0),
    2
  );

  const totalOrdersProcessed = activity.filter(
    (entry) =>
      isLastNDays(entry.timestamp, 1) &&
      (/logged|used|moved|updated|restocked|added/i.test(entry.message) || entry.type === "update")
  ).length;

  const anomalies: string[] = [];
  const highGrowth = growthScores.filter((entry) => entry.wow >= 20).slice(0, 3);
  for (const entry of highGrowth) {
    anomalies.push(`${entry.item.name} demand increased ${round(entry.wow)}% vs last week.`);
  }

  const risks = recommendations
    .filter((entry) => entry.daysUntilStockout <= 3)
    .slice(0, 4)
    .map(
      (entry) =>
        `${entry.itemName}: stockout in ~${entry.daysUntilStockout} days (${entry.expectedStockoutWindow}, confidence ${entry.confidence}).`
    );

  const actionItems = recommendations.slice(0, 4).map((entry) => {
    const item = itemById.get(entry.itemId);
    const unit = item?.unit ?? "units";
    return `Reorder ${entry.suggestedReorderQuantity} ${unit} of ${entry.itemName}.`;
  });

  if (anomalies.length === 0) {
    anomalies.push("No major usage anomalies detected in the current lookback window.");
  }

  if (risks.length === 0) {
    risks.push("No high-risk stockouts expected in the next 72 hours.");
  }

  if (actionItems.length === 0) {
    actionItems.push("No urgent procurement actions needed right now.");
  }

  return {
    overview: {
      totalOrdersProcessed,
      totalInventoryConsumed,
      fastestGrowingItem: fastestGrowing,
      slowestMovingItem: slowestMoving,
    },
    anomalies,
    operationalRisks: risks,
    actionItems,
  };
}
