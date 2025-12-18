import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { X, ChevronDown } from "lucide-react";
import { NavigationTabsSection } from "../HomePageMap/sections/NavigationTabsSection";
import { StatsOverview } from "./sections/StatsOverview";
import { DiseaseOutbreakChart } from "./sections/DiseaseOutbreakChart";
import { GlobalHealthMap } from "./sections/GlobalHealthMap";
import { RecentAlerts } from "./sections/RecentAlerts";
import { TopDiseases } from "./sections/TopDiseases";
import { RegionalBreakdown } from "./sections/RegionalBreakdown";
import { DiseaseDistributionPie } from "./sections/DiseaseDistributionPie";
import { TrendAnalysis } from "./sections/TrendAnalysis";
import { AIPredictions } from "./sections/AIPredictions";
import { AlertTimeline } from "./sections/AlertTimeline";
import { GlobalHealthIndex } from "./sections/GlobalHealthIndex";
import { OutbreakCategories } from "./sections/OutbreakCategories";
import { SpreadsheetImport } from "../../components/SpreadsheetImport";
import { CityExtractionStatus } from "./sections/CityExtractionStatus";
import { DiseaseTracking } from "./sections/DiseaseTracking";
import { DataExportTable } from "./sections/DataExportTable";
import { useCountries } from "../../lib/useCountries";
import { useLanguage } from "../../contexts/LanguageContext";

