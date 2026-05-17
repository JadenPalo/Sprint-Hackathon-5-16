import { useMemo, useState } from "react";
import { SectionTitle } from "../components/common/SectionTitle";
import { InventoryList } from "../components/inventory/InventoryList";
import { ItemFormModal } from "../components/inventory/ItemFormModal";
import type { AppStore } from "../hooks/useAppState";
import type { InventoryDraft, InventoryItem } from "../types/inventory";

interface InventoryPageProps {
  store: AppStore;
}

export function InventoryPage({ store }: InventoryPageProps) {
  const [query, setQuery] = useState("");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return store.inventory;
    }

    return store.inventory.filter((item) => {
      return (
        item.name.toLowerCase().includes(normalized) ||
        item.category.toLowerCase().includes(normalized)
      );
    });
  }, [query, store.inventory]);

  function handleSubmit(draft: InventoryDraft, id?: string) {
    if (id) {
      store.editItem(id, draft);
      return;
    }

    store.addItem(draft);
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Inventory"
        title="Track, adjust, and restock items"
        description="Everything updates instantly in local storage, even while offline."
        action={
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setModalOpen(true);
            }}
            className="rounded-2xl bg-cafe-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cafe-800"
          >
            + Add item
          </button>
        }
      />

      <div className="card-surface p-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
          placeholder="Search items or categories..."
        />
      </div>

      <InventoryList
        items={filteredItems}
        zones={store.zones}
        onIncrease={(id) => store.adjustItemQuantity(id, 1)}
        onDecrease={(id) => store.adjustItemQuantity(id, -1)}
        onEdit={(item) => {
          setEditingItem(item);
          setModalOpen(true);
        }}
        onDelete={(id) => store.deleteItem(id)}
        onAssignZone={(id, zoneId) => store.assignItemToZone(id, zoneId)}
      />

      <ItemFormModal
        open={modalOpen}
        item={editingItem}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
