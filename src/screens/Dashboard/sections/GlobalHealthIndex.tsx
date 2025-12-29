import { useState } from "react";
import { BarChart3, Users, TrendingUp, MapPin, Activity, Network } from "lucide-react";
import { DashboardHeader } from "@/screens/GlobalHealthIndex/dashboard/DasboardHeader";
import { KPISummary } from "@/screens/GlobalHealthIndex/dashboard/KPISummary";
import { OverviewSection } from "@/screens/GlobalHealthIndex/dashboard/OverviewSection";
import { DemographicsSection } from "@/screens/GlobalHealthIndex/dashboard/DemographicsSection";
import { TrendsSection } from "@/screens/GlobalHealthIndex/dashboard/TrendsSection";
import { RiskFactorsSection } from "@/screens/GlobalHealthIndex/dashboard/RiskFactorsSection";
import { GeographicSection } from "@/screens/GlobalHealthIndex/dashboard/GeographicSection";
import { DALYSection } from "@/screens/GlobalHealthIndex/dashboard/DALYSection";
import { DashboardFooter } from "@/screens/GlobalHealthIndex/dashboard/DashboardFooter";

export const GlobalHealthIndex = (): JSX.Element => {
  const [filters, setFilters] = useState({
    category: "All Categories",
    country: "Global",
    yearRange: undefined, // Show all years by default
    year: undefined,
    sex: "All",
    ageGroup: "All Ages",
    searchTerm: "",
  });

  const handleFilterChange = (newFilters: any) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const sections = [
    { id: "overview", title: "Overview", icon: BarChart3, component: OverviewSection },
    { id: "demographics", title: "Age & Sex Patterns", icon: Users, component: DemographicsSection },
    { id: "trends", title: "Time Trends", icon: TrendingUp, component: TrendsSection },
    // { id: "risk", title: "Risk Factor Insights", icon: Network, component: RiskFactorsSection },
    { id: "geographic", title: "Geographic Patterns", icon: MapPin, component: GeographicSection },
    { id: "daly", title: "DALY & Intervention Analysis", icon: Activity, component: DALYSection }
  ];

  return (
    <div className="bg-[#2a4149] rounded-lg overflow-hidden custom-scrollbar">
      <DashboardHeader onFilterChange={handleFilterChange} filters={filters} />

      <main className="px-6 py-8 space-y-8">
        {/* KPI Summary */}
        <section className="animate-fade-in-up">
          <KPISummary filters={filters} />
        </section>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#66dbe1]/30 to-transparent"></div>

        {/* Dynamic Sections */}
        {sections.map((section, index) => {
          const Icon = section.icon;
          const Component = section.component;
          
          return (
            <section 
              key={section.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#66dbe1]/10 rounded-lg">
                  <Icon className="h-5 w-5 text-[#66dbe1]" />
                </div>
                <h2 className="[font-family:'Roboto',Helvetica] text-xl font-semibold text-[#66dbe1]">
                  {section.title}
                </h2>
              </div>
              <Component filters={filters} />
              
              {/* Section Divider (except for last section) */}
              {index < sections.length - 1 && (
                <div className="mt-8 h-px bg-gradient-to-r from-transparent via-[#eaebf0]/10 to-transparent"></div>
              )}
            </section>
          );
        })}
      </main>

      <DashboardFooter />
    </div>
  );
};
