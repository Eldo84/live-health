import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Users, Globe, AlertCircle } from "lucide-react";
import { useHealthStatistics } from "@/lib/useHealthStatistics";

interface KPISummaryProps {
  filters?: {
    category?: string;
    country?: string;
    yearRange?: string;
    sex?: string;
    ageGroup?: string;
    searchTerm?: string;
  };
}

export const KPISummary = ({ filters = {} }: KPISummaryProps) => {
  const { data: healthStats, loading } = useHealthStatistics(filters);

  const kpis = useMemo(() => {
    if (!healthStats || healthStats.length === 0) {
      return {
        totalPrevalence: 0,
        totalMortality: 0,
        totalDALYs: 0,
        affectedConditions: 0,
        trend: 0
      };
    }

    // Group by unique condition+country+ageGroup+year combination to avoid double-counting
    // Then sum the rates
    const uniqueKeyMap = new Map<string, {
      prevalence: number;
      mortality: number;
      dalys: number;
    }>();

    healthStats.forEach(stat => {
      // Create unique key from condition, country, ageGroup, and year
      const key = `${stat.condition}|${stat.country_code}|${stat.age_group || 'All'}|${stat.year}`;
      
      if (!uniqueKeyMap.has(key)) {
        uniqueKeyMap.set(key, {
          prevalence: stat.prevalence_per_100k || 0,
          mortality: stat.mortality_rate || 0,
          dalys: stat.dalys_per_100k || 0,
        });
      }
    });

    // Aggregate and then average per unique record to keep per-100k rates realistic
    let sumPrevalence = 0;
    let sumMortality = 0;
    let sumDALYs = 0;
    uniqueKeyMap.forEach((values) => {
      sumPrevalence += values.prevalence;
      sumMortality += values.mortality;
      sumDALYs += values.dalys;
    });

    const recordCount = uniqueKeyMap.size || 1; // avoid divide-by-zero
    const totalPrevalence = sumPrevalence / recordCount;
    const totalMortality = sumMortality / recordCount;
    const totalDALYs = sumDALYs / recordCount;

    // Count unique conditions
    const uniqueConditions = new Set(healthStats.map(s => s.condition));
    const affectedConditions = uniqueConditions.size;

    // Calculate trend (compare to previous year if available)
    const currentYear = Math.max(...healthStats.map(s => s.year));
    const previousYear = currentYear - 1;
    const currentYearData = healthStats.filter(s => s.year === currentYear);
    const previousYearData = healthStats.filter(s => s.year === previousYear);
    
    const currentTotal = currentYearData.reduce((sum, stat) => sum + (stat.prevalence_per_100k || 0), 0);
    const previousTotal = previousYearData.reduce((sum, stat) => sum + (stat.prevalence_per_100k || 0), 0);
    
    const trend = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    return {
      totalPrevalence: Math.round(totalPrevalence),
      totalMortality: Math.round(totalMortality),
      totalDALYs: Math.round(totalDALYs),
      affectedConditions,
      trend: Math.round(trend * 10) / 10
    };
  }, [healthStats]);

  const kpiCards = [
    {
      title: "Total Prevalence",
      value: kpis.totalPrevalence.toLocaleString(),
      subtitle: "cases per 100k",
      icon: Users,
      color: "#66dbe1",
      bgColor: "#66dbe133"
    },
    {
      title: "Mortality Rate",
      value: kpis.totalMortality.toLocaleString(),
      subtitle: "deaths per 100k",
      icon: AlertCircle,
      color: "#f87171",
      bgColor: "#f8717133"
    },
    {
      title: "Disease Burden (DALYs)",
      value: kpis.totalDALYs.toLocaleString(),
      subtitle: "disability-adjusted life years",
      icon: Activity,
      color: "#fbbf24",
      bgColor: "#fbbf2433"
    },
    {
      title: "Conditions Tracked",
      value: kpis.affectedConditions.toString(),
      subtitle: "unique conditions",
      icon: Globe,
      color: "#4ade80",
      bgColor: "#4ade8033"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="bg-[#ffffff14] border-[#eaebf024]">
            <CardContent className="p-6">
              <div className="h-4 bg-[#ffffff1a] rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-[#ffffff1a] rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-[#ffffff1a] rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiCards.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card 
            key={index} 
            className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-all duration-300 hover:scale-105 hover:shadow-lg"
            style={{ 
              animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div 
                  className="p-3 rounded-lg" 
                  style={{ backgroundColor: kpi.bgColor }}
                >
                  <Icon className="h-6 w-6" style={{ color: kpi.color }} />
                </div>
                {index === 0 && kpis.trend !== 0 && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${kpis.trend > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {kpis.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(kpis.trend)}%
                  </div>
                )}
              </div>
              <h3 className="font-family:'Roboto',Helvetica text-sm font-medium text-[#ebebeb99] mb-1">
                {kpi.title}
              </h3>
              <p className="font-family:'Roboto',Helvetica text-3xl font-bold text-[#ebebeb] mb-1">
                {kpi.value}
              </p>
              <p className="font-family:'Roboto',Helvetica text-xs text-[#ebebeb99]">
                {kpi.subtitle}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
