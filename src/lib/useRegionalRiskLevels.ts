import { useEffect, useState } from "react";
import { geocodeLocation } from "./geocode";

export interface RegionalRiskData {
  region: string;
  outbreakCount: number;
  totalCases: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  maxSeverity: number;
  countries: Array<{
    name: string;
    outbreakCount: number;
    totalCases: number;
    riskLevel: "low" | "medium" | "high" | "critical";
    position?: [number, number];
  }>;
}

export interface CountryRiskPoint {
  name: string;
  position: [number, number];
  outbreakCount: number;
  totalCases: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  region: string;
}

// Map countries to continents manually as fallback (when continent data isn't in database)
// Note: This should ideally use the continent field from the countries table
const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // North America
  "United States": "Americas",
  "Canada": "Americas",
  "Mexico": "Americas",
  // Central America
  "Guatemala": "Americas",
  "Belize": "Americas",
  "El Salvador": "Americas",
  "Honduras": "Americas",
  "Nicaragua": "Americas",
  "Costa Rica": "Americas",
  "Panama": "Americas",
  // Caribbean
  "Cuba": "Americas",
  "Jamaica": "Americas",
  "Haiti": "Americas",
  "Dominican Republic": "Americas",
  "Puerto Rico": "Americas",
  "Trinidad and Tobago": "Americas",
  // South America
  "Brazil": "Americas",
  "Argentina": "Americas",
  "Chile": "Americas",
  "Colombia": "Americas",
  "Peru": "Americas",
  "Venezuela": "Americas",
  "Ecuador": "Americas",
  "Bolivia": "Americas",
  "Paraguay": "Americas",
  "Uruguay": "Americas",
  "Guyana": "Americas",
  "Suriname": "Americas",
  "French Guiana": "Americas",
  // Europe
  "United Kingdom": "Europe",
  "Ireland": "Europe",
  "France": "Europe",
  "Germany": "Europe",
  "Netherlands": "Europe",
  "Czech Republic": "Europe",
  "Spain": "Europe",
  "Italy": "Europe",
  "Poland": "Europe",
  "Russia": "Europe",
  "Belgium": "Europe",
  "Greece": "Europe",
  "Austria": "Europe",
  // Asia
  "China": "Asia",
  "India": "Asia",
  "Japan": "Asia",
  "South Korea": "Asia",
  "Malaysia": "Asia",
  "Pakistan": "Asia",
  "Bangladesh": "Asia",
  "Maldives": "Asia",
  "Singapore": "Asia",
  "Thailand": "Asia",
  "Indonesia": "Asia",
  "Philippines": "Asia",
  "Vietnam": "Asia",
  "Taiwan": "Asia",
  "Palestine": "Asia",
  "Jordan": "Asia",
  "Saudi Arabia": "Asia",
  // Oceania
  "Australia": "Oceania",
  "New Zealand": "Oceania",
  // Africa
  "Nigeria": "Africa",
  "South Africa": "Africa",
  "South Sudan": "Africa",
  "Kenya": "Africa",
  "Egypt": "Africa",
  "Ghana": "Africa",
  "Ethiopia": "Africa",
  "Tanzania": "Africa",
  "Togo": "Africa",
};

// Get continent from country data (prefer database value, fallback to manual mapping)
function getContinent(countryName: string, countryContinent?: string): string {
  // Use continent from database if available and valid (not "Unknown")
  if (countryContinent) {
    // Normalize common variations
    const normalized = countryContinent.trim();
    
    // Skip if continent is "Unknown" or empty - use fallback instead
    if (normalized === "" || normalized.toLowerCase() === "unknown") {
      // Fall through to manual mapping
    } else if (normalized === "North America" || normalized === "South America" || normalized === "Central America") {
      return "Americas";
    } else {
      // Return the continent from database (should be one of: Africa, Asia, Europe, Americas, Oceania)
      return normalized;
    }
  }
  
  // Fallback to manual mapping (case-insensitive match for better compatibility)
  const countryLower = countryName.toLowerCase();
  for (const [key, value] of Object.entries(COUNTRY_TO_CONTINENT)) {
    if (key.toLowerCase() === countryLower) {
      return value;
    }
  }
  
  // If still no match, return "Other" (never return "Unknown")
  // Log in development to help identify missing countries
  if (process.env.NODE_ENV === 'development') {
    console.warn(`No continent mapping found for country: "${countryName}" (continent from DB: "${countryContinent || 'null'}"), using "Other"`);
  }
  return "Other";
}

