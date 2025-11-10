import React from "react";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../../../components/ui/collapsible";
import { X, Filter } from "lucide-react";

export interface FilterState {
  country: string | null;
  dateRange: string | null; // "24h", "7d", "14d", "30d", "6m", "1y"
  category: string | null;
  diseaseSearch: string;
}

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableCountries: string[];
  availableCategories: string[];
  isFullscreen?: boolean;
}

const DATE_RANGE_OPTIONS = [
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "14d", label: "14 Days" },
  { value: "30d", label: "30 Days" },
  { value: "6m", label: "6 Months" },
  { value: "1y", label: "1 Year" },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  availableCountries,
  availableCategories,
  isFullscreen = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(true);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilter = (key: keyof FilterState) => {
    updateFilter(key, key === "diseaseSearch" ? "" : null);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      country: null,
      dateRange: null,
      category: null,
      diseaseSearch: "",
    });
  };

  const hasActiveFilters = filters.country || filters.dateRange || filters.category || filters.diseaseSearch;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={`absolute z-[1100] transition-opacity duration-300 ${
        isFullscreen ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        top: "100px",
        left: "90px",
        width: "320px",
      }}
    >
      <div className="bg-[#315C64B2] border border-[#EAEBF024] rounded-lg shadow-lg backdrop-blur-sm overflow-hidden">
        <CollapsibleTrigger className="w-full hover:bg-[#305961]/50 transition-colors">
          <div className="px-3 py-2 border-b border-[#EAEBF024]/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#67DBE2]" />
              <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-white text-sm tracking-[-0.10px] leading-4">
                Filters
              </h3>
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-[#67DBE2] rounded-full"></span>
              )}
            </div>
            <button className="w-4 h-4 p-0 hover:bg-transparent flex-shrink-0">
              <img
                className="w-4 h-4 transition-transform duration-200"
                alt="Dropdown"
                src="/group-938.svg"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 space-y-4 max-h-[600px] overflow-y-auto">
            {/* Disease Search */}
            <div className="space-y-2">
              <label className="[font-family:'Roboto',Helvetica] text-xs font-medium text-white/90">
                Disease Search
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search diseases..."
                  value={filters.diseaseSearch}
                  onChange={(e) => updateFilter("diseaseSearch", e.target.value)}
                  className="w-full bg-[#23313c] border-[#EAEBF024] text-white placeholder:text-white/50 text-sm h-8"
                />
                {filters.diseaseSearch && (
                  <button
                    onClick={() => clearFilter("diseaseSearch")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    aria-label="Clear disease search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="[font-family:'Roboto',Helvetica] text-xs font-medium text-white/90">
                Date Range
              </label>
              <select
                value={filters.dateRange || ""}
                onChange={(e) => updateFilter("dateRange", e.target.value || null)}
                className="w-full bg-[#23313c] border border-[#EAEBF024] text-white text-sm h-8 px-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#67DBE2]/50 [&>option]:bg-[#23313c] [&>option]:text-white"
              >
                <option value="">All Time</option>
                {DATE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Country Filter */}
            <div className="space-y-2">
              <label className="[font-family:'Roboto',Helvetica] text-xs font-medium text-white/90">
                Country
              </label>
              <select
                value={filters.country || ""}
                onChange={(e) => updateFilter("country", e.target.value || null)}
                className="w-full bg-[#23313c] border border-[#EAEBF024] text-white text-sm h-8 px-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#67DBE2]/50 [&>option]:bg-[#23313c] [&>option]:text-white"
              >
                <option value="">All Countries</option>
                {availableCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="[font-family:'Roboto',Helvetica] text-xs font-medium text-white/90">
                Outbreak Category
              </label>
              <select
                value={filters.category || ""}
                onChange={(e) => updateFilter("category", e.target.value || null)}
                className="w-full bg-[#23313c] border border-[#EAEBF024] text-white text-sm h-8 px-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#67DBE2]/50 [&>option]:bg-[#23313c] [&>option]:text-white"
              >
                <option value="">All Categories</option>
                {availableCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear All Button */}
            {hasActiveFilters && (
              <Button
                onClick={clearAllFilters}
                variant="outline"
                size="sm"
                className="w-full bg-[#23313c] border-[#EAEBF024] text-white hover:bg-[#305961] text-xs h-7"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

