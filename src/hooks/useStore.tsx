import React, { createContext, useContext } from "react";

import { useEditorStore } from "@/app/store";

interface StoreProviderProps {
  children: React.ReactNode;
}

type EditorStore = ({} & ReturnType<typeof useEditorStore>) | null;

const StoreContext = createContext<EditorStore>(null);

const StoreProvider = ({ children }: StoreProviderProps) => {
  const store = useEditorStore();

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};

function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error("useStore must be used within a StoreProvider.");
  }

  return context;
}

export { StoreProvider, useStore };
