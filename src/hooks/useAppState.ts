import { useEffect, useMemo, useRef, useState } from "react";
import { seedInventory } from "../data/seedInventory";
import { defaultActivity, defaultAdminWelcomeMessage, defaultWelcomeMessage } from "../lib/constants";
import {
  buildAdjustmentResponse,
  buildInventoryByZoneSummary,
  buildItemLocationResponse,
  buildItemsInZoneResponse,
  buildLowStockResponse,
  buildReorderResponse,
  buildSummaryResponse,
} from "../lib/chatbot";
import {
  createInventoryItem,
  findBestInventoryMatch,
  getItemStatus,
  normalizeName,
  updateItemQuantity,
} from "../lib/inventory";
import { buildPeakHourData, buildSeasonalInsight, buildTopItems } from "../lib/analytics";
import { parseInventoryCommand } from "../lib/parser";
import { loadState, saveState, type PersistedAppState } from "../lib/storage";
import { createPendingSyncEntry, simulateSync } from "../lib/sync";
import { connectStreamUser, disconnectStreamUser } from "../lib/streamClient";
import { ensureZoneChannel, postInventoryAttachmentEvent, postZoneSystemMessage } from "../lib/streamApi";
import type { ChatMessage } from "../types/chat";
import type {
  ActivityEntry,
  Block,
  BlockPlacement,
  DashboardWidgetId,
  DashboardWidgetLayout,
  EmployeeResponsibility,
  InventoryDraft,
  InventoryItem,
  ItemPlacement,
  Section,
  Subzone,
  UserRole,
  UserDashboardLayout,
  Zone,
  ZoneResponsibility,
} from "../types/inventory";
import type { PendingSyncEntry, SyncStatus } from "../types/sync";

interface AppState {
  inventory: InventoryItem[];
  activity: ActivityEntry[];
  messages: ChatMessage[];
  adminMessages: ChatMessage[];
  pendingSyncEntries: PendingSyncEntry[];
  isOnline: boolean;
  syncStatus: SyncStatus;
  zones: Zone[];
  userRole: UserRole;
  employees: EmployeeResponsibility[];
  zoneResponsibilities: ZoneResponsibility[];
  dashboardLayouts: UserDashboardLayout[];
  subzones: Subzone[];
  itemPlacements: ItemPlacement[];
  sections: Section[];
  blockPlacements: BlockPlacement[];
  currentEmployeeId: string | null;
}

const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetLayout[] = [
  { widgetId: "inventory-summary", visible: true, x: 0, y: 0, w: 6, h: 2, order: 0 },
  { widgetId: "employee-stats", visible: true, x: 6, y: 0, w: 6, h: 2, order: 1 },
  { widgetId: "active-responsibilities", visible: true, x: 0, y: 2, w: 6, h: 3, order: 2 },
  { widgetId: "alerts-notifications", visible: true, x: 6, y: 2, w: 6, h: 3, order: 3 },
  { widgetId: "zone-map-preview", visible: true, x: 0, y: 5, w: 12, h: 2, order: 4 },
];

function createDefaultDashboardLayout(userId: string): UserDashboardLayout {
  return {
    userId,
    widgets: DEFAULT_DASHBOARD_WIDGETS.map((widget) => ({ ...widget })),
    updatedAt: new Date().toISOString(),
  };
}

function createInitialState(): AppState {
  const persisted = typeof window !== "undefined" ? loadState() : null;

  if (persisted) {
    const legacySectionId = "legacy-section";
    const legacyBlocks = (persisted.inventory ?? []).map((item) => ({
      id: `legacy-item-${item.id}`,
      type: "text" as const,
      content: item.name,
      metadata: {
        emoji: "📦",
      },
    }));

    const sections =
      persisted.sections.length > 0
        ? persisted.sections
        : [
            {
              id: legacySectionId,
              index: 0,
              label: "Imported Inventory",
              blocks: legacyBlocks,
            },
          ];

    const blockPlacements =
      persisted.blockPlacements.length > 0
        ? persisted.blockPlacements
        : (persisted.itemPlacements ?? []).map((placement) => ({
            blockId: `legacy-item-${placement.itemId}`,
            zoneId: placement.zoneId,
            subzoneId: placement.subzoneId ?? null,
            x: placement.x,
            y: placement.y,
            metadata: {
              aisleNumber: placement.aisleNumber,
            },
          }));

    const hasCurrentLayout = (persisted.dashboardLayouts ?? []).some(
      (layout) => layout.userId === persisted.userRole
    );

    return {
      ...persisted,
      adminMessages:
        persisted.adminMessages.length > 0 ? persisted.adminMessages : [defaultAdminWelcomeMessage],
      employees: persisted.employees ?? [],
      zoneResponsibilities: persisted.zoneResponsibilities ?? [],
      dashboardLayouts: hasCurrentLayout
        ? persisted.dashboardLayouts ?? []
        : [...(persisted.dashboardLayouts ?? []), createDefaultDashboardLayout(persisted.userRole)],
      subzones: persisted.subzones ?? [],
      itemPlacements: persisted.itemPlacements ?? [],
      sections,
      blockPlacements,
      currentEmployeeId: persisted.currentEmployeeId ?? persisted.employees?.[0]?.id ?? null,
    };
  }

  return {
    inventory: seedInventory,
    activity: defaultActivity,
    messages: [defaultWelcomeMessage],
    adminMessages: [defaultAdminWelcomeMessage],
    pendingSyncEntries: [],
    isOnline: true,
    syncStatus: "online",
    zones: [],
    userRole: "staff",
    employees: [],
    zoneResponsibilities: [],
    dashboardLayouts: [createDefaultDashboardLayout("staff"), createDefaultDashboardLayout("admin")],
    subzones: [],
    itemPlacements: [],
    sections: [
      { id: crypto.randomUUID(), index: 0, blocks: [] },
      { id: crypto.randomUUID(), index: 1, blocks: [] },
      { id: crypto.randomUUID(), index: 2, blocks: [] },
    ],
    blockPlacements: [],
    currentEmployeeId: null,
  };
}

