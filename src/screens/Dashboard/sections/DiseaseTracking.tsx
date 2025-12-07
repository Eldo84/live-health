// @ts-nocheck - Recharts type compatibility issues with React 18+
import { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Loader2, Search, X, Clock } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/ui/tabs";
import { useGoogleTrends, TRACKED_DISEASES } from "../../../lib/useGoogleTrends";
import { DiseaseRegionMap } from "./DiseaseRegionMap";

// Google Trends authentic color palette
const colorPalette = [
  "#4285F4", // Google Blue
  "#EA4335", // Google Red
  "#FBBC04", // Google Yellow
  "#34A853", // Google Green
  "#9334E6", // Purple
];

// Time range options
const TIME_RANGES = [
  { label: "Past 4 hours", value: "4h", days: 0.17 },
  { label: "Past day", value: "1d", days: 1 },
  { label: "Past 7 days", value: "7d", days: 7 },
  { label: "Past 30 days", value: "30d", days: 30 },
] as const;

type TimeRangeValue = typeof TIME_RANGES[number]["value"];

// Generate wavy line path (Google Trends style)
const generateWavyPath = (points: { x: number; y: number }[]): string => {
  if (points.length < 2) return "";
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    // Simple line segments create the jagged/wavy look
    path += ` L ${curr.x} ${curr.y}`;
  }
  
  return path;
};

// Tooltip data
interface HoveredData {
  date: string;
  x: number;
  values: Array<{
    disease: string;
    value: number;
    color: string;
  }>;
}

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
}

