import { STORAGE_KEY } from "./constants";
import type { ChatMessage } from "../types/chat";
import type {
  ActivityEntry,
  BlockPlacement,
  EmployeeResponsibility,
  InventoryItem,
  ItemPlacement,
  MapActivityEntry,
  Section,
  Subzone,
  UsageEvent,
  UserRole,
  Zone,
  ZoneResponsibility,
} from "../types/inventory";
import type { PendingSyncEntry, SyncStatus } from "../types/sync";

export interface PersistedAppState {
  inventory: InventoryItem[];
  activity: ActivityEntry[];
  usageEvents: UsageEvent[];
  mapActivity: MapActivityEntry[];
  messages: ChatMessage[];
  adminMessages: ChatMessage[];
  pendingSyncEntries: PendingSyncEntry[];
  isOnline: boolean;
  syncStatus: SyncStatus;
  zones: Zone[];
  userRole: UserRole;
  employees: EmployeeResponsibility[];
  zoneResponsibilities: ZoneResponsibility[];

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

    const parsed = JSON.parse(raw) as Partial<PersistedAppState> & {
      syncStatus?: unknown;
      pendingSyncEntries?: Array<Partial<PendingSyncEntry>>;
    };
    const parsedSyncStatus = parsed.syncStatus as string | undefined;
    const migratedPendingSyncEntries: PendingSyncEntry[] = (parsed.pendingSyncEntries ?? []).map((entry) => ({
      id: entry.id ?? crypto.randomUUID(),
      type: entry.type ?? "inventory_update",
      payload: entry.payload ?? {},
      timestamp: entry.timestamp ?? new Date().toISOString(),
      retryCount: entry.retryCount ?? 0,
      status: entry.status ?? "pending",
      label: entry.label ?? "Queued change",
      lastError: entry.lastError,
      nextRetryAt: entry.nextRetryAt,
    }));

    const migratedSyncStatus: SyncStatus =
      parsedSyncStatus === "online" || parsedSyncStatus === "synced"
        ? "online-synced"
        : parsedSyncStatus === "pending-sync" || parsedSyncStatus === "offline"
          ? "offline-queued"
          : parsedSyncStatus === "online-syncing" ||
              parsedSyncStatus === "online-synced" ||
              parsedSyncStatus === "offline-queued" ||
              parsedSyncStatus === "sync-error"
            ? parsedSyncStatus
            : "online-synced";

    return {
      inventory: (parsed.inventory ?? []).map(item => ({ ...item, costPrice: item.costPrice ?? 0, salePrice: item.salePrice ?? 0 })),
      activity: parsed.activity ?? [],
      usageEvents: parsed.usageEvents ?? [],
      mapActivity: parsed.mapActivity ?? [],
      messages: parsed.messages ?? [],
      adminMessages: parsed.adminMessages ?? [],
      pendingSyncEntries: migratedPendingSyncEntries,
      isOnline: parsed.isOnline ?? true,
      syncStatus: migratedSyncStatus,
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
