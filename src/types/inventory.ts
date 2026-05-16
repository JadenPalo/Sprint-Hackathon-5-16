export type ItemStatus = "healthy" | "low" | "critical";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  criticalThreshold: number;
  updatedAt: string;
}

export interface InventoryDraft {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  criticalThreshold: number;
}

export interface ActivityEntry {
  id: string;
  type: "add" | "update" | "delete" | "sync";
  message: string;
  timestamp: string;
  pendingSync: boolean;
}
