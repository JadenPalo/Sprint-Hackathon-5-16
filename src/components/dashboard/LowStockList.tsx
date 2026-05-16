import { getItemStatus, getStatusLabel } from "../../lib/inventory";
import type { InventoryItem } from "../../types/inventory";

interface LowStockListProps {
  items: InventoryItem[];
}

export function LowStockList({ items }: LowStockListProps) {
  const flagged = items
    .filter((item) => getItemStatus(item) !== "healthy")
    .sort((left, right) => left.quantity - right.quantity)
    .slice(0, 5);

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Needs attention</h3>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Priority
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {flagged.length === 0 ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Everything looks healthy right now.
          </div>
        ) : (
          flagged.map((item) => {
            const status = getItemStatus(item);

            return (
              <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">
                      {item.quantity} {item.unit} left
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      status === "critical"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {getStatusLabel(status)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
