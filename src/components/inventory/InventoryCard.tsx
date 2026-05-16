import { formatTimestamp } from "../../lib/dates";
import { getItemStatus } from "../../lib/inventory";
import type { InventoryItem } from "../../types/inventory";
import { ItemStatusBadge } from "./ItemStatusBadge";

interface InventoryCardProps {
  item: InventoryItem;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export function InventoryCard({
  item,
  onIncrease,
  onDecrease,
  onEdit,
  onDelete,
}: InventoryCardProps) {
  const status = getItemStatus(item);

  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {item.category}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{item.name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            Updated {formatTimestamp(item.updatedAt)}
          </p>
        </div>
        <ItemStatusBadge status={status} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {item.quantity} <span className="text-sm font-medium text-slate-500">{item.unit}</span>
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Threshold</p>
          <p className="mt-1 text-sm font-medium text-slate-700">
            Low at {item.lowStockThreshold} · Critical at {item.criticalThreshold}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onDecrease(item.id)}
          className="flex-1 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          -1 used
        </button>
        <button
          type="button"
          onClick={() => onIncrease(item.id)}
          className="flex-1 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          +1 restock
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
