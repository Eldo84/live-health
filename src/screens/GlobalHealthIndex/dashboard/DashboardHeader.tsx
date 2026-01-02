import { Activity, Download, RotateCcw, Calendar, Globe, Filter, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { categories } from '@/data/mockData';

interface DashboardHeaderProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onReset: () => void;
  onMenuClick?: () => void;
}

const years = [2020, 2021, 2022, 2023, 2024];
const countries = [
  { value: 'all', label: 'All Countries' },
  { value: 'USA', label: 'United States' },
  { value: 'CN', label: 'China' },
  { value: 'IN', label: 'India' },
  { value: 'BR', label: 'Brazil' },
  { value: 'DE', label: 'Germany' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'JP', label: 'Japan' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'AU', label: 'Australia' },
];

// Create category options from actual data categories
// Filter out any malformed categories and create user-friendly labels
const getCategoryOptions = () => {
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
  ];
  
  // Filter out malformed categories (those with missing closing parens or merge errors)
  const validCategories = categories.filter(cat => {
    if (!cat || typeof cat !== 'string') return false;
    // Filter out categories with unmatched parentheses
    if (cat.includes('(') && !cat.includes(')')) return false;
    // Filter out merge errors
    if (cat.includes('SchistosomiaCardiovascular')) return false;
    return true;
  });
  
  // Create options with the actual category name as both value and label
  validCategories.forEach(cat => {
    categoryOptions.push({
      value: cat,
      label: cat,
    });
  });
  
  return categoryOptions;
};

const categoryOptions = getCategoryOptions();

export const DashboardHeader = ({
  selectedYear,
  onYearChange,
  selectedCountry,
  onCountryChange,
  selectedCategory,
  onCategoryChange,
  onReset,
  onMenuClick,
}: DashboardHeaderProps) => {
  return (
    <header className="glass sticky top-0 z-50 border-b border-border/50 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 glow-primary">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg lg:text-xl font-semibold tracking-tight">
                <span className="hidden sm:inline">Global Burden of Disease</span>
                <span className="sm:hidden">GBD Dashboard</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                Comprehensive health data visualization
              </p>
            </div>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="h-8 sm:h-9 gap-1.5 sm:gap-2 bg-secondary/50 border-border/50 hover:bg-secondary text-xs sm:text-sm"
            >
              <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
            <Button
              size="sm"
              className="h-8 sm:h-9 gap-1.5 sm:gap-2 bg-primary hover:bg-primary/90 text-xs sm:text-sm"
            >
              <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground hidden sm:block" />
            <Select 
              value={selectedYear.toString()} 
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              className="w-[70px] sm:w-[90px] h-8 sm:h-9 bg-secondary/50 border-border/50 text-xs sm:text-sm"
            >
              {years.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </Select>
          </div>

          {/* Country Selector */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground hidden sm:block" />
            <Select 
              value={selectedCountry} 
              onChange={(e) => onCountryChange(e.target.value)}
              className="w-[100px] sm:w-[130px] h-8 sm:h-9 bg-secondary/50 border-border/50 text-xs sm:text-sm"
            >
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Category Selector */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground hidden sm:block" />
            <Select 
              value={selectedCategory} 
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-[110px] sm:w-[150px] h-8 sm:h-9 bg-secondary/50 border-border/50 text-xs sm:text-sm"
            >
              {categoryOptions.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label.length > 25 ? category.label.substring(0, 22) + '...' : category.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Mobile Action Buttons */}
          <div className="flex sm:hidden items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={onReset}
              className="h-8 w-8 bg-secondary/50 border-border/50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              className="h-8 w-8 bg-primary hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