function createActivity(
  message: string,
  pendingSync: boolean,
  type: ActivityEntry["type"] = "update"
): ActivityEntry {
  return {
    id: crypto.randomUUID(),
    type,
    message,
    timestamp: new Date().toISOString(),
    pendingSync,
  };
}

function createMessage(role: ChatMessage["role"], text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    timestamp: new Date().toISOString(),
  };
}

function findBestZoneMatch(zones: Zone[], phrase: string): Zone | null {
  const normalizedPhrase = normalizeName(phrase);
  if (!normalizedPhrase) {
    return null;
  }

  const exact = zones.find((zone) => normalizeName(zone.name) === normalizedPhrase);
  if (exact) {
    return exact;
  }

  const includes = zones.find((zone) => normalizeName(zone.name).includes(normalizedPhrase));
  if (includes) {
    return includes;
  }

  return zones.find((zone) => normalizedPhrase.includes(normalizeName(zone.name))) ?? null;
}

function upsertDashboardLayout(
  layouts: UserDashboardLayout[],
  userId: UserRole,
  updater: (widgets: DashboardWidgetLayout[]) => DashboardWidgetLayout[]
): UserDashboardLayout[] {
  const existing = layouts.find((layout) => layout.userId === userId);
  if (!existing) {
    return [...layouts, { ...createDefaultDashboardLayout(userId), widgets: updater(DEFAULT_DASHBOARD_WIDGETS) }];
  }

  return layouts.map((layout) =>
    layout.userId === userId
      ? {
          ...layout,
          widgets: updater(layout.widgets),
          updatedAt: new Date().toISOString(),
        }
      : layout
  );
}

function getLayoutForUser(layouts: UserDashboardLayout[], userId: UserRole): UserDashboardLayout {
  return layouts.find((layout) => layout.userId === userId) ?? createDefaultDashboardLayout(userId);
}

