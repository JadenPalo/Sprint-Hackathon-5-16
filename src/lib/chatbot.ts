import { isToday } from "./dates";
import { getItemStatus, getStatusLabel } from "./inventory";
import { pluralize } from "./format";
import type { ActivityEntry, InventoryItem, Zone } from "../types/inventory";

export function buildLowStockResponse(items: InventoryItem[]): string {
  const flagged = items.filter((item) => getItemStatus(item) !== "healthy");

  if (flagged.length === 0) {
    return "You’re in a good spot right now — nothing is currently low or critical.";
  }

  const critical = flagged.filter((item) => getItemStatus(item) === "critical");
  const low = flagged.filter((item) => getItemStatus(item) === "low");

  const parts: string[] = [];

  if (critical.length > 0) {
    parts.push(`Critical: ${critical.map((item) => item.name).join(", ")}`);
  }

  if (low.length > 0) {
    parts.push(`Low: ${low.map((item) => item.name).join(", ")}`);
  }

  return `${parts.join(". ")}. I’d prioritize the critical items first.`;
}

export function buildReorderResponse(items: InventoryItem[]): string {
  const flagged = items
    .filter((item) => getItemStatus(item) !== "healthy")
    .sort((left, right) => left.quantity - right.quantity);

  if (flagged.length === 0) {
    return "Nothing needs urgent reordering right now. Inventory looks healthy across the board.";
  }

  const topItems = flagged.slice(0, 4);
  return `I’d reorder ${topItems.map((item) => item.name).join(", ")} next. Those are the items closest to causing service friction.`;
}

export function buildAdjustmentResponse(item: InventoryItem, direction: "add" | "subtract", amount: number): string {
  const status = getItemStatus(item);
  const statusLabel = getStatusLabel(status).toLowerCase();

  if (direction === "add") {
    return `Got it — I added ${amount} ${pluralize(amount, item.unit)} to ${item.name}. You now have ${item.quantity} total, and that puts you in a ${statusLabel} range.`;
  }

  return `Done — I logged ${amount} ${pluralize(amount, item.unit)} used from ${item.name}. You have ${item.quantity} left, which is currently ${statusLabel}.`;
}

export function buildSummaryResponse(activity: ActivityEntry[]): string {
  const todaysEntries = activity.filter((entry) => isToday(entry.timestamp) && entry.type !== "sync");

  if (todaysEntries.length === 0) {
    return "There haven’t been any inventory changes logged today yet.";
  }

  const recent = todaysEntries.slice(0, 4).map((entry) => entry.message);
  return `Here’s the latest from today: ${recent.join(" • ")}.`;
}

export function buildItemLocationResponse(item: InventoryItem, zone: Zone | null): string {
  if (!zone) {
    return `${item.name} is currently unassigned to a zone.`;
  }

  return `${item.name} is located in ${zone.name}.`;
}

export function buildItemsInZoneResponse(zone: Zone, items: InventoryItem[]): string {
  if (items.length === 0) {
    return `${zone.name} currently has no assigned items.`;
  }

  const listed = items.map((item) => `${item.name} (${item.quantity} ${item.unit})`);
  return `${zone.name} has ${items.length} item${items.length === 1 ? "" : "s"}: ${listed.join(", ")}.`;
}

export function buildInventoryByZoneSummary(zones: Zone[], items: InventoryItem[]): string {
  if (zones.length === 0) {
    return "No zones are configured yet. Create zones in Map Builder to get a zone summary.";
  }

  const zoneLines = zones.map((zone) => {
    const zoneItems = items.filter((item) => item.zoneId === zone.id);
    return `${zone.name}: ${zoneItems.length} item${zoneItems.length === 1 ? "" : "s"}`;
  });

  const unassignedCount = items.filter((item) => !item.zoneId).length;
  return `Inventory by zone — ${zoneLines.join(" • ")} • Unassigned: ${unassignedCount} item${unassignedCount === 1 ? "" : "s"}.`;
}
