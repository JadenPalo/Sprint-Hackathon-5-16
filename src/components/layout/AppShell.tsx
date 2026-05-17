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
  onRoleChange?: (nextRole: UserRole) => void;
  firebaseEnabled: boolean;
  authLoading: boolean;
  isAuthenticated: boolean;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
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
  firebaseEnabled,
  authLoading,
  isAuthenticated,
  onSignIn,
  onSignOut,
}: AppShellProps) {
  return (
    <div className="min-h-screen pb-28">
      <Header
        syncStatus={syncStatus}
        isOnline={isOnline}
        userRole={userRole}
        onToggleOnline={onToggleOnline}
        onRoleChange={onRoleChange}
        firebaseEnabled={firebaseEnabled}
        authLoading={authLoading}
        isAuthenticated={isAuthenticated}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />
      <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <main className="flex-1">{children}</main>
      </div>
      <BottomNav currentPage={currentPage} userRole={userRole} onNavigate={onNavigate} />
    </div>
  );
}
