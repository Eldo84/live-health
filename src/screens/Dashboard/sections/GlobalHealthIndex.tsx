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
    yearRange: "2020-2024",
    sex: "All",
    ageGroup: "All Ages",
    searchTerm: "",
  });

  const handleFilterChange = (newFilters: any) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="bg-background rounded-lg overflow-hidden">
      <DashboardHeader onFilterChange={handleFilterChange} />

      <main className="px-6 py-8 space-y-8">
        {/* Overview Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Overview</h2>
          <OverviewSection />
        </section>

        {/* Demographics Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Age &amp; Sex Patterns</h2>
          <DemographicsSection />
        </section>

        {/* Time Trends Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Time Trends</h2>
          <TrendsSection />
        </section>

        {/* Risk Factors Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Risk Factor Insights</h2>
          <RiskFactorsSection />
        </section>

        {/* Geographic Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Geographic Patterns</h2>
          <GeographicSection />
        </section>

        {/* DALY Analysis Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-foreground">DALY &amp; Intervention Analysis</h2>
          <DALYSection />
        </section>
      </main>

      <DashboardFooter />
    </div>
  );
};
