import { useMemo, useState, type DragEvent } from "react";
import type { AppStore } from "../hooks/useAppState";
import type { DashboardWidgetId } from "../types/inventory";
import { MetricCard } from "../components/dashboard/MetricCard";
import { LowStockList } from "../components/dashboard/LowStockList";
import { RecentUpdatesCard } from "../components/dashboard/RecentUpdatesCard";
import { SyncBadge } from "../components/dashboard/SyncBadge";
import { SectionTitle } from "../components/common/SectionTitle";
import { EmployeePanel } from "../components/employees/EmployeePanel";
import { StreamActivityFeed } from "../components/dashboard/StreamActivityFeed";
import { getStreamConfig, hasUsableStreamConfig } from "../lib/stream";

interface DashboardPageProps {
  store: AppStore;
}

const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  "inventory-summary": "Inventory summary",
  "zone-map-preview": "Zone map preview",
  "employee-stats": "Employee stats",
  "active-responsibilities": "Active responsibilities",
  "alerts-notifications": "Alerts / notifications",
};

const GRID_COLUMNS = 12;
const ROW_HEIGHT = 84;

export function DashboardPage({ store }: DashboardPageProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [payrollFilter, setPayrollFilter] = useState<"all" | "on" | "off">("all");

  const layout = useMemo(
    () => store.getDashboardLayout(store.userRole),
    [store, store.dashboardLayouts, store.userRole]
  );

  const widgets = useMemo(
    () => [...layout.widgets].sort((left, right) => left.order - right.order),
    [layout.widgets]
  );

  const visibleWidgets = widgets.filter((widget) => widget.visible);
  const maxRows = Math.max(8, ...visibleWidgets.map((widget) => widget.y + widget.h));
  const containerHeight = maxRows * ROW_HEIGHT;
  const streamReady = hasUsableStreamConfig(getStreamConfig());

  function onDropWidget(event: DragEvent<HTMLDivElement>) {
    if (!isEditMode) {
      return;
    }

    event.preventDefault();
    const widgetId = event.dataTransfer.getData("text/widget-id") as DashboardWidgetId;
    if (!widgetId) {
      return;
    }

    const sourceWidget = widgets.find((widget) => widget.widgetId === widgetId);
    if (!sourceWidget) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(
        GRID_COLUMNS - sourceWidget.w,
        Math.floor(((event.clientX - rect.left) / rect.width) * GRID_COLUMNS)
      )
    );
    const y = Math.max(0, Math.floor((event.clientY - rect.top) / ROW_HEIGHT));

    store.updateDashboardWidgetPosition(store.userRole, widgetId, {
      x,
      y,
      w: sourceWidget.w,
      h: sourceWidget.h,
    });
  }

  function renderWidget(widgetId: DashboardWidgetId) {
    switch (widgetId) {
      case "inventory-summary":
        return (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            <MetricCard label="Total items" value={store.metrics.totalItems} helper="Tracked cafe supplies" />
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
        );
      case "zone-map-preview":
        return (
          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Zone map preview</h3>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {store.zones.length} zones
              </span>
            </div>
            <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              {store.zones.length === 0 ? (
                <li className="rounded-xl bg-slate-50 px-3 py-2 text-slate-500">No zones configured yet.</li>
              ) : (
                store.zones.slice(0, 6).map((zone) => (
                  <li key={zone.id} className="rounded-xl bg-slate-50 px-3 py-2">
                    {zone.name}
                  </li>
                ))
              )}
            </ul>
          </div>
        );
      case "employee-stats":
        return (
          <EmployeePanel
            employees={store.employees}
            payrollFilter={payrollFilter}
            onPayrollFilterChange={setPayrollFilter}
          />
        );
      case "active-responsibilities":
        return (
          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Active responsibilities</h3>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {store.listResponsibilities({ status: "active" }).length} active
              </span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {store.zoneResponsibilities.length === 0 ? (
                <li className="rounded-xl bg-slate-50 px-3 py-2 text-slate-500">
                  No responsibilities created yet.
                </li>
              ) : (
                store.zoneResponsibilities.slice(0, 6).map((responsibility) => {
                  const zone = store.zones.find((entry) => entry.id === responsibility.zoneId);
                  return (
                    <li key={responsibility.id} className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="font-medium text-slate-900">{responsibility.title}</p>
                      <p className="text-xs text-slate-500">{zone?.name ?? "Unknown zone"}</p>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        );
      case "alerts-notifications":
        return (
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <SyncBadge status={store.syncStatus} pending={store.pendingSyncEntries} />
                <RecentUpdatesCard activity={store.activity} />
              </div>
              <LowStockList items={store.inventory} />
            </div>
            <StreamActivityFeed enabled={streamReady} />
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Dashboard"
        title="Operational command center"
        description="Customize widget placement, monitor stock and staffing, and track active zone responsibilities."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditMode((current) => !current)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                isEditMode ? "bg-cafe-700 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {isEditMode ? "Exit edit mode" : "Edit dashboard"}
            </button>
          </div>
        }
      />

      {isEditMode ? (
        <div className="card-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Dashboard editing · widget visibility
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {widgets.map((widget) => (
              <label key={widget.widgetId} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <input
                  type="checkbox"
                  checked={widget.visible}
                  onChange={(event) =>
                    store.setDashboardWidgetVisibility(store.userRole, widget.widgetId, event.target.checked)
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm text-slate-700">{WIDGET_LABELS[widget.widgetId]}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className="relative rounded-2xl border border-dashed border-slate-300 bg-slate-100/50 p-2"
        style={{ height: containerHeight }}
        onDragOver={(event) => isEditMode && event.preventDefault()}
        onDrop={onDropWidget}
      >
        {visibleWidgets.map((widget, index) => (
          <div
            key={widget.widgetId}
            draggable={isEditMode}
            onDragStart={(event) => event.dataTransfer.setData("text/widget-id", widget.widgetId)}
            className="absolute p-2"
            style={{
              left: `${(widget.x / GRID_COLUMNS) * 100}%`,
              width: `${(widget.w / GRID_COLUMNS) * 100}%`,
              top: widget.y * ROW_HEIGHT,
              height: widget.h * ROW_HEIGHT,
            }}
          >
            <div className="h-full overflow-auto rounded-2xl bg-white/70">
              {isEditMode ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {WIDGET_LABELS[widget.widgetId]}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => store.moveDashboardWidget(store.userRole, widget.widgetId, Math.max(0, index - 1))}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        store.moveDashboardWidget(
                          store.userRole,
                          widget.widgetId,
                          Math.min(visibleWidgets.length - 1, index + 1)
                        )
                      }
                      className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="p-2">{renderWidget(widget.widgetId)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