function calculateRiskLevel(
  outbreakCount: number,
  totalCases: number,
  maxSeverity: number
): "low" | "medium" | "high" | "critical" {
  // Risk calculation based on multiple factors
  let riskScore = 0;
  
  // Outbreak count factor (0-40 points)
  if (outbreakCount >= 50) riskScore += 40;
  else if (outbreakCount >= 20) riskScore += 30;
  else if (outbreakCount >= 10) riskScore += 20;
  else if (outbreakCount >= 5) riskScore += 10;
  
  // Case count factor (0-30 points)
  if (totalCases >= 10000) riskScore += 30;
  else if (totalCases >= 1000) riskScore += 20;
  else if (totalCases >= 100) riskScore += 10;
  else if (totalCases >= 10) riskScore += 5;
  
  // Severity factor (0-30 points)
  if (maxSeverity >= 4) riskScore += 30;
  else if (maxSeverity >= 3) riskScore += 20;
  else if (maxSeverity >= 2) riskScore += 10;
  
  // Determine risk level
  if (riskScore >= 70) return "critical";
  if (riskScore >= 50) return "high";
  if (riskScore >= 30) return "medium";
  return "low";
}

export function useRegionalRiskLevels(timeRange: string = "30d", countryId?: string | null) {
  const [data, setData] = useState<RegionalRiskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchRiskLevels() {
      try {
        setLoading(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Missing Supabase configuration");
        }

        // Calculate date range
        const now = new Date();
        const timeRanges: Record<string, number> = {
          "24h": 1,
          "7d": 7,
          "30d": 30,
          "1y": 365,
        };

        const days = timeRanges[timeRange] || 30;
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        // Fetch outbreak signals with country data and coordinates
        // IMPORTANT: Include continent field from countries table to properly categorize regions
        const params = new URLSearchParams();
        params.set(
          "select",
          "id,case_count_mentioned,severity_assessment,country_id,latitude,longitude,countries!country_id(name,continent)"
        );
        params.set("detected_at", `gte.${startDate.toISOString()}`);
        
        // Add country filter if provided
        if (countryId) {
          params.set('country_id', `eq.${countryId}`);
        }

        const url = `${supabaseUrl}/rest/v1/outbreak_signals?${params.toString()}`;
        const response = await fetch(url, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch risk levels: ${response.statusText}`);
        }

        const signals: any[] = await response.json();
        
        // Debug: Log sample signal to check structure
        if (process.env.NODE_ENV === 'development' && signals.length > 0) {
          console.log('Sample signal structure:', JSON.stringify(signals[0], null, 2));
        }

        // Group by country (store continent info with each country)
        const countryData = new Map<
          string,
          {
            outbreakCount: number;
            totalCases: number;
            maxSeverity: number;
            coordinates: Array<[number, number]>;
            continent?: string; // Store continent for each country
          }
        >();

        signals.forEach((signal: any) => {
          const country = Array.isArray(signal.countries)
            ? signal.countries[0]
            : signal.countries;
          if (!country || !country.name) return;

          const countryName = country.name;
          const countryContinent = country.continent; // Get continent from database
          
          const cases = signal.case_count_mentioned || 0;
          const severity = signal.severity_assessment || "low";
          const severityNum =
            severity === "critical"
              ? 4
              : severity === "high"
              ? 3
              : severity === "medium"
              ? 2
              : 1;

          if (!countryData.has(countryName)) {
            countryData.set(countryName, {
              outbreakCount: 0,
              totalCases: 0,
              maxSeverity: 0,
              coordinates: [],
              continent: countryContinent, // Store continent
            });
          }

          const data = countryData.get(countryName)!;
          data.outbreakCount++;
          data.totalCases += cases;
          data.maxSeverity = Math.max(data.maxSeverity, severityNum);
          // Update continent if we get a value (may not have been set initially)
          if (countryContinent && !data.continent) {
            data.continent = countryContinent;
          }
          
          // Collect coordinates if available
          if (signal.latitude && signal.longitude) {
            const lat = parseFloat(signal.latitude);
            const lng = parseFloat(signal.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              data.coordinates.push([lat, lng]);
            }
          }
        });

        // Group countries by continent
        const regionData = new Map<string, RegionalRiskData>();

        countryData.forEach((countryStats, countryName) => {
          // Use continent from database if available, otherwise fallback to mapping
          const continent = getContinent(countryName, countryStats.continent);
          
          // Debug logging (only in development)
          if (process.env.NODE_ENV === 'development' && continent === "Other") {
            console.warn(`Country "${countryName}" has no continent from DB ("${countryStats.continent || 'null'}") and no manual mapping; using "Other".`);
          }
          const countryRisk = calculateRiskLevel(
            countryStats.outbreakCount,
            countryStats.totalCases,
            countryStats.maxSeverity
          );

          if (!regionData.has(continent)) {
            regionData.set(continent, {
              region: continent,
              outbreakCount: 0,
              totalCases: 0,
              riskLevel: "low",
              maxSeverity: 0,
              countries: [],
            });
          }

          const region = regionData.get(continent)!;
          region.outbreakCount += countryStats.outbreakCount;
          region.totalCases += countryStats.totalCases;
          region.maxSeverity = Math.max(region.maxSeverity, countryStats.maxSeverity);
          
          // Calculate average position or use geocode lookup
          let position: [number, number] | undefined;
          if (countryStats.coordinates.length > 0) {
            // Use average of all coordinates
            const avgLat = countryStats.coordinates.reduce((sum, [lat]) => sum + lat, 0) / countryStats.coordinates.length;
            const avgLng = countryStats.coordinates.reduce((sum, [, lng]) => sum + lng, 0) / countryStats.coordinates.length;
            position = [avgLat, avgLng];
          } else {
            // Fallback to geocode lookup
            position = geocodeLocation(countryName) || undefined;
          }
          
          region.countries.push({
            name: countryName,
            outbreakCount: countryStats.outbreakCount,
            totalCases: countryStats.totalCases,
            riskLevel: countryRisk,
            position,
          });
        });

        // Calculate region risk levels and sort
        const regions: RegionalRiskData[] = Array.from(regionData.values())
          .map((region) => ({
            ...region,
            riskLevel: calculateRiskLevel(
              region.outbreakCount,
              region.totalCases,
              region.maxSeverity
            ),
            countries: region.countries.sort(
              (a, b) => b.outbreakCount - a.outbreakCount
            ),
          }))
          .sort((a, b) => {
            // Sort by risk level first, then by outbreak count
            const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const riskDiff = riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
            if (riskDiff !== 0) return riskDiff;
            return b.outbreakCount - a.outbreakCount;
          });

        if (!active) return;

        setData(regions);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        console.error("Error fetching regional risk levels:", err);
        setError(err.message || "Failed to load risk level data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchRiskLevels();

    return () => {
      active = false;
    };
  }, [timeRange, countryId]);

  return { data, loading, error };
}

// Hook to get country points for map visualization
export function useCountryRiskPoints(timeRange: string = "30d", countryId?: string | null) {
  const { data, loading, error } = useRegionalRiskLevels(timeRange, countryId);
  const [points, setPoints] = useState<CountryRiskPoint[]>([]);

  useEffect(() => {
    if (!data || data.length === 0) {
      setPoints([]);
      return;
    }

    const countryPoints: CountryRiskPoint[] = [];
    data.forEach((region) => {
      region.countries.forEach((country) => {
        if (country.position) {
          countryPoints.push({
            name: country.name,
            position: country.position,
            outbreakCount: country.outbreakCount,
            totalCases: country.totalCases,
            riskLevel: country.riskLevel,
            region: region.region,
          });
        }
      });
    });

    setPoints(countryPoints);
  }, [data]);

  return { points, loading, error };
}

