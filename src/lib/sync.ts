import { SYNC_DELAY_MS } from "./constants";
import type { PendingSyncEntry } from "../types/sync";

export function createPendingSyncEntry(label: string): PendingSyncEntry {
  return {
    id: crypto.randomUUID(),
    label,
    timestamp: new Date().toISOString(),
  };
}

export function simulateSync(task: () => void): number {
  return window.setTimeout(task, SYNC_DELAY_MS);
}
