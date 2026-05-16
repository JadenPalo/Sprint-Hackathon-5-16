import { formatTimestamp } from "../../lib/dates";
import type { ActivityEntry } from "../../types/inventory";

interface RecentUpdatesCardProps {
  activity: ActivityEntry[];
}

export function RecentUpdatesCard({ activity }: RecentUpdatesCardProps) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Recent updates</h3>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Live log
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {activity.slice(0, 5).map((entry) => (
          <div key={entry.id} className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-800">{entry.message}</p>
              <span className="text-xs text-slate-500">{formatTimestamp(entry.timestamp)}</span>
            </div>
            {entry.pendingSync ? (
              <p className="mt-1 text-xs font-medium text-amber-700">Awaiting sync</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
