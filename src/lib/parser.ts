import { findBestInventoryMatch } from "./inventory";
import type { InventoryItem } from "../types/inventory";

export type ParsedIntent =
  | { type: "list-low" }
  | { type: "reorder-suggestions" }
  | { type: "daily-summary" }
  | { type: "adjust"; direction: "add" | "subtract"; quantity: number; itemName: string }
  | { type: "unknown" };

const addPatterns = /\b(add|restock|received|increase|brought in)\b/i;
const subtractPatterns = /\b(use|used|remove|removed|decrease|sold|spent)\b/i;

export function parseInventoryCommand(input: string, items: InventoryItem[]): ParsedIntent {
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
