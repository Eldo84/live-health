import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { diseaseCategories, countries, yearRanges, sexOptions, ageGroups } from "@/lib/mockData";

interface DashboardHeaderProps {
  onFilterChange: (filters: any) => void;
  filters?: {
    category?: string;
    country?: string;
    yearRange?: string;
    sex?: string;
    ageGroup?: string;
    searchTerm?: string;
  };
}

export const DashboardHeader = ({ onFilterChange, filters = {} }: DashboardHeaderProps) => {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || "");

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ category: e.target.value });
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ country: e.target.value });
  };

  const handleYearRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ yearRange: e.target.value });
  };

  const handleSexChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ sex: e.target.value });
  };

  const handleAgeGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ageGroup: e.target.value });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onFilterChange({ searchTerm: value });
  };

  return (
    <header className="bg-[#ffffff14] border-b border-[#eaebf024] px-6 py-4 sticky top-0 z-50 backdrop-blur-sm">
      <div className="flex flex-col gap-4">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="[font-family:'Roboto',Helvetica] text-2xl font-bold text-[#66dbe1]">📊 Global Health Burden Dashboard</h1>
            <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">Comprehensive analysis of disease patterns and health outcomes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="[font-family:'Roboto',Helvetica] border-[#eaebf024] text-[#ebebeb] hover:bg-[#ffffff1a]">Export CSV</Button>
            <Button variant="outline" size="sm" className="[font-family:'Roboto',Helvetica] border-[#eaebf024] text-[#ebebeb] hover:bg-[#ffffff1a]">Export PDF</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="[font-family:'Roboto',Helvetica] text-sm font-medium text-[#ebebeb]">Category:</label>
            <Select 
              value={filters.category || "All Categories"} 
              onChange={handleCategoryChange}
              className="w-[180px] bg-[#2a4149] border-[#66dbe1] text-white hover:bg-[#3a5159] focus:ring-2 focus:ring-[#66dbe1] cursor-pointer" 
              style={{ color: '#ffffff' }}
            >
              {diseaseCategories.map((category) => (
                <option key={category} value={category} style={{ backgroundColor: '#2a4149', color: '#ffffff' }}>
                  {category}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="[font-family:'Roboto',Helvetica] text-sm font-medium text-[#ebebeb]">Country:</label>
            <Select 
              value={filters.country || "Global"} 
              onChange={handleCountryChange}
              className="w-[140px] bg-[#2a4149] border-[#66dbe1] text-white hover:bg-[#3a5159] focus:ring-2 focus:ring-[#66dbe1] cursor-pointer" 
              style={{ color: '#ffffff' }}
            >
              {countries.map((country) => (
                <option key={country} value={country} style={{ backgroundColor: '#2a4149', color: '#ffffff' }}>
                  {country}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="[font-family:'Roboto',Helvetica] text-sm font-medium text-[#ebebeb]">Years:</label>
            <Select 
              value={filters.yearRange || "2015-2019"} 
              onChange={handleYearRangeChange}
              className="w-[130px] bg-[#2a4149] border-[#66dbe1] text-white hover:bg-[#3a5159] focus:ring-2 focus:ring-[#66dbe1] cursor-pointer" 
              style={{ color: '#ffffff' }}
            >
              {yearRanges.map((range) => (
                <option key={range} value={range} style={{ backgroundColor: '#2a4149', color: '#ffffff' }}>
                  {range}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="[font-family:'Roboto',Helvetica] text-sm font-medium text-[#ebebeb]">Sex:</label>
            <Select 
              value={filters.sex || "All"} 
              onChange={handleSexChange}
              className="w-[100px] bg-[#2a4149] border-[#66dbe1] text-white hover:bg-[#3a5159] focus:ring-2 focus:ring-[#66dbe1] cursor-pointer" 
              style={{ color: '#ffffff' }}
            >
              {sexOptions.map((sex) => (
                <option key={sex} value={sex} style={{ backgroundColor: '#2a4149', color: '#ffffff' }}>
                  {sex}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="[font-family:'Roboto',Helvetica] text-sm font-medium text-[#ebebeb]">Age:</label>
            <Select 
              value={filters.ageGroup || "All Ages"} 
              onChange={handleAgeGroupChange}
              className="w-[140px] bg-[#2a4149] border-[#66dbe1] text-white hover:bg-[#3a5159] focus:ring-2 focus:ring-[#66dbe1] cursor-pointer" 
              style={{ color: '#ffffff' }}
            >
              {ageGroups.map((age) => (
                <option key={age} value={age} style={{ backgroundColor: '#2a4149', color: '#ffffff' }}>
                  {age}
                </option>
              ))}
            </Select>
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#ebebeb99]" />
            <Input
              placeholder="Search diseases or risk factors..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 bg-[#ffffff14] border-[#eaebf024] text-[#ebebeb] placeholder:text-[#ebebeb99]"
            />
          </div>
        </div>
      </div>
    </header>
  );
};