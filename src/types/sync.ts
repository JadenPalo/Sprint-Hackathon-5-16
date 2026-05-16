export type SyncStatus = "online" | "offline" | "pending-sync" | "synced";

export interface PendingSyncEntry {
  id: string;
  label: string;
  timestamp: string;
}
