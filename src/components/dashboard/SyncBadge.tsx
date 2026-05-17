import type { PendingSyncEntry, SyncStatus } from "../../types/sync";

interface SyncBadgeProps {
  status: SyncStatus;
  pending: PendingSyncEntry[];
}

const statusStyles: Record<SyncStatus, string> = {
  "online-synced": "bg-emerald-50 text-emerald-700",
  "online-syncing": "bg-cyan-50 text-cyan-700",
  "offline-queued": "bg-amber-50 text-amber-700",
  "sync-error": "bg-rose-50 text-rose-700",
};

const labels: Record<SyncStatus, string> = {
  "online-synced": "Online + Synced",
  "online-syncing": "Online + Syncing",
  "offline-queued": "Offline + Queued",
  "sync-error": "Sync Error",
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
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Queued</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">
        {status === "offline-queued"
          ? `Changes are queued locally (${pending.length} pending) and will replay automatically when online.`
          : status === "online-syncing"
            ? `Replaying queued actions (${pending.length} remaining).`
            : status === "sync-error"
              ? "Some queued actions failed. Retry will continue automatically with backoff."
              : "All queued changes are synced."}
      </p>
    </div>
  );
}
