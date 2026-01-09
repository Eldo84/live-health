import React, { useMemo, useState, useEffect } from "react";
import { useGoogleTrendsRegions } from "../../../lib/useGoogleTrendsRegions";
import { AlertCircle, Loader2, ChevronDown } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";

// Color scale for popularity scores (0-100)
// Based on Google Trends visualization style
const getPopularityColor = (score: number): string => {
  if (score === 0) return "#e5e7eb"; // Gray for no data
  if (score <= 20) return "#bfdbfe"; // Light blue
  if (score <= 40) return "#93c5fd"; // Light-medium blue
  if (score <= 60) return "#60a5fa"; // Medium blue
  if (score <= 80) return "#3b82f6"; // Blue
  return "#1d4ed8"; // Dark blue (highest)
};

// Google Trends authentic color palette for multiple diseases
const DISEASE_COLORS = [
  "#4285F4", // Google Blue
  "#EA4335", // Google Red
  "#FBBC04", // Google Yellow
  "#34A853", // Google Green
  "#9334E6", // Purple
];

// Map resize handler for dashboard
const MapResizeHandler = () => {
  const map = useMap();
  React.useEffect(() => {
    const invalidateSize = () => {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    window.addEventListener("resize", invalidateSize);
    return () => {
      window.removeEventListener("resize", invalidateSize);
    };
  }, [map]);
  return null;
};

// Create custom icon based on popularity score and disease color
const createPopularityIcon = (
  score: number,
  diseaseColor?: string,
  size: number = 12
) => {
  const color = diseaseColor || getPopularityColor(score);
  const radius = Math.max(6, Math.min(16, 6 + (score / 100) * 10)); // Size based on score

  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${radius/2}"
          fill="${color}" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" opacity="${score === 0 ? 0.5 : 1}"/>
      </svg>`
    )}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

interface DiseaseRegionMapProps {
  selectedDiseases: string[];
  timeRange: string;
}

export const DiseaseRegionMap = ({
  selectedDiseases,
  timeRange,
}: DiseaseRegionMapProps): JSX.Element => {
  const { regionData, loading, error } = useGoogleTrendsRegions(
    selectedDiseases,
    timeRange
  );

  // Disease used for sorting the ranked region list (like "Interest for Malaria")
  const [sortDisease, setSortDisease] = useState<string | null>(
    selectedDiseases[0] ?? null
  );

  // Keep sort disease in sync when selection changes
  useEffect(() => {
    if (!sortDisease || !selectedDiseases.includes(sortDisease)) {
      setSortDisease(selectedDiseases[0] ?? null);
    }
  }, [selectedDiseases.join(","), sortDisease]);

  // Get disease colors
  const diseaseColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    selectedDiseases.forEach((disease, index) => {
      map[disease] = DISEASE_COLORS[index % DISEASE_COLORS.length];
    });
    return map;
  }, [selectedDiseases]);

  // Flatten and prepare markers data
  const markers = useMemo(() => {
    const markerMap = new Map<
      string,
      {
        position: [number, number];
        regionName: string;
        regions: Map<string, {
          disease: string;
          region: string;
          score: number;
        }>; // Use Map to deduplicate by disease name
      }
    >();

    regionData.forEach((diseaseData) => {
      diseaseData.regions.forEach((region) => {
        if (!region.coordinates) return; // Skip regions without coordinates

        const key = `${region.coordinates[0]},${region.coordinates[1]}`;
        if (!markerMap.has(key)) {
          markerMap.set(key, {
            position: region.coordinates,
            regionName: region.region,
            regions: new Map(),
          });
        }

        const marker = markerMap.get(key)!;
        // Only keep the highest score for each disease at this location
        const existing = marker.regions.get(diseaseData.disease);
        if (!existing || region.popularity_score > existing.score) {
          marker.regions.set(diseaseData.disease, {
            disease: diseaseData.disease,
            region: region.region,
            score: region.popularity_score,
          });
        }
      });
    });

    // Convert Map values to arrays
    return Array.from(markerMap.values()).map(marker => ({
      position: marker.position,
      regionName: marker.regionName,
      regions: Array.from(marker.regions.values()),
    }));
  }, [regionData]);

  // Calculate map bounds to fit all markers
  const bounds = useMemo(() => {
    if (markers.length === 0) return null;

    const lats = markers.map((m) => m.position[0]);
    const lngs = markers.map((m) => m.position[1]);

    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ] as [[number, number], [number, number]];
  }, [markers]);

  // Build a ranked region list similar to Google Trends "Compared breakdown by region"
  const rankedRegions = useMemo(() => {
    if (!sortDisease) return [];

    // Aggregate scores per region across diseases
    const regionMap = new Map<
      string,
      {
        regionName: string;
        scores: Record<string, number>;
      }
    >();

    regionData.forEach((diseaseData) => {
      diseaseData.regions.forEach((region) => {
        const key = region.region;
        if (!regionMap.has(key)) {
          regionMap.set(key, {
            regionName: region.region,
            scores: {},
          });
        }
        const entry = regionMap.get(key)!;
        entry.scores[diseaseData.disease] = region.popularity_score;
      });
    });

    const regionsArray = Array.from(regionMap.values());

    // Define major countries/regions that should always be shown even with score 100
    // These are countries with significant population and search volume
    const majorCountries = new Set([
      "United States", "Canada", "United Kingdom", "China", "India", "Brazil",
      "Russia", "Japan", "Germany", "France", "Italy", "Spain", "Australia",
      "Mexico", "Indonesia", "South Korea", "Turkey", "Saudi Arabia", "Argentina",
      "South Africa", "Poland", "Netherlands", "Belgium", "Sweden", "Norway",
      "Denmark", "Finland", "Switzerland", "Austria", "Ireland", "New Zealand",
      "Portugal", "Greece", "Israel", "Chile", "Colombia", "Peru", "Venezuela",
      "Philippines", "Thailand", "Vietnam", "Malaysia", "Singapore", "Taiwan",
      "Egypt", "Nigeria", "Kenya", "Morocco", "Algeria", "Tunisia", "Ghana",
      "Ukraine", "Romania", "Czech Republic", "Hungary", "Bulgaria", "Croatia",
      "Serbia", "Slovakia", "Slovenia", "Estonia", "Latvia", "Lithuania"
    ]);

    // Identify regions with score 100 for the sort disease
    const regionsWith100 = regionsArray.filter(
      (r) => (r.scores[sortDisease] ?? 0) === 100
    );
    
    // Check if there are major countries with scores < 100
    const majorCountriesBelow100 = regionsArray.filter(
      (r) => majorCountries.has(r.regionName) && (r.scores[sortDisease] ?? 0) < 100
    );

    // If there are many regions with 100 AND major countries with lower scores,
    // filter out small territories/islands with 100 (but keep major countries)
    // This matches Google Trends website behavior
    let filteredRegions = regionsArray;
    if (regionsWith100.length > 5 && majorCountriesBelow100.length > 0) {
      filteredRegions = regionsArray.filter((region) => {
        const score = region.scores[sortDisease] ?? 0;
        
        // Always keep major countries, even with score 100
        if (majorCountries.has(region.regionName)) {
          return true;
        }
        
        // Filter out small territories/islands with score 100
        // when there are major countries with lower scores
        if (score === 100) {
          return false;
        }
        
        return true;
      });
    }

    // Sort by selected disease interest descending
    // Google Trends website sorts by the selected disease's score
    filteredRegions.sort(
      (a, b) => {
        const scoreA = a.scores[sortDisease] ?? 0;
        const scoreB = b.scores[sortDisease] ?? 0;
        
        // Primary sort: by sort disease score
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        
        // Secondary sort: by average score across all diseases (for tie-breaking)
        // This helps match Google Trends website which considers overall interest
        const avgA = selectedDiseases.reduce((sum, d) => sum + (a.scores[d] ?? 0), 0) / selectedDiseases.length;
        const avgB = selectedDiseases.reduce((sum, d) => sum + (b.scores[d] ?? 0), 0) / selectedDiseases.length;
        
        return avgB - avgA;
      }
    );

    return filteredRegions;
  }, [regionData, sortDisease]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-white rounded-lg border border-gray-200">
        <Loader2 className="w-6 h-6 text-[#4285F4] animate-spin mr-2" />
        <p className="text-sm text-gray-500">Loading region popularity data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-white rounded-lg border border-gray-200">
        <AlertCircle className="w-5 h-5 text-[#EA4335] mr-2" />
        <p className="text-sm text-[#EA4335]">Error: {error}</p>
      </div>
    );
  }

  if (selectedDiseases.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">
          Select at least one disease to view region popularity
        </p>
      </div>
    );
  }

  if (markers.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">
          No region popularity data available for selected diseases
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-800 text-base">
              Interest by Region
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              See where your search terms were most popular. Values are on a scale
              from 0 to 100, where 100 is the location with the most popularity as a
              fraction of total searches.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Region selector – fixed to Worldwide for now */}
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>Region</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 bg-white text-xs text-gray-700"
              >
                Worldwide
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Sort dropdown – Interest for <disease> */}
            {sortDisease && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="text-gray-500">Sort:</span>
                <div className="relative">
                  <select
                    className="appearance-none pl-3 pr-7 py-1 rounded-full border border-gray-200 bg-white text-xs text-gray-800 font-medium cursor-pointer"
                    value={sortDisease}
                    onChange={(e) => setSortDisease(e.target.value)}
                  >
                    {selectedDiseases.map((disease) => (
                      <option key={disease} value={disease}>
                        Interest for {disease}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content: map left, ranked list right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0" style={{ minHeight: "500px" }}>
        {/* LEFT: Map + legend */}
        <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-gray-200">
          <div className="relative" style={{ height: "500px" }}>
            <MapContainer
              center={bounds ? undefined : [20, 0]}
              zoom={bounds ? undefined : 2}
              bounds={bounds || undefined}
              boundsOptions={{ padding: [50, 50] }}
              style={{ height: "100%", width: "100%", zIndex: 0 }}
              scrollWheelZoom={true}
            >
              <MapResizeHandler />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {markers.map((marker, index) => {
                const topRegion = marker.regions.sort((a, b) => b.score - a.score)[0];
                const diseaseColor = diseaseColorMap[topRegion.disease];

                return (
                  <Marker
                    key={`marker-${index}`}
                    position={marker.position}
                    icon={createPopularityIcon(
                      topRegion.score,
                      selectedDiseases.length === 1 ? undefined : diseaseColor
                    )}
                  >
                    <Tooltip
                      permanent={false}
                      direction="top"
                      offset={[0, -10]}
                      className="custom-tooltip"
                    >
                      <div className="p-2 min-w-[200px]">
                        <div className="font-semibold text-sm text-gray-900 mb-2">
                          {marker.regionName}
                        </div>
                        <div className="space-y-1.5">
                          {marker.regions
                            .sort((a, b) => b.score - a.score)
                            .map((region) => (
                              <div
                                key={region.disease}
                                className="flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                      backgroundColor:
                                        diseaseColorMap[region.disease] ||
                                        getPopularityColor(region.score),
                                    }}
                                  />
                                  <span className="text-gray-700 capitalize">
                                    {region.disease}
                                  </span>
                                </div>
                                <span
                                  className="font-bold"
                                  style={{
                                    color:
                                      diseaseColorMap[region.disease] ||
                                      getPopularityColor(region.score),
                                  }}
                                >
                                  {region.score}
                                </span>
                              </div>
                            ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-500">
                          Higher value = higher proportion of searches in this region
                        </div>
                      </div>
                    </Tooltip>

                    <Popup className="custom-popup" maxWidth={300}>
                      <div className="p-2">
                        <div className="font-semibold text-sm text-gray-900 mb-2">
                          {marker.regionName}
                        </div>
                        <div className="space-y-1.5">
                          {marker.regions
                            .sort((a, b) => b.score - a.score)
                            .map((region) => (
                              <div
                                key={region.disease}
                                className="flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                      backgroundColor:
                                        diseaseColorMap[region.disease] ||
                                        getPopularityColor(region.score),
                                    }}
                                  />
                                  <span className="text-gray-700 capitalize">
                                    {region.disease}
                                  </span>
                                </div>
                                <span
                                  className="font-bold"
                                  style={{
                                    color:
                                      diseaseColorMap[region.disease] ||
                                      getPopularityColor(region.score),
                                  }}
                                >
                                  {region.score}
                                </span>
                              </div>
                            ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-500">
                          Higher value = higher proportion of searches in this region
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Legend */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">Popularity Scale:</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#bfdbfe]" title="0-20" />
                  <div className="w-3 h-3 rounded-full bg-[#93c5fd]" title="21-40" />
                  <div className="w-3 h-3 rounded-full bg-[#60a5fa]" title="41-60" />
                  <div className="w-3 h-3 rounded-full bg-[#3b82f6]" title="61-80" />
                  <div className="w-3 h-3 rounded-full bg-[#1d4ed8]" title="81-100" />
                </div>
                <span className="text-xs text-gray-500">Low → High</span>
              </div>

              {selectedDiseases.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">Diseases:</span>
                  {selectedDiseases.map((disease, index) => (
                    <div key={disease} className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            DISEASE_COLORS[index % DISEASE_COLORS.length],
                        }}
                      />
                      <span className="text-xs text-gray-600 capitalize">
                        {disease}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Ranked regions list with stacked bars */}
        <div className="lg:col-span-5">
          <div className="h-full flex flex-col">
            <div className="px-5 pt-4 pb-2 border-b border-gray-200 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Showing top {Math.min(rankedRegions.length, 10)} of{" "}
                {rankedRegions.length} regions
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {rankedRegions.slice(0, 10).map((region, index) => {
                const sortScore = region.scores[sortDisease || ""] ?? 0;
                const maxScoreForRow = Math.max(
                  ...selectedDiseases.map((d) => region.scores[d] ?? 0),
                  1
                );

                return (
                  <div key={region.regionName} className="flex items-center gap-4">
                    <div className="w-6 text-xs text-gray-500">{index + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-800">
                          {region.regionName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round(sortScore)}
                        </span>
                      </div>

                      {/* Stacked bar */}
                      <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden flex">
                        {selectedDiseases.map((disease) => {
                          const score = region.scores[disease] ?? 0;
                          if (score <= 0) return null;

                          return (
                            <div
                              key={disease}
                              className="h-full"
                              style={{
                                width: `${(score / maxScoreForRow) * 100}%`,
                                backgroundColor:
                                  disease === sortDisease
                                    ? diseaseColorMap[disease]
                                    : `${diseaseColorMap[disease]}cc`,
                              }}
                              title={`${disease}: ${Math.round(score)}`}
                            />
                          );
                        })}
                      </div>

                      {selectedDiseases.length > 1 && (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {selectedDiseases.map((disease) => {
                            const score = region.scores[disease] ?? 0;
                            if (score <= 0) return null;
                            return (
                              <div
                                key={`${region.regionName}-${disease}`}
                                className="flex items-center gap-1 text-[10px] text-gray-600"
                              >
                                <span
                                  className="inline-block w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor: diseaseColorMap[disease],
                                  }}
                                />
                                <span className="capitalize">{disease}</span>
                                <span className="text-gray-400">
                                  {Math.round(score)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

