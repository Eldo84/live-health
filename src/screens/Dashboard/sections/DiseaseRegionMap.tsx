import React, { useMemo } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { useGoogleTrendsRegions } from "../../../lib/useGoogleTrendsRegions";
import { AlertCircle, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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
        regions: Array<{
          disease: string;
          region: string;
          score: number;
        }>;
      }
    >();

    regionData.forEach((diseaseData) => {
      diseaseData.regions.forEach((region) => {
        if (!region.coordinates) return; // Skip regions without coordinates

        const key = `${region.coordinates[0]},${region.coordinates[1]}`;
        if (!markerMap.has(key)) {
          markerMap.set(key, {
            position: region.coordinates,
            regions: [],
          });
        }

        markerMap.get(key)!.regions.push({
          disease: diseaseData.disease,
          region: region.region,
          score: region.popularity_score,
        });
      });
    });

    return Array.from(markerMap.values());
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
        </div>
      </div>

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
            // For multiple diseases, show the highest score or use first disease color
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
                <Popup className="custom-popup" maxWidth={300}>
                  <div className="p-2">
                    <div className="font-semibold text-sm text-gray-900 mb-2">
                      {marker.regions[0].region}
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
  );
};

