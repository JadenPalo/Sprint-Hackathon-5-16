import type { ActivityEntry, EmployeeResponsibility, ZoneResponsibility } from "../types/inventory";

export interface EmployeeInsight {
  employeeId: string;
  employeeName: string;
  completionRateDeltaPct: number;
  idleGapSignal: string;
}

export interface ActivityInsightsReport {
  teamAverageCompleted: number;
  topPerformer: string;
  insights: EmployeeInsight[];
}

function round(value: number, digits = 1): number {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

function deriveCompletedByEmployee(
  employees: EmployeeResponsibility[],
  responsibilities: ZoneResponsibility[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const employee of employees) {
    map.set(employee.id, 0);
  }

  for (const responsibility of responsibilities) {
    if (responsibility.status !== "completed" || !responsibility.assignedPersonId) {
      continue;
    }
    map.set(
      responsibility.assignedPersonId,
      (map.get(responsibility.assignedPersonId) ?? 0) + 1
    );
  }

  return map;
}

export function buildActivityInsightsReport(
  activity: ActivityEntry[],
  employees: EmployeeResponsibility[],
  responsibilities: ZoneResponsibility[]
): ActivityInsightsReport {
  const completedByEmployee = deriveCompletedByEmployee(employees, responsibilities);
  const completedValues = [...completedByEmployee.values()];
  const teamAverageCompleted =
    completedValues.length > 0
      ? completedValues.reduce((sum, value) => sum + value, 0) / completedValues.length
      : 0;

  const insights: EmployeeInsight[] = employees.map((employee) => {
    const completed = completedByEmployee.get(employee.id) ?? 0;
    const completionRateDeltaPct =
      teamAverageCompleted > 0 ? ((completed - teamAverageCompleted) / teamAverageCompleted) * 100 : 0;

    const recentSignals = activity
      .filter((entry) => entry.message.toLowerCase().includes(employee.name.toLowerCase()))
      .slice(0, 10);

    const idleGapSignal =
      recentSignals.length < 2
        ? "insufficient data"
        : recentSignals.length < 4
          ? "moderate gap pattern"
          : "consistent activity cadence";

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      completionRateDeltaPct: round(completionRateDeltaPct),
      idleGapSignal,
    };
  });

  const topPerformer = [...insights].sort(
    (a, b) => b.completionRateDeltaPct - a.completionRateDeltaPct
  )[0]?.employeeName ?? "N/A";

  return {
    teamAverageCompleted: round(teamAverageCompleted, 2),
    topPerformer,
    insights,
  };
}
