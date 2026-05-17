export type SyncStatus = "online-synced" | "online-syncing" | "offline-queued" | "sync-error";

export type SyncQueueEntryType =
  | "inventory_update"
  | "employee_update"
  | "task_update"
  | "stock_adjustment"
  | "map_update";

export type SyncQueueEntryStatus = "pending" | "failed" | "synced";

export interface PendingSyncEntry {
  id: string;
  type: SyncQueueEntryType;
  payload: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
  status: SyncQueueEntryStatus;
  label: string;
  lastError?: string;
  nextRetryAt?: string;
}