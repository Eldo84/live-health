// @ts-nocheck - Recharts type compatibility issues with React 18+
import { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Loader2, Search, X, TrendingUp } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { useGoogleTrends, TRACKED_DISEASES } from "../../../lib/useGoogleTrends";

// Google Trends authentic color palette
const colorPalette = [
  "#4285F4", // Google Blue
  "#EA4335", // Google Red
  "#FBBC04", // Google Yellow
  "#34A853", // Google Green
  "#9334E6", // Purple
];

// Generate a smooth wavy curve path using cubic bezier curves
const generateSmoothPath = (
  points: { x: number; y: number }[],
  tension: number = 0.4
): string => {
  if (points.length < 2) return "";

  if (points.length === 2) {
    const midX = (points[0].x + points[1].x) / 2;
    const midY = (points[0].y + points[1].y) / 2;
    return `M ${points[0].x} ${points[0].y} Q ${midX} ${midY - 8}, ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
};

// Tooltip data for a hovered date
interface HoveredData {
  date: string;
  x: number;
  values: Array<{
    disease: string;
    value: number;
    color: string;
  }>;
}

// Google Trends Chart Component
interface GoogleTrendsChartProps {
  datasets: Array<{
    disease: string;
    color: string;
    data: Array<{ date: string; interest_value: number; normalized_value: number }>;
  }>;
  onClearAll: () => void;
}

const GoogleTrendsChart = ({ datasets, onClearAll }: GoogleTrendsChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredData, setHoveredData] = useState<HoveredData | null>(null);

  // Chart dimensions
  const chartWidth = 800;
  const laneHeight = 100;
  const chartHeight = datasets.length * laneHeight;
  const leftPadding = 20;
  const rightPadding = 20;
  const topPadding = 20;
  const bottomPadding = 40;
  const lanePadding = laneHeight * 0.15;

  // Get all unique dates across all datasets
  const allDates = useMemo(() => {
    const dateSet = new Set<string>();
    datasets.forEach((ds) => ds.data.forEach((d) => dateSet.add(d.date)));
    return Array.from(dateSet).sort();
  }, [datasets]);

  // Calculate x position for a given index
  const getX = (index: number) => {
    const availableWidth = chartWidth - leftPadding - rightPadding;
    return leftPadding + (index / Math.max(allDates.length - 1, 1)) * availableWidth;
  };

  // Calculate y position for a value in a specific lane
  const getY = (value: number, laneIndex: number) => {
    const laneTop = topPadding + laneIndex * laneHeight;
    const laneBottom = laneTop + laneHeight;
    const usableTop = laneTop + lanePadding;
    const usableBottom = laneBottom - lanePadding;
    const usableHeight = usableBottom - usableTop;
    return usableBottom - (value / 100) * usableHeight;
  };

  // Generate wave paths using normalized values
  const wavePaths = useMemo(() => {
    return datasets.map((dataset, laneIndex) => {
      const points: { x: number; y: number; date: string; value: number }[] = [];

      allDates.forEach((date, i) => {
        const dataPoint = dataset.data.find((d) => d.date === date);
        // Use normalized_value for chart positioning
        const value = dataPoint?.normalized_value ?? 0;
        const x = getX(i);
        const y = getY(value, laneIndex);
        points.push({ x, y, date, value });
      });

      if (points.length === 0) return null;

      const linePath = generateSmoothPath(points.map((p) => ({ x: p.x, y: p.y })), 0.35);

      // Create area path for gradient fill
      const laneBottom = topPadding + (laneIndex + 1) * laneHeight - lanePadding;
      const areaPath =
        linePath +
        ` L ${points[points.length - 1].x} ${laneBottom}` +
        ` L ${points[0].x} ${laneBottom} Z`;

      return {
        disease: dataset.disease,
        color: dataset.color,
        linePath,
        areaPath,
        points,
        laneIndex,
      };
    });
  }, [datasets, allDates, laneHeight, lanePadding]);

  // Handle mouse move - find closest DATE and show all diseases for that date
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = chartWidth / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    // Find closest date based on x position
    let closestDateIndex = 0;
    let minDist = Infinity;

    allDates.forEach((_, i) => {
      const x = getX(i);
      const dist = Math.abs(x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closestDateIndex = i;
      }
    });

    // Only show tooltip if mouse is within reasonable range
    if (minDist > 50) {
      setHoveredData(null);
      return;
    }

    const hoveredDate = allDates[closestDateIndex];
    const x = getX(closestDateIndex);

    // Get NORMALIZED values for all diseases on this date (for tooltip display)
    const values = datasets.map((dataset) => {
      const dataPoint = dataset.data.find((d) => d.date === hoveredDate);
      return {
        disease: dataset.disease,
        value: dataPoint?.normalized_value ?? 0,
        color: dataset.color,
      };
    });

    setHoveredData({
      date: hoveredDate,
      x,
      values,
    });
  };

  // X-axis labels
  const xAxisLabels = useMemo(() => {
    const maxLabels = 8;
    const step = Math.max(1, Math.floor(allDates.length / maxLabels));
    return allDates
      .filter((_, i) => i % step === 0 || i === allDates.length - 1)
      .map((date) => {
        const d = new Date(date);
        return {
          label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          x: getX(allDates.indexOf(date)),
        };
      });
  }, [allDates]);

  if (datasets.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-white rounded-lg border border-gray-200">
        <p className="[font-family:'Roboto',Helvetica] font-normal text-gray-500 text-sm">
          Select at least one disease to view trends
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#4285F4]" />
          <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-gray-800 text-base">
            Google Trends Interest Over Time
          </h3>
        </div>
        <button
          onClick={onClearAll}
          className="[font-family:'Roboto',Helvetica] px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Clear All
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {datasets.map((dataset) => (
          <div key={dataset.disease} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: dataset.color }}
            />
            <span className="[font-family:'Roboto',Helvetica] text-sm text-gray-700 font-medium capitalize">
              {dataset.disease}
            </span>
          </div>
        ))}
      </div>

      {/* SVG Chart */}
      <div ref={containerRef} className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full"
          style={{ minHeight: `${Math.max(300, chartHeight)}px` }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredData(null)}
        >
          {/* Gradients */}
          <defs>
            {datasets.map((dataset, i) => (
              <linearGradient
                key={`gradient-${i}`}
                id={`wave-gradient-${i}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={dataset.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={dataset.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>

          {/* Lane backgrounds */}
          {datasets.map((_, i) => {
            const laneTop = topPadding + i * laneHeight;
            return (
              <g key={`lane-${i}`}>
                <rect
                  x={leftPadding}
                  y={laneTop}
                  width={chartWidth - leftPadding - rightPadding}
                  height={laneHeight}
                  fill={i % 2 === 0 ? "#f9fafb" : "#ffffff"}
                />
                {i > 0 && (
                  <line
                    x1={leftPadding}
                    y1={laneTop}
                    x2={chartWidth - rightPadding}
                    y2={laneTop}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                )}
              </g>
            );
          })}

          {/* Vertical grid lines */}
          {xAxisLabels.map((label, i) => (
            <line
              key={`vgrid-${i}`}
              x1={label.x}
              y1={topPadding}
              x2={label.x}
              y2={chartHeight - bottomPadding}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Wave areas */}
          {wavePaths.map(
            (wp, i) =>
              wp && (
                <path
                  key={`area-${i}`}
                  d={wp.areaPath}
                  fill={`url(#wave-gradient-${i})`}
                  className="transition-opacity duration-300"
                />
              )
          )}

          {/* Wave lines */}
          {wavePaths.map(
            (wp, i) =>
              wp && (
                <path
                  key={`line-${i}`}
                  d={wp.linePath}
                  fill="none"
                  stroke={wp.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                  className="transition-all duration-300"
                />
              )
          )}

          {/* Data points - highlight all points on hovered date */}
          {wavePaths.map((wp, waveIndex) =>
            wp?.points.map((pt, i) => {
              const isHovered = hoveredData?.date === pt.date;
              return (
                <circle
                  key={`point-${waveIndex}-${i}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 3}
                  fill={isHovered ? wp.color : wp.color}
                  stroke="white"
                  strokeWidth={isHovered ? 2 : 1.5}
                  className="transition-all duration-200"
                  style={{ 
                    opacity: isHovered ? 1 : 0.7,
                    filter: isHovered ? `drop-shadow(0 0 4px ${wp.color})` : "none"
                  }}
                />
              );
            })
          )}

          {/* X-axis labels */}
          {xAxisLabels.map((label, i) => (
            <text
              key={`xlabel-${i}`}
              x={label.x}
              y={chartHeight - bottomPadding + 20}
              textAnchor="middle"
              className="[font-family:'Roboto',Helvetica]"
              fill="#6b7280"
              fontSize="11"
            >
              {label.label}
            </text>
          ))}

          {/* Disease labels */}
          {datasets.map((dataset, i) => {
            const laneCenter = topPadding + i * laneHeight + laneHeight / 2;
            return (
              <text
                key={`dlabel-${i}`}
                x={leftPadding + 8}
                y={laneCenter - laneHeight / 2 + 16}
                className="[font-family:'Roboto',Helvetica] font-semibold capitalize"
                fill={colorPalette[i % colorPalette.length]}
                fontSize="12"
              >
                {dataset.disease}
              </text>
            );
          })}

          {/* Vertical hover line */}
          {hoveredData && (
            <line
              x1={hoveredData.x}
              y1={topPadding}
              x2={hoveredData.x}
              y2={chartHeight - bottomPadding}
              stroke="#374151"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}
        </svg>

        {/* Google Trends-style Tooltip - Shows ALL diseases for hovered date */}
        {hoveredData && (
          <div
            className="absolute pointer-events-none bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]"
            style={{
              left: `${(hoveredData.x / chartWidth) * 100}%`,
              top: "10px",
              transform: hoveredData.x > chartWidth * 0.7 ? "translateX(-100%)" : "translateX(0)",
            }}
          >
            {/* Date Header */}
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
              <div className="[font-family:'Roboto',Helvetica] text-sm font-semibold text-gray-800">
                {new Date(hoveredData.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            
            {/* Disease Values */}
            <div className="px-3 py-2 space-y-1.5">
              {hoveredData.values.map((item) => (
                <div key={item.disease} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="[font-family:'Roboto',Helvetica] text-sm text-gray-700 capitalize">
                      {item.disease}
                    </span>
                  </div>
                  <span 
                    className="[font-family:'Roboto',Helvetica] text-sm font-bold"
                    style={{ color: item.color }}
                  >
                    {Math.round(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="[font-family:'Roboto',Helvetica] font-normal text-gray-500 text-xs leading-relaxed">
          <span className="font-semibold text-gray-700">Note:</span> Values are normalized 
          relative to the highest point among all selected diseases (100 = peak interest). 
          This matches how Google Trends displays comparison data.
        </p>
      </div>
    </div>
  );
};

// Main Component
export const DiseaseTracking = (): JSX.Element => {
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch Google Trends data for selected diseases
  const { trends, loading, error } = useGoogleTrends(selectedDiseases);

  // Filter diseases based on search query
  const filteredDiseases = useMemo(() => {
    if (!searchQuery.trim()) return TRACKED_DISEASES;
    const query = searchQuery.toLowerCase().trim();
    return TRACKED_DISEASES.filter((disease) => disease.toLowerCase().includes(query));
  }, [searchQuery]);

  // Build datasets for chart with CROSS-DISEASE NORMALIZATION
  // This makes values comparable like Google Trends does when comparing multiple diseases
  const chartDatasets = useMemo(() => {
    if (selectedDiseases.length === 0 || trends.length === 0) {
      return [];
    }

    // Step 1: Get all raw data with original interest values
    const rawDatasets = selectedDiseases.map((disease, index) => {
      const trendData = trends.find((t) => t.disease === disease);
      return {
        disease,
        color: colorPalette[index % colorPalette.length],
        data: trendData?.data || [],
      };
    });

    // Step 2: Find the GLOBAL maximum across ALL diseases and ALL dates
    let globalMax = 0;
    rawDatasets.forEach((dataset) => {
      dataset.data.forEach((point) => {
        if (point.interest_value > globalMax) {
          globalMax = point.interest_value;
        }
      });
    });

    // Step 3: Normalize all values relative to globalMax
    // This makes values comparable across diseases (like Google Trends comparison view)
    const normalizedDatasets = rawDatasets.map((dataset) => ({
      ...dataset,
      data: dataset.data.map((point) => ({
        ...point,
        // Normalize: (value / globalMax) * 100
        // If globalMax is 0, keep as 0
        normalized_value: globalMax > 0 
          ? Math.round((point.interest_value / globalMax) * 100) 
          : 0,
      })),
    }));

    return normalizedDatasets;
  }, [selectedDiseases, trends]);

  const handleDiseaseToggle = (disease: string) => {
    if (selectedDiseases.includes(disease)) {
      setSelectedDiseases(selectedDiseases.filter((d) => d !== disease));
    } else if (selectedDiseases.length < 5) {
      setSelectedDiseases([...selectedDiseases, disease]);
    }
  };

  const handleClearAll = () => {
    setSelectedDiseases([]);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardHeader className="pb-4">
          <div>
            <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
              Disease Tracking
            </h3>
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
              Compare Google Trends search interest for diseases (select up to 5)
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Disease Selection Panel */}
            <div className="bg-[#ffffff0d] rounded-lg p-4 border border-[#ffffff1a]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm">
                  Select Diseases to Compare
                </h4>
                <span className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">
                  {selectedDiseases.length}/5 selected
                </span>
              </div>

              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ebebeb99]" />
                <Input
                  type="text"
                  placeholder="Search diseases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 bg-[#ffffff14] border-[#dae0e633] text-[#ebebeb] text-sm h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ebebeb99] hover:text-[#ebebeb] transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Disease List */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[240px] overflow-y-auto">
                {filteredDiseases.map((disease) => {
                  const isSelected = selectedDiseases.includes(disease);
                  const diseaseIndex = selectedDiseases.indexOf(disease);
                  const color =
                    diseaseIndex !== -1
                      ? colorPalette[diseaseIndex % colorPalette.length]
                      : "#4a5568";
                  const isDisabled = !isSelected && selectedDiseases.length >= 5;

                  return (
                    <button
                      key={disease}
                      onClick={() => !isDisabled && handleDiseaseToggle(disease)}
                      disabled={isDisabled}
                      className={`flex items-center gap-2 p-2 rounded-md transition-colors text-left ${
                        isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-[#ffffff14] cursor-pointer"
                      } ${isSelected ? "bg-[#ffffff14]" : ""}`}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 border-2 transition-colors"
                        style={{
                          backgroundColor: isSelected ? color : "transparent",
                          borderColor: isSelected ? color : "#4a5568",
                        }}
                      />
                      <span className="[font-family:'Roboto',Helvetica] font-medium text-[#ffffff] text-xs capitalize truncate">
                        {disease}
                      </span>
                    </button>
                  );
                })}
              </div>

              {filteredDiseases.length === 0 && (
                <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm py-4 text-center">
                  No diseases found matching "{searchQuery}"
                </p>
              )}
            </div>

            {/* Chart Section */}
            {error ? (
              <div className="flex items-center justify-center h-[300px] bg-[#ffffff08] rounded-lg">
                <p className="[font-family:'Roboto',Helvetica] font-medium text-[#f87171] text-sm">
                  Error loading trends: {error}
                </p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-[300px] bg-white rounded-lg border border-gray-200">
                <Loader2 className="w-6 h-6 text-[#4285F4] animate-spin mr-2" />
                <p className="[font-family:'Roboto',Helvetica] font-normal text-gray-500 text-sm">
                  Loading Google Trends data...
                </p>
              </div>
            ) : (
              <GoogleTrendsChart datasets={chartDatasets} onClearAll={handleClearAll} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