export function useAppState() {
  const [state, setState] = useState<AppState>(createInitialState);
  const syncTimer = useRef<number | null>(null);

  useEffect(() => {
    const persistedState: PersistedAppState = {
      inventory: state.inventory,
      activity: state.activity,
      messages: state.messages,
      adminMessages: state.adminMessages,
      pendingSyncEntries: state.pendingSyncEntries,
      isOnline: state.isOnline,
      syncStatus: state.syncStatus,
      zones: state.zones,
      userRole: state.userRole,
      employees: state.employees,
      zoneResponsibilities: state.zoneResponsibilities,
      dashboardLayouts: state.dashboardLayouts,
      subzones: state.subzones,
      itemPlacements: state.itemPlacements,
      sections: state.sections,
      blockPlacements: state.blockPlacements,
      currentEmployeeId: state.currentEmployeeId,
    };

    saveState(persistedState);
  }, [state]);

  useEffect(() => {
    return () => {
      if (syncTimer.current) {
        window.clearTimeout(syncTimer.current);
      }
    };
  }, []);

  const metrics = useMemo(() => {
    const lowCount = state.inventory.filter((item) => getItemStatus(item) === "low").length;
    const criticalCount = state.inventory.filter((item) => getItemStatus(item) === "critical").length;
    const healthyCount = state.inventory.filter((item) => getItemStatus(item) === "healthy").length;

    return {
      totalItems: state.inventory.length,
      lowCount,
      criticalCount,
      healthyCount,
    };
  }, [state.inventory]);

  const activeEmployee = useMemo(
    () => state.employees.find((employee) => employee.id === state.currentEmployeeId) ?? null,
    [state.currentEmployeeId, state.employees]
  );

  const streamActor = useMemo(
    () =>
      activeEmployee
        ? {
            id: activeEmployee.id,
            name: activeEmployee.name,
            role: state.userRole === "admin" ? "admin" : "employee",
          }
        : {
            id: `role-${state.userRole}`,
            name: state.userRole === "admin" ? "Admin" : "Employee",
            role: state.userRole === "admin" ? "admin" : "employee",
          },
    [activeEmployee, state.userRole]
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrapStreamUser() {
      const connected = await connectStreamUser(streamActor);
      if (!connected || cancelled) {
        return;
      }
    }

    bootstrapStreamUser();

    return () => {
      cancelled = true;
      void disconnectStreamUser();
    };
  }, [streamActor]);

  function scheduleOnlineReset() {
    if (syncTimer.current) {
      window.clearTimeout(syncTimer.current);
    }

    syncTimer.current = simulateSync(() => {
      setState((current) => {
        if (!current.isOnline || current.pendingSyncEntries.length > 0) {
          return current;
        }

        return {
          ...current,
          syncStatus: "online",
        };
      });
    });
  }

  function appendAssistantMessage(text: string) {
    const reply = createMessage("assistant", text);

    setState((current) => ({
      ...current,
      messages: [...current.messages, reply],
    }));
  }

  function appendAdminAssistantMessage(text: string) {
    const reply = createMessage("assistant", text);

    setState((current) => ({
      ...current,
      adminMessages: [...current.adminMessages, reply],
    }));
  }

  function buildAdminResponse(input: string) {
    const normalized = input.toLowerCase();
    const topItems = buildTopItems(state.inventory);
    const seasonal = buildSeasonalInsight(state.inventory);
    const peakHours = buildPeakHourData();
    const busiest = [...peakHours].sort((left, right) => right.orders - left.orders)[0];
    const lowest = [...state.inventory].sort((left, right) => left.quantity - right.quantity).slice(0, 3);

    if (/\b(promote|promotion|market|upsell)\b/i.test(normalized)) {
      const topName = topItems[0]?.name ?? "signature drinks";
      return `I’d promote ${seasonal.promote}. For this shift, highlight ${topName} in combo offers to improve throughput and ticket size.`;
    }

    if (/\b(stock|restock|order|replenish)\b/i.test(normalized)) {
      if (lowest.length === 0) {
        return "Inventory is currently empty, so there are no stock priorities yet.";
      }

      return `Prioritize restocking ${lowest.map((item) => item.name).join(", ")}. Also increase buffer for ${seasonal.stockFocus}.`;
    }

    if (/\b(busy|busiest|peak|staff|staffing|rush)\b/i.test(normalized)) {
      return `Your busiest window is around ${busiest?.hour ?? "midday"} (${busiest?.orders ?? 0} mock orders). Staff the bar and prep station heavier 30 minutes before that window.`;
    }

    return "I can help with promotion planning, stock priorities, and busiest-hour staffing recommendations. Try asking: “What should we promote this week?”";
  }

  function commitInventoryChange(
    updater: (items: InventoryItem[]) => InventoryItem[],
    activityMessage: string,
    activityType: ActivityEntry["type"] = "update"
  ) {
    const shouldScheduleOnlineReset = state.isOnline;

    setState((current) => {
      const pendingSync = !current.isOnline;
      const updatedItems = updater(current.inventory);
      const activityEntry = createActivity(activityMessage, pendingSync, activityType);
      const pendingSyncEntries = pendingSync
        ? [...current.pendingSyncEntries, createPendingSyncEntry(activityMessage)]
        : current.pendingSyncEntries;

      return {
        ...current,
        inventory: updatedItems,
        activity: [activityEntry, ...current.activity].slice(0, 20),
        pendingSyncEntries,
        syncStatus: pendingSync ? "pending-sync" : "synced",
      };
    });

    if (shouldScheduleOnlineReset) {
      scheduleOnlineReset();
    }
  }

  function addItem(draft: InventoryDraft) {
    const nextItem = createInventoryItem(draft);

    commitInventoryChange(
      (items) => [nextItem, ...items],
      `Added ${nextItem.name} with ${nextItem.quantity} ${nextItem.unit}.`,
      "add"
    );
  }

  function editItem(id: string, draft: InventoryDraft) {
    commitInventoryChange(
      (items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                ...createInventoryItem(draft),
                id,
              }
            : item
        ),
      `Updated ${draft.name}.`
    );
  }

  function deleteItem(id: string) {
    const item = state.inventory.find((entry) => entry.id === id);

    if (!item) {
      return;
    }

    commitInventoryChange(
      (items) => items.filter((entry) => entry.id !== id),
      `Deleted ${item.name}.`,
      "delete"
    );
  }

  function adjustItemQuantity(id: string, delta: number) {
    const item = state.inventory.find((entry) => entry.id === id);

    if (!item) {
      return;
    }

    const verb = delta >= 0 ? "Added" : "Used";

    commitInventoryChange(
      (items) =>
        items.map((entry) =>
          entry.id === id ? updateItemQuantity(entry, entry.quantity + delta) : entry
        ),
      `${verb} ${Math.abs(delta)} ${item.unit} for ${item.name}.`
    );
  }

  function createZone(zone: Omit<Zone, "id">) {
    const nextZone: Zone = {
      id: crypto.randomUUID(),
      ...zone,
    };

    const shouldScheduleOnlineReset = state.isOnline;

    setState((current) => {
      const pendingSync = !current.isOnline;
      const activityEntry = createActivity(`Created zone ${nextZone.name}.`, pendingSync);
      const pendingSyncEntries = pendingSync
        ? [...current.pendingSyncEntries, createPendingSyncEntry(`Created zone ${nextZone.name}.`)]
        : current.pendingSyncEntries;

      return {
        ...current,
        zones: [...current.zones, nextZone],
        activity: [activityEntry, ...current.activity].slice(0, 20),
        pendingSyncEntries,
        syncStatus: pendingSync ? "pending-sync" : "synced",
      };
    });

    if (shouldScheduleOnlineReset) {
      scheduleOnlineReset();
    }

    void ensureZoneChannel({
      zoneId: nextZone.id,
      zoneName: nextZone.name,
      memberIds: state.employees
        .filter((employee) => employee.assignedZoneIds.includes(nextZone.id))
        .map((employee) => employee.id),
      createdBy: streamActor,
    });
  }

  function updateZone(id: string, updates: Partial<Omit<Zone, "id">>) {
    const zone = state.zones.find((entry) => entry.id === id);

    if (!zone) {
      return;
    }

    const shouldScheduleOnlineReset = state.isOnline;

    setState((current) => {
      const pendingSync = !current.isOnline;
      const activityEntry = createActivity(`Updated zone ${zone.name}.`, pendingSync);
      const pendingSyncEntries = pendingSync
        ? [...current.pendingSyncEntries, createPendingSyncEntry(`Updated zone ${zone.name}.`)]
        : current.pendingSyncEntries;

      return {
        ...current,
        zones: current.zones.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)),
        activity: [activityEntry, ...current.activity].slice(0, 20),
        pendingSyncEntries,
        syncStatus: pendingSync ? "pending-sync" : "synced",
      };
    });

    if (shouldScheduleOnlineReset) {
      scheduleOnlineReset();
    }

    void ensureZoneChannel({
      zoneId: id,
      zoneName: updates.name?.trim() || zone.name,
      memberIds: state.employees
        .filter((employee) => employee.assignedZoneIds.includes(id))
        .map((employee) => employee.id),
      createdBy: streamActor,
    });
  }

  function deleteZone(id: string) {
    const zone = state.zones.find((entry) => entry.id === id);

    if (!zone) {
      return;
    }

    const shouldScheduleOnlineReset = state.isOnline;

    setState((current) => {
      const pendingSync = !current.isOnline;
      const activityEntry = createActivity(`Deleted zone ${zone.name}.`, pendingSync, "delete");
      const pendingSyncEntries = pendingSync
        ? [...current.pendingSyncEntries, createPendingSyncEntry(`Deleted zone ${zone.name}.`)]
        : current.pendingSyncEntries;

      return {
        ...current,
        zones: current.zones.filter((entry) => entry.id !== id),
        inventory: current.inventory.map((entry) =>
          entry.zoneId === id ? { ...entry, zoneId: null } : entry
        ),
        subzones: current.subzones.filter((entry) => entry.zoneId !== id),
        itemPlacements: current.itemPlacements.filter((entry) => entry.zoneId !== id),
        blockPlacements: current.blockPlacements.filter((entry) => entry.zoneId !== id),
        employees: current.employees.map((employee) => ({
          ...employee,
          assignedZoneIds: employee.assignedZoneIds.filter((zoneId) => zoneId !== id),
        })),
        zoneResponsibilities: current.zoneResponsibilities.filter(
          (responsibility) => responsibility.zoneId !== id
        ),
        activity: [activityEntry, ...current.activity].slice(0, 20),
        pendingSyncEntries,
        syncStatus: pendingSync ? "pending-sync" : "synced",
      };
    });

    if (shouldScheduleOnlineReset) {
      scheduleOnlineReset();
    }
  }

  function assignItemToZone(itemId: string, zoneId: string | null) {
    const item = state.inventory.find((entry) => entry.id === itemId);

    if (!item) {
      return;
    }

    const zoneName = zoneId ? state.zones.find((entry) => entry.id === zoneId)?.name : "Unassigned";
    commitInventoryChange(
      (items) => items.map((entry) => (entry.id === itemId ? { ...entry, zoneId } : entry)),
      `Moved ${item.name} to ${zoneName ?? "Unknown zone"}.`
    );

    setState((current) => ({
      ...current,
      itemPlacements: zoneId
        ? current.itemPlacements.filter((entry) => entry.itemId !== itemId || entry.zoneId !== zoneId)
        : current.itemPlacements.filter((entry) => entry.itemId !== itemId),
    }));

    if (zoneId) {
      void postInventoryAttachmentEvent({
        zoneId,
        text: `${item.name} moved to ${zoneName ?? "Unknown zone"}.`,
        createdBy: streamActor,
        itemId: item.id,
        itemName: item.name,
        quantity: item.quantity,
        unit: item.unit,
      });
    }
  }

  function addEmployee(name: string, role = "Team Member") {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const id = crypto.randomUUID();

    setState((current) => ({
      ...current,
      employees: [
        ...current.employees,
        {
          id,
          name: trimmed,
          role,
          isOnPayroll: true,
          assignedZoneIds: [],
          assignedResponsibilityIds: [],
          responsibilityNotes: "",
        },
      ],
      currentEmployeeId: current.currentEmployeeId ?? id,
    }));
  }

  function updateEmployee(
    id: string,
    updates: Partial<
      Pick<
        EmployeeResponsibility,
        "name" | "role" | "isOnPayroll" | "responsibilityNotes" | "assignedZoneIds" | "assignedResponsibilityIds"
      >
    >
  ) {
    const employeeName = state.employees.find((employee) => employee.id === id)?.name ?? "Employee";

    setState((current) => ({
      ...current,
      employees: current.employees.map((employee) =>
        employee.id === id ? { ...employee, ...updates } : employee
      ),
    }));

    if (updates.assignedZoneIds) {
      updates.assignedZoneIds.forEach((zoneId) => {
        const zone = state.zones.find((entry) => entry.id === zoneId);
        if (!zone) {
          return;
        }

        void ensureZoneChannel({
          zoneId,
          zoneName: zone.name,
          memberIds: state.employees
            .map((employee) =>
              employee.id === id
                ? {
                    ...employee,
                    assignedZoneIds: updates.assignedZoneIds ?? employee.assignedZoneIds,
                  }
                : employee
            )
            .filter((employee) => employee.assignedZoneIds.includes(zoneId))
            .map((employee) => employee.id),
          createdBy: streamActor,
        });

        void postZoneSystemMessage({
          zoneId,
          text: `${employeeName} assigned to zone ${zone.name}.`,
          createdBy: streamActor,
          attachments: [
            {
              type: "employee_assignment",
              employeeId: id,
              employeeName,
              zoneId,
            },
          ],
        });
      });
    }
  }

  function listEmployees(filter?: { isOnPayroll?: boolean }) {
    if (typeof filter?.isOnPayroll === "boolean") {
      return state.employees.filter((employee) => employee.isOnPayroll === filter.isOnPayroll);
    }

    return state.employees;
  }

  function getEmployeeStats() {
    const total = state.employees.length;
    const onPayroll = state.employees.filter((employee) => employee.isOnPayroll).length;
    const offPayroll = total - onPayroll;

    return { total, onPayroll, offPayroll };
  }

  function createResponsibility(
    zoneId: string,
    input: {
      title: string;
      description: string;
      assignedPersonId?: string;
      status?: ZoneResponsibility["status"];
      notes?: string;
    }
  ) {
    const title = input.title.trim();
    if (!title) {
      return;
    }

    const responsibility: ZoneResponsibility = {
      id: crypto.randomUUID(),
      zoneId,
      title,
      description: input.description.trim(),
      assignedPersonId: input.assignedPersonId,
      status: input.status ?? "pending",
      notes: input.notes ?? "",
      createdAt: new Date().toISOString(),
    };

    setState((current) => {
      const nextEmployees = responsibility.assignedPersonId
        ? current.employees.map((employee) =>
            employee.id === responsibility.assignedPersonId
              ? {
                  ...employee,
                  assignedResponsibilityIds: Array.from(
                    new Set([...employee.assignedResponsibilityIds, responsibility.id])
                  ),
                }
              : employee
          )
        : current.employees;

      return {
        ...current,
        zoneResponsibilities: [...current.zoneResponsibilities, responsibility],
        employees: nextEmployees,
      };
    });

    void postZoneSystemMessage({
      zoneId,
      text: `Responsibility created: ${responsibility.title}.`,
      createdBy: streamActor,
      attachments: [
        {
          type: "responsibility",
          responsibilityId: responsibility.id,
          title: responsibility.title,
          status: responsibility.status,
        },
      ],
    });
  }

  function updateResponsibility(
    responsibilityId: string,
    updates: Partial<
      Pick<ZoneResponsibility, "title" | "description" | "status" | "notes" | "assignedPersonId">
    >
  ) {
    setState((current) => {
      const existing = current.zoneResponsibilities.find(
        (responsibility) => responsibility.id === responsibilityId
      );

      if (!existing) {
        return current;
      }

      const nextResponsibilities = current.zoneResponsibilities.map((responsibility) =>
        responsibility.id === responsibilityId ? { ...responsibility, ...updates } : responsibility
      );

      let nextEmployees = current.employees;
      if (
        Object.prototype.hasOwnProperty.call(updates, "assignedPersonId") &&
        updates.assignedPersonId !== existing.assignedPersonId
      ) {
        nextEmployees = current.employees.map((employee) => {
          const removed = employee.assignedResponsibilityIds.filter((id) => id !== responsibilityId);

          if (updates.assignedPersonId && employee.id === updates.assignedPersonId) {
            return {
              ...employee,
              assignedResponsibilityIds: Array.from(new Set([...removed, responsibilityId])),
            };
          }

          return {
            ...employee,
            assignedResponsibilityIds: removed,
          };
        });
      }

      return {
        ...current,
        zoneResponsibilities: nextResponsibilities,
        employees: nextEmployees,
      };
    });

    const currentResponsibility = state.zoneResponsibilities.find(
      (responsibility) => responsibility.id === responsibilityId
    );

    if (currentResponsibility) {
      void postZoneSystemMessage({
        zoneId: currentResponsibility.zoneId,
        text: `Responsibility updated: ${updates.title ?? currentResponsibility.title}.`,
        createdBy: streamActor,
        attachments: [
          {
            type: "responsibility",
            responsibilityId,
            ...updates,
          },
        ],
      });
    }
  }

  function assignResponsibility(responsibilityId: string, employeeId?: string) {
    updateResponsibility(responsibilityId, { assignedPersonId: employeeId });
  }

  function listResponsibilities(filter?: {
    zoneId?: string;
    assignedPersonId?: string;
    status?: ZoneResponsibility["status"];
  }) {
    return state.zoneResponsibilities.filter((responsibility) => {
      if (filter?.zoneId && responsibility.zoneId !== filter.zoneId) {
        return false;
      }

      if (
        typeof filter?.assignedPersonId === "string" &&
        responsibility.assignedPersonId !== filter.assignedPersonId
      ) {
        return false;
      }

      if (filter?.status && responsibility.status !== filter.status) {
        return false;
      }

      return true;
    });
  }

  function getDashboardLayout(userId: UserRole) {
    return getLayoutForUser(state.dashboardLayouts, userId);
  }

  function saveDashboardLayout(userId: UserRole, widgets: DashboardWidgetLayout[]) {
    setState((current) => ({
      ...current,
      dashboardLayouts: upsertDashboardLayout(current.dashboardLayouts, userId, () => widgets),
    }));
  }

  function moveDashboardWidget(userId: UserRole, widgetId: DashboardWidgetId, targetOrder: number) {
    setState((current) => ({
      ...current,
      dashboardLayouts: upsertDashboardLayout(current.dashboardLayouts, userId, (widgets) => {
        const ordered = [...widgets].sort((left, right) => left.order - right.order);
        const fromIndex = ordered.findIndex((widget) => widget.widgetId === widgetId);
        if (fromIndex < 0) {
          return ordered;
        }

        const [moved] = ordered.splice(fromIndex, 1);
        if (!moved) {
          return ordered;
        }

        const clamped = Math.max(0, Math.min(targetOrder, ordered.length));
        ordered.splice(clamped, 0, moved);

        return ordered.map((widget, order) => ({ ...widget, order }));
      }),
    }));
  }

  function setDashboardWidgetVisibility(userId: UserRole, widgetId: DashboardWidgetId, visible: boolean) {
    setState((current) => ({
      ...current,
      dashboardLayouts: upsertDashboardLayout(current.dashboardLayouts, userId, (widgets) =>
        widgets.map((widget) => (widget.widgetId === widgetId ? { ...widget, visible } : widget))
      ),
    }));
  }

  function updateDashboardWidgetPosition(
    userId: UserRole,
    widgetId: DashboardWidgetId,
    position: Pick<DashboardWidgetLayout, "x" | "y" | "w" | "h">
  ) {
    setState((current) => ({
      ...current,
      dashboardLayouts: upsertDashboardLayout(current.dashboardLayouts, userId, (widgets) =>
        widgets.map((widget) => (widget.widgetId === widgetId ? { ...widget, ...position } : widget))
      ),
    }));
  }

  function createSubzone(input: Omit<Subzone, "id">) {
    setState((current) => ({
      ...current,
      subzones: [...current.subzones, { ...input, id: crypto.randomUUID() }],
    }));
  }

  function updateSubzone(id: string, updates: Partial<Omit<Subzone, "id" | "zoneId">>) {
    setState((current) => ({
      ...current,
      subzones: current.subzones.map((subzone) =>
        subzone.id === id ? { ...subzone, ...updates } : subzone
      ),
    }));
  }

  function deleteSubzone(id: string) {
    setState((current) => ({
      ...current,
      subzones: current.subzones.filter((subzone) => subzone.id !== id),
      itemPlacements: current.itemPlacements.map((placement) =>
        placement.subzoneId === id ? { ...placement, subzoneId: null } : placement
      ),
      blockPlacements: current.blockPlacements.map((placement) =>
        placement.subzoneId === id ? { ...placement, subzoneId: null } : placement
      ),
    }));
  }

  function placeItemInZone(input: ItemPlacement) {
    setState((current) => ({
      ...current,
      itemPlacements: [
        ...current.itemPlacements.filter(
          (placement) => !(placement.itemId === input.itemId && placement.zoneId === input.zoneId)
        ),
        input,
      ],
    }));
  }

  function createSection(label?: string) {
    setState((current) => ({
      ...current,
      sections: [
        ...current.sections,
        {
          id: crypto.randomUUID(),
          index: current.sections.length,
          label: label?.trim() ? label.trim() : undefined,
          blocks: [],
        },
      ],
    }));
  }

  function reorderSections(fromIndex: number, toIndex: number) {
    setState((current) => {
      const next = [...current.sections];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) {
        return current;
      }
      next.splice(toIndex, 0, moved);

      return {
        ...current,
        sections: next.map((section, index) => ({ ...section, index })),
      };
    });
  }

  function createBlock(
    sectionId: string,
    type: Block["type"],
    content: string,
    metadata?: Block["metadata"]
  ) {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    setState((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              blocks: [
                ...section.blocks,
                {
                  id: crypto.randomUUID(),
                  type,
                  content: trimmed,
                  metadata,
                },
              ],
            }
          : section
      ),
    }));
  }

  function moveBlock(
    sourceSectionId: string,
    targetSectionId: string,
    blockId: string,
    targetIndex: number
  ) {
    setState((current) => {
      const source = current.sections.find((section) => section.id === sourceSectionId);
      const target = current.sections.find((section) => section.id === targetSectionId);
      if (!source || !target) {
        return current;
      }

      const block = source.blocks.find((entry) => entry.id === blockId);
      if (!block) {
        return current;
      }

      const sourceBlocks = source.blocks.filter((entry) => entry.id !== blockId);
      const targetBlocks = target.id === source.id ? [...sourceBlocks] : [...target.blocks];
      const clampedIndex = Math.max(0, Math.min(targetIndex, targetBlocks.length));
      targetBlocks.splice(clampedIndex, 0, block);

      return {
        ...current,
        sections: current.sections.map((section) => {
          if (section.id === source.id && section.id === target.id) {
            return { ...section, blocks: targetBlocks };
          }

          if (section.id === source.id) {
            return { ...section, blocks: sourceBlocks };
          }

          if (section.id === target.id) {
            return { ...section, blocks: targetBlocks };
          }

          return section;
        }),
      };
    });
  }

  function placeBlock(input: BlockPlacement) {
    setState((current) => ({
      ...current,
      blockPlacements: [
        ...current.blockPlacements.filter(
          (placement) => !(placement.blockId === input.blockId && placement.zoneId === input.zoneId)
        ),
        input,
      ],
    }));
  }

  function setCurrentEmployee(nextEmployeeId: string | null) {
    setState((current) => ({
      ...current,
      currentEmployeeId: nextEmployeeId,
    }));
  }

  function setUserRole(nextRole: UserRole) {
    setState((current) => ({
      ...current,
      userRole: nextRole,
    }));
  }

  function listItemsInZone(zoneId: string) {
    return state.inventory.filter((entry) => entry.zoneId === zoneId);
  }

  function setOnlineStatus(nextOnline: boolean) {
    setState((current) => {
      if (nextOnline && !current.isOnline && current.pendingSyncEntries.length > 0) {
        return {
          ...current,
          isOnline: true,
          syncStatus: "synced",
          pendingSyncEntries: [],
          activity: [
            createActivity("Pending offline changes synced successfully.", false, "sync"),
            ...current.activity,
          ].slice(0, 20),
        };
      }

      return {
        ...current,
        isOnline: nextOnline,
        syncStatus: nextOnline
          ? "online"
          : current.pendingSyncEntries.length > 0
            ? "pending-sync"
            : "offline",
      };
    });

    if (nextOnline) {
      scheduleOnlineReset();
    }
  }

  function sendAdminMessage(text: string) {
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    const userMessage = createMessage("user", trimmed);

    setState((current) => ({
      ...current,
      adminMessages: [...current.adminMessages, userMessage],
    }));

    appendAdminAssistantMessage(buildAdminResponse(trimmed));
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    const userMessage = createMessage("user", trimmed);

    setState((current) => ({
      ...current,
      messages: [...current.messages, userMessage],
    }));

    const inventorySnapshot = state.inventory;
    const activitySnapshot = state.activity;
    const zonesSnapshot = state.zones;
    const parsed = parseInventoryCommand(trimmed, inventorySnapshot, zonesSnapshot);

    if (parsed.type === "list-low") {
      appendAssistantMessage(buildLowStockResponse(inventorySnapshot));
      return;
    }

    if (parsed.type === "reorder-suggestions") {
      appendAssistantMessage(buildReorderResponse(inventorySnapshot));
      return;
    }

    if (parsed.type === "daily-summary") {
      appendAssistantMessage(buildSummaryResponse(activitySnapshot));
      return;
    }

    if (parsed.type === "summarize_inventory_by_zone") {
      appendAssistantMessage(buildInventoryByZoneSummary(zonesSnapshot, inventorySnapshot));
      return;
    }

    if (parsed.type === "find_item_location") {
      const item = findBestInventoryMatch(inventorySnapshot, parsed.itemName);
      if (!item) {
        appendAssistantMessage("I couldn’t find that item in inventory yet.");
        return;
      }

      const zone = item.zoneId ? zonesSnapshot.find((entry) => entry.id === item.zoneId) ?? null : null;
      appendAssistantMessage(buildItemLocationResponse(item, zone));
      return;
    }

    if (parsed.type === "list_items_in_zone") {
      const zone = findBestZoneMatch(zonesSnapshot, parsed.zoneName);
      if (!zone) {
        appendAssistantMessage("I couldn’t find that zone. Try the exact zone name from the map.");
        return;
      }

      appendAssistantMessage(buildItemsInZoneResponse(zone, listItemsInZone(zone.id)));
      return;
    }

    if (parsed.type === "move_item_to_zone") {
      const item = findBestInventoryMatch(inventorySnapshot, parsed.itemName);
      if (!item) {
        appendAssistantMessage("I couldn’t match that item. Try using the inventory list name.");
        return;
      }

      const zone = findBestZoneMatch(zonesSnapshot, parsed.zoneName);
      if (!zone) {
        appendAssistantMessage("I couldn’t find that destination zone. Please check the map zone name.");
        return;
      }

      assignItemToZone(item.id, zone.id);
      appendAssistantMessage(`Done — moved ${item.name} to ${zone.name}.`);
      return;
    }

    if (parsed.type === "adjust") {
      const item = findBestInventoryMatch(inventorySnapshot, parsed.itemName);

      if (!item) {
        appendAssistantMessage(
          "I couldn’t match that item yet. Try using the inventory name as it appears in the list."
        );
        return;
      }

      const delta = parsed.direction === "add" ? parsed.quantity : -parsed.quantity;
      const updatedItem = updateItemQuantity(item, item.quantity + delta);

      commitInventoryChange(
        (items) => items.map((entry) => (entry.id === item.id ? updatedItem : entry)),
        parsed.direction === "add"
          ? `Restocked ${item.name} by ${parsed.quantity} ${item.unit}.`
          : `Logged ${parsed.quantity} ${item.unit} used from ${item.name}.`
      );

      appendAssistantMessage(buildAdjustmentResponse(updatedItem, parsed.direction, parsed.quantity));
      return;
    }

    appendAssistantMessage(
      "I can help with low-stock checks, reorders, summaries, item locations, zone lookups, and moves like “Move oat milk to Cold Storage.”"
    );
  }

  return {
    ...state,
    metrics,
    addItem,
    editItem,
    deleteItem,
    adjustItemQuantity,
    createZone,
    updateZone,
    deleteZone,
    assignItemToZone,
    addEmployee,
    updateEmployee,
    listEmployees,
    getEmployeeStats,
    createResponsibility,
    updateResponsibility,
    assignResponsibility,
    listResponsibilities,
    getDashboardLayout,
    saveDashboardLayout,
    moveDashboardWidget,
    setDashboardWidgetVisibility,
    updateDashboardWidgetPosition,
    createSubzone,
    updateSubzone,
    deleteSubzone,
    placeItemInZone,
    createSection,
    reorderSections,
    createBlock,
    moveBlock,
    placeBlock,
    setCurrentEmployee,
    listItemsInZone,
    setUserRole,
    sendAdminMessage,
    sendMessage,
    setOnlineStatus,
  };
}

export type AppStore = ReturnType<typeof useAppState>;
