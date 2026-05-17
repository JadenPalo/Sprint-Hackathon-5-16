import type { UserRole } from "../../types/inventory";

export type PageId =
  | "dashboard"
  | "inventory"
  | "assistant"
  | "map"
  | "responsibilities"
  | "admin-dashboard"
  | "admin-assistant";

interface BottomNavProps {
  currentPage: PageId;
  userRole: UserRole;
  onNavigate: (page: PageId) => void;
}

const items: Array<{ id: PageId; label: string; emoji: string; adminOnly?: boolean; staffOnly?: boolean }> = [
  { id: "dashboard", label: "Dashboard", emoji: "📊" },
  { id: "inventory", label: "Inventory", emoji: "📦" },
  { id: "map", label: "Map", emoji: "🗺️" },
  { id: "responsibilities", label: "My Tasks", emoji: "📋" },
  { id: "assistant", label: "Assistant", emoji: "💬" },
  { id: "admin-dashboard", label: "Admin", emoji: "📈", adminOnly: true },
  { id: "admin-assistant", label: "AI Ops", emoji: "🧠", adminOnly: true },
];

export function BottomNav({ currentPage, userRole, onNavigate }: BottomNavProps) {
  const visibleItems = items.filter((item) => {
    if (item.adminOnly) {
      return userRole === "admin";
    }

    if (item.staffOnly) {
      return userRole === "staff";
    }

    return true;
  });

  return (
    <nav className="card-surface fixed bottom-3 left-1/2 z-30 w-[calc(100%-1rem)] max-w-xl -translate-x-1/2 p-1.5 sm:bottom-4 sm:w-[calc(100%-2rem)] sm:p-2">
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{ gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))` }}
      >
        {visibleItems.map((item) => {
          const active = item.id === currentPage;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`rounded-xl px-2 py-2 text-[11px] font-semibold transition sm:rounded-2xl sm:px-3 sm:py-3 sm:text-sm ${
                active
                  ? "bg-cafe-700 text-white shadow-soft"
                  : "bg-transparent text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="block text-base sm:text-base">{item.emoji}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
