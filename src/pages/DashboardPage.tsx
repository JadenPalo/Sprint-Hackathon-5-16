import type { AppStore } from "../hooks/useAppState";
import { MetricCard } from "../components/dashboard/MetricCard";
import { LowStockList } from "../components/dashboard/LowStockList";
import { RecentUpdatesCard } from "../components/dashboard/RecentUpdatesCard";
import { SyncBadge } from "../components/dashboard/SyncBadge";
import { SectionTitle } from "../components/common/SectionTitle";

interface DashboardPageProps {
  store: AppStore;
}

export function DashboardPage({ store }: DashboardPageProps) {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Dashboard"
        title="Live inventory health"
        description="Monitor stock levels, critical items, recent updates, and sync readiness at a glance."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total items"
          value={store.metrics.totalItems}
          helper="Tracked cafe supplies"
        />
        <MetricCard
          label="Low stock"
          value={store.metrics.lowCount}
          tone="low"
          helper="Needs attention soon"
        />
        <MetricCard
          label="Critical"
          value={store.metrics.criticalCount}
          tone="critical"
          helper="Restock first"
        />
        <MetricCard
          label="Healthy"
          value={store.metrics.healthyCount}
          tone="healthy"
          helper="Comfortable inventory"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <SyncBadge status={store.syncStatus} pending={store.pendingSyncEntries} />
          <RecentUpdatesCard activity={store.activity} />
        </div>
        <LowStockList items={store.inventory} />
      </div>
    </div>
  );
}
