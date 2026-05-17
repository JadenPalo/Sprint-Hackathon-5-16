import { findBestInventoryMatch, normalizeName } from "./inventory";
import type { InventoryItem, Zone } from "../types/inventory";

export type ParsedIntent =
  | { type: "list-low" }
  | { type: "reorder-suggestions" }
  | { type: "daily-summary" }
  | { type: "adjust"; direction: "add" | "subtract"; quantity: number; itemName: string }
  | { type: "find_item_location"; itemName: string }
  | { type: "list_items_in_zone"; zoneName: string }
  | { type: "move_item_to_zone"; itemName: string; zoneName: string; quantity?: number }
  | { type: "summarize_inventory_by_zone" }
  | { type: "unknown" };

const addPatterns = /\b(add|restock|received|increase|brought in)\b/i;
const subtractPatterns = /\b(use|used|remove|removed|decrease|sold|spent)\b/i;
const locationPatterns = /\b(where is|where's|location of|find)\b/i;

export function parseInventoryCommand(
  input: string,
  items: InventoryItem[],
  zones: Zone[] = []
): ParsedIntent {
  const text = input.trim();

  if (!text) {
    return { type: "unknown" };
  }

  if (/\b(low|running low|low stock)\b/i.test(text)) {
    return { type: "list-low" };
  }

  if (/\b(reorder|restock today|what should i reorder)\b/i.test(text)) {
    return { type: "reorder-suggestions" };
  }

  if (/\b(summary|summarize|today's changes|todays changes|recent updates)\b/i.test(text)) {
    return { type: "daily-summary" };
  }

  if (/\b(summary by zone|summarize inventory by zone|inventory by zone|zone summary)\b/i.test(text)) {
    return { type: "summarize_inventory_by_zone" };
  }

  if (/\b(what('| i)s in|items in|list items in)\b/i.test(text)) {
    const zoneName = extractZoneName(text, zones);
    return zoneName ? { type: "list_items_in_zone", zoneName } : { type: "unknown" };
  }

  if (locationPatterns.test(text) && !/\bzone\b/i.test(text)) {
    const itemName = extractItemNameWithoutQuantity(text, items);
    return itemName ? { type: "find_item_location", itemName } : { type: "unknown" };
  }

  if (/\b(move|assign|place|put)\b/i.test(text) && /\b(to)\b/i.test(text)) {
    const zoneName = extractZoneName(text, zones);
    if (!zoneName) {
      return { type: "unknown" };
    }

    const quantityMatch = text.match(/(\d+)/);
    const quantity = quantityMatch ? Number(quantityMatch[1]) : undefined;
    const itemName = extractItemNameForMove(text, items, zoneName, quantity);
    return itemName ? { type: "move_item_to_zone", itemName, zoneName, quantity } : { type: "unknown" };
  }

  const quantityMatch = text.match(/(\d+)/);
  const quantity = quantityMatch ? Number(quantityMatch[1]) : null;

  if (quantity && addPatterns.test(text)) {
    const itemName = extractItemName(text, quantity, items);
    return itemName ? { type: "adjust", direction: "add", quantity, itemName } : { type: "unknown" };
  }

  if (quantity && subtractPatterns.test(text)) {
    const itemName = extractItemName(text, quantity, items);
    return itemName ? { type: "adjust", direction: "subtract", quantity, itemName } : { type: "unknown" };
  }

  return { type: "unknown" };
}

function extractItemName(text: string, quantity: number, items: InventoryItem[]): string | null {
  const stripped = text
    .replace(/\b(add|restock|received|increase|brought in|use|used|remove|removed|decrease|sold|spent|we)\b/gi, " ")
    .replace(new RegExp(`\\b${quantity}\\b`, "g"), " ")
    .replace(/\b(of|the|a|an)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const directMatch = findBestInventoryMatch(items, stripped);
  return directMatch?.name ?? null;
}

function extractItemNameWithoutQuantity(text: string, items: InventoryItem[]): string | null {
  const stripped = text
    .replace(/\b(where is|where's|location of|find|the|item|inventory)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const directMatch = findBestInventoryMatch(items, stripped);
  return directMatch?.name ?? null;
}

function extractItemNameForMove(
  text: string,
  items: InventoryItem[],
  zoneName: string,
  quantity?: number
): string | null {
  const zonePattern = new RegExp(zoneName, "i");
  const stripped = text
    .replace(/\b(move|assign|place|put|to|zone|the|a|an)\b/gi, " ")
    .replace(zonePattern, " ")
    .replace(quantity ? new RegExp(`\\b${quantity}\\b`, "g") : /$^/, " ")
    .replace(/\s+/g, " ")
    .trim();

  const directMatch = findBestInventoryMatch(items, stripped);
  return directMatch?.name ?? null;
}

function extractZoneName(text: string, zones: Zone[]): string | null {
  if (zones.length === 0) {
    return null;
  }

  const normalizedText = normalizeName(text);
  const rankedMatches = zones
    .filter((zone) => normalizedText.includes(normalizeName(zone.name)))
    .sort((left, right) => right.name.length - left.name.length);

  return rankedMatches[0]?.name ?? null;
}
