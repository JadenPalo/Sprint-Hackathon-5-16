import type { InventoryDraft, InventoryItem, ItemStatus } from "../types/inventory";

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function getItemStatus(item: InventoryItem): ItemStatus {
  if (item.quantity <= item.criticalThreshold) {
    return "critical";
  }

  if (item.quantity <= item.lowStockThreshold) {
    return "low";
  }

  return "healthy";
}

export function getStatusLabel(status: ItemStatus): string {
  switch (status) {
    case "critical":
      return "Critical";
    case "low":
      return "Low";
    default:
      return "Healthy";
  }
}

export function updateItemQuantity(item: InventoryItem, nextQuantity: number): InventoryItem {
  return {
    ...item,
    quantity: Math.max(0, nextQuantity),
    updatedAt: new Date().toISOString(),
  };
}

export function createInventoryItem(draft: InventoryDraft): InventoryItem {
  return {
    id: createId("item"),
    name: draft.name.trim(),
    category: draft.category.trim(),
    quantity: Math.max(0, draft.quantity),
    unit: draft.unit.trim(),
    lowStockThreshold: Math.max(0, draft.lowStockThreshold),
    criticalThreshold: Math.max(0, draft.criticalThreshold),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findBestInventoryMatch(items: InventoryItem[], phrase: string): InventoryItem | null {
  const normalizedPhrase = normalizeName(phrase);
  if (!normalizedPhrase) {
    return null;
  }

  const exact = items.find((item) => normalizeName(item.name) === normalizedPhrase);
  if (exact) {
    return exact;
  }

  const includes = items.find((item) => normalizeName(item.name).includes(normalizedPhrase));
  if (includes) {
    return includes;
  }

  return (
    items.find((item) => normalizedPhrase.includes(normalizeName(item.name))) ??
    null
  );
}
