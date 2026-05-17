import { SYNC_DELAY_MS } from "./constants";
import type { PendingSyncEntry, SyncQueueEntryType } from "../types/sync";

export function createPendingSyncEntry(
  label: string,
  type: SyncQueueEntryType = "inventory_update",
  payload: Record<string, unknown> = {}
): PendingSyncEntry {
  return {
    id: crypto.randomUUID(),
    type,
    payload,
    timestamp: new Date().toISOString(),
    retryCount: 0,
    status: "pending",
    label,
  };
}

export function simulateSync(task: () => void): number {
  return window.setTimeout(task, SYNC_DELAY_MS);
}
