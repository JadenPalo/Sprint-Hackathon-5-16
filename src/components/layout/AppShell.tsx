import type { ReactNode } from "react";
import { BottomNav, type PageId } from "./BottomNav";
import { Header } from "./Header";
import type { SyncStatus } from "../../types/sync";

interface AppShellProps {
  children: ReactNode;
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  syncStatus: SyncStatus;
  isOnline: boolean;
  onToggleOnline: (nextOnline: boolean) => void;
}

export function AppShell({
  children,
  currentPage,
  onNavigate,
  syncStatus,
  isOnline,
  onToggleOnline,
}: AppShellProps) {
  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Header
          syncStatus={syncStatus}
          isOnline={isOnline}
          onToggleOnline={onToggleOnline}
        />
        <main className="flex-1">{children}</main>
      </div>
      <BottomNav currentPage={currentPage} onNavigate={onNavigate} />
    </div>
  );
}
