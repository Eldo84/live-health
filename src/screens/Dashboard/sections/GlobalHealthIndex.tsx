import { useState } from "react";
import { DashboardHeader } from "@/screens/GlobalHealthIndex/dashboard/DasboardHeader";
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
    yearRange: "2015-2019",
    sex: "All",
    ageGroup: "All Ages",
    searchTerm: "",
  });

  const handleFilterChange = (newFilters: any) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="bg-[#2a4149] rounded-lg overflow-hidden">
      <DashboardHeader onFilterChange={handleFilterChange} filters={filters} />

      <main className="px-6 py-8 space-y-8">
        {/* Overview Section */}
        <section>
          <h2 className="[font-family:'Roboto',Helvetica] text-xl font-semibold mb-4 text-[#66dbe1]">Overview</h2>
          <OverviewSection filters={filters} />
        </section>

        {/* Demographics Section */}
        <section>
          <h2 className="[font-family:'Roboto',Helvetica] text-xl font-semibold mb-4 text-[#66dbe1]">Age &amp; Sex Patterns</h2>
          <DemographicsSection filters={filters} />
        </section>

        {/* Time Trends Section */}
        <section>
          <h2 className="[font-family:'Roboto',Helvetica] text-xl font-semibold mb-4 text-[#66dbe1]">Time Trends</h2>
          <TrendsSection filters={filters} />
        </section>

        {/* Risk Factors Section */}
        <section>
          <h2 className="[font-family:'Roboto',Helvetica] text-xl font-semibold mb-4 text-[#66dbe1]">Risk Factor Insights</h2>
          <RiskFactorsSection filters={filters} />
        </section>

        {/* Geographic Section */}
        <section>
          <h2 className="[font-family:'Roboto',Helvetica] text-xl font-semibold mb-4 text-[#66dbe1]">Geographic Patterns</h2>
          <GeographicSection filters={filters} />
        </section>

        {/* DALY Analysis Section */}
        <section>
          <h2 className="[font-family:'Roboto',Helvetica] text-xl font-semibold mb-4 text-[#66dbe1]">DALY &amp; Intervention Analysis</h2>
          <DALYSection filters={filters} />
        </section>
      </main>

      <DashboardFooter />
    </div>
  );
};