export const Dashboard = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [timeRange, setTimeRange] = useState("7d");
  const [activeView, setActiveView] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const { countries, loading: countriesLoading } = useCountries();
  const { t } = useLanguage();

  // Read tab from URL parameter and set active view
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      // Validate tab value
      const validTabs = ["overview", "analytics", "predictions", "categories", "health-index", "data", "disease-tracking"];
      if (validTabs.includes(tabParam)) {
        setActiveView(tabParam);
      }
    }
  }, [searchParams]);

  // Update URL when activeView changes (but not from URL param)
  const handleTabChange = (value: string) => {
    setActiveView(value);
    setSearchParams({ tab: value }, { replace: true });
  };

  // Filter countries based on search query
  const filteredCountries = React.useMemo(() => {
    if (!countrySearchQuery.trim()) return countries;
    const query = countrySearchQuery.toLowerCase().trim();
    return countries.filter(country => 
      country.name.toLowerCase().includes(query)
    );
  }, [countries, countrySearchQuery]);

  // Get selected country name
  const selectedCountryName = React.useMemo(() => {
    if (!selectedCountry) return "";
    const country = countries.find(c => c.id === selectedCountry);
    return country?.name || "";
  }, [countries, selectedCountry]);

  // Handle country selection
  const handleCountrySelect = (countryId: string | null, countryName: string = "") => {
    setSelectedCountry(countryId);
    setCountrySearchQuery(countryName);
    setIsCountryDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
        // Reset search query to selected country name when closing
        if (selectedCountry) {
          setCountrySearchQuery(selectedCountryName);
        } else {
          setCountrySearchQuery("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedCountry, selectedCountryName]);

  return (
    <div className="w-full min-h-screen bg-[#2a4149] p-3 sm:p-4 md:p-6 overflow-hidden">
      <div className="max-w-[1400px] mx-auto" style={{ width: '100%', maxWidth: '100%' }}>
        {/* Header Section - Responsive */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div className="flex-shrink-0">
            <h1 className="[font-family:'Roboto',Helvetica] font-bold text-[#66dbe1] text-2xl sm:text-3xl md:text-[38px] tracking-[0] leading-tight sm:leading-[48.1px]">
              {t("dashboard.diseaseOutbreakDashboard")}
            </h1>
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs sm:text-sm mt-2">
              {t("dashboard.realTimeMonitoring")}
            </p>
          </div>

          {/* Controls Section - Responsive */}
          <div className="flex flex-col w-full lg:w-auto lg:items-end gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-wrap">
              {/* Search Input */}
              <div className="flex w-full sm:w-[200px] lg:w-[180px] xl:w-[220px] items-center gap-2 px-2 lg:px-3 py-2 bg-[#ffffff24] rounded-md overflow-hidden border border-solid border-[#dae0e633] shadow-[0px_1px_2px_#1018280a]">
                <img
                  className="relative w-4 h-4 flex-shrink-0"
                  alt="Search"
                  src="/zoom-search.svg"
                />
                <Input
                  type="text"
                  placeholder={t("dashboard.searchDiseases")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-0 text-[#ebebeb] text-xs lg:text-sm [font-family:'Roboto',Helvetica] font-medium tracking-[-0.10px] leading-5 placeholder:text-[#ebebeb] focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0 min-w-0"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="flex items-center justify-center w-4 h-4 text-[#ebebeb99] hover:text-[#ebebeb] transition-colors flex-shrink-0"
                    aria-label={t("dashboard.clearSearch")}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Country Dropdown */}
              <div className="relative w-full sm:w-[160px] lg:w-[150px] xl:w-[180px]" ref={countryDropdownRef}>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={t("dashboard.searchCountry")}
                    value={countrySearchQuery}
                    onChange={(e) => {
                      setCountrySearchQuery(e.target.value);
                      setIsCountryDropdownOpen(true);
                      // Clear selection if user types something different
                      if (selectedCountry) {
                        const selectedName = countries.find(c => c.id === selectedCountry)?.name || "";
                        if (e.target.value !== selectedName) {
                          setSelectedCountry(null);
                        }
                      }
                    }}
                    onFocus={() => setIsCountryDropdownOpen(true)}
                    className="bg-[#ffffff24] border border-[#dae0e633] text-[#ebebeb] text-xs lg:text-sm px-2 lg:px-3 py-2 pr-7 h-[38px] placeholder:text-[#ebebeb99] focus-visible:ring-2 focus-visible:ring-[#4eb7bd]/50 w-full"
                    disabled={countriesLoading}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCountryDropdownOpen(!isCountryDropdownOpen);
                      if (!isCountryDropdownOpen && !countrySearchQuery) {
                        setCountrySearchQuery(selectedCountryName);
                      }
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#ebebeb99] hover:text-[#ebebeb] transition-colors"
                    disabled={countriesLoading}
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {countrySearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setCountrySearchQuery("");
                        setSelectedCountry(null);
                        setIsCountryDropdownOpen(false);
                      }}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-[#ebebeb99] hover:text-[#ebebeb] transition-colors"
                      aria-label={t("dashboard.clearCountrySearch")}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {isCountryDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-[#2a4149] border border-[#dae0e633] rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => handleCountrySelect(null, "")}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-[#ffffff14] transition-colors ${
                        !selectedCountry ? 'bg-[#4eb7bd33] text-[#66dbe1]' : 'text-[#ebebeb]'
                      }`}
                    >
                      {t("dashboard.allCountries")}
                    </button>
                    {filteredCountries.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-[#ebebeb99]">
                        {t("dashboard.noCountriesFound")}
                      </div>
                    ) : (
                      filteredCountries.map((country) => (
                        <button
                          key={country.id}
                          type="button"
                          onClick={() => handleCountrySelect(country.id, country.name)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-[#ffffff14] transition-colors ${
                            selectedCountry === country.id ? 'bg-[#4eb7bd33] text-[#66dbe1]' : 'text-[#ebebeb]'
                          }`}
                        >
                          {country.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Time Range Tabs */}
              <Tabs value={timeRange} onValueChange={setTimeRange} className="w-full sm:w-auto flex-shrink-0">
                <TabsList className="bg-[#ffffff14] border border-[#eaebf024] w-full sm:w-auto h-[38px]">
                  <TabsTrigger value="24h" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb] flex-1 sm:flex-none text-xs px-2 lg:px-3">
                    {t("dashboard.timeRange24h")}
                  </TabsTrigger>
                  <TabsTrigger value="7d" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb] flex-1 sm:flex-none text-xs px-2 lg:px-3">
                    {t("dashboard.timeRange7d")}
                  </TabsTrigger>
                  <TabsTrigger value="30d" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb] flex-1 sm:flex-none text-xs px-2 lg:px-3">
                    {t("dashboard.timeRange30d")}
                  </TabsTrigger>
                  <TabsTrigger value="1y" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb] flex-1 sm:flex-none text-xs px-2 lg:px-3">
                    {t("dashboard.timeRange1y")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {/* Navigation Tabs - Commented out */}
            {/* <NavigationTabsSection /> */}
          </div>
        </div>

        {/* Main Tabs - Scrollable on mobile */}
        <Tabs value={activeView} onValueChange={handleTabChange} className="mt-6 w-full" style={{ maxWidth: '100%' }}>
          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 mb-6">
            <TabsList className="bg-[#ffffff14] border border-[#eaebf024] w-max min-w-full sm:min-w-0 inline-flex">
              <TabsTrigger value="overview" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb] whitespace-nowrap text-xs sm:text-sm">
                {t("dashboard.overview")}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb] whitespace-nowrap text-xs sm:text-sm">
                {t("dashboard.analytics")}
              </TabsTrigger>
              <TabsTrigger value="predictions" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb] whitespace-nowrap text-xs sm:text-sm">
                {t("dashboard.predictions")}
              </TabsTrigger>
              <TabsTrigger value="categories" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb] whitespace-nowrap text-xs sm:text-sm">
                {t("dashboard.outbreakCategories")}
              </TabsTrigger>
              <TabsTrigger value="health-index" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb] whitespace-nowrap text-xs sm:text-sm">
                {t("dashboard.globalHealthIndex")}
              </TabsTrigger>
              <TabsTrigger value="data" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb] whitespace-nowrap text-xs sm:text-sm">
                {t("dashboard.dataManagement")}
              </TabsTrigger>
              <TabsTrigger value="disease-tracking" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb] whitespace-nowrap text-xs sm:text-sm">
                {t("dashboard.diseaseTracking")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden', contain: 'inline-size' }}>
            <div className="space-y-6" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
              <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                <StatsOverview timeRange={timeRange} searchQuery={searchQuery} countryId={selectedCountry} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ width: '100%', maxWidth: '100%' }}>
                <div className="lg:col-span-2" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                  <DiseaseOutbreakChart timeRange={timeRange} searchQuery={searchQuery} countryId={selectedCountry} />
                </div>
                <div style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                  <TopDiseases timeRange={timeRange} searchQuery={searchQuery} countryId={selectedCountry} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ width: '100%', maxWidth: '100%' }}>
                <div style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                  <GlobalHealthMap timeRange={timeRange} countryId={selectedCountry} />
                </div>
                <div style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                  <RegionalBreakdown timeRange={timeRange} countryId={selectedCountry} />
                </div>
              </div>

              <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                <CityExtractionStatus />
              </div>

              <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                <RecentAlerts searchQuery={searchQuery} limit={50} countryId={selectedCountry} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DiseaseDistributionPie timeRange={timeRange} searchQuery={searchQuery} countryId={selectedCountry} />
              <TrendAnalysis timeRange={timeRange} countryId={selectedCountry} />
            </div>

            <AlertTimeline countryId={selectedCountry} />
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6 mt-0">
            <AIPredictions />
          </TabsContent>

          <TabsContent value="categories" className="space-y-6 mt-0">
            <OutbreakCategories />
          </TabsContent>

          <TabsContent value="health-index" className="space-y-6 mt-0">
            <GlobalHealthIndex />
          </TabsContent>

          <TabsContent value="data" className="space-y-6 mt-0">
            <DataExportTable timeRange={timeRange} countryId={selectedCountry} />
            {/* <SpreadsheetImport /> */}
          </TabsContent>

          <TabsContent value="disease-tracking" className="space-y-6 mt-0">
            <DiseaseTracking timeRange={timeRange} countryId={selectedCountry} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
