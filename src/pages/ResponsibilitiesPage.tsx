import { useMemo, useState } from "react";
import { SectionTitle } from "../components/common/SectionTitle";
import { EmptyState } from "../components/common/EmptyState";
import { ResponsibilityCard } from "../components/responsibilities/ResponsibilityCard";
import type { AppStore } from "../hooks/useAppState";

interface ResponsibilitiesPageProps {
  store: AppStore;
}

export function ResponsibilitiesPage({ store }: ResponsibilitiesPageProps) {
  const [expandedResponsibilityId, setExpandedResponsibilityId] = useState<string | null>(null);
  const [draftByZone, setDraftByZone] = useState<Record<string, string>>({});

  const selectedEmployee =
    store.employees.find((employee) => employee.id === store.currentEmployeeId) ?? null;

  const assignedZones = useMemo(
    () =>
      selectedEmployee
        ? store.zones.filter((zone) => selectedEmployee.assignedZoneIds.includes(zone.id))
        : [],
    [selectedEmployee, store.zones]
  );

  const responsibilitiesByZone = useMemo(() => {
    const map: Record<string, ReturnType<typeof store.listResponsibilities>> = {};

    assignedZones.forEach((zone) => {
      map[zone.id] = store.listResponsibilities({ zoneId: zone.id });
    });

    return map;
  }, [assignedZones, store]);

  function createForZone(zoneId: string) {
    const title = (draftByZone[zoneId] ?? "").trim();
    if (!title || !selectedEmployee) {
      return;
    }

    store.createResponsibility(zoneId, {
      title,
      description: "",
      assignedPersonId: selectedEmployee.id,
      status: "pending",
      notes: "",
    });

    setDraftByZone((current) => ({ ...current, [zoneId]: "" }));
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="My Responsibilities"
        title="Zone responsibility tracker"
        description="Each responsibility is independent and keeps its own status, assignment, and notes."
      />

      <div className="card-surface p-5">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Employee profile
          </span>
          <select
            value={store.currentEmployeeId ?? ""}
            onChange={(event) => store.setCurrentEmployee(event.target.value || null)}
            className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-3 py-3 text-sm outline-none"
          >
            {store.employees.length === 0 ? <option value="">No employees configured</option> : null}
            {store.employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!selectedEmployee ? (
        <EmptyState
          title="No employee selected"
          description="Choose an employee profile to view and manage assigned zone responsibilities."
        />
      ) : (
        <div className="space-y-4">
          <div className="card-surface p-5">
            <h3 className="text-base font-semibold text-slate-900">{selectedEmployee.name}</h3>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{selectedEmployee.role}</p>
            <p className="mt-2 text-sm text-slate-600">
              Payroll status:{" "}
              <span className="font-semibold">{selectedEmployee.isOnPayroll ? "On payroll" : "Not on payroll"}</span>
            </p>
          </div>

          {assignedZones.length === 0 ? (
            <EmptyState
              title="No assigned zones"
              description="This employee has no assigned zones yet. Assign zones from the admin dashboard."
            />
          ) : (
            assignedZones.map((zone) => {
              const responsibilities = responsibilitiesByZone[zone.id] ?? [];

              return (
                <div key={zone.id} className="card-surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-base font-semibold text-slate-900">{zone.name}</h4>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                      {responsibilities.length} responsibilities
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <input
                      value={draftByZone[zone.id] ?? ""}
                      onChange={(event) =>
                        setDraftByZone((current) => ({ ...current, [zone.id]: event.target.value }))
                      }
                      placeholder="Add new responsibility title"
                      className="soft-ring min-w-0 flex-1 rounded-xl border-0 bg-slate-50 px-3 py-2 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => createForZone(zone.id)}
                      className="rounded-xl bg-cafe-700 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Add
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {responsibilities.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        No responsibilities added for this zone.
                      </p>
                    ) : (
                      responsibilities.map((responsibility) => (
                        <ResponsibilityCard
                          key={responsibility.id}
                          responsibility={responsibility}
                          employees={store.employees}
                          expanded={expandedResponsibilityId === responsibility.id}
                          onToggle={() =>
                            setExpandedResponsibilityId((current) =>
                              current === responsibility.id ? null : responsibility.id
                            )
                          }
                          onUpdate={(responsibilityId, updates) =>
                            store.updateResponsibility(responsibilityId, updates)
                          }
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
