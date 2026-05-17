import type { ActivityEntry, InventoryItem, Zone } from "../types/inventory";

interface GeminiRequestContext {
  message: string;
  inventory: InventoryItem[];
  zones: Zone[];
  activity: ActivityEntry[];
}

function getGeminiConfig() {
  const provider = (import.meta.env.VITE_AI_PROVIDER ?? "gemini").toLowerCase();
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY ?? "";
  const model = import.meta.env.VITE_GEMINI_MODEL ?? "gemini-1.5-flash";
  return { provider, apiKey, model };
}

export function isGeminiAvailable(): boolean {
  const { provider, apiKey } = getGeminiConfig();
  return provider === "gemini" && Boolean(apiKey);
}

function buildContextBlock(inventory: InventoryItem[], zones: Zone[], activity: ActivityEntry[]): string {
  const itemLines = inventory
    .slice(0, 50)
    .map(
      (item) =>
        `- ${item.name}: qty=${item.quantity} ${item.unit}, low=${item.lowStockThreshold}, critical=${item.criticalThreshold}, zone=${item.zoneId ?? "unassigned"}`
    )
    .join("\n");

  const zoneLines =
    zones.length > 0
      ? zones.map((zone) => `- ${zone.id}: ${zone.name}`).join("\n")
      : "- none configured";

  const recentActivity =
    activity.length > 0
      ? activity
          .slice(0, 12)
          .map((entry) => `- ${entry.timestamp}: ${entry.message}`)
          .join("\n")
      : "- no recent activity";

  return [
    "You are a concise operations assistant for a cafe inventory and map workflow.",
    "Be practical and brief (max 5 bullets or 2 short paragraphs).",
    "If the user asks about stock risk, prioritize critical then low items.",
    "Do not invent inventory data; only use provided context.",
    "",
    "Inventory snapshot:",
    itemLines || "- no items",
    "",
    "Zones:",
    zoneLines,
    "",
    "Recent activity:",
    recentActivity,
  ].join("\n");
}

export async function buildGeminiAssistantResponse({
  message,
  inventory,
  zones,
  activity,
}: GeminiRequestContext): Promise<string | null> {
  const { apiKey, model } = getGeminiConfig();
  if (!isGeminiAvailable()) {
    return null;
  }

  const prompt = `${buildContextBlock(inventory, zones, activity)}\n\nUser request:\n${message}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 450,
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    return text || null;
  } catch {
    return null;
  }
}
