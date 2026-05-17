import type { InventoryItem, Zone } from "../../types/inventory";
import { EmptyState } from "../common/EmptyState";
import { InventoryCard } from "./InventoryCard";

interface InventoryListProps {
  items: InventoryItem[];
  zones: Zone[];
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onAssignZone: (id: string, zoneId: string | null) => void;
}

export function InventoryList({
  items,
  zones,
  onIncrease,
  onDecrease,
  onEdit,
  onDelete,
  onAssignZone,
}: InventoryListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No inventory items yet"
        description="Add your first supply item to start tracking stock locally."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <InventoryCard
          key={item.id}
          item={item}
          zones={zones}
          onIncrease={onIncrease}
          onDecrease={onDecrease}
          onEdit={onEdit}
          onDelete={onDelete}
          onAssignZone={onAssignZone}
        />
      ))}
    </div>
  );
}
