import type { EmployeeResponsibility, ZoneResponsibility } from "../../types/inventory";

interface ResponsibilityCardProps {
  responsibility: ZoneResponsibility;
  employees: EmployeeResponsibility[];
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (
    responsibilityId: string,
    updates: Partial<
      Pick<ZoneResponsibility, "title" | "description" | "status" | "notes" | "assignedPersonId">
    >
  ) => void;
  readOnly?: boolean;
}

export function ResponsibilityCard({
  responsibility,
  employees,
  expanded,
  onToggle,
  onUpdate,
  readOnly = false,
}: ResponsibilityCardProps) {
  const assignedEmployee = employees.find((employee) => employee.id === responsibility.assignedPersonId);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">{responsibility.title}</p>
          <p className="text-xs text-slate-500">
            {assignedEmployee ? `Assigned: ${assignedEmployee.name}` : "Unassigned"}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
          {responsibility.status}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-slate-200 px-4 py-4">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Description
              </span>
              <textarea
                value={responsibility.description}
                onChange={(event) =>
                  onUpdate(responsibility.id, { description: event.target.value })
                }
                readOnly={readOnly}
                rows={2}
                className="soft-ring w-full rounded-xl border-0 bg-white px-3 py-2 text-sm outline-none"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Status
                </span>
                <select
                  value={responsibility.status}
                  onChange={(event) =>
                    onUpdate(responsibility.id, {
                      status: event.target.value as ZoneResponsibility["status"],
                    })
                  }
                  disabled={readOnly}
                  className="soft-ring w-full rounded-xl border-0 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="active">active</option>
                  <option value="pending">pending</option>
                  <option value="completed">completed</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Assigned person
                </span>
                <select
                  value={responsibility.assignedPersonId ?? ""}
                  onChange={(event) =>
                    onUpdate(responsibility.id, {
                      assignedPersonId: event.target.value || undefined,
                    })
                  }
                  disabled={readOnly}
                  className="soft-ring w-full rounded-xl border-0 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="">Unassigned</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Notes
              </span>
              <textarea
                value={responsibility.notes}
                onChange={(event) => onUpdate(responsibility.id, { notes: event.target.value })}
                readOnly={readOnly}
                rows={3}
                className="soft-ring w-full rounded-xl border-0 bg-white px-3 py-2 text-sm outline-none"
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
