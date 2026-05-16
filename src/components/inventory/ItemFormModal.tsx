import { useEffect, useState, type FormEvent } from "react";
import type { InventoryDraft, InventoryItem } from "../../types/inventory";

interface ItemFormModalProps {
  open: boolean;
  item?: InventoryItem | null;
  onClose: () => void;
  onSubmit: (draft: InventoryDraft, id?: string) => void;
}

const emptyDraft: InventoryDraft = {
  name: "",
  category: "",
  quantity: 0,
  unit: "",
  lowStockThreshold: 0,
  criticalThreshold: 0,
};

export function ItemFormModal({ open, item, onClose, onSubmit }: ItemFormModalProps) {
  const [draft, setDraft] = useState<InventoryDraft>(emptyDraft);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (item) {
      setDraft({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        lowStockThreshold: item.lowStockThreshold,
        criticalThreshold: item.criticalThreshold,
      });
      return;
    }

    setDraft(emptyDraft);
  }, [item, open]);

  if (!open) {
    return null;
  }

  function updateField<Key extends keyof InventoryDraft>(key: Key, value: InventoryDraft[Key]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.name.trim() || !draft.category.trim() || !draft.unit.trim()) {
      return;
    }

    onSubmit(
      {
        ...draft,
        lowStockThreshold: Math.max(draft.lowStockThreshold, draft.criticalThreshold),
      },
      item?.id
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="card-surface w-full max-w-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cafe-600">
              {item ? "Edit item" : "Add new item"}
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-900">
              {item ? item.name : "Create inventory item"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600"
          >
            Close
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Item name</span>
              <input
                value={draft.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
                placeholder="Oat milk"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Category</span>
              <input
                value={draft.category}
                onChange={(event) => updateField("category", event.target.value)}
                className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
                placeholder="Dairy Alternatives"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Quantity</span>
              <input
                type="number"
                min="0"
                value={draft.quantity}
                onChange={(event) => updateField("quantity", Number(event.target.value))}
                className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Unit</span>
              <input
                value={draft.unit}
                onChange={(event) => updateField("unit", event.target.value)}
                className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
                placeholder="cartons"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Low threshold</span>
              <input
                type="number"
                min="0"
                value={draft.lowStockThreshold}
                onChange={(event) => updateField("lowStockThreshold", Number(event.target.value))}
                className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Critical threshold</span>
              <input
                type="number"
                min="0"
                value={draft.criticalThreshold}
                onChange={(event) => updateField("criticalThreshold", Number(event.target.value))}
                className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
              />
            </label>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-cafe-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cafe-800"
          >
            {item ? "Save changes" : "Add item"}
          </button>
        </form>
      </div>
    </div>
  );
}
