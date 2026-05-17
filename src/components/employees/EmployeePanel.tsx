import type { EmployeeResponsibility } from "../../types/inventory";

interface EmployeePanelProps {
  employees: EmployeeResponsibility[];
  payrollFilter: "all" | "on" | "off";
  onPayrollFilterChange: (next: "all" | "on" | "off") => void;
}

export function EmployeePanel({ employees, payrollFilter, onPayrollFilterChange }: EmployeePanelProps) {
  const total = employees.length;
  const onPayroll = employees.filter((employee) => employee.isOnPayroll).length;
  const offPayroll = total - onPayroll;

  const filtered = employees.filter((employee) => {
    if (payrollFilter === "on") {
      return employee.isOnPayroll;
    }

    if (payrollFilter === "off") {
      return !employee.isOnPayroll;
    }

    return true;
  });

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Employee stats</h3>
        <select
          value={payrollFilter}
          onChange={(event) => onPayrollFilterChange(event.target.value as "all" | "on" | "off")}
          className="soft-ring rounded-xl border-0 bg-slate-50 px-3 py-2 text-sm outline-none"
        >
          <option value="all">All employees</option>
          <option value="on">On payroll</option>
          <option value="off">Not on payroll</option>
        </select>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{total}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">On payroll</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">{onPayroll}</p>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Not on payroll</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{offPayroll}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {filtered.length === 0 ? (
          <li className="rounded-xl bg-slate-50 px-3 py-2 text-slate-500">No employees in this filter.</li>
        ) : (
          filtered.slice(0, 6).map((employee) => (
            <li key={employee.id} className="rounded-xl bg-slate-50 px-3 py-2">
              <span className="font-medium text-slate-900">{employee.name}</span>
              <span className="ml-2 text-xs uppercase tracking-[0.16em] text-slate-500">{employee.role}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
