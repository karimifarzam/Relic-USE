import React, { createContext, useContext, useMemo } from 'react';

interface WindowContextType {
  window: Window;
  document: Document;
}

const WindowContext = createContext<WindowContextType>({
  window,
  document,
});

export const useWindow = () => useContext(WindowContext);

interface WindowProviderProps {
  children: React.ReactNode;
  windowRef: Window;
}

function WindowProvider({ children, windowRef }: WindowProviderProps) {
  const value = useMemo(
    () => ({
      window: windowRef,
      document: windowRef.document,
    }),
    [windowRef],
  );

  return (
    <WindowContext.Provider value={value}>{children}</WindowContext.Provider>
  );
}

export { WindowProvider };
export default WindowContext;
