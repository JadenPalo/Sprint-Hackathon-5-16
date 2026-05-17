import type { InventoryItem, UsageEvent } from "../types/inventory";

export type ForecastConfidence = "high" | "medium" | "low";

export interface ProcurementRecommendation {
  itemId: string;
  itemName: string;
  daysUntilStockout: number;
  expectedStockoutWindow: string;
  confidence: ForecastConfidence;
  suggestedReorderQuantity: number;
  reasoningSummary: string;
  weeklyChangePct: number;
  spike48hPct: number;
  demandTrendMultiplier: number;
}

function round(value: number, digits = 1): number {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function formatStockoutWindow(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.toLocaleDateString(undefined, { weekday: "long" });
  const hour = date.getHours();
  const period = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return `${day} ${period}`;
}

function calculateUsageBuckets(
  usageEvents: UsageEvent[],
  itemId: string,
  nowMs: number
): {
  last48h: number;
  previous48h: number;
  last7d: number;
  previous7d: number;
  events14d: number;
} {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const ts48 = nowMs - 48 * HOUR;
  const ts96 = nowMs - 96 * HOUR;
  const ts7d = nowMs - 7 * DAY;
  const ts14d = nowMs - 14 * DAY;

  let last48h = 0;
  let previous48h = 0;
  let last7d = 0;
  let previous7d = 0;
  let events14d = 0;

  for (const event of usageEvents) {
    if (event.itemId !== itemId) {
      continue;
    }

    const t = new Date(event.timestamp).getTime();
    if (Number.isNaN(t)) {
      continue;
    }

    const usedAmount = Math.max(0, -event.delta);
    if (usedAmount <= 0) {
      continue;
    }

    if (t >= ts14d) {
      events14d += 1;
    }

    if (t >= ts48) {
      last48h += usedAmount;
    } else if (t >= ts96) {
      previous48h += usedAmount;
    }

    if (t >= ts7d) {
      last7d += usedAmount;
    } else if (t >= ts14d) {
      previous7d += usedAmount;
    }
  }

  return { last48h, previous48h, last7d, previous7d, events14d };
}

function dayOfWeekDemandFactor(referenceTimestamp: number): number {
  const day = new Date(referenceTimestamp).getDay();
  const isWeekend = day === 0 || day === 6;
  return isWeekend ? 1.2 : 1;
}

export function buildProcurementRecommendations(
  inventory: InventoryItem[],
  usageEvents: UsageEvent[],
  now: Date = new Date()
): ProcurementRecommendation[] {
  const nowMs = now.getTime();

  const recommendations = inventory
    .map((item) => {
      const buckets = calculateUsageBuckets(usageEvents, item.id, nowMs);

      const weeklyDailyAvg = buckets.last7d > 0 ? buckets.last7d / 7 : 0;
      const fallbackDaily = Math.max(0.1, (item.lowStockThreshold || 1) / 3);
      const avgDailyUsage = Math.max(weeklyDailyAvg, item.usageRate ?? 0, fallbackDaily);

      const weeklyChangePct =
        buckets.previous7d > 0 ? ((buckets.last7d - buckets.previous7d) / buckets.previous7d) * 100 : 0;

      const spike48hPct =
        buckets.previous48h > 0 ? ((buckets.last48h - buckets.previous48h) / buckets.previous48h) * 100 : 0;

      const trendMultiplier = clamp(1 + weeklyChangePct / 100, 0.5, 2.5);
      const shortTermVelocity = Math.max(0.1, buckets.last48h / 2);
      const blendedDailyDemand = shortTermVelocity * 0.65 + avgDailyUsage * 0.35;

      const baselineDaysRemaining = item.quantity / Math.max(0.1, blendedDailyDemand);
      const adjustedDaysRemaining = baselineDaysRemaining / Math.max(0.5, trendMultiplier);

      const predictedStockoutMs = nowMs + adjustedDaysRemaining * 24 * 60 * 60 * 1000;
      const dayFactor = dayOfWeekDemandFactor(predictedStockoutMs);

      const demandTrendMultiplier = clamp(trendMultiplier * dayFactor, 0.5, 3);
      const forecast7d = blendedDailyDemand * 7 * demandTrendMultiplier;
      const safetyStock = item.safetyStock ?? Math.max(item.lowStockThreshold, 1);
      const suggestedReorderQuantity = Math.max(0, Math.ceil(forecast7d + safetyStock - item.quantity));

      const confidence: ForecastConfidence =
        buckets.events14d >= 14 ? "high" : buckets.events14d >= 6 ? "medium" : "low";

      const reasoningSummary = `${item.name} usage ${
        weeklyChangePct >= 0 ? "increased" : "decreased"
      } ${Math.abs(round(weeklyChangePct))}% week-over-week; last 48h ${
        spike48hPct >= 0 ? "spiked" : "cooled"
      } ${Math.abs(round(spike48hPct))}%. At current trend, stockout is expected in ~${round(
        adjustedDaysRemaining
      )} days.`;

      return {
        itemId: item.id,
        itemName: item.name,
        daysUntilStockout: round(adjustedDaysRemaining, 2),
        expectedStockoutWindow: formatStockoutWindow(predictedStockoutMs),
        confidence,
        suggestedReorderQuantity,
        reasoningSummary,
        weeklyChangePct: round(weeklyChangePct),
        spike48hPct: round(spike48hPct),
        demandTrendMultiplier: round(demandTrendMultiplier, 2),
      };
    })
    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

  return recommendations;
}

export function buildUsageSeriesByDay(usageEvents: UsageEvent[], lookbackDays = 14): Array<{ day: string; used: number }> {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const cutoff = now - lookbackDays * DAY;

  const buckets = new Map<number, number>();
  for (const event of usageEvents) {
    const ts = new Date(event.timestamp).getTime();
    if (Number.isNaN(ts) || ts < cutoff) {
      continue;
    }
    const used = Math.max(0, -event.delta);
    if (used <= 0) {
      continue;
    }
    const key = startOfDay(ts);
    buckets.set(key, (buckets.get(key) ?? 0) + used);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, used]) => ({
      day: new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      used: round(used, 2),
    }));
}
