import { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { InventoryPage } from "./pages/InventoryPage";
import { AssistantPage } from "./pages/AssistantPage";
import { useAppState } from "./hooks/useAppState";
import type { PageId } from "./components/layout/BottomNav";

export default function App() {
  const store = useAppState();
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");

  return (
    <AppShell
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      syncStatus={store.syncStatus}
      isOnline={store.isOnline}
      onToggleOnline={store.setOnlineStatus}
    >
      {currentPage === "dashboard" ? <DashboardPage store={store} /> : null}
      {currentPage === "inventory" ? <InventoryPage store={store} /> : null}
      {currentPage === "assistant" ? <AssistantPage store={store} /> : null}
    </AppShell>
  );
}
