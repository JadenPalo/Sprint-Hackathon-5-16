import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import { SectionTitle } from "../components/common/SectionTitle";
import { useStore } from "../context/StoreContext";
import {
  buildPeakHourData,
  buildSeasonalInsight,
  buildTopItems,
  buildWeeklySalesData,
} from "../lib/analytics";

export function AdminDashboardPage() {
  const store = useStore();
  const [employeeName, setEmployeeName] = useState("");
  const [employeeRole, setEmployeeRole] = useState("Team Member");
  const lowRatio =
    store.metrics.totalItems === 0 ? 0 : Math.round((store.metrics.lowCount / store.metrics.totalItems) * 100);

  const salesData = buildWeeklySalesData(store.activity);
  const peakHourData = buildPeakHourData();
  const topItems = buildTopItems(store.inventory);
  const seasonal = buildSeasonalInsight(store.inventory);
  const employeeStats = store.getEmployeeStats();

  const topReorders = store.procurementRecommendations.slice(0, 5);
  const ops = store.dailyOpsReport;
  const insights = store.activityInsightsReport;

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Admin Dashboard"
        title="Operations and trend snapshots"
        description="Manager-focused inventory insights for planning, staffing decisions, and team responsibilities."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card-surface p-5">
          <p className="text-sm text-slate-500">Tracked items</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{store.metrics.totalItems}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm text-slate-500">Low-stock ratio</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{lowRatio}%</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm text-slate-500">On payroll</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{employeeStats.onPayroll}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm text-slate-500">Not on payroll</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{employeeStats.offPayroll}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card-surface p-5">
          <h3 className="text-base font-semibold text-slate-900">Daily Ops Intelligence Report</h3>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-xl bg-slate-100 px-3 py-2">
              <p className="text-slate-500">Orders processed</p>
              <p className="font-semibold text-slate-900">{ops.overview.totalOrdersProcessed}</p>
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2">
              <p className="text-slate-500">Inventory consumed (24h)</p>
              <p className="font-semibold text-slate-900">{ops.overview.totalInventoryConsumed}</p>
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2">
              <p className="text-slate-500">Fastest growth</p>
              <p className="font-semibold text-slate-900">{ops.overview.fastestGrowingItem}</p>
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2">
              <p className="text-slate-500">Slowest moving</p>
              <p className="font-semibold text-slate-900">{ops.overview.slowestMovingItem}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-xs text-slate-700">
            <div>
              <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Key anomalies</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {ops.anomalies.slice(0, 3).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Operational risks</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {ops.operationalRisks.slice(0, 3).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Action items</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {ops.actionItems.slice(0, 3).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-base font-semibold text-slate-900">AI Reorder Forecast</h3>
          <p className="mt-1 text-xs text-slate-500">Predictive recommendations (48h velocity + weekly baseline)</p>
          <div className="mt-3 space-y-2 text-xs">
            {topReorders.length === 0 ? (
              <p className="text-slate-500">Not enough telemetry yet to forecast reorders.</p>
            ) : (
              topReorders.map((entry) => (
                <div key={entry.itemId} className="rounded-xl bg-slate-100 px-3 py-2 text-slate-700">
                  <p className="font-semibold text-slate-900">{entry.itemName}</p>
                  <p>
                    Runout ~{entry.daysUntilStockout}d ({entry.expectedStockoutWindow}) • Confidence{" "}
                    <span className="font-semibold uppercase">{entry.confidence}</span>
                  </p>
                  <p>
                    Suggested reorder: <span className="font-semibold">{entry.suggestedReorderQuantity}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card-surface p-5">
          <h3 className="text-base font-semibold text-slate-900">Weekly sales trend (mock)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#7c3aed" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-base font-semibold text-slate-900">Peak-hour demand (mock)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHourData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="orders" fill="#0f766e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="card-surface p-5">
          <h3 className="text-base font-semibold text-slate-900">Top stocked items</h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {topItems.map((item) => (
              <li key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span>{item.name}</span>
                <span className="font-semibold">{item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-base font-semibold text-slate-900">{seasonal.season} seasonal insights</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li>
              <span className="font-semibold">Promote:</span> {seasonal.promote}
            </li>
            <li>
              <span className="font-semibold">Stock focus:</span> {seasonal.stockFocus}
            </li>
            <li>
              <span className="font-semibold">Note:</span> {seasonal.note}
            </li>
          </ul>
        </div>
      </div>

      <div className="card-surface p-5">
        <h3 className="text-base font-semibold text-slate-900">Admin-only employee activity insights</h3>
        <p className="mt-1 text-xs text-slate-500">
          For operational optimization and workload balancing only — not punitive surveillance.
        </p>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-xl bg-slate-100 px-3 py-2">
            <p className="text-slate-500">Team average completed tasks</p>
            <p className="font-semibold text-slate-900">{insights.teamAverageCompleted}</p>
          </div>
          <div className="rounded-xl bg-slate-100 px-3 py-2">
            <p className="text-slate-500">Top performer</p>
            <p className="font-semibold text-slate-900">{insights.topPerformer}</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {insights.insights.slice(0, 5).map((entry) => (
            <div key={entry.employeeId} className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">{entry.employeeName}</p>
              <p>Completion delta vs team avg: {entry.completionRateDeltaPct}%</p>
              <p>Idle-gap signal: {entry.idleGapSignal}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card-surface p-5">
        <h3 className="text-base font-semibold text-slate-900">Employee management</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={employeeName}
            onChange={(event) => setEmployeeName(event.target.value)}
            className="soft-ring min-w-0 rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
            placeholder="Add employee name"
          />
          <input
            value={employeeRole}
            onChange={(event) => setEmployeeRole(event.target.value)}
            className="soft-ring min-w-0 rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
            placeholder="Role"
          />
          <button
            type="button"
            onClick={() => {
              store.addEmployee(employeeName, employeeRole.trim() || "Team Member");
              setEmployeeName("");
            }}
            className="rounded-2xl bg-cafe-700 px-4 py-3 text-sm font-semibold text-white"
          >
            Add
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {store.employees.length === 0 ? (
            <p className="text-sm text-slate-500">No employees assigned yet.</p>
          ) : (
            store.employees.map((employee) => (
              <div key={employee.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{employee.name}</p>
                    <p className="text-xs text-slate-500">{employee.role}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    <input
                      type="checkbox"
                      checked={employee.isOnPayroll}
                      onChange={(event) =>
                        store.updateEmployee(employee.id, { isOnPayroll: event.target.checked })
                      }
                    />
                    On payroll
                  </label>
                </div>

                <label className="mt-3 block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Assigned zones
                  </span>
                  <select
                    multiple
                    value={employee.assignedZoneIds}
                    onChange={(event) => {
                      const selected = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
                      store.updateEmployee(employee.id, { assignedZoneIds: selected });
                    }}
                    className="soft-ring min-h-24 w-full rounded-2xl border-0 bg-white px-3 py-2 text-sm outline-none"
                  >
                    {store.zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </label>

                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                  Assigned responsibilities: {employee.assignedResponsibilityIds.length}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
