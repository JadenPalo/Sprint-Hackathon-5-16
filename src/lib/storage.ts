import { STORAGE_KEY } from "./constants";
import type { ChatMessage } from "../types/chat";
import type {
  ActivityEntry,
  BlockPlacement,
  EmployeeResponsibility,
  InventoryItem,
  ItemPlacement,
  Section,
  Subzone,
  UserDashboardLayout,
  Zone,
  ZoneResponsibility,
} from "../types/inventory";
import type { PendingSyncEntry, SyncStatus } from "../types/sync";

export interface PersistedAppState {
  inventory: InventoryItem[];
  activity: ActivityEntry[];
  messages: ChatMessage[];
  adminMessages: ChatMessage[];
  pendingSyncEntries: PendingSyncEntry[];
  isOnline: boolean;
  syncStatus: SyncStatus;
  zones: Zone[];
  userRole: "staff" | "admin";
  employees: EmployeeResponsibility[];
  zoneResponsibilities: ZoneResponsibility[];
  dashboardLayouts: UserDashboardLayout[];
  subzones: Subzone[];
  itemPlacements: ItemPlacement[];
  sections: Section[];
  blockPlacements: BlockPlacement[];
  currentEmployeeId: string | null;
}

export function loadState(): PersistedAppState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedAppState>;

    return {
      inventory: parsed.inventory ?? [],
      activity: parsed.activity ?? [],
      messages: parsed.messages ?? [],
      adminMessages: parsed.adminMessages ?? [],
      pendingSyncEntries: parsed.pendingSyncEntries ?? [],
      isOnline: parsed.isOnline ?? true,
      syncStatus: parsed.syncStatus ?? "online",
      zones: parsed.zones ?? [],
      userRole: parsed.userRole ?? "staff",
      employees: (parsed.employees ?? []).map((employee) => ({
        ...employee,
        role: employee.role ?? "Team Member",
        isOnPayroll: employee.isOnPayroll ?? true,
        assignedZoneIds: employee.assignedZoneIds ?? [],
        assignedResponsibilityIds: employee.assignedResponsibilityIds ?? [],
        responsibilityNotes: employee.responsibilityNotes ?? "",
      })),
      zoneResponsibilities: parsed.zoneResponsibilities ?? [],
      dashboardLayouts: parsed.dashboardLayouts ?? [],
      subzones: parsed.subzones ?? [],
      itemPlacements: parsed.itemPlacements ?? [],
      sections: parsed.sections ?? [],
      blockPlacements: parsed.blockPlacements ?? [],
      currentEmployeeId: parsed.currentEmployeeId ?? null,
    };
  } catch {
    return null;
  }
}

export function saveState(state: PersistedAppState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
