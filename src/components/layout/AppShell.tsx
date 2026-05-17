import type { ReactNode } from "react";
import { BottomNav, type PageId } from "./BottomNav";
import { Header } from "./Header";
import type { UserRole } from "../../types/inventory";
import type { SyncStatus } from "../../types/sync";

interface AppShellProps {
  children: ReactNode;
  currentPage: PageId;
  userRole: UserRole;
  onNavigate: (page: PageId) => void;
  syncStatus: SyncStatus;
  isOnline: boolean;
  onToggleOnline: (nextOnline: boolean) => void;
  onRoleChange: (nextRole: UserRole) => void;
}

export function AppShell({
  children,
  currentPage,
  userRole,
  onNavigate,
  syncStatus,
  isOnline,
  onToggleOnline,
  onRoleChange,
}: AppShellProps) {
  return (
    <div className="min-h-screen pb-24 sm:pb-28">
      <Header
        syncStatus={syncStatus}
        isOnline={isOnline}
        userRole={userRole}
        onToggleOnline={onToggleOnline}
        onRoleChange={onRoleChange}
      />
      <div className="mx-auto flex min-h-[calc(100vh-150px)] max-w-7xl flex-col gap-4 px-3 py-3 sm:min-h-[calc(100vh-180px)] sm:gap-6 sm:px-6 sm:py-4 lg:px-8">
        <main className="flex-1">{children}</main>
        <div className="pointer-events-none mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-cafe-500/55 sm:mt-8 sm:text-xs">
          LocalOps AI
        </div>
      </div>
      <BottomNav currentPage={currentPage} userRole={userRole} onNavigate={onNavigate} />
    </div>
  );
}
