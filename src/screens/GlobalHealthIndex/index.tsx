import { useState, useMemo } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DashboardHeader } from '@/screens/GlobalHealthIndex/dashboard/DashboardHeader';
import { DiseaseSidebar } from '@/screens/GlobalHealthIndex/dashboard/DiseaseSideBar';
import { MetricCard } from '@/screens/GlobalHealthIndex/dashboard/MetricCard';
import { TrendChart } from '@/screens/GlobalHealthIndex/dashboard/TrendChart';
import { CountryComparisonChart } from '@/screens/GlobalHealthIndex/dashboard/CountryComparisonChart';
import { WorldMap } from '@/screens/GlobalHealthIndex/dashboard/WorldMap';
import { GenderDistribution } from '@/screens/GlobalHealthIndex/dashboard/GenderDistribution';
import { DataTable } from '@/screens/GlobalHealthIndex/dashboard/DataTable';
import { PrevalenceHistogram } from '@/screens/GlobalHealthIndex/dashboard/PrevalanceHistogram';
import { BurdenBubbleChart } from '@/screens/GlobalHealthIndex/dashboard/BurdenBubblechart';
import { CategoryStackedBar } from '@/screens/GlobalHealthIndex/dashboard/CategoryStackedBar';
import { RiskFactorRadar } from '@/screens/GlobalHealthIndex/dashboard/RiskFactorRader';
import { TopConditionsChart } from '@/screens/GlobalHealthIndex/dashboard/TopConditionsChart';
import { GenderComparisonChart } from '@/screens/GlobalHealthIndex/dashboard/GenderComparisonChart';
import { YLDsDALYsComparison } from '@/screens/GlobalHealthIndex/dashboard/YLDsDALYsComparison';
import {
  diseases,
  Disease,
  diseaseData,
  generateCountryData,
  generateTimeSeriesData,
  getLatestDiseaseData,
  getLatestDiseaseDataByCountry,
} from '@/data/mockData';

