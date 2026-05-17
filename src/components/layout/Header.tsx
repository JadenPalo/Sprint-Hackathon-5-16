import { TogglePill } from "../common/TogglePill";
import type { UserRole } from "../../types/inventory";
import type { SyncStatus } from "../../types/sync";

interface HeaderProps {
  syncStatus: SyncStatus;
  isOnline: boolean;
  userRole: UserRole;
  onToggleOnline: (nextOnline: boolean) => void;
  onRoleChange: (nextRole: UserRole) => void;
}

export function Header({
  syncStatus,
  isOnline,
  userRole,
  onToggleOnline,
  onRoleChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 w-full border-b border-cafe-200 bg-gradient-to-r from-cafe-100 via-white to-cafe-50">
      <div className="mx-auto flex w-full max-w-none flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cafe-700">LocalOps AI</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">Offline-first cafe operations</h1>
              <span className="rounded-full bg-cafe-200 px-3 py-1 text-xs font-semibold text-cafe-900">
                System brand banner
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              A tablet-friendly inventory dashboard and human-like operations assistant for local businesses.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex items-center gap-2 rounded-full bg-white p-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-600 shadow-soft">
              <button
                type="button"
                onClick={() => onRoleChange("staff")}
                className={`rounded-full px-3 py-1 transition ${
                  userRole === "staff" ? "bg-cafe-700 text-white" : "text-slate-500"
                }`}
              >
                Employee
              </button>
              <button
                type="button"
                onClick={() => onRoleChange("admin")}
                className={`rounded-full px-3 py-1 transition ${
                  userRole === "admin" ? "bg-cafe-700 text-white" : "text-slate-500"
                }`}
              >
                Admin
              </button>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-soft">
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
      </div>
    </header>
  );
}
