import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FilterPanelContextType {
  isMobileFiltersOpen: boolean;
  setIsMobileFiltersOpen: (open: boolean) => void;
}

const FilterPanelContext = createContext<FilterPanelContextType | undefined>(undefined);

export const FilterPanelProvider = ({ children }: { children: ReactNode }) => {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  return (
    <FilterPanelContext.Provider value={{ isMobileFiltersOpen, setIsMobileFiltersOpen }}>
      {children}
    </FilterPanelContext.Provider>
  );
};

export const useFilterPanel = () => {
  const context = useContext(FilterPanelContext);
  if (context === undefined) {
    throw new Error('useFilterPanel must be used within a FilterPanelProvider');
  }
  return context;
};