const Index = () => {
  const [selectedYear, setSelectedYear] = useState(2023);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(diseases[0]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleReset = () => {
    setSelectedYear(2023);
    setSelectedCountry('all');
    setSelectedCategory('all');
    setSelectedDisease(diseases[0]);
  };

  // Check if selected disease matches the category filter
  const diseaseMatchesCategory = useMemo(() => {
    if (!selectedDisease || !selectedCategory || selectedCategory === 'all') return true;
    
    const categoryLower = selectedCategory.toLowerCase().trim();
    const diseaseCategoryLower = selectedDisease.category?.toLowerCase().trim() || '';
    
    if (!diseaseCategoryLower) return true; // If no category, don't filter out
    
    // First check for exact match (since we're now using exact category names from data)
    if (diseaseCategoryLower === categoryLower) {
      return true;
    }
    
    // Then check if one contains the other (for partial matches)
    if (diseaseCategoryLower.includes(categoryLower) || categoryLower.includes(diseaseCategoryLower)) {
      return true;
    }
    
    // Finally, check if any word from the filter matches
    const filterWords = categoryLower.split(/\s+/).filter(w => w.length > 0);
    const matches = filterWords.some(word => diseaseCategoryLower.includes(word));
    
    // Debug logging
    if (process.env.NODE_ENV === 'development' && !matches) {
      console.log('Category mismatch:', {
        selectedCategory,
        diseaseCategory: selectedDisease.category,
        categoryLower,
        diseaseCategoryLower,
        filterWords,
      });
    }
    
    return matches;
  }, [selectedDisease, selectedCategory]);

  const currentDiseaseData = useMemo(() => {
    if (!selectedDisease?.id) return undefined;
    
    const countryCode = selectedCountry !== 'all' ? selectedCountry : undefined;
    const countryUpper = countryCode ? countryCode.toUpperCase() : null;
    
    // First try to get data for the selected year
    const yearData = diseaseData.filter(d => 
      d.baseId === selectedDisease.id && 
      d.year === selectedYear &&
      (!countryUpper || d.location.toUpperCase() === countryUpper || 
       (countryUpper === 'US' && d.location.toUpperCase() === 'USA'))
    );
    
    if (yearData.length > 0) {
      return yearData.sort((a, b) => b.year - a.year)[0];
    }
    
    // Fallback to latest data for the country
    return getLatestDiseaseDataByCountry(selectedDisease.id, countryCode);
  }, [selectedDisease, selectedCountry, selectedYear]);

  const countryData = useMemo(() => {
    if (!selectedDisease?.id) return [];
    const data = generateCountryData(selectedDisease.id, selectedYear, selectedCountry !== 'all' ? selectedCountry : undefined);
    // If no data for selected year, try to get data for any available year
    if (data.length === 0 && selectedYear) {
      // Try previous years
      for (let y = selectedYear - 1; y >= 2020; y--) {
        const yearData = generateCountryData(selectedDisease.id, y, selectedCountry !== 'all' ? selectedCountry : undefined);
        if (yearData.length > 0) return yearData;
      }
    }
    return data;
  }, [selectedDisease, selectedYear, selectedCountry]);

  const timeSeriesData = useMemo(() => {
    if (!selectedDisease?.id) return [];
    const data = generateTimeSeriesData(selectedDisease.id, selectedCountry !== 'all' ? selectedCountry : undefined);
    
    // Filter by selected year - show data up to and including the selected year
    const filteredByYear = data.filter(d => d.year <= selectedYear);
    
    // If no time series, create one from current disease data
    if (filteredByYear.length === 0 && currentDiseaseData) {
      return [{
        year: currentDiseaseData.year,
        prevalence: currentDiseaseData.prevalence,
        incidence: currentDiseaseData.incidence,
        mortality: currentDiseaseData.mortalityRate,
        dalys: currentDiseaseData.dalys,
      }];
    }
    return filteredByYear;
  }, [selectedDisease, currentDiseaseData, selectedCountry, selectedYear]);

  const metrics = useMemo(() => {
    // If no time series but we have current disease data, use that
    if (!timeSeriesData.length && currentDiseaseData) {
      return {
        prevalence: { value: currentDiseaseData.prevalence, trend: 0, sparkline: [currentDiseaseData.prevalence] },
        incidence: { value: currentDiseaseData.incidence, trend: 0, sparkline: [currentDiseaseData.incidence] },
        mortality: { value: currentDiseaseData.mortalityRate, trend: 0, sparkline: [currentDiseaseData.mortalityRate] },
        dalys: { value: currentDiseaseData.dalys, trend: 0, sparkline: [currentDiseaseData.dalys] },
      };
    }
    
    if (!timeSeriesData.length) {
      return {
        prevalence: { value: 0, trend: 0, sparkline: [] },
        incidence: { value: 0, trend: 0, sparkline: [] },
        mortality: { value: 0, trend: 0, sparkline: [] },
        dalys: { value: 0, trend: 0, sparkline: [] },
      };
    }

    // Find data for the selected year, or use the closest available year
    const yearData = timeSeriesData.find(d => d.year === selectedYear);
    const latestData = yearData || timeSeriesData[timeSeriesData.length - 1];
    
    // Find previous year data for trend calculation
    const previousYear = selectedYear - 1;
    const previousYearData = timeSeriesData.find(d => d.year === previousYear);
    const previousData = previousYearData || (timeSeriesData.length > 1 ? timeSeriesData[timeSeriesData.length - 2] : latestData);

    const calcTrend = (current: number, previous: number) => {
      if (!previous || previous === 0) return 0;
      return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    };

    // Sparkline should show all data up to selected year
    const sparklineData = timeSeriesData.filter(d => d.year <= selectedYear);

    return {
      prevalence: { value: latestData.prevalence, trend: calcTrend(latestData.prevalence, previousData.prevalence), sparkline: sparklineData.map((d) => d.prevalence) },
      incidence: { value: latestData.incidence, trend: calcTrend(latestData.incidence, previousData.incidence), sparkline: sparklineData.map((d) => d.incidence) },
      mortality: { value: latestData.mortality, trend: calcTrend(latestData.mortality, previousData.mortality), sparkline: sparklineData.map((d) => d.mortality) },
      dalys: { value: latestData.dalys, trend: calcTrend(latestData.dalys, previousData.dalys), sparkline: sparklineData.map((d) => d.dalys) },
    };
  }, [timeSeriesData, currentDiseaseData, selectedYear]);

  const genderData = useMemo(() => {
    if (!currentDiseaseData) return { male: 50, female: 50 };
    const total = currentDiseaseData.male + currentDiseaseData.female;
    if (total === 0) return { male: 50, female: 50 };
    return {
      male: Math.round((currentDiseaseData.male / total) * 100),
      female: Math.round((currentDiseaseData.female / total) * 100),
    };
  }, [currentDiseaseData]);

  const handleDiseaseSelect = (disease: Disease) => {
    setSelectedDisease(disease);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background bg-grid-pattern bg-grid">
      <DashboardHeader
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onReset={handleReset}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-6 min-h-0">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <DiseaseSidebar
            diseases={diseases}
            selectedDisease={selectedDisease}
            onSelectDisease={setSelectedDisease}
            selectedCategory={selectedCategory}
          />
        </div>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[300px] sm:w-[340px]">
            <DiseaseSidebar
              diseases={diseases}
              selectedDisease={selectedDisease}
              onSelectDisease={handleDiseaseSelect}
              selectedCategory={selectedCategory}
              isMobile
            />
          </SheetContent>
        </Sheet>

        <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-6">
          <div className="max-w-[1800px] mx-auto space-y-4 sm:space-y-6">
            {selectedDisease && (
              <div className="animate-fade-in">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight">{selectedDisease.name}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{selectedDisease.category}</p>
                {!diseaseMatchesCategory && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
                    ⚠️ This disease doesn't match the selected category filter. Showing data anyway.
                  </p>
                )}
              </div>
            )}

            {/* No Data Message */}
            {selectedDisease && selectedCountry !== 'all' && !currentDiseaseData && (
              <div className="glass rounded-lg p-6 text-center animate-fade-in">
                <p className="text-sm sm:text-base text-muted-foreground">
                  No data available for <strong>{selectedCountry}</strong> for this condition.
                  {selectedCountry === 'USA' && ' Please ensure usa.json is properly loaded.'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Try selecting "All Countries" or choose a different country.
                </p>
              </div>
            )}

            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              <MetricCard title="Prevalence" value={metrics.prevalence.value} unit="per 100k" trend={metrics.prevalence.trend} trendLabel="vs last year" variant="default" sparkline={metrics.prevalence.sparkline} delay={0} />
              <MetricCard title="Incidence" value={metrics.incidence.value} unit="new/year" trend={metrics.incidence.trend} trendLabel="vs last year" variant="success" sparkline={metrics.incidence.sparkline} delay={50} />
              <MetricCard title="Mortality" value={`${metrics.mortality.value}%`} trend={metrics.mortality.trend} trendLabel="vs last year" variant="danger" sparkline={metrics.mortality.sparkline} delay={100} />
              <MetricCard title="DALYs" value={metrics.dalys.value} unit="years" trend={metrics.dalys.trend} trendLabel="vs last year" variant="warning" sparkline={metrics.dalys.sparkline} delay={150} />
            </div>

            {/* Trend & Country Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <TrendChart data={timeSeriesData} title="Time-Series Trend (2020-2023)" />
              <CountryComparisonChart data={countryData} title="Country Comparison" />
            </div>

            {/* Histogram, Bubble & Radar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <PrevalenceHistogram title="Distribution Histogram" selectedCategory={selectedCategory} />
              <BurdenBubbleChart title="Disease Burden Analysis" selectedCategory={selectedCategory} />
              <RiskFactorRadar title="Top Risk Factors" diseaseId={selectedDisease?.id} />
            </div>

            {/* Top Conditions & Category Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <TopConditionsChart title="Top 10 Conditions by Burden" selectedCategory={selectedCategory} />
              <CategoryStackedBar title="Category Burden Comparison" />
            </div>

            {/* Gender Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <GenderComparisonChart title="Gender Distribution by Condition" selectedCategory={selectedCategory} />
              <YLDsDALYsComparison title="YLDs vs YLLs (Disability vs Life Lost)" selectedCategory={selectedCategory} />
              <GenderDistribution title="Selected Disease Gender Split" malePercentage={genderData.male} femalePercentage={genderData.female} />
            </div>

            {/* World Map & Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <WorldMap title="Global Disease Distribution" selectedCountry={selectedCountry !== 'all' ? selectedCountry : undefined} onCountryClick={(code) => setSelectedCountry(code)} />
              </div>
              <div className="glass rounded-lg p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-medium mb-3">Data Source</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{currentDiseaseData?.dataSource || 'CDC, WHO, IHME'}</p>
                <h3 className="text-xs sm:text-sm font-medium mt-4 mb-2">Risk Factors</h3>
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  {currentDiseaseData?.riskFactors.slice(0, 6).map((rf, i) => (
                    <span key={i} className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-secondary rounded-md">{rf}</span>
                  ))}
                </div>
              </div>
            </div>

            <DataTable data={countryData} title="Detailed Country Data" />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
export { Index as GlobalHealthIndex };

