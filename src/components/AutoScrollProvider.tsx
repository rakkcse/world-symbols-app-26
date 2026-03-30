import React, { createContext, useContext, useState, useEffect } from 'react';

interface AutoScrollContextType {
  autoScrollEnabled: boolean;
  setAutoScrollEnabled: (enabled: boolean) => void;
  autoScrollDelay: number;
  setAutoScrollDelay: (delay: number) => void;
}

const AutoScrollContext = createContext<AutoScrollContextType | undefined>(undefined);

export function AutoScrollProvider({ children }: { children: React.ReactNode }) {
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(() => {
    const saved = localStorage.getItem('autoScrollEnabled');
    return saved ? JSON.parse(saved) : false;
  });
  const [autoScrollDelay, setAutoScrollDelay] = useState(() => {
    const saved = localStorage.getItem('autoScrollDelay');
    return saved ? parseInt(saved, 10) : 3000;
  });

  useEffect(() => {
    localStorage.setItem('autoScrollEnabled', JSON.stringify(autoScrollEnabled));
  }, [autoScrollEnabled]);

  useEffect(() => {
    localStorage.setItem('autoScrollDelay', autoScrollDelay.toString());
  }, [autoScrollDelay]);

  return (
    <AutoScrollContext.Provider value={{ autoScrollEnabled, setAutoScrollEnabled, autoScrollDelay, setAutoScrollDelay }}>
      {children}
    </AutoScrollContext.Provider>
  );
}

export function useAutoScroll() {
  const context = useContext(AutoScrollContext);
  if (!context) throw new Error('useAutoScroll must be used within AutoScrollProvider');
  return context;
}
