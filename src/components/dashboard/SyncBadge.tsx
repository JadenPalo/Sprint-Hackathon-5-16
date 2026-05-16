import type { PendingSyncEntry, SyncStatus } from "../../types/sync";

interface SyncBadgeProps {
  status: SyncStatus;
  pending: PendingSyncEntry[];
}

const statusStyles: Record<SyncStatus, string> = {
  online: "bg-emerald-50 text-emerald-700",
  offline: "bg-slate-100 text-slate-700",
  "pending-sync": "bg-amber-50 text-amber-700",
  synced: "bg-cyan-50 text-cyan-700",
};

const labels: Record<SyncStatus, string> = {
  online: "Online",
  offline: "Offline",
  "pending-sync": "Pending Sync",
  synced: "Synced",
};

export function SyncBadge({ status, pending }: SyncBadgeProps) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Sync status</p>
          <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[status]}`}>
            {labels[status]}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-slate-900">{pending.length}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pending</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">
        {status === "offline"
          ? "Changes stay available locally until the device reconnects."
          : status === "pending-sync"
            ? "Offline edits are queued and ready to sync."
            : status === "synced"
              ? "Latest local changes were synced successfully."
              : "Inventory is actively connected and up to date."}
      </p>
    </div>
  );
}
