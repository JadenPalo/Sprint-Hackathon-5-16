export type PageId = "dashboard" | "inventory" | "assistant";

interface BottomNavProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

const items: Array<{ id: PageId; label: string; emoji: string }> = [
  { id: "dashboard", label: "Dashboard", emoji: "📊" },
  { id: "inventory", label: "Inventory", emoji: "📦" },
  { id: "assistant", label: "Assistant", emoji: "💬" },
];

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <nav className="card-surface fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 p-2">
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const active = item.id === currentPage;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-cafe-700 text-white shadow-soft"
                  : "bg-transparent text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="block text-base">{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
