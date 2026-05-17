export type ItemStatus = "healthy" | "low" | "critical";
export type UserRole = "staff" | "admin";
export type ResponsibilityStatus = "active" | "pending" | "completed";
export type DashboardWidgetId =
  | "inventory-summary"
  | "low-stock-alerts"
  | "sales-overview"
  | "peak-hours"
  | "chatbot"
  | "store-map"
  | "sync-status";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  criticalThreshold: number;
  updatedAt: string;
  zoneId?: string | null;
  costPrice?: number;
  salePrice?: number;
  lastReorderDate?: string;
  usageRate?: number;
  safetyStock?: number;
}

export interface InventoryDraft {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  criticalThreshold: number;
}

export interface Zone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  mapId?: string;
}

export interface EmployeeResponsibility {
  id: string;
  name: string;
  role: string;
  isOnPayroll: boolean;
  assignedZoneIds: string[];
  assignedResponsibilityIds: string[];
  responsibilityNotes: string;
}

export interface ZoneResponsibility {
  id: string;
  zoneId: string;
  title: string;
  description: string;
  assignedPersonId?: string;
  status: ResponsibilityStatus;
  notes: string;
  createdAt: string;
}

export interface DashboardWidgetLayout {
  widgetId: DashboardWidgetId;
  visible: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  order: number;
}

export interface UserDashboardLayout {
  userId: string;
  widgets: DashboardWidgetLayout[];
  updatedAt: string;
}

export interface Subzone {
  id: string;
  zoneId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  aisleNumber?: string;
}

export interface ItemPlacement {
  itemId: string;
  zoneId: string;
  subzoneId?: string | null;
  x: number;
  y: number;
  aisleNumber?: string;
}

export type BlockType = "emoji" | "text" | "data";

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  metadata?: {
    emoji?: string;
    tags?: string[];
    style?: Record<string, string>;
  };
}

export interface Section {
  id: string;
  index: number;
  label?: string;
  blocks: Block[];
}

export interface BlockPlacement {
  blockId: string;
  zoneId: string;
  subzoneId?: string | null;
  x: number;
  y: number;
  metadata?: {
    aisleNumber?: string;
  };
}

export interface ActivityEntry {
  id: string;
  type: "add" | "update" | "delete" | "sync";
  message: string;
  timestamp: string;
  pendingSync: boolean;
}

export interface MapActivityEntry {
  id: string;
  message: string;
  timestamp: string;
}

export interface UsageEvent {
  id: string;
  itemId: string;
  delta: number;
  timestamp: string;
  actorId: string | null;
}
