import React, { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  sidebarWidth: number; // Actual width based on collapsed state
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const SIDEBAR_EXPANDED_WIDTH = 160;
const SIDEBAR_COLLAPSED_WIDTH = 70;

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  // Always default to collapsed (true) - sidebar starts collapsed by default
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(true);

  const setIsCollapsed = (value: boolean) => {
    setIsCollapsedState(value);
    localStorage.setItem("sidebar_collapsed", String(value));
  };

  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, sidebarWidth }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

