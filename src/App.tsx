import { useMemo, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { InventoryPage } from "./pages/InventoryPage";
import { AssistantPage } from "./pages/AssistantPage";
import { AdminAssistantPage } from "./pages/AdminAssistantPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { MapPage } from "./pages/MapPage";
import { ResponsibilitiesPage } from "./pages/ResponsibilitiesPage";
import { useAppState } from "./hooks/useAppState";
import type { PageId } from "./components/layout/BottomNav";

export default function App() {
  const store = useAppState();
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");

  const resolvedPage = useMemo<PageId>(() => {
    if (
      (store.userRole !== "admin" &&
        (currentPage === "admin-dashboard" || currentPage === "admin-assistant")) ||
      (store.userRole === "admin" && currentPage === "responsibilities")
    ) {
      return "dashboard";
    }

    return currentPage;
  }, [currentPage, store.userRole]);

  return (
    <AppShell
      currentPage={resolvedPage}
      userRole={store.userRole}
      onNavigate={setCurrentPage}
      syncStatus={store.syncStatus}
      isOnline={store.isOnline}
      onToggleOnline={store.setOnlineStatus}
      onRoleChange={store.setUserRole}
    >
      {resolvedPage === "dashboard" ? <DashboardPage store={store} /> : null}
      {resolvedPage === "inventory" ? <InventoryPage store={store} /> : null}
      {resolvedPage === "assistant" ? <AssistantPage store={store} /> : null}
      {resolvedPage === "map" ? <MapPage store={store} /> : null}
      {resolvedPage === "responsibilities" ? <ResponsibilitiesPage store={store} /> : null}
      {resolvedPage === "admin-dashboard" ? <AdminDashboardPage store={store} /> : null}
      {resolvedPage === "admin-assistant" ? <AdminAssistantPage store={store} /> : null}
    </AppShell>
  );
}
