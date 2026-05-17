import { createContext, useContext, type ReactNode } from "react";
import type { AppStore } from "../hooks/useAppState";

const StoreContext = createContext<AppStore | null>(null);

interface StoreProviderProps {
  store: AppStore;
  children: ReactNode;
}

export function StoreProvider({ store, children }: StoreProviderProps) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useStore must be used within StoreProvider");
  }
  return store;
}
