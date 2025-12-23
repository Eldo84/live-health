import { useState } from "react";
import { Search, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { diseaseCategories, countries, getYearRanges, sexOptions, ageGroups } from "@/lib/diseaseSeedData";
import { useHealthStatistics } from "@/lib/useHealthStatistics";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  const [isExporting, setIsExporting] = useState(false);
  
  // Fetch data for export
  const { data: exportData } = useHealthStatistics(filters);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ category: e.target.value });
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ country: e.target.value });
  };

  const handleYearRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "All Years") {
      onFilterChange({ yearRange: undefined, year: undefined });
    } else {
      const parts = value.split("-").map(Number).filter(n => Number.isFinite(n));
      if (parts.length === 1) {
        onFilterChange({ yearRange: value, year: parts[0] });
      } else {
        onFilterChange({ yearRange: value, year: undefined });
      }
    }
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

  const handleExportCSV = () => {
    if (!exportData || exportData.length === 0) return;

    const headers = [
      "Condition", "Category", "Country", "Year", "Age Group", 
      "Prevalence (per 100k)", "Incidence (per 100k)", "Mortality (per 100k)", 
      "DALYs (per 100k)", "YLDs (per 100k)", "Female DALYs", "Male DALYs"
    ];

    const csvContent = [
      headers.join(","),
      ...exportData.map(row => [
        `"${row.condition}"`,
        `"${row.category}"`,
        `"${row.country_code}"`,
        row.year,
        `"${row.age_group}"`,
        row.prevalence_per_100k,
        row.incidence_per_100k,
        row.mortality_rate,
        row.dalys_per_100k,
        row.ylds_per_100k,
        row.female_value,
        row.male_value
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `health_data_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Capture the main dashboard content
      // We assume the main content is in a 'main' tag or we can capture document.body
      // Ideally we should capture the specific container, but document.body works for full page
      const element = document.body;
      
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: "#202b30" // Match theme background
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`health_dashboard_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF Export failed:", error);
    } finally {
      setIsExporting(false);
    }
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportCSV}
              disabled={!exportData || exportData.length === 0}
              className="[font-family:'Roboto',Helvetica] border-[#eaebf024] text-[#ebebeb] hover:bg-[#ffffff1a] gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="[font-family:'Roboto',Helvetica] border-[#eaebf024] text-[#ebebeb] hover:bg-[#ffffff1a] gap-2"
            >
              <FileText className="w-4 h-4" />
              {isExporting ? "Generating..." : "Export PDF"}
            </Button>
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
              value={filters.yearRange || "All Years"} 
              onChange={handleYearRangeChange}
              className="w-[130px] bg-[#2a4149] border-[#66dbe1] text-white hover:bg-[#3a5159] focus:ring-2 focus:ring-[#66dbe1] cursor-pointer" 
              style={{ color: '#ffffff' }}
            >
              <option value="All Years" style={{ backgroundColor: '#2a4149', color: '#ffffff' }}>
                All Years
              </option>
              {getYearRanges().map((range) => (
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