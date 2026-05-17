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
import type { AppStore } from "../hooks/useAppState";
import {
  buildPeakHourData,
  buildSeasonalInsight,
  buildTopItems,
  buildWeeklySalesData,
} from "../lib/analytics";

interface AdminDashboardPageProps {
  store: AppStore;
}

export function AdminDashboardPage({ store }: AdminDashboardPageProps) {
  const [employeeName, setEmployeeName] = useState("");
  const [employeeRole, setEmployeeRole] = useState("Team Member");
  const lowRatio =
    store.metrics.totalItems === 0 ? 0 : Math.round((store.metrics.lowCount / store.metrics.totalItems) * 100);

  const salesData = buildWeeklySalesData(store.activity);
  const peakHourData = buildPeakHourData();
  const topItems = buildTopItems(store.inventory);
  const seasonal = buildSeasonalInsight(store.inventory);
  const employeeStats = store.getEmployeeStats();

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
