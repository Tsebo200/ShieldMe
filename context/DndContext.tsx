import React, { createContext, useContext, useRef, useCallback } from 'react';

type DropHandler = (data?: any) => void;

interface DndContextType {
  registerDropHandler: (id: string, handler: DropHandler) => void;
  unregisterDropHandler: (id: string) => void;
  handleDrop: (id: string, data?: any) => void;
}

const DndContext = createContext<DndContextType | null>(null);

export const useDnd = () => {
  const context = useContext(DndContext);
  // Return null instead of throwing to allow graceful degradation
  if (!context) {
    console.warn('useDnd must be used within DndProvider');
    return null;
  }
  return context;
};

export const DndContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handlersRef = useRef<Map<string, DropHandler>>(new Map());

  const registerDropHandler = useCallback((id: string, handler: DropHandler) => {
    handlersRef.current.set(id, handler);
  }, []);

  const unregisterDropHandler = useCallback((id: string) => {
    handlersRef.current.delete(id);
  }, []);

  const handleDrop = useCallback((id: string, data?: any) => {
    const handler = handlersRef.current.get(id);
    if (handler) {
      handler(data);
    }
  }, []);

  return (
    <DndContext.Provider value={{ registerDropHandler, unregisterDropHandler, handleDrop }}>
      {children}
    </DndContext.Provider>
  );
};