const GoogleTrendsChart = ({ datasets, onClearAll, timeRange, onTimeRangeChange }: GoogleTrendsChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredData, setHoveredData] = useState<HoveredData | null>(null);

  // Chart dimensions - separate lane for each disease
  const chartWidth = 900;
  const laneHeight = 80;
  const chartHeight = datasets.length * laneHeight + 60; // 60 for x-axis
  const leftPadding = 120; // Space for disease labels
  const rightPadding = 20;
  const topPadding = 10;
  const chartAreaWidth = chartWidth - leftPadding - rightPadding;

  // Get all dates
  const allDates = useMemo(() => {
    const dateSet = new Set<string>();
    datasets.forEach((ds) => ds.data.forEach((d) => dateSet.add(d.date)));
    return Array.from(dateSet).sort();
  }, [datasets]);

  // Get X position
  const getX = (index: number) => {
    return leftPadding + (index / Math.max(allDates.length - 1, 1)) * chartAreaWidth;
  };

  // Get Y position within a lane
  const getY = (value: number, laneIndex: number) => {
    const laneTop = topPadding + laneIndex * laneHeight;
    const laneBottom = laneTop + laneHeight - 10; // 10px padding at bottom
    const usableHeight = laneBottom - laneTop - 20; // 20px padding
    // Invert Y, map 0-100 to lane
    return laneTop + 10 + usableHeight - (value / 100) * usableHeight;
  };

  // Generate paths for each disease in its own lane
  const linePaths = useMemo(() => {
    return datasets.map((dataset, laneIndex) => {
      const points: { x: number; y: number; date: string; value: number }[] = [];

      allDates.forEach((date, i) => {
        const dataPoint = dataset.data.find((d) => d.date === date);
        const value = dataPoint?.normalized_value ?? 0;
        points.push({
          x: getX(i),
          y: getY(value, laneIndex),
          date,
          value,
        });
      });

      return {
        disease: dataset.disease,
        color: dataset.color,
        path: generateWavyPath(points),
        points,
        laneIndex,
      };
    });
  }, [datasets, allDates]);

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = chartWidth / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    if (mouseX < leftPadding || mouseX > chartWidth - rightPadding) {
      setHoveredData(null);
      return;
    }

    let closestDateIndex = 0;
    let minDist = Infinity;
    allDates.forEach((_, i) => {
      const dist = Math.abs(getX(i) - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closestDateIndex = i;
      }
    });

    const hoveredDate = allDates[closestDateIndex];
    const values = datasets.map((dataset) => {
      const dataPoint = dataset.data.find((d) => d.date === hoveredDate);
      return {
        disease: dataset.disease,
        value: dataPoint?.normalized_value ?? 0,
        color: dataset.color,
      };
    });

    setHoveredData({ date: hoveredDate, x: getX(closestDateIndex), values });
  };

  // X-axis labels
  const xAxisLabels = useMemo(() => {
    const maxLabels = 6;
    const step = Math.max(1, Math.floor(allDates.length / maxLabels));
    return allDates
      .filter((_, i) => i % step === 0 || i === allDates.length - 1)
      .map((date) => ({
        label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        x: getX(allDates.indexOf(date)),
      }));
  }, [allDates]);

  if (datasets.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">Select at least one disease to view trends</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800 text-base">Interest over time</span>
          <div className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 text-xs cursor-help">?</div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {TIME_RANGES.map((range) => (
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
            <X className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      {allDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[300px] bg-gray-50 rounded-lg">
          <Clock className="w-8 h-8 text-gray-400 mb-2" />
          <p className="text-gray-600 text-sm">No data available for this time range</p>
        </div>
      ) : (
        <div>
          {/* Chart */}
          <div ref={containerRef} className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full"
              style={{ minHeight: `${chartHeight}px` }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredData(null)}
            >
              {/* Lanes */}
              {datasets.map((dataset, i) => {
                const laneTop = topPadding + i * laneHeight;
                return (
                  <g key={dataset.disease}>
                    {/* Lane background - alternating */}
                    <rect
                      x={leftPadding}
                      y={laneTop}
                      width={chartAreaWidth}
                      height={laneHeight}
                      fill={i % 2 === 0 ? "#fafafa" : "#ffffff"}
                    />
                    {/* Lane separator */}
                    <line
                      x1={leftPadding}
                      y1={laneTop + laneHeight}
                      x2={chartWidth - rightPadding}
                      y2={laneTop + laneHeight}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                    {/* Disease label */}
                    <text
                      x={leftPadding - 10}
                      y={laneTop + laneHeight / 2 + 4}
                      textAnchor="end"
                      fill={dataset.color}
                      fontSize="12"
                      fontWeight="500"
                      className="capitalize"
                    >
                      {dataset.disease}
                    </text>
                  </g>
                );
              })}

              {/* Wavy lines for each disease */}
              {linePaths.map((line) => (
                <path
                  key={line.disease}
                  d={line.path}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              {/* Hover line */}
              {hoveredData && (
                <line
                  x1={hoveredData.x}
                  y1={topPadding}
                  x2={hoveredData.x}
                  y2={topPadding + datasets.length * laneHeight}
                  stroke="#9ca3af"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              )}

              {/* Hover points */}
              {hoveredData && linePaths.map((line) => {
                const point = line.points.find((p) => p.date === hoveredData.date);
                if (!point) return null;
                return (
                  <circle
                    key={line.disease}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill={line.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                );
              })}

              {/* X-axis labels */}
              {xAxisLabels.map((label, i) => (
                <text
                  key={i}
                  x={label.x}
                  y={chartHeight - 20}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize="11"
                >
                  {label.label}
                </text>
              ))}
            </svg>

            {/* Tooltip - positioned to the side so it doesn't block disease lines */}
            {hoveredData && (
              <div
                className="absolute pointer-events-none bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]"
                style={{
                  // Position tooltip to the left or right of the hover line
                  left: hoveredData.x > chartWidth * 0.5 
                    ? `${((hoveredData.x - 20) / chartWidth) * 100}%` 
                    : `${((hoveredData.x + 20) / chartWidth) * 100}%`,
                  top: "50%",
                  transform: hoveredData.x > chartWidth * 0.5 
                    ? "translate(-100%, -50%)" 
                    : "translate(0%, -50%)",
                }}
              >
                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                  <div className="text-xs font-medium text-gray-700">
                    {new Date(hoveredData.date).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </div>
                </div>
                <div className="px-3 py-2 space-y-1">
                  {hoveredData.values.sort((a, b) => b.value - a.value).map((item) => (
                    <div key={item.disease} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-gray-700 capitalize">{item.disease}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: item.color }}>{Math.round(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-200">
        {datasets.map((dataset) => (
          <div key={dataset.disease} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dataset.color }} />
            <span className="text-sm text-gray-700 capitalize">{dataset.disease}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Component
export const DiseaseTracking = (): JSX.Element => {
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRangeValue>("30d");
  const [activeTab, setActiveTab] = useState<"time" | "region">("time");

  const { trends, loading, error } = useGoogleTrends(selectedDiseases);

  const filteredDiseases = useMemo(() => {
    if (!searchQuery.trim()) return TRACKED_DISEASES;
    return TRACKED_DISEASES.filter((d) => d.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [searchQuery]);

  const cutoffDate = useMemo(() => {
    const now = new Date();
    const range = TIME_RANGES.find((r) => r.value === timeRange);
    if (!range) return null;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - range.days);
    return cutoff.toISOString().split("T")[0];
  }, [timeRange]);

  const chartDatasets = useMemo(() => {
    if (selectedDiseases.length === 0 || trends.length === 0) return [];

    const rawDatasets = selectedDiseases.map((disease, index) => {
      const trendData = trends.find((t) => t.disease === disease);
      const filteredData = (trendData?.data || []).filter((point) => !cutoffDate || point.date >= cutoffDate);
      return { disease, color: colorPalette[index % colorPalette.length], data: filteredData };
    });

    let globalMax = 0;
    rawDatasets.forEach((ds) => ds.data.forEach((p) => { if (p.interest_value > globalMax) globalMax = p.interest_value; }));

    return rawDatasets.map((ds) => ({
      ...ds,
      data: ds.data.map((p) => ({
        ...p,
        normalized_value: globalMax > 0 ? Math.round((p.interest_value / globalMax) * 100) : 0,
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
            <h3 className="font-semibold text-[#ffffff] text-lg">Disease Tracking</h3>
            <p className="text-[#ebebeb99] text-sm mt-1">Compare Google Trends search interest for diseases (select up to 5)</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Selection Panel */}
            <div className="bg-[#ffffff0d] rounded-lg p-4 border border-[#ffffff1a]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-[#ffffff] text-sm">Select Diseases to Compare</h4>
                <span className="text-xs text-[#ebebeb99]">{selectedDiseases.length}/5 selected</span>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ebebeb99]" />
                <Input
                  placeholder="Search diseases..."
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
                  Interest over Time
                </TabsTrigger>
                <TabsTrigger 
                  value="region"
                  className="data-[state=active]:bg-[#ffffff14] data-[state=active]:text-[#ffffff] text-[#ebebeb99]"
                >
                  Interest by Region
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
                    <p className="text-sm text-gray-500">Loading...</p>
                  </div>
                ) : (
                  <GoogleTrendsChart
                    datasets={chartDatasets}
                    onClearAll={() => setSelectedDiseases([])}
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
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
