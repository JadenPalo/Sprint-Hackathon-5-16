import type { ChatMessage } from "../types/chat";
import type { ActivityEntry } from "../types/inventory";

export const STORAGE_KEY = "localops-ai-state";
export const SYNC_DELAY_MS = 1200;

export const defaultWelcomeMessage: ChatMessage = {
  id: "assistant-welcome",
  role: "assistant",
  text: "Hi — I’m your LocalOps assistant. I can help you check low-stock items, restock supplies, log usage, and summarize what changed today.",
  timestamp: new Date().toISOString(),
};

export const defaultActivity: ActivityEntry[] = [
  {
    id: "activity-seed",
    type: "sync",
    message: "Cafe inventory loaded and ready for today's shift.",
    timestamp: new Date().toISOString(),
    pendingSync: false,
  },
];
