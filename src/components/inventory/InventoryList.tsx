import type { InventoryItem } from "../../types/inventory";
import { EmptyState } from "../common/EmptyState";
import { InventoryCard } from "./InventoryCard";

interface InventoryListProps {
  items: InventoryItem[];
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export function InventoryList({
  items,
  onIncrease,
  onDecrease,
  onEdit,
  onDelete,
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
          onIncrease={onIncrease}
          onDecrease={onDecrease}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
