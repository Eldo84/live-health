import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { useCountryRiskPoints } from "../../../lib/useRegionalRiskLevels";
import { AlertCircle, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "../../../contexts/LanguageContext";

const RISK_COLORS = {
  low: "#4ade80",
  medium: "#fbbf24",
  high: "#fb923c",
  critical: "#f87171",
};

// RISK_LABELS will be translated in component

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
    
    window.addEventListener('resize', invalidateSize);
    return () => {
      window.removeEventListener('resize', invalidateSize);
    };
  }, [map]);
  return null;
};

// Create custom icon based on risk level
const createRiskIcon = (riskLevel: "low" | "medium" | "high" | "critical", size: number = 12) => {
  const color = RISK_COLORS[riskLevel];
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-1}"
          fill="${color}" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>
      </svg>`
    )}`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
  });
};

interface GlobalHealthMapProps {
  timeRange?: string;
  countryId?: string | null;
}

export const GlobalHealthMap = ({ timeRange = "30d", countryId }: GlobalHealthMapProps): JSX.Element => {
  const { points, loading, error } = useCountryRiskPoints(timeRange, countryId);
  const { t } = useLanguage();

  const RISK_LABELS = {
    low: t("dashboard.low"),
    medium: t("dashboard.medium"),
    high: t("dashboard.high"),
    critical: t("dashboard.critical"),
  };

  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <CardHeader className="pb-4">
        <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
          {t("dashboard.globalHealthHeatmap")}
        </h3>
        <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
          {t("dashboard.riskLevelsByRegion")}
        </p>
      </CardHeader>
      <CardContent style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="w-6 h-6 text-[#66dbe1] animate-spin" />
            <span className="ml-2 [font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-sm">
              {t("dashboard.loadingRiskData")}
            </span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[300px] text-[#f87171]">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="[font-family:'Roboto',Helvetica] font-normal text-sm">
              {error}
            </span>
          </div>
        ) : points.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-[#ebebeb99]">
            <span className="[font-family:'Roboto',Helvetica] font-normal text-sm">
              {t("dashboard.noRiskData")}
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* World Map */}
            <div className="relative w-full h-[350px] bg-[#ffffff] rounded-lg overflow-hidden border border-[#374151]">
              <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: "100%", width: "100%", zIndex: 0 }}
                scrollWheelZoom={false}
                zoomControl={true}
              >
                <MapResizeHandler />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {points.map((point, index) => (
                  <Marker
                    key={`${point.name}-${index}`}
                    position={point.position}
                    icon={createRiskIcon(point.riskLevel, 14)}
                  >
                    <Popup className="custom-popup">
                      <div className="[font-family:'Roboto',Helvetica] text-sm">
                        <div className="font-semibold text-[#2a4149] mb-1">
                          {point.name}
                        </div>
                        <div className="text-xs text-[#2a4149] space-y-0.5">
                          <div>
                            <span className="font-medium">{t("dashboard.region")}:</span> {point.region}
                          </div>
                          <div>
                            <span className="font-medium">{t("dashboard.risk")}:</span>{" "}
                            <span
                              style={{ color: RISK_COLORS[point.riskLevel] }}
                              className="font-semibold"
                            >
                              {RISK_LABELS[point.riskLevel]}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">{t("dashboard.outbreaks")}:</span> {point.outbreakCount}
                          </div>
                          {point.totalCases > 0 && (
                            <div>
                              <span className="font-medium">{t("dashboard.cases")}:</span> {point.totalCases.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Risk Level Legend - Moved to bottom */}
            <div className="flex items-center justify-between bg-[#00000099] backdrop-blur-sm rounded-lg p-2.5">
              <span className="[font-family:'Roboto',Helvetica] font-medium text-[#ffffff] text-xs">
                {t("dashboard.riskLevel")}:
              </span>
              <div className="flex items-center gap-2">
                {Object.entries(RISK_COLORS).map(([level, color]) => (
                  <div key={level} className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs">
                      {RISK_LABELS[level as keyof typeof RISK_LABELS]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
