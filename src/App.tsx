import { Suspense, lazy, useMemo, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { useAppState } from "./hooks/useAppState";
import { StoreProvider } from "./context/StoreContext";
import type { PageId } from "./components/layout/BottomNav";

const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const InventoryPage = lazy(() => import("./pages/InventoryPage").then((module) => ({ default: module.InventoryPage })));
const AssistantPage = lazy(() => import("./pages/AssistantPage").then((module) => ({ default: module.AssistantPage })));
const AdminAssistantPage = lazy(() =>
  import("./pages/AdminAssistantPage").then((module) => ({ default: module.AdminAssistantPage }))
);
const AdminDashboardPage = lazy(() =>
  import("./pages/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage }))
);
const MapPage = lazy(() => import("./pages/MapPage").then((module) => ({ default: module.MapPage })));
const ResponsibilitiesPage = lazy(() =>
  import("./pages/ResponsibilitiesPage").then((module) => ({ default: module.ResponsibilitiesPage }))
);

export default function App() {
  const store = useAppState();
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");
  const effectiveUserRole = store.userRole;

  const resolvedPage = useMemo<PageId>(() => {
    const isAdminArea = currentPage === "admin-dashboard" || currentPage === "admin-assistant";

    if (effectiveUserRole === "staff" && isAdminArea) {
      return "dashboard";
    }

    return currentPage;
  }, [currentPage, effectiveUserRole]);

  return (
    <StoreProvider store={store}>
      <AppShell
        currentPage={resolvedPage}
        userRole={effectiveUserRole}
        onNavigate={setCurrentPage}
        syncStatus={store.syncStatus}
        isOnline={store.isOnline}
        onToggleOnline={store.setOnlineStatus}
        onRoleChange={store.setUserRole}
        firebaseEnabled={false}
        authLoading={false}
        isAuthenticated={false}
        onSignIn={async () => {}}
        onSignOut={async () => {}}
      >
        <Suspense fallback={<div className="card-surface p-5 text-sm text-slate-600">Loading page...</div>}>
          {resolvedPage === "dashboard" ? <DashboardPage /> : null}
          {resolvedPage === "inventory" ? <InventoryPage /> : null}
          {resolvedPage === "assistant" ? <AssistantPage /> : null}
          {resolvedPage === "map" ? <MapPage /> : null}
          {resolvedPage === "responsibilities" ? <ResponsibilitiesPage /> : null}
          {resolvedPage === "admin-dashboard" ? <AdminDashboardPage /> : null}
          {resolvedPage === "admin-assistant" ? <AdminAssistantPage /> : null}
        </Suspense>
      </AppShell>
    </StoreProvider>
  );
}
