import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { diseaseCategories, countries, yearRanges, sexOptions, ageGroups } from "@/lib/mockData";

interface DashboardHeaderProps {
  onFilterChange: (filters: any) => void;
}

export const DashboardHeader = ({ onFilterChange }: DashboardHeaderProps) => {
  return (
    <header className="bg-card border-b px-6 py-4 sticky top-0 z-50 backdrop-blur-sm bg-card/95">
      <div className="flex flex-col gap-4">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">📊 Global Health Burden Dashboard</h1>
            <p className="text-sm text-muted-foreground">Comprehensive analysis of disease patterns and health outcomes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Export CSV</Button>
            <Button variant="outline" size="sm">Export PDF</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Category:</label>
            <Select defaultValue="All Categories" className="w-[180px]">
              {diseaseCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Country:</label>
            <Select defaultValue="Global" className="w-[140px]">
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Years:</label>
            <Select defaultValue="2020-2024" className="w-[130px]">
              {yearRanges.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Sex:</label>
            <Select defaultValue="All" className="w-[100px]">
              {sexOptions.map((sex) => (
                <option key={sex} value={sex}>
                  {sex}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Age:</label>
            <Select defaultValue="All Ages" className="w-[140px]">
              {ageGroups.map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </Select>
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search diseases or risk factors..."
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </header>
  );
};