import { TogglePill } from "../common/TogglePill";
import type { SyncStatus } from "../../types/sync";

interface HeaderProps {
  syncStatus: SyncStatus;
  isOnline: boolean;
  onToggleOnline: (nextOnline: boolean) => void;
}

export function Header({ syncStatus, isOnline, onToggleOnline }: HeaderProps) {
  return (
    <header className="card-surface sticky top-4 z-20 px-5 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cafe-700">
            LocalOps AI
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">Offline-first cafe operations</h1>
            <span className="rounded-full bg-cafe-100 px-3 py-1 text-xs font-semibold text-cafe-800">
              GetStream-ready assistant
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            A tablet-friendly inventory dashboard and human-like operations assistant for local businesses.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
            Status: {syncStatus.replace("-", " ")}
          </div>
          <TogglePill
            checked={isOnline}
            onChange={onToggleOnline}
            enabledLabel="Online mode"
            disabledLabel="Offline demo mode"
          />
        </div>
      </div>
    </header>
  );
}
