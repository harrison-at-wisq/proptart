'use client';

import React, { createContext, useContext, useState } from 'react';

interface LayoutModeContextValue {
  layoutMode: boolean;
  setLayoutMode: (value: boolean) => void;
}

const LayoutModeContext = createContext<LayoutModeContextValue>({
  layoutMode: false,
  setLayoutMode: () => {},
});

export function LayoutModeProvider({ children }: { children: React.ReactNode }) {
  const [layoutMode, setLayoutMode] = useState(false);

  return (
    <LayoutModeContext.Provider value={{ layoutMode, setLayoutMode }}>
      {children}
    </LayoutModeContext.Provider>
  );
}

export function useLayoutMode() {
  return useContext(LayoutModeContext);
}
