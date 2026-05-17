import { useEffect, useState } from "react";
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
  const roles: { id: UserRole; label: string }[] = [
    { id: "staff", label: "Employee" },
    { id: "admin", label: "Admin" },
  ];
  const [mobileCompact, setMobileCompact] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const isMobile = window.innerWidth < 640;
      setMobileCompact(isMobile && window.scrollY > 0);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 w-full border-b border-cafe-200 bg-gradient-to-r from-cafe-100 via-white to-cafe-50 transition-all duration-300 ease-out">
      <div
        className={`mx-auto flex w-full max-w-none flex-col gap-2 px-4 sm:px-6 lg:px-8 ${
          mobileCompact ? "py-1 sm:py-4" : "py-2 sm:gap-4 sm:py-4"
        }`}
      >
        <div
          className={`${
            mobileCompact
              ? "flex items-center justify-between gap-2"
              : "flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
          }`}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cafe-700 sm:text-xs">LocalOps AI</p>
            {!mobileCompact ? (
              <>
                <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                  <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Offline-first cafe operations</h1>
                  <span className="inline-flex rounded-full bg-cafe-200 px-2.5 py-1 text-[10px] font-semibold text-cafe-900 sm:px-3 sm:text-xs">
                    System brand banner
                  </span>
                </div>
                <p className="mt-1 hidden max-w-3xl text-sm text-slate-600 sm:mt-2 sm:block">
                  A tablet-friendly inventory dashboard and human-like operations assistant for local businesses.
                </p>
              </>
            ) : null}
          </div>

          <div
            className={`${
              mobileCompact ? "flex items-center" : "flex flex-col items-start gap-2 md:items-end md:gap-3"
            }`}
          >
            <div className="flex items-center gap-1 rounded-full bg-white p-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 shadow-soft sm:gap-2 sm:text-xs sm:tracking-[0.15em]">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => onRoleChange(role.id)}
                  className={`rounded-full px-2.5 py-1 transition sm:px-3 ${
                    userRole === role.id ? "bg-cafe-700 text-white" : "text-slate-500"
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
            {!mobileCompact ? (
              <>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-soft">
                  Status: {syncStatus.replace("-", " ")}
                </div>
                <TogglePill
                  checked={isOnline}
                  onChange={onToggleOnline}
                  enabledLabel="Online mode"
                  disabledLabel="Offline demo mode"
                />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
