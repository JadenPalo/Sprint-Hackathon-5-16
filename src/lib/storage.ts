import { STORAGE_KEY } from "./constants";
import type { ChatMessage } from "../types/chat";
import type { ActivityEntry, InventoryItem } from "../types/inventory";
import type { PendingSyncEntry, SyncStatus } from "../types/sync";

export interface PersistedAppState {
  inventory: InventoryItem[];
  activity: ActivityEntry[];
  messages: ChatMessage[];
  pendingSyncEntries: PendingSyncEntry[];
  isOnline: boolean;
  syncStatus: SyncStatus;
}

export function loadState(): PersistedAppState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as PersistedAppState;
  } catch {
    return null;
  }
}

export function saveState(state: PersistedAppState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
