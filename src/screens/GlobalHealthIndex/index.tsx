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
  normalizeCountryCode,
} from '@/data/mockData';
import { deduplicateAndAggregate } from './utils/filterHelpers';

const Index = () => {
  const [selectedYear, setSelectedYear] = useState(2023);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleReset = () => {
    setSelectedYear(2023);
    setSelectedCountry('all');
    setSelectedCategory('all');
    setSelectedDisease(null);
    setSidebarOpen(false);
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
    
    if (countryCode) {
      // Normalize the country code (e.g., CN -> CHN, US -> USA)
      const normalizedCode = normalizeCountryCode(countryCode);
      
      // First try to get data for the selected year
      const yearData = diseaseData.filter(d => 
        d.baseId === selectedDisease.id && 
        d.year === selectedYear &&
        d.location.toUpperCase() === normalizedCode.toUpperCase()
      );
      
      if (yearData.length > 0) {
        return yearData.sort((a, b) => b.year - a.year)[0];
      }
      
      // Fallback to latest data for the country
      return getLatestDiseaseDataByCountry(selectedDisease.id, countryCode);
    }
    
    // Aggregate data from all countries for the selected year
    const allCountriesData = diseaseData.filter(d => 
      d.baseId === selectedDisease.id && 
      d.year === selectedYear
    );
    
    if (allCountriesData.length === 0) {
      // Fallback to latest data from any country
      return getLatestDiseaseData(selectedDisease.id);
    }
    
    // Aggregate correctly: average rates, sum counts
    const first = allCountriesData[0];
    type AggregatedType = typeof first & { count: number };
    const aggregated = allCountriesData.slice(1).reduce((acc: AggregatedType, curr) => {
      // Sum rates (will average later)
      acc.prevalence += curr.prevalence;
      acc.incidence += curr.incidence;
      acc.mortalityRate += curr.mortalityRate;
      
      // Sum counts (these are correct to sum)
      acc.dalys += curr.dalys;
      acc.ylds += curr.ylds;
      acc.female += curr.female;
      acc.male += curr.male;
      acc.allSexes += curr.allSexes;
      
      acc.count += 1;
      return acc;
    }, {
      ...first,
      count: 1,
    } as AggregatedType);
    
    // Average rate-based metrics (prevalence, incidence, mortalityRate)
    const averaged = {
      ...aggregated,
      prevalence: aggregated.count > 0 ? aggregated.prevalence / aggregated.count : 0,
      incidence: aggregated.count > 0 ? aggregated.incidence / aggregated.count : 0,
      mortalityRate: aggregated.count > 0 ? aggregated.mortalityRate / aggregated.count : 0,
    };
    
    // Remove count from result
    const { count, ...result } = averaged;
    return result;
  }, [selectedDisease, selectedCountry, selectedYear]);

  // Pre-filter data by country and year for performance (memoized to avoid repeated filtering)
  const preFilteredData = useMemo(() => {
    let filtered = diseaseData;
    
    // Filter by country if not 'all'
    if (selectedCountry !== 'all') {
      const normalizedCode = normalizeCountryCode(selectedCountry);
      filtered = filtered.filter(d => d.location.toUpperCase() === normalizedCode.toUpperCase());
    }
    
    // Filter by year
    filtered = filtered.filter(d => d.year === selectedYear);
    
    // If no data for selected year, fall back to latest available year
    if (filtered.length === 0 && selectedCountry !== 'all') {
      // Only do this expensive operation if we have country filter
      const countryFiltered = diseaseData.filter(d => {
        const normalizedCode = normalizeCountryCode(selectedCountry);
        return d.location.toUpperCase() === normalizedCode.toUpperCase();
      });
      if (countryFiltered.length > 0) {
        const availableYears = Array.from(new Set(countryFiltered.map(d => d.year))).filter(y => y > 0).sort((a, b) => b - a);
        if (availableYears.length > 0) {
          const latestYear = availableYears[0];
          filtered = countryFiltered.filter(d => d.year === latestYear);
        }
      }
    }
    
    return filtered;
  }, [selectedCountry, selectedYear]);

  // Aggregate all diseases data when "All Categories" is selected
  const aggregateAllDiseasesData = useMemo(() => {
    if (selectedCategory !== 'all') return null;
    
    // Use pre-filtered data
    const filtered = preFilteredData;
    
    if (filtered.length === 0) return null;
    
    // Deduplicate and aggregate
    const deduplicated = deduplicateAndAggregate(filtered);
    
    if (deduplicated.length === 0) return null;
    
    // Aggregate correctly: average rates, sum counts
    const first = deduplicated[0];
    type AggregatedType = typeof first & { count: number };
    const aggregated = deduplicated.slice(1).reduce((acc: AggregatedType, curr) => {
      // Sum rates (will average later)
      acc.prevalence += curr.prevalence;
      acc.incidence += curr.incidence;
      acc.mortalityRate += curr.mortalityRate;
      
      // Sum counts (these are correct to sum)
      acc.dalys += curr.dalys;
      acc.ylds += curr.ylds;
      acc.female += curr.female;
      acc.male += curr.male;
      acc.allSexes += curr.allSexes;
      
      acc.count += 1;
      return acc;
    }, {
      ...first,
      count: 1,
    } as AggregatedType);
    
    // Average rate-based metrics
    const averaged = {
      ...aggregated,
      prevalence: aggregated.count > 0 ? aggregated.prevalence / aggregated.count : 0,
      incidence: aggregated.count > 0 ? aggregated.incidence / aggregated.count : 0,
      mortalityRate: aggregated.count > 0 ? aggregated.mortalityRate / aggregated.count : 0,
    };
    
    const { count, ...result } = averaged;
    return result;
  }, [selectedCategory, preFilteredData]);

  // Pre-filter time series data by country for performance
  const preFilteredTimeSeriesData = useMemo(() => {
    let filtered = diseaseData;
    
    // Filter by country if not 'all'
    if (selectedCountry !== 'all') {
      const normalizedCode = normalizeCountryCode(selectedCountry);
      filtered = filtered.filter(d => d.location.toUpperCase() === normalizedCode.toUpperCase());
    }
    
    // Filter by year (all years up to selected year)
    filtered = filtered.filter(d => d.year <= selectedYear && d.year > 0);
    
    return filtered;
  }, [selectedCountry, selectedYear]);

  // Aggregate time series for all diseases when "All Categories" is selected
  const aggregateTimeSeriesData = useMemo(() => {
    if (selectedCategory !== 'all') return [];
    
    // Use pre-filtered data
    const filtered = preFilteredTimeSeriesData;
    
    if (filtered.length === 0) return [];
    
    // Deduplicate
    const deduplicated = deduplicateAndAggregate(filtered);
    
    // Group by year and aggregate correctly: average rates, sum counts
    const yearMap = new Map<number, { prevalence: number; incidence: number; mortality: number; dalys: number; count: number }>();
    
    deduplicated.forEach(d => {
      const existing = yearMap.get(d.year) || { prevalence: 0, incidence: 0, mortality: 0, dalys: 0, count: 0 };
      yearMap.set(d.year, {
        prevalence: existing.prevalence + d.prevalence, // Sum for averaging
        incidence: existing.incidence + d.incidence, // Sum for averaging
        mortality: existing.mortality + d.mortalityRate, // Sum for averaging
        dalys: existing.dalys + d.dalys, // Sum (correct)
        count: existing.count + 1,
      });
    });
    
    // Convert to array: average rates, keep summed counts
    return Array.from(yearMap.entries())
      .map(([year, data]) => ({
        year,
        prevalence: data.count > 0 ? data.prevalence / data.count : 0, // Average
        incidence: data.count > 0 ? data.incidence / data.count : 0, // Average
        mortality: data.count > 0 ? data.mortality / data.count : 0, // Average
        dalys: data.dalys, // Sum (correct)
      }))
      .sort((a, b) => a.year - b.year);
  }, [selectedCategory, preFilteredTimeSeriesData]);

  const countryData = useMemo(() => {
    // When "All Categories" is selected or no disease is selected, generate aggregate country data
    if (selectedCategory === 'all' || !selectedDisease?.id) {
      // Filter by year and country
      let filtered = diseaseData.filter(d => d.year === selectedYear);
      
      if (selectedCountry !== 'all') {
        const normalizedCode = normalizeCountryCode(selectedCountry);
        filtered = filtered.filter(d => d.location.toUpperCase() === normalizedCode.toUpperCase());
      }
      
      // Deduplicate by baseId first
      const deduplicated = deduplicateAndAggregate(filtered);
      
      // Group by country and aggregate
      const countryMap = new Map<string, {
        country: string;
        countryCode: string;
        region: string;
        prevalence: number;
        incidence: number;
        mortality: number;
        dalys: number;
        count: number;
      }>();
      
      deduplicated.forEach(d => {
        const countryKey = d.location.toUpperCase();
        const existing = countryMap.get(countryKey) || {
          country: d.location,
          countryCode: d.location,
          region: 'Unknown', // You might want to add region mapping
          prevalence: 0,
          incidence: 0,
          mortality: 0,
          dalys: 0,
          count: 0,
        };
        
        countryMap.set(countryKey, {
          ...existing,
          prevalence: existing.prevalence + d.prevalence, // Sum for averaging
          incidence: existing.incidence + d.incidence, // Sum for averaging
          mortality: existing.mortality + d.mortalityRate, // Sum for averaging
          dalys: existing.dalys + d.dalys, // Sum (correct)
          count: existing.count + 1,
        });
      });
      
      // Convert to array and average rates
      return Array.from(countryMap.values()).map(country => ({
        country: country.country,
        countryCode: country.countryCode,
        region: country.region,
        prevalence: country.count > 0 ? country.prevalence / country.count : 0, // Average
        incidence: country.count > 0 ? country.incidence / country.count : 0, // Average
        mortality: country.count > 0 ? country.mortality / country.count : 0, // Average
        dalys: country.dalys, // Sum (correct)
        year: selectedYear,
      }));
    }
    
    // For specific disease, use existing logic
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
  }, [selectedDisease, selectedYear, selectedCountry, selectedCategory, preFilteredData]);

  const timeSeriesData = useMemo(() => {
    // When "All Categories" is selected, use aggregate time series across all diseases
    if (selectedCategory === 'all') {
      return aggregateTimeSeriesData;
    }
    
    if (!selectedDisease?.id) return [];
    
    if (selectedCountry === 'all') {
      // Aggregate time series data from all countries
      const allData = diseaseData.filter(d => 
        d.baseId === selectedDisease.id && 
        d.year <= selectedYear
      );
      
      // Group by year and aggregate correctly: average rates, sum counts
      const yearMap = new Map<number, { prevalence: number; incidence: number; mortality: number; dalys: number; count: number }>();
      
      allData.forEach(d => {
        const existing = yearMap.get(d.year) || { prevalence: 0, incidence: 0, mortality: 0, dalys: 0, count: 0 };
        yearMap.set(d.year, {
          prevalence: existing.prevalence + d.prevalence, // Sum for averaging
          incidence: existing.incidence + d.incidence, // Sum for averaging
          mortality: existing.mortality + d.mortalityRate, // Sum for averaging
          dalys: existing.dalys + d.dalys, // Sum (correct)
          count: existing.count + 1,
        });
      });
      
      // Convert to array: average rates, keep summed counts
      const aggregated = Array.from(yearMap.entries())
        .map(([year, data]) => ({
          year,
          prevalence: data.count > 0 ? data.prevalence / data.count : 0, // Average
          incidence: data.count > 0 ? data.incidence / data.count : 0, // Average
          mortality: data.count > 0 ? data.mortality / data.count : 0, // Average
          dalys: data.dalys, // Sum (correct)
        }))
        .sort((a, b) => a.year - b.year);
      
      return aggregated;
    }
    
    // Single country - use existing logic
    const data = generateTimeSeriesData(selectedDisease.id, selectedCountry);
    
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
  }, [selectedDisease, currentDiseaseData, selectedCountry, selectedYear, selectedCategory, aggregateTimeSeriesData]);

  // Helper function to round values appropriately
  const roundValue = (value: number, decimals: number = 1): number => {
    if (value === 0) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  };

  const metrics = useMemo(() => {
    // When "All Categories" is selected, use aggregate data
    if (selectedCategory === 'all') {
      // Use aggregate time series if available
      if (aggregateTimeSeriesData.length > 0) {
        const yearData = aggregateTimeSeriesData.find(d => d.year === selectedYear);
        const latestData = yearData || aggregateTimeSeriesData[aggregateTimeSeriesData.length - 1];
        
        const previousYear = selectedYear - 1;
        const previousYearData = aggregateTimeSeriesData.find(d => d.year === previousYear);
        const previousData = previousYearData || (aggregateTimeSeriesData.length > 1 ? aggregateTimeSeriesData[aggregateTimeSeriesData.length - 2] : latestData);

        const calcTrend = (current: number, previous: number) => {
          if (!previous || previous === 0) return 0;
          return Math.round(((current - previous) / previous) * 100 * 10) / 10;
        };

        const sparklineData = aggregateTimeSeriesData.filter(d => d.year <= selectedYear);

        return {
          prevalence: { value: roundValue(latestData.prevalence, 1), trend: calcTrend(latestData.prevalence, previousData.prevalence), sparkline: sparklineData.map((d) => d.prevalence) },
          incidence: { value: roundValue(latestData.incidence, 1), trend: calcTrend(latestData.incidence, previousData.incidence), sparkline: sparklineData.map((d) => d.incidence) },
          mortality: { value: roundValue(latestData.mortality, 4), trend: calcTrend(latestData.mortality, previousData.mortality), sparkline: sparklineData.map((d) => d.mortality) },
          dalys: { value: roundValue(latestData.dalys, 1), trend: calcTrend(latestData.dalys, previousData.dalys), sparkline: sparklineData.map((d) => d.dalys) },
        };
      }
      
      // Fallback to aggregate snapshot data
      if (aggregateAllDiseasesData) {
        return {
          prevalence: { value: roundValue(aggregateAllDiseasesData.prevalence, 1), trend: 0, sparkline: [aggregateAllDiseasesData.prevalence] },
          incidence: { value: roundValue(aggregateAllDiseasesData.incidence, 1), trend: 0, sparkline: [aggregateAllDiseasesData.incidence] },
          mortality: { value: roundValue(aggregateAllDiseasesData.mortalityRate, 4), trend: 0, sparkline: [aggregateAllDiseasesData.mortalityRate] },
          dalys: { value: roundValue(aggregateAllDiseasesData.dalys, 1), trend: 0, sparkline: [aggregateAllDiseasesData.dalys] },
        };
      }
    }
    
    // For specific category, use disease-specific data
    // If no time series but we have current disease data, use that
    if (!timeSeriesData.length && currentDiseaseData) {
      return {
        prevalence: { value: roundValue(currentDiseaseData.prevalence, 1), trend: 0, sparkline: [currentDiseaseData.prevalence] },
        incidence: { value: roundValue(currentDiseaseData.incidence, 1), trend: 0, sparkline: [currentDiseaseData.incidence] },
        mortality: { value: roundValue(currentDiseaseData.mortalityRate, 4), trend: 0, sparkline: [currentDiseaseData.mortalityRate] },
        dalys: { value: roundValue(currentDiseaseData.dalys, 1), trend: 0, sparkline: [currentDiseaseData.dalys] },
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
      prevalence: { value: roundValue(latestData.prevalence, 1), trend: calcTrend(latestData.prevalence, previousData.prevalence), sparkline: sparklineData.map((d) => d.prevalence) },
      incidence: { value: roundValue(latestData.incidence, 1), trend: calcTrend(latestData.incidence, previousData.incidence), sparkline: sparklineData.map((d) => d.incidence) },
      mortality: { value: roundValue(latestData.mortality, 4), trend: calcTrend(latestData.mortality, previousData.mortality), sparkline: sparklineData.map((d) => d.mortality) },
      dalys: { value: roundValue(latestData.dalys, 1), trend: calcTrend(latestData.dalys, previousData.dalys), sparkline: sparklineData.map((d) => d.dalys) },
    };
  }, [timeSeriesData, currentDiseaseData, selectedYear, selectedCategory, aggregateAllDiseasesData, aggregateTimeSeriesData]);

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
            onSelectDisease={handleDiseaseSelect}
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
                  {(selectedCountry === 'USA' || selectedCountry === 'CHN') && ' Please ensure the data file is properly loaded.'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Try selecting "All Countries" or choose a different country.
                </p>
              </div>
            )}

            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              <MetricCard title="Prevalence" value={metrics.prevalence.value} unit={selectedCountry === 'all' ? "avg per 100k" : "per 100k"} trend={metrics.prevalence.trend} trendLabel="vs last year" variant="default" sparkline={metrics.prevalence.sparkline} delay={0} />
              <MetricCard title="Incidence" value={metrics.incidence.value} unit={selectedCountry === 'all' ? "avg new/year" : "new/year"} trend={metrics.incidence.trend} trendLabel="vs last year" variant="success" sparkline={metrics.incidence.sparkline} delay={50} />
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
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {selectedCategory === 'all' 
                    ? 'CDC, WHO, IHME, NCPG' 
                    : (currentDiseaseData?.dataSource || 'CDC, WHO, IHME')}
                </p>
                <h3 className="text-xs sm:text-sm font-medium mt-4 mb-2">Risk Factors</h3>
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  {selectedCategory === 'all' ? (
                    // When "All Categories", show top risk factors from aggregate data
                    (() => {
                      const allRiskFactors = new Map<string, number>();
                      let filtered = diseaseData;
                      if (selectedCountry !== 'all') {
                        const normalizedCode = normalizeCountryCode(selectedCountry);
                        filtered = filtered.filter(d => d.location.toUpperCase() === normalizedCode.toUpperCase());
                      }
                      filtered.forEach(d => {
                        d.riskFactors.forEach(rf => {
                          allRiskFactors.set(rf, (allRiskFactors.get(rf) || 0) + 1);
                        });
                      });
                      const topFactors = Array.from(allRiskFactors.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6)
                        .map(([rf]) => rf);
                      return topFactors.map((rf, i) => (
                        <span key={i} className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-secondary rounded-md">{rf}</span>
                      ));
                    })()
                  ) : (
                    currentDiseaseData?.riskFactors.slice(0, 6).map((rf, i) => (
                      <span key={i} className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-secondary rounded-md">{rf}</span>
                    ))
                  )}
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

