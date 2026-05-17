import { useMemo } from "react";
import { useStore } from "../context/StoreContext";
import { MetricCard } from "../components/dashboard/MetricCard";
import { RecentUpdatesCard } from "../components/dashboard/RecentUpdatesCard";
import { SyncBadge } from "../components/dashboard/SyncBadge";
import { SectionTitle } from "../components/common/SectionTitle";
import { StreamActivityFeed } from "../components/dashboard/StreamActivityFeed";
import { buildPeakHourData, buildWeeklySalesData } from "../lib/analytics";
import { getStreamConfig, hasUsableStreamConfig } from "../lib/stream";

export function DashboardPage() {
  const store = useStore();
  const streamReady = hasUsableStreamConfig(getStreamConfig());
  const salesData = useMemo(() => buildWeeklySalesData(store.activity), [store.activity]);
  const peakHourData = useMemo(() => buildPeakHourData(), []);
  const topRecommendations = useMemo(
    () => store.procurementRecommendations.slice(0, 4),
    [store.procurementRecommendations]
  );

  const visibleActivity = useMemo(() => {
    if (store.userRole === "admin") {
      return store.activity.slice(0, 6);
    }

    const activeEmployeeName =
      store.employees.find((employee) => employee.id === store.currentEmployeeId)?.name.toLowerCase() ?? "";

    if (!activeEmployeeName) {
      return store.activity.filter((entry) => entry.pendingSync).slice(0, 6);
    }

    return store.activity
      .filter(
        (entry) =>
          entry.pendingSync || entry.message.toLowerCase().includes(activeEmployeeName)
      )
      .slice(0, 6);
  }, [store.activity, store.currentEmployeeId, store.employees, store.userRole]);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Operational Control Panel"
        title="Operations dashboard"
        description="Fixed, deterministic layout for all users. No customization controls."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total items" value={store.metrics.totalItems} helper="Tracked inventory items" />
        <MetricCard label="Low stock" value={store.metrics.lowCount} tone="low" helper="Needs attention" />
        <MetricCard label="Critical" value={store.metrics.criticalCount} tone="critical" helper="Urgent restock" />
        <MetricCard label="Healthy" value={store.metrics.healthyCount} tone="healthy" helper="Stable supply" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="card-surface p-4">
          <p className="text-sm font-semibold text-slate-800">AI Reorder Recommendations</p>
          <div className="mt-3 space-y-3">
            {topRecommendations.length === 0 ? (
              <p className="text-sm text-slate-500">Not enough usage history yet for predictive recommendations.</p>
            ) : (
              topRecommendations.map((entry) => (
                <div key={entry.itemId} className="rounded-xl bg-slate-100 px-3 py-3 text-xs text-slate-700">
                  <p className="text-sm font-semibold text-slate-900">{entry.itemName}</p>
                  <p className="mt-1">
                    Stockout in ~{entry.daysUntilStockout} days ({entry.expectedStockoutWindow}) • Confidence:{" "}
                    <span className="font-semibold uppercase">{entry.confidence}</span>
                  </p>
                  <p className="mt-1">
                    Reorder suggestion: <span className="font-semibold">{entry.suggestedReorderQuantity}</span> units
                  </p>
                  <p className="mt-1 text-slate-600">{entry.reasoningSummary}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card-surface p-4">
          <p className="text-sm font-semibold text-slate-800">Sync Status</p>
          <div className="mt-3 space-y-3">
            <SyncBadge status={store.syncStatus} pending={store.pendingSyncEntries} />
            <RecentUpdatesCard activity={visibleActivity} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="card-surface p-4">
          <p className="text-sm font-semibold text-slate-800">Sales Overview</p>
          <ul className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
            {salesData.map((point) => (
              <li key={point.label} className="rounded-xl bg-slate-100 px-3 py-2">
                <span className="font-semibold">{point.label}:</span> {point.sales}
              </li>
            ))}
          </ul>
        </div>

        <div className="card-surface p-4">
          <p className="text-sm font-semibold text-slate-800">Peak Hours</p>
          <ul className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
            {peakHourData.map((point) => (
              <li key={point.hour} className="rounded-xl bg-slate-100 px-3 py-2">
                <span className="font-semibold">{point.hour}:</span> {point.orders} orders
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="card-surface p-4">
          <p className="text-sm font-semibold text-slate-800">Store Map Snapshot</p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-slate-100 px-3 py-2">
              <p className="text-xs text-slate-500">Zones</p>
              <p className="font-semibold text-slate-800">{store.zones.length}</p>
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2">
              <p className="text-xs text-slate-500">Subzones</p>
              <p className="font-semibold text-slate-800">{store.subzones.length}</p>
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2">
              <p className="text-xs text-slate-500">Map Items</p>
              <p className="font-semibold text-slate-800">{store.itemPlacements.length}</p>
            </div>
          </div>
        </div>

        <div className="card-surface p-4">
          <p className="text-sm font-semibold text-slate-800">Chatbot Activity</p>
          <div className="mt-3">
            <StreamActivityFeed enabled={streamReady} />
          </div>
        </div>
      </div>
    </div>
  );
}
