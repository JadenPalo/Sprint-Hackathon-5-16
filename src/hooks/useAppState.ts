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
import { pluralize } from "../lib/format";
import { buildActivityInsightsReport } from "../lib/activityInsights";
import { buildDailyOpsReport } from "../lib/dailyOps";
import { parseInventoryCommand } from "../lib/parser";
import { buildProcurementRecommendations } from "../lib/procurement";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { getFirebaseServices, isFirebaseEnabled } from "../lib/firebase";
import { buildGeminiAssistantResponse, isGeminiAvailable } from "../lib/gemini";
import { loadState, saveState, type PersistedAppState } from "../lib/storage";
import { createPendingSyncEntry } from "../lib/sync";
import { connectStreamUser, disconnectStreamUser } from "../lib/streamClient";
import { ensureZoneChannel, postInventoryAttachmentEvent, postZoneSystemMessage } from "../lib/streamApi";
import type { ChatMessage } from "../types/chat";
import type {
  ActivityEntry,
  Block,
  BlockPlacement,
  EmployeeResponsibility,
  InventoryDraft,
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

interface AppState {
  inventory: InventoryItem[];
  activity: ActivityEntry[];
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
  usageEvents: UsageEvent[];
  currentEmployeeId: string | null;
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

    return {
      ...persisted,
      mapActivity: persisted.mapActivity ?? [],
      adminMessages:
        persisted.adminMessages.length > 0 ? persisted.adminMessages : [defaultAdminWelcomeMessage],
      employees: persisted.employees ?? [],
      zoneResponsibilities: persisted.zoneResponsibilities ?? [],

      subzones: persisted.subzones ?? [],
      itemPlacements: persisted.itemPlacements ?? [],
      sections,
      blockPlacements,
      usageEvents: persisted.usageEvents ?? [],
      currentEmployeeId: persisted.currentEmployeeId ?? persisted.employees?.[0]?.id ?? null,
    };
  }

  return {
    inventory: seedInventory,
    activity: defaultActivity,
    mapActivity: [],
    messages: [defaultWelcomeMessage],
    adminMessages: [defaultAdminWelcomeMessage],
    pendingSyncEntries: [],
    isOnline: true,
    syncStatus: "online-synced",
    zones: [],
    userRole: "staff",
    employees: [],
    zoneResponsibilities: [],

    subzones: [],
    itemPlacements: [],
    sections: [
      { id: crypto.randomUUID(), index: 0, blocks: [] },
      { id: crypto.randomUUID(), index: 1, blocks: [] },
      { id: crypto.randomUUID(), index: 2, blocks: [] },
    ],
    blockPlacements: [],
    usageEvents: [],
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

function createMapActivity(message: string): MapActivityEntry {
  return {
    id: crypto.randomUUID(),
    message,
    timestamp: new Date().toISOString(),
  };
}

function createUsageEvent(itemId: string, delta: number, actorId: string | null): UsageEvent {
  return {
    id: crypto.randomUUID(),
    itemId,
    delta,
    timestamp: new Date().toISOString(),
    actorId,
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


export function useAppState() {
  const [state, setState] = useState<AppState>(createInitialState);
  const syncTimer = useRef<number | null>(null);
  const persistTimer = useRef<number | null>(null);
  const streamConnectionVersion = useRef(0);
  const firebaseWriteNonceRef = useRef<string | null>(null);
  const skipNextFirebaseShadowWriteRef = useRef(false);
  const firebaseEnabled = isFirebaseEnabled();
  const firebaseServices = firebaseEnabled ? getFirebaseServices() : null;

  useEffect(() => {
    if (persistTimer.current) {
      window.clearTimeout(persistTimer.current);
    }

    const persistedState: PersistedAppState = {
      inventory: state.inventory,
      activity: state.activity,
      usageEvents: state.usageEvents,
      mapActivity: state.mapActivity,
      messages: state.messages,
      adminMessages: state.adminMessages,
      pendingSyncEntries: state.pendingSyncEntries,
      isOnline: state.isOnline,
      syncStatus: state.syncStatus,
      zones: state.zones,
      userRole: state.userRole,
      employees: state.employees,
      zoneResponsibilities: state.zoneResponsibilities,

      subzones: state.subzones,
      itemPlacements: state.itemPlacements,
      sections: state.sections,
      blockPlacements: state.blockPlacements,
      currentEmployeeId: state.currentEmployeeId,
    };

    persistTimer.current = window.setTimeout(() => {
      saveState(persistedState);

      if (skipNextFirebaseShadowWriteRef.current) {
        skipNextFirebaseShadowWriteRef.current = false;
      } else if (firebaseEnabled && firebaseServices) {
        const nonce = crypto.randomUUID();
        firebaseWriteNonceRef.current = nonce;

        void setDoc(
          doc(firebaseServices.db, "configs", "app-state"),
          {
            ...persistedState,
            __meta: {
              nonce,
              updatedAt: new Date().toISOString(),
            },
          },
          { merge: true }
        );
      }

      persistTimer.current = null;
    }, 350);

    return () => {
      if (persistTimer.current) {
        window.clearTimeout(persistTimer.current);
      }
    };
  }, [state, firebaseEnabled, firebaseServices]);

  useEffect(() => {
    if (!firebaseEnabled || !firebaseServices) {
      return;
    }

    const unsubscribe = onSnapshot(doc(firebaseServices.db, "configs", "app-state"), (snapshot) => {
      if (!snapshot.exists() || snapshot.metadata.hasPendingWrites) {
        return;
      }

      const payload = snapshot.data() as Partial<PersistedAppState> & {
        __meta?: { nonce?: string };
      };

      if (payload.__meta?.nonce && payload.__meta.nonce === firebaseWriteNonceRef.current) {
        return;
      }

      skipNextFirebaseShadowWriteRef.current = true;

      setState((current) => ({
        ...current,
        inventory: payload.inventory ?? current.inventory,
        activity: payload.activity ?? current.activity,
        usageEvents: payload.usageEvents ?? current.usageEvents,
        mapActivity: payload.mapActivity ?? current.mapActivity,
        messages: payload.messages ?? current.messages,
        adminMessages: payload.adminMessages ?? current.adminMessages,
        pendingSyncEntries: payload.pendingSyncEntries ?? current.pendingSyncEntries,
        isOnline: payload.isOnline ?? current.isOnline,
        syncStatus: payload.syncStatus ?? current.syncStatus,
        zones: payload.zones ?? current.zones,
        userRole: payload.userRole ?? current.userRole,
        employees: payload.employees ?? current.employees,
        zoneResponsibilities: payload.zoneResponsibilities ?? current.zoneResponsibilities,
        subzones: payload.subzones ?? current.subzones,
        itemPlacements: payload.itemPlacements ?? current.itemPlacements,
        sections: payload.sections ?? current.sections,
        blockPlacements: payload.blockPlacements ?? current.blockPlacements,
        currentEmployeeId: payload.currentEmployeeId ?? current.currentEmployeeId,
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [firebaseEnabled, firebaseServices]);

  useEffect(() => {
    return () => {
      if (syncTimer.current) {
        window.clearTimeout(syncTimer.current);
      }
      if (persistTimer.current) {
        window.clearTimeout(persistTimer.current);
      }
      streamConnectionVersion.current += 1;
      void disconnectStreamUser();
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

  const procurementRecommendations = useMemo(
    () => buildProcurementRecommendations(state.inventory, state.usageEvents),
    [state.inventory, state.usageEvents]
  );

  const dailyOpsReport = useMemo(
    () => buildDailyOpsReport(state.inventory, state.usageEvents, state.activity, procurementRecommendations),
    [state.inventory, state.usageEvents, state.activity, procurementRecommendations]
  );

  const activityInsightsReport = useMemo(
    () => buildActivityInsightsReport(state.activity, state.employees, state.zoneResponsibilities),
    [state.activity, state.employees, state.zoneResponsibilities]
  );

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
    const connectionVersion = streamConnectionVersion.current + 1;
    streamConnectionVersion.current = connectionVersion;
    let cancelled = false;

    async function bootstrapStreamUser() {
      const connected = await connectStreamUser(streamActor);
      if (!connected || cancelled || streamConnectionVersion.current !== connectionVersion) {
        return;
      }
    }

    bootstrapStreamUser();

    return () => {
      cancelled = true;
      streamConnectionVersion.current += 1;
      void disconnectStreamUser();
    };
  }, [streamActor]);

  function getSyncStatus(isOnline: boolean, queue: PendingSyncEntry[]): SyncStatus {
    if (!isOnline) {
      return "offline-queued";
    }

    if (queue.some((entry) => entry.status === "failed")) {
      return "sync-error";
    }

    return queue.length > 0 ? "online-syncing" : "online-synced";
  }

  function scheduleOnlineReset(delayMs = 120) {
    if (syncTimer.current) {
      window.clearTimeout(syncTimer.current);
    }

    syncTimer.current = window.setTimeout(() => {
      processSyncQueue();
    }, delayMs);
  }

  function processSyncQueue() {
    let nextDelay: number | null = null;

    setState((current) => {
      if (!current.isOnline) {
        return {
          ...current,
          syncStatus: getSyncStatus(false, current.pendingSyncEntries),
        };
      }

      if (current.pendingSyncEntries.length === 0) {
        return {
          ...current,
          syncStatus: "online-synced",
        };
      }

      const now = Date.now();
      const first = current.pendingSyncEntries[0];
      if (!first) {
        return {
          ...current,
          pendingSyncEntries: [],
          syncStatus: "online-synced",
        };
      }

      const retryAt = first.nextRetryAt ? new Date(first.nextRetryAt).getTime() : 0;
      if (first.status === "failed" && retryAt > now) {
        nextDelay = Math.max(250, retryAt - now);
        return {
          ...current,
          syncStatus: "sync-error",
        };
      }

      const shouldForceFailure = first.payload.forceFailure === true && first.retryCount < 3;
      if (shouldForceFailure) {
        const nextRetryCount = first.retryCount + 1;
        const backoffMs = Math.min(30000, 1000 * 2 ** nextRetryCount);
        const failedEntry: PendingSyncEntry = {
          ...first,
          status: "failed",
          retryCount: nextRetryCount,
          lastError: "Retry required for queued action.",
          nextRetryAt: new Date(now + backoffMs).toISOString(),
        };

        nextDelay = backoffMs;

        return {
          ...current,
          pendingSyncEntries: [failedEntry, ...current.pendingSyncEntries.slice(1)],
          syncStatus: "sync-error",
        };
      }

      const remainingQueue = current.pendingSyncEntries.slice(1);
      nextDelay = remainingQueue.length > 0 ? 120 : null;

      return {
        ...current,
        pendingSyncEntries: remainingQueue,
        syncStatus: getSyncStatus(true, remainingQueue),
        activity:
          remainingQueue.length === 0
            ? [createActivity("Queued offline changes synced successfully.", false, "sync"), ...current.activity].slice(
                0,
                20
              )
            : current.activity,
      };
    });

    if (nextDelay !== null) {
      scheduleOnlineReset(nextDelay);
    }
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
      const previousById = new Map(current.inventory.map((item) => [item.id, item]));
      const usageDeltaEvents: UsageEvent[] = [];

      for (const updated of updatedItems) {
        const previous = previousById.get(updated.id);
        if (!previous) {
          continue;
        }

        const delta = updated.quantity - previous.quantity;
        if (delta !== 0) {
          usageDeltaEvents.push(createUsageEvent(updated.id, delta, current.currentEmployeeId));
        }
      }

      const activityEntry = createActivity(activityMessage, pendingSync, activityType);
      const pendingSyncEntries = pendingSync
        ? [
            ...current.pendingSyncEntries,
            createPendingSyncEntry(activityMessage, "inventory_update", { activityType, activityMessage }),
          ]
        : current.pendingSyncEntries;

      return {
        ...current,
        inventory: updatedItems,
        usageEvents: [...usageDeltaEvents, ...current.usageEvents].slice(0, 5000),
        activity: [activityEntry, ...current.activity].slice(0, 20),
        pendingSyncEntries,
        syncStatus: getSyncStatus(current.isOnline, pendingSyncEntries),
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
        ? [
            ...current.pendingSyncEntries,
            createPendingSyncEntry(`Created zone ${nextZone.name}.`, "map_update", {
              action: "create_zone",
              zoneId: nextZone.id,
              zoneName: nextZone.name,
            }),
          ]
        : current.pendingSyncEntries;
      const mapEntry = createMapActivity(`Zone created: ${nextZone.name}.`);

      return {
        ...current,
        zones: [...current.zones, nextZone],
        activity: [activityEntry, ...current.activity].slice(0, 20),
        mapActivity: [mapEntry, ...current.mapActivity].slice(0, 50),
        pendingSyncEntries,
        syncStatus: getSyncStatus(current.isOnline, pendingSyncEntries),
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
        ? [
            ...current.pendingSyncEntries,
            createPendingSyncEntry(`Updated zone ${zone.name}.`, "map_update", {
              action: "update_zone",
              zoneId: id,
              updates,
            }),
          ]
        : current.pendingSyncEntries;
      const mapEntry = createMapActivity(`Zone updated: ${updates.name?.trim() || zone.name}.`);

      return {
        ...current,
        zones: current.zones.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)),
        activity: [activityEntry, ...current.activity].slice(0, 20),
        mapActivity: [mapEntry, ...current.mapActivity].slice(0, 50),
        pendingSyncEntries,
        syncStatus: getSyncStatus(current.isOnline, pendingSyncEntries),
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
        ? [
            ...current.pendingSyncEntries,
            createPendingSyncEntry(`Deleted zone ${zone.name}.`, "map_update", {
              action: "delete_zone",
              zoneId: id,
              zoneName: zone.name,
            }),
          ]
        : current.pendingSyncEntries;
      const mapEntry = createMapActivity(`Zone deleted: ${zone.name}.`);

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
        mapActivity: [mapEntry, ...current.mapActivity].slice(0, 50),
        pendingSyncEntries,
        syncStatus: getSyncStatus(current.isOnline, pendingSyncEntries),
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

    setState((current) => {
      const pendingSync = !current.isOnline;
      const activityEntry = createActivity(`Added employee ${trimmed}.`, pendingSync);
      const pendingSyncEntries = pendingSync
        ? [
            ...current.pendingSyncEntries,
            createPendingSyncEntry(`Added employee ${trimmed}.`, "employee_update", {
              action: "add_employee",
              employeeId: id,
              name: trimmed,
              role,
            }),
          ]
        : current.pendingSyncEntries;

      return {
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
        activity: [activityEntry, ...current.activity].slice(0, 20),
        pendingSyncEntries,
        syncStatus: getSyncStatus(current.isOnline, pendingSyncEntries),
        currentEmployeeId: current.currentEmployeeId ?? id,
      };
    });
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
    if (state.userRole !== "admin") {
      return;
    }

    const employeeName = state.employees.find((employee) => employee.id === id)?.name ?? "Employee";
    const shouldScheduleOnlineReset = state.isOnline;

    setState((current) => {
      const pendingSync = !current.isOnline;
      const activityEntry = createActivity(`Updated employee ${employeeName}.`, pendingSync);
      const pendingSyncEntries = pendingSync
        ? [
            ...current.pendingSyncEntries,
            createPendingSyncEntry(`Updated employee ${employeeName}.`, "employee_update", {
              action: "update_employee",
              employeeId: id,
              updates,
            }),
          ]
        : current.pendingSyncEntries;

      return {
        ...current,
        employees: current.employees.map((employee) =>
          employee.id === id ? { ...employee, ...updates } : employee
        ),
        activity: [activityEntry, ...current.activity].slice(0, 20),
        pendingSyncEntries,
        syncStatus: getSyncStatus(current.isOnline, pendingSyncEntries),
      };
    });

    if (shouldScheduleOnlineReset) {
      scheduleOnlineReset();
    }

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
    if (state.userRole !== "admin") {
      return;
    }

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
    const shouldScheduleOnlineReset = state.isOnline;

    setState((current) => {
      const pendingSync = !current.isOnline;
      const activityMessage = `Created responsibility ${responsibility.title}.`;
      const activityEntry = createActivity(activityMessage, pendingSync, "add");
      const pendingSyncEntries = pendingSync
        ? [
            ...current.pendingSyncEntries,
            createPendingSyncEntry(activityMessage, "task_update", {
              action: "create_responsibility",
              responsibilityId: responsibility.id,
              zoneId: responsibility.zoneId,
              title: responsibility.title,
              assignedPersonId: responsibility.assignedPersonId ?? null,
              status: responsibility.status,
            }),
          ]
        : current.pendingSyncEntries;

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
        activity: [activityEntry, ...current.activity].slice(0, 20),
        pendingSyncEntries,
        syncStatus: getSyncStatus(current.isOnline, pendingSyncEntries),
      };
    });

    if (shouldScheduleOnlineReset) {
      scheduleOnlineReset();
    }

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
    const currentResponsibilitySnapshot = state.zoneResponsibilities.find(
      (responsibility) => responsibility.id === responsibilityId
    );

    if (!currentResponsibilitySnapshot) {
      return;
    }

    const isAdmin = state.userRole === "admin";
    const isOwnTask = currentResponsibilitySnapshot.assignedPersonId === state.currentEmployeeId;

    if (!isAdmin && !isOwnTask) {
      return;
    }

    const sanitizedUpdates: Partial<
      Pick<ZoneResponsibility, "title" | "description" | "status" | "notes" | "assignedPersonId">
    > = isAdmin
      ? updates
      : {
          status: updates.status,
          notes: updates.notes,
        };

    if (!isAdmin) {
      const hasAssignmentChange = Object.prototype.hasOwnProperty.call(updates, "assignedPersonId");
      const hasTitleChange = Object.prototype.hasOwnProperty.call(updates, "title");
      const hasDescriptionChange = Object.prototype.hasOwnProperty.call(updates, "description");
      if (hasAssignmentChange || hasTitleChange || hasDescriptionChange) {
        return;
      }
    }

    const shouldScheduleOnlineReset = state.isOnline;

    setState((current) => {
      const existing = current.zoneResponsibilities.find(
        (responsibility) => responsibility.id === responsibilityId
      );

      if (!existing) {
        return current;
      }

      const pendingSync = !current.isOnline;
      const activityMessage = `Updated responsibility ${sanitizedUpdates.title ?? existing.title}.`;
      const activityEntry = createActivity(activityMessage, pendingSync);

      const nextResponsibilities = current.zoneResponsibilities.map((responsibility) =>
        responsibility.id === responsibilityId ? { ...responsibility, ...sanitizedUpdates } : responsibility
      );

      let nextEmployees = current.employees;
      if (
        Object.prototype.hasOwnProperty.call(sanitizedUpdates, "assignedPersonId") &&
        sanitizedUpdates.assignedPersonId !== existing.assignedPersonId
      ) {
        nextEmployees = current.employees.map((employee) => {
          const removed = employee.assignedResponsibilityIds.filter((id) => id !== responsibilityId);

          if (sanitizedUpdates.assignedPersonId && employee.id === sanitizedUpdates.assignedPersonId) {
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

      const pendingSyncEntries = pendingSync
        ? [
            ...current.pendingSyncEntries,
            createPendingSyncEntry(activityMessage, "task_update", {
              action: "update_responsibility",
              responsibilityId,
              zoneId: existing.zoneId,
              updates: sanitizedUpdates,
            }),
          ]
        : current.pendingSyncEntries;

      return {
        ...current,
        zoneResponsibilities: nextResponsibilities,
        employees: nextEmployees,
        activity: [activityEntry, ...current.activity].slice(0, 20),
        pendingSyncEntries,
        syncStatus: getSyncStatus(current.isOnline, pendingSyncEntries),
      };
    });

    if (shouldScheduleOnlineReset) {
      scheduleOnlineReset();
    }

    const currentResponsibility = state.zoneResponsibilities.find(
      (responsibility) => responsibility.id === responsibilityId
    );

    if (currentResponsibility) {
      void postZoneSystemMessage({
        zoneId: currentResponsibility.zoneId,
        text: `Responsibility updated: ${sanitizedUpdates.title ?? currentResponsibility.title}.`,
        createdBy: streamActor,
        attachments: [
          {
            type: "responsibility",
            responsibilityId,
            ...sanitizedUpdates,
          },
        ],
      });
    }
  }

  function assignResponsibility(responsibilityId: string, employeeId?: string) {
    if (state.userRole !== "admin") {
      return;
    }
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

  function createSubzone(input: Omit<Subzone, "id">) {
    const next = { ...input, id: crypto.randomUUID() };
    setState((current) => ({
      ...current,
      subzones: [...current.subzones, next],
      mapActivity: [createMapActivity(`Subzone created: ${next.name}.`), ...current.mapActivity].slice(0, 50),
    }));
  }

  function updateSubzone(id: string, updates: Partial<Omit<Subzone, "id" | "zoneId">>) {
    setState((current) => ({
      ...current,
      subzones: current.subzones.map((subzone) =>
        subzone.id === id ? { ...subzone, ...updates } : subzone
      ),
      mapActivity: [createMapActivity(`Subzone updated.`), ...current.mapActivity].slice(0, 50),
    }));
  }

  function deleteSubzone(id: string) {
    const subzoneName = state.subzones.find((entry) => entry.id === id)?.name ?? "Subzone";
    setState((current) => ({
      ...current,
      subzones: current.subzones.filter((subzone) => subzone.id !== id),
      itemPlacements: current.itemPlacements.map((placement) =>
        placement.subzoneId === id ? { ...placement, subzoneId: null } : placement
      ),
      blockPlacements: current.blockPlacements.map((placement) =>
        placement.subzoneId === id ? { ...placement, subzoneId: null } : placement
      ),
      mapActivity: [createMapActivity(`Subzone deleted: ${subzoneName}.`), ...current.mapActivity].slice(0, 50),
    }));
  }

  function placeItemInZone(input: ItemPlacement) {
    const itemName = state.inventory.find((entry) => entry.id === input.itemId)?.name ?? "Item";
    setState((current) => ({
      ...current,
      itemPlacements: [
        ...current.itemPlacements.filter(
          (placement) => !(placement.itemId === input.itemId && placement.zoneId === input.zoneId)
        ),
        input,
      ],
      mapActivity: [createMapActivity(`${itemName} moved inside map.`), ...current.mapActivity].slice(0, 50),
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
      mapActivity: [createMapActivity(`Map item placement updated.`), ...current.mapActivity].slice(0, 50),
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
    setState((current) => ({
      ...current,
      isOnline: nextOnline,
      syncStatus: getSyncStatus(nextOnline, current.pendingSyncEntries),
    }));

    if (nextOnline) {
      scheduleOnlineReset(0);
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

  async function sendMessage(text: string) {
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

    if (parsed.type === "unknown" && isGeminiAvailable()) {
      const geminiResponse = await buildGeminiAssistantResponse({
        message: trimmed,
        inventory: inventorySnapshot,
        zones: zonesSnapshot,
        activity: activitySnapshot,
      });

      if (geminiResponse) {
        appendAssistantMessage(geminiResponse);
        return;
      }

      appendAssistantMessage(
        "I’m having trouble reaching Gemini right now. Please try again in a moment, or use a direct command like “restock oat milk by 5.”"
      );
      return;
    }

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

      if (parsed.inferredQuantity) {
        const actionLabel = parsed.direction === "add" ? "Added" : "Logged usage for";
        appendAssistantMessage(
          `${actionLabel} 1 ${pluralize(1, item.unit)} of ${item.name}. If you want a different amount, include a number (for example: “${parsed.direction === "add" ? "add" : "use"} 5 ${item.name}”).`
        );
        return;
      }

      appendAssistantMessage(buildAdjustmentResponse(updatedItem, parsed.direction, parsed.quantity));
      return;
    }

    appendAssistantMessage(
      isGeminiAvailable()
        ? "I can help with stock analysis, summaries, item locations, and map moves. Try asking naturally, for example: “What risks should I handle before lunch rush?”"
        : "I can help with low-stock checks, reorders, summaries, item locations, zone lookups, and moves like “Move oat milk to Cold Storage.”"
    );
  }

  return {
    ...state,
    metrics,
    procurementRecommendations,
    dailyOpsReport,
    activityInsightsReport,
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
