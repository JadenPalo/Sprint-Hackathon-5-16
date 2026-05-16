import { useEffect, useMemo, useRef, useState } from "react";
import { seedInventory } from "../data/seedInventory";
import { defaultActivity, defaultWelcomeMessage } from "../lib/constants";
import {
  buildAdjustmentResponse,
  buildLowStockResponse,
  buildReorderResponse,
  buildSummaryResponse,
} from "../lib/chatbot";
import { createInventoryItem, findBestInventoryMatch, getItemStatus, updateItemQuantity } from "../lib/inventory";
import { parseInventoryCommand } from "../lib/parser";
import { loadState, saveState, type PersistedAppState } from "../lib/storage";
import { createPendingSyncEntry, simulateSync } from "../lib/sync";
import type { ChatMessage } from "../types/chat";
import type { ActivityEntry, InventoryDraft, InventoryItem } from "../types/inventory";
import type { PendingSyncEntry, SyncStatus } from "../types/sync";

interface AppState {
  inventory: InventoryItem[];
  activity: ActivityEntry[];
  messages: ChatMessage[];
  pendingSyncEntries: PendingSyncEntry[];
  isOnline: boolean;
  syncStatus: SyncStatus;
}

function createInitialState(): AppState {
  const persisted = typeof window !== "undefined" ? loadState() : null;

  if (persisted) {
    return persisted;
  }

  return {
    inventory: seedInventory,
    activity: defaultActivity,
    messages: [defaultWelcomeMessage],
    pendingSyncEntries: [],
    isOnline: true,
    syncStatus: "online",
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

export function useAppState() {
  const [state, setState] = useState<AppState>(createInitialState);
  const syncTimer = useRef<number | null>(null);

  useEffect(() => {
    const persistedState: PersistedAppState = {
      inventory: state.inventory,
      activity: state.activity,
      messages: state.messages,
      pendingSyncEntries: state.pendingSyncEntries,
      isOnline: state.isOnline,
      syncStatus: state.syncStatus,
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
    const parsed = parseInventoryCommand(trimmed, inventorySnapshot);

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
      "I can help with low-stock checks, reorders, summaries, and simple stock updates like “Add 12 oat milks” or “We used 50 large cups.”"
    );
  }

  return {
    ...state,
    metrics,
    addItem,
    editItem,
    deleteItem,
    adjustItemQuantity,
    sendMessage,
    setOnlineStatus,
  };
}

export type AppStore = ReturnType<typeof useAppState>;
