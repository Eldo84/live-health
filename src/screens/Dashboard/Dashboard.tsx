import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { X } from "lucide-react";
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

export const Dashboard = (): JSX.Element => {
  const [timeRange, setTimeRange] = useState("7d");
  const [activeView, setActiveView] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="w-full min-h-screen bg-[#2a4149] p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="[font-family:'Roboto',Helvetica] font-bold text-[#66dbe1] text-[38px] tracking-[0] leading-[48.1px]">
              Disease Outbreak Dashboard
            </h1>
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-sm mt-2">
              Real-time monitoring and analytics of global disease outbreaks
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-4">
              <div className="flex w-[300px] items-center gap-2 px-3 py-2.5 bg-[#ffffff24] rounded-md overflow-hidden border border-solid border-[#dae0e633] shadow-[0px_1px_2px_#1018280a]">
                <img
                  className="relative w-[18px] h-[18px]"
                  alt="Search"
                  src="/zoom-search.svg"
                />
                <Input
                  type="text"
                  placeholder="Search diseases, regions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-0 text-[#ebebeb] text-sm [font-family:'Roboto',Helvetica] font-medium tracking-[-0.10px] leading-5 placeholder:text-[#ebebeb] focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="flex items-center justify-center w-4 h-4 text-[#ebebeb99] hover:text-[#ebebeb] transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <Tabs value={timeRange} onValueChange={setTimeRange}>
                <TabsList className="bg-[#ffffff14] border border-[#eaebf024]">
                  <TabsTrigger value="24h" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb]">
                    24h
                  </TabsTrigger>
                  <TabsTrigger value="7d" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb]">
                    7d
                  </TabsTrigger>
                  <TabsTrigger value="30d" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb]">
                    30d
                  </TabsTrigger>
                  <TabsTrigger value="1y" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb]">
                    1y
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <NavigationTabsSection />
          </div>
        </div>

        <Tabs value={activeView} onValueChange={setActiveView} className="mt-6">
          <TabsList className="bg-[#ffffff14] border border-[#eaebf024] mb-6">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb]">
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb]">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="predictions" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb]">
              AI Predictions
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb]">
              Outbreak Categories
            </TabsTrigger>
            <TabsTrigger value="health-index" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb]">
              Global Health Index
            </TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-[#4eb7bd] data-[state=active]:text-white text-[#ebebeb]">
              Data Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
            <StatsOverview timeRange={timeRange} searchQuery={searchQuery} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DiseaseOutbreakChart timeRange={timeRange} searchQuery={searchQuery} />
              </div>
              <div>
                <TopDiseases timeRange={timeRange} searchQuery={searchQuery} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlobalHealthMap />
              <RegionalBreakdown />
            </div>

            <CityExtractionStatus />

            <RecentAlerts searchQuery={searchQuery} limit={50} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DiseaseDistributionPie timeRange={timeRange} searchQuery={searchQuery} />
              <TrendAnalysis timeRange={timeRange} />
            </div>

            <AlertTimeline />
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
            <SpreadsheetImport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
