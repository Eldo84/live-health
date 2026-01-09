import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Loader2, Search, X, Clock } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/ui/tabs";
import { useGoogleTrends, TRACKED_DISEASES } from "../../../lib/useGoogleTrends";
import { DiseaseRegionMap } from "./DiseaseRegionMap";
import { useLanguage } from "../../../contexts/LanguageContext";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Google Trends authentic color palette
const colorPalette = [
  "#4285F4", // Google Blue
  "#EA4335", // Google Red
  "#FBBC04", // Google Yellow
  "#34A853", // Google Green
  "#9334E6", // Purple
];

type TimeRangeValue = "4h" | "1d" | "7d" | "30d";

// Chart Props
interface GoogleTrendsChartProps {
  datasets: Array<{
    disease: string;
    color: string;
    data: Array<{ date: string; interest_value: number; normalized_value: number }>;
  }>;
  onClearAll: () => void;
  timeRange: TimeRangeValue;
  onTimeRangeChange: (value: TimeRangeValue) => void;
  timeRanges: Array<{ label: string; value: TimeRangeValue; days: number }>;
}

const GoogleTrendsChart = ({ datasets, onClearAll, timeRange, onTimeRangeChange, timeRanges }: GoogleTrendsChartProps) => {
  const { t } = useLanguage();

  // Get all dates and sort them
  const allDates = useMemo(() => {
    const dateSet = new Set<string>();
    datasets.forEach((ds) => ds.data.forEach((d) => dateSet.add(d.date)));
    return Array.from(dateSet).sort();
  }, [datasets]);

  // Prepare chart data for Chart.js
  const chartData = useMemo(() => {
    // Create datasets for each disease
    const chartDatasets = datasets.map((dataset) => {
      // Map data points to { x: Date, y: value } format for time scale
      const data = allDates.map((dateStr) => {
        const dataPoint = dataset.data.find((d) => d.date === dateStr);
        return {
          x: new Date(dateStr),
          y: dataPoint?.normalized_value ?? 0,
        };
      });

      return {
        label: dataset.disease.charAt(0).toUpperCase() + dataset.disease.slice(1),
        data: data,
        borderColor: dataset.color,
        backgroundColor: dataset.color,
        pointStyle: 'circle' as const,
        pointRadius: 4,
        fill: false,
      };
    });

    return {
      datasets: chartDatasets,
    };
  }, [datasets, allDates]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
          displayFormats: {
            day: 'MMM d, yyyy',
          },
        },
        ticks: {
          maxTicksLimit: 4,
          maxRotation: 0,
        },
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 25,
        },
        title: {
          display: true,
          text: 'Interest Score',
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: 'Interest Over Time',
      },
      legend: {
        display: datasets.length > 0,
        position: 'bottom' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
  };

  if (datasets.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">{t("dashboard.selectAtLeastOneDisease")}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800 text-base">{t("dashboard.interestOverTime")}</span>
          <div className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 text-xs cursor-help">?</div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => onTimeRangeChange(range.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  timeRange === range.value ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <button onClick={onClearAll} className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md flex items-center gap-1">
            <X className="w-3 h-3" /> {t("dashboard.clear")}
          </button>
        </div>
      </div>

      {allDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[300px] bg-gray-50 rounded-lg">
          <Clock className="w-8 h-8 text-gray-400 mb-2" />
          <p className="text-gray-600 text-sm">{t("dashboard.noDataAvailableForTimeRange")}</p>
        </div>
      ) : (
        <div className="h-[400px]">
          <Line data={chartData} options={options} />
        </div>
      )}

      {/* Legend */}
      {datasets.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-200">
          {datasets.map((dataset) => (
            <div key={dataset.disease} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dataset.color }} />
              <span className="text-sm text-gray-700 capitalize">{dataset.disease}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Component
export const DiseaseTracking = (): JSX.Element => {
  const { t } = useLanguage();
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRangeValue>("30d");
  const [activeTab, setActiveTab] = useState<"time" | "region">("time");

  const { trends, loading, error } = useGoogleTrends(selectedDiseases);

  const filteredDiseases = useMemo(() => {
    if (!searchQuery.trim()) return TRACKED_DISEASES;
    return TRACKED_DISEASES.filter((d) => d.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [searchQuery]);

  const TIME_RANGES = [
    { label: t("dashboard.past4Hours"), value: "4h", days: 0.17 },
    { label: t("dashboard.pastDay"), value: "1d", days: 1 },
    { label: t("dashboard.past7Days"), value: "7d", days: 7 },
    { label: t("dashboard.past30Days"), value: "30d", days: 30 },
  ] as const;

  const cutoffDate = useMemo(() => {
    const now = new Date();
    const range = TIME_RANGES.find((r) => r.value === timeRange);
    if (!range) return null;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - range.days);
    return cutoff.toISOString().split("T")[0];
  }, [timeRange, TIME_RANGES]);

  const chartDatasets = useMemo(() => {
    if (selectedDiseases.length === 0 || trends.length === 0) return [];

    const rawDatasets = selectedDiseases.map((disease, index) => {
      const trendData = trends.find((t) => t.disease === disease);
      const filteredData = (trendData?.data || []).filter((point) => !cutoffDate || point.date >= cutoffDate);
      return { disease, color: colorPalette[index % colorPalette.length], data: filteredData };
    });

    // Use raw interest_value directly - already normalized by Google Trends API within each group
    // Google Trends API normalizes scores 0-100 where 100 is the peak for the group
    // We should NOT re-normalize here as it would create incorrect comparisons
    // Note: Diseases from different groups may not be directly comparable, but this matches
    // Google Trends website behavior when diseases are in the same group
    return rawDatasets.map((ds) => ({
      ...ds,
      data: ds.data.map((p) => ({
        ...p,
        normalized_value: p.interest_value, // Use raw value, already normalized by API
      })),
    }));
  }, [selectedDiseases, trends, cutoffDate]);

  const handleDiseaseToggle = (disease: string) => {
    if (selectedDiseases.includes(disease)) {
      setSelectedDiseases(selectedDiseases.filter((d) => d !== disease));
    } else if (selectedDiseases.length < 5) {
      setSelectedDiseases([...selectedDiseases, disease]);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardHeader className="pb-4">
          <div>
            <h3 className="font-semibold text-[#ffffff] text-lg">{t("dashboard.diseaseTracking")}</h3>
            <p className="text-[#ebebeb99] text-sm mt-1">{t("dashboard.compareGoogleTrendsSearchInterest")}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Selection Panel */}
            <div className="bg-[#ffffff0d] rounded-lg p-4 border border-[#ffffff1a]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-[#ffffff] text-sm">{t("dashboard.selectDiseasesToCompare")}</h4>
                <span className="text-xs text-[#ebebeb99]">{selectedDiseases.length}/5 {t("dashboard.selected")}</span>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ebebeb99]" />
                <Input
                  placeholder={t("dashboard.searchDiseases")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 bg-[#ffffff14] border-[#dae0e633] text-[#ebebeb] text-sm h-9"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ebebeb99] hover:text-[#ebebeb]">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[240px] overflow-y-auto">
                {filteredDiseases.map((disease) => {
                  const isSelected = selectedDiseases.includes(disease);
                  const idx = selectedDiseases.indexOf(disease);
                  const color = idx !== -1 ? colorPalette[idx % colorPalette.length] : "#4a5568";
                  const isDisabled = !isSelected && selectedDiseases.length >= 5;

                  return (
                    <button
                      key={disease}
                      onClick={() => !isDisabled && handleDiseaseToggle(disease)}
                      disabled={isDisabled}
                      className={`flex items-center gap-2 p-2 rounded-md transition-colors text-left ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-[#ffffff14]"} ${isSelected ? "bg-[#ffffff14]" : ""}`}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 border-2"
                        style={{ backgroundColor: isSelected ? color : "transparent", borderColor: isSelected ? color : "#4a5568" }}
                      />
                      <span className="text-xs text-[#ffffff] capitalize truncate">{disease}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Switcher */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "time" | "region")} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-[#ffffff0d] border border-[#ffffff1a]">
                <TabsTrigger 
                  value="time" 
                  className="data-[state=active]:bg-[#ffffff14] data-[state=active]:text-[#ffffff] text-[#ebebeb99]"
                >
                  {t("dashboard.interestOverTime")}
                </TabsTrigger>
                <TabsTrigger 
                  value="region"
                  className="data-[state=active]:bg-[#ffffff14] data-[state=active]:text-[#ffffff] text-[#ebebeb99]"
                >
                  {t("dashboard.interestByRegion")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="time" className="mt-4">
                {error ? (
                  <div className="flex items-center justify-center h-[300px] bg-[#ffffff08] rounded-lg">
                    <p className="text-sm text-[#f87171]">Error: {error}</p>
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center h-[300px] bg-white rounded-lg border">
                    <Loader2 className="w-6 h-6 text-[#4285F4] animate-spin mr-2" />
                    <p className="text-sm text-gray-500">{t("dashboard.loading")}</p>
                  </div>
                ) : (
                  <GoogleTrendsChart
                    datasets={chartDatasets}
                    onClearAll={() => setSelectedDiseases([])}
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    timeRanges={TIME_RANGES}
                  />
                )}
              </TabsContent>

              <TabsContent value="region" className="mt-4">
                <DiseaseRegionMap
                  selectedDiseases={selectedDiseases}
                  timeRange={timeRange}
                />
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
