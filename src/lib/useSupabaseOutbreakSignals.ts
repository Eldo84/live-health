import React, { useEffect, useState, useMemo } from "react";
import { FilterState } from "../screens/HomePageMap/sections/FilterPanel";
import { calculateDistance } from "./utils";

export interface OutbreakSignal {
  id: string;
  disease: string;
  location: string;
  city?: string;
  category: string;
  pathogen?: string;
  keywords: string;
  position: [number, number];
  date?: string;
  url?: string;
  title?: string;
  source?: string; // News source name
  severity?: string;
  confidence?: number;
}

const DATE_RANGE_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "14d": 14 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "6m": 6 * 30 * 24 * 60 * 60 * 1000, // Approximate
  "1y": 365 * 24 * 60 * 60 * 1000,
};

// Category name mappings for variations (e.g., "veterinary outbreak" -> "Veterinary Outbreaks")
const CATEGORY_VARIATIONS: Record<string, string> = {
  "veterinary outbreak": "Veterinary Outbreaks",
  "veterinary outbreaks": "Veterinary Outbreaks",
  "zoonotic outbreak": "Zoonotic Outbreaks",
  "zoonotic outbreaks": "Zoonotic Outbreaks",
  "emerging & re-emerging disease outbreaks": "Emerging Infectious Diseases",
  "emerging and re-emerging disease outbreaks": "Emerging Infectious Diseases",
  "sexually transmitted outbreaks": "Sexually Transmitted Infections",
  "sexually transmitted infections": "Sexually Transmitted Infections",
};

// Normalize category name for comparison (case-insensitive, handles variations)
function normalizeCategoryForComparison(category: string | null | undefined): string {
  if (!category) return "";
  
  const trimmed = category.trim();
  const lower = trimmed.toLowerCase();
  
  // Check variations mapping first
  if (CATEGORY_VARIATIONS[lower]) {
    return CATEGORY_VARIATIONS[lower];
  }
  
  // Handle case-insensitive matching for known categories
  const knownCategories = [
    "Foodborne Outbreaks",
    "Waterborne Outbreaks",
    "Vector-Borne Outbreaks",
    "Airborne Outbreaks",
    "Contact Transmission",
    "Healthcare-Associated Infections",
    "Zoonotic Outbreaks",
    "Sexually Transmitted Infections",
    "Vaccine-Preventable Diseases",
    "Emerging Infectious Diseases",
    "Veterinary Outbreaks",
    "Neurological Outbreaks",
    "Respiratory Outbreaks",
    "Other"
  ];
  
  // Find case-insensitive match
  for (const knownCategory of knownCategories) {
    if (knownCategory.toLowerCase() === lower) {
      return knownCategory;
    }
  }
  
  // Handle partial matches (e.g., "veterinary" should match "Veterinary Outbreaks")
  for (const knownCategory of knownCategories) {
    const knownLower = knownCategory.toLowerCase();
    // Check if the category contains the key word or vice versa
    if (lower.includes(knownLower.replace(" outbreaks", "")) || 
        knownLower.includes(lower.replace(" outbreak", "").replace(" outbreaks", ""))) {
      // Special handling for veterinary/zoonotic
      if (lower.includes("veterinary") && knownCategory === "Veterinary Outbreaks") {
        return "Veterinary Outbreaks";
      }
      if (lower.includes("zoonotic") && knownCategory === "Zoonotic Outbreaks") {
        return "Zoonotic Outbreaks";
      }
      // Special handling for sexually transmitted variations
      if (lower.includes("sexually transmitted") && knownCategory === "Sexually Transmitted Infections") {
        return "Sexually Transmitted Infections";
      }
    }
  }
  
  // Handle composite categories that start with known categories
  // e.g., "Sexually Transmitted Outbreaks, Bloodborne Outbreaks" -> "Sexually Transmitted Infections"
  if (trimmed.includes(',')) {
    const firstCategory = trimmed.split(',')[0].trim();
    const firstLower = firstCategory.toLowerCase();
    
    // Check variations mapping for the first category
    if (CATEGORY_VARIATIONS[firstLower]) {
      return CATEGORY_VARIATIONS[firstLower];
    }
    
    // Handle specific composite category patterns
    if (firstLower.includes("sexually transmitted")) {
      return "Sexually Transmitted Infections";
    }
    if (firstLower.includes("veterinary")) {
      return "Veterinary Outbreaks";
    }
    if (firstLower.includes("zoonotic")) {
      return "Zoonotic Outbreaks";
    }
    if (firstLower.includes("emerging") && (firstLower.includes("re-emerging") || firstLower.includes("reemerging"))) {
      return "Emerging Infectious Diseases";
    }
    
    // For other composite categories, check if first part matches a known category
    for (const knownCategory of knownCategories) {
      const knownLower = knownCategory.toLowerCase();
      if (firstLower === knownLower || firstLower.includes(knownLower.replace(" outbreaks", "").replace(" infections", ""))) {
        return knownCategory;
      }
    }
  }
  
  // Return original if no match found
  return trimmed;
}

// Extract all categories from a composite category string
function extractCategories(category: string): string[] {
  if (!category) return [];
  // Split by comma and normalize each part
  return category.split(',').map(cat => {
    const trimmed = cat.trim();
    const normalized = normalizeCategoryForComparison(trimmed);
    return normalized;
  }).filter(Boolean);
}

// Check if two category names match (handles variations and case)
export function categoriesMatch(category1: string | null | undefined, category2: string | null | undefined): boolean {
  if (!category1 || !category2) return false;
  
  const normalized1 = normalizeCategoryForComparison(category1);
  const normalized2 = normalizeCategoryForComparison(category2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) return true;
  
  // Case-insensitive match after normalization
  if (normalized1.toLowerCase() === normalized2.toLowerCase()) return true;
  
  // Handle composite categories - check if any part of category1 matches category2
  if (category1.includes(',')) {
    const categories1 = extractCategories(category1);
    if (categories1.includes(normalized2)) return true;
  }
  if (category2.includes(',')) {
    const categories2 = extractCategories(category2);
    if (categories2.includes(normalized1)) return true;
  }
  
  // Check if both contain the same keyword (for veterinary/zoonotic variations)
  const lower1 = category1.toLowerCase();
  const lower2 = category2.toLowerCase();
  
  // Special handling for veterinary: "veterinary outbreak" should match "Veterinary Outbreaks"
  if (lower1.includes("veterinary") && lower2.includes("veterinary")) {
    return true;
  }
  
  // Special handling for zoonotic: "zoonotic outbreak" should match "Zoonotic Outbreaks"
  if (lower1.includes("zoonotic") && lower2.includes("zoonotic")) {
    return true;
  }
  
  // Special handling for sexually transmitted: "Sexually Transmitted Outbreaks" should match "Sexually Transmitted Infections"
  if (lower1.includes("sexually transmitted") && lower2.includes("sexually transmitted")) {
    return true;
  }
  
  // Special handling for emerging diseases
  if (lower1.includes("emerging") && lower2.includes("emerging")) {
    // Check if both are about re-emerging or both are about emerging infectious diseases
    const bothReEmerging = (lower1.includes("re-emerging") || lower1.includes("reemerging")) && 
                           (lower2.includes("re-emerging") || lower2.includes("reemerging"));
    const bothEmerging = lower1.includes("infectious") && lower2.includes("infectious");
    if (bothReEmerging || bothEmerging || (lower1.includes("re-emerging") && lower2.includes("infectious"))) {
      return true;
    }
  }
  
  return false;
}

export function useSupabaseOutbreakSignals(filters?: FilterState | null) {
  const [allSignals, setAllSignals] = useState<OutbreakSignal[]>([]); // Store ALL signals
  const [signals, setSignals] = useState<OutbreakSignal[]>([]); // Filtered signals
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastDateRangeRef = React.useRef<string | null>(null);
  const hasFetchedRef = React.useRef(false);
  const fetchIdRef = React.useRef(0);

  // Filter signals client-side (instant, no database call)
  // Use useMemo for performance - only recalculate when filters or allSignals change
  const filteredSignals = useMemo(() => {
    if (allSignals.length === 0) {
      // Debug: Log when allSignals is empty
      if (loading === false) {
        console.log('⚠️ allSignals is empty and loading is false - no data available');
      }
      return [];
    }
    
    console.log('🔍 Filtering', allSignals.length, 'signals with filters:', {
      country: filters?.country,
      diseaseSearch: filters?.diseaseSearch,
      category: filters?.category
    });

    let filtered = allSignals;

    // Apply date range filter client-side using the normalized signal date
    if (filters?.dateRange) {
      const rangeMs = DATE_RANGE_MS[filters.dateRange];
      if (rangeMs) {
        const cutoff = Date.now() - rangeMs;
        filtered = filtered.filter(signal => {
          if (!signal.date) {
            return false;
          }
          const signalTime = Date.parse(signal.date);
          if (Number.isNaN(signalTime)) {
            return false;
          }
          return signalTime >= cutoff;
        });
      }
    }

    // Filter by category (client-side)
    // Category filter is separate from disease type filter - only filter by category name
    if (filters?.category) {
      filtered = filtered.filter(s => {
        // Check both normalized category and original category name for composite categories
        const originalCategory = (s as any).originalCategoryName;
        if (originalCategory && originalCategory !== s.category) {
          // If we have the original category (which might be composite), check it too
          return categoriesMatch(originalCategory, filters.category) || categoriesMatch(s.category, filters.category);
        }
        return categoriesMatch(s.category, filters.category);
      });
    }

    // Filter by country (client-side)
    if (filters?.country) {
      const countryFilter = filters.country.toLowerCase().trim();
      filtered = filtered.filter(s => {
        const signalCountry = (s as any).countryName?.toLowerCase().trim() || '';
        const locationLower = s.location.toLowerCase().trim();
        
        // Handle common aliases (optimized checks)
        if (countryFilter.includes('united states') || countryFilter.includes('usa') || countryFilter === 'us') {
          return signalCountry.includes('united states') ||
                 locationLower.includes('united states') || 
                 locationLower.includes('usa') || 
                 locationLower.includes(', us') ||
                 locationLower.includes(' u.s.') ||
                 locationLower.endsWith(', us');
        }
        if (countryFilter.includes('united kingdom') || countryFilter === 'uk') {
          return signalCountry.includes('united kingdom') ||
                 locationLower.includes('united kingdom') || 
                 locationLower.includes(' uk') ||
                 locationLower.includes(', uk') ||
                 locationLower.endsWith(', uk');
        }
        
        // Quick exact match first
        if (signalCountry === countryFilter) return true;
        
        // Then partial matches
        return signalCountry.includes(countryFilter) ||
               countryFilter.includes(signalCountry) ||
               locationLower.includes(countryFilter);
      });
    }

    // Filter by disease search (client-side)
    if (filters?.diseaseSearch && filters.diseaseSearch.trim()) {
      const searchTerm = filters.diseaseSearch.toLowerCase().trim();
      const countryName = filters?.country?.toLowerCase().trim();
      
      // Skip if search term matches country name
      const isCountryMatch = countryName && (
        searchTerm === countryName ||
        (searchTerm === 'usa' && countryName.includes('united states')) ||
        (searchTerm === 'us' && countryName.includes('united states')) ||
        (searchTerm === 'uk' && countryName.includes('united kingdom'))
      );
      
      if (!isCountryMatch) {
        // Precompute lowercase strings once for better performance
        filtered = filtered.filter(s => {
          const detectedDisease = (s as any).detectedDiseaseName?.toLowerCase() || '';
          const diseaseLower = s.disease.toLowerCase();
          const keywordsLower = s.keywords.toLowerCase();
          const pathogenLower = (s.pathogen || '').toLowerCase();
          const titleLower = (s.title || '').toLowerCase();
          
          const fields = [diseaseLower, detectedDisease, keywordsLower, pathogenLower, titleLower];

          // Direct substring match
          const substringMatch = fields.some(field => field.includes(searchTerm));
          if (substringMatch) return true;

          // Prefix match on individual words (supports first-letter searches)
          const prefixMatch = fields.some(field =>
            field
              .split(/[\s,;:()/\-]+/)
              .filter(Boolean)
              .some((word: string) => word.startsWith(searchTerm))
          );

          return prefixMatch;
        });
      }
    }

    // Filter by distance from user location (near me) - client-side
    if (filters?.nearMe && filters.nearMe.coordinates && filters.nearMe.radiusKm > 0) {
      const [userLat, userLon] = filters.nearMe.coordinates;
      const radiusKm = filters.nearMe.radiusKm;
      
      filtered = filtered.filter(s => {
        const [signalLat, signalLon] = s.position;
        const distance = calculateDistance(userLat, userLon, signalLat, signalLon);
        return distance <= radiusKm;
      });
      
      console.log(`📍 Filtered by distance: ${filtered.length} signals within ${radiusKm}km`);
    }

    // Filter by disease type (client-side)
    if (filters?.diseaseType && filters.diseaseType !== "all") {
      filtered = filtered.filter(s => {
        let diseaseType = (s as any).diseaseType;
        const detectedDiseaseName = (s as any).detectedDiseaseName;
        const signalCategory = s.category?.toLowerCase() || '';
        const originalCategory = ((s as any).originalCategoryName || s.category || '').toLowerCase();
        
        // For "OTHER" diseases (indicated by presence of detected_disease_name),
        // infer type from detected_disease_name if available
        if (detectedDiseaseName) {
          const lowerName = detectedDiseaseName.toLowerCase();
          // Veterinary keywords
          const veterinaryKeywords = [
            "cattle", "livestock", "animal", "livestock disease", "animal disease",
            "swine", "pig", "poultry", "chicken", "bird", "goat", "sheep", "cow",
            "veterinary", "herd", "flock", "livestock outbreak", "animal outbreak"
          ];
          // Zoonotic keywords (affects both)
          const zoonoticKeywords = [
            "avian influenza", "bird flu", "rabies", "anthrax", "leptospirosis",
            "q fever", "rift valley fever", "brucellosis", "salmonella"
          ];
          
          // Check for zoonotic first (more specific)
          if (zoonoticKeywords.some(keyword => lowerName.includes(keyword))) {
            diseaseType = "zoonotic";
          } else if (veterinaryKeywords.some(keyword => lowerName.includes(keyword))) {
            diseaseType = "veterinary";
          }
        }
        
        // Also check category to match disease type
        // If category indicates veterinary/zoonotic, include it even if disease_type doesn't match
        const hasVeterinaryCategory = signalCategory.includes("veterinary") || originalCategory.includes("veterinary");
        const hasZoonoticCategory = signalCategory.includes("zoonotic") || originalCategory.includes("zoonotic");
        
        if (filters.diseaseType === "human") {
          // Human: exclude veterinary and zoonotic (by type or category)
          if (diseaseType === "veterinary" || diseaseType === "zoonotic" || hasVeterinaryCategory || hasZoonoticCategory) {
            return false;
          }
          return diseaseType === "human" || diseaseType === null || diseaseType === undefined; // Default to human if not set
        } else if (filters.diseaseType === "veterinary") {
          // Veterinary: include if disease_type is veterinary OR category is veterinary
          return diseaseType === "veterinary" || hasVeterinaryCategory;
        } else if (filters.diseaseType === "zoonotic") {
          // Zoonotic: include if disease_type is zoonotic OR category is zoonotic
          return diseaseType === "zoonotic" || hasZoonoticCategory;
        }
        return true;
      });
    }

    console.log('✅ Filtered to', filtered.length, 'signals');
    return filtered;
  }, [allSignals, filters?.category, filters?.country, filters?.diseaseSearch, filters?.diseaseType, filters?.nearMe, loading]);
  
  // Update signals state when filtered results change
  useEffect(() => {
    // Always update signals with filtered results
    // If filters are cleared, filteredSignals will be allSignals again
    setSignals(filteredSignals);
    
    // Debug: Log when filtering results in 0 signals (but allSignals has data)
    if (filteredSignals.length === 0 && allSignals.length > 0) {
      console.log('⚠️ Filtered to 0 signals, but allSignals has', allSignals.length, 'signals');
      console.log('Active filters:', {
        country: filters?.country,
        diseaseSearch: filters?.diseaseSearch,
        category: filters?.category,
        dateRange: filters?.dateRange
      });
      console.log('Sample countries in allSignals:', 
        Array.from(new Set(allSignals.slice(0, 50).map(s => (s as any).countryName))).filter(Boolean).slice(0, 10));
    }
  }, [filteredSignals, allSignals.length, filters]);

  // Fetch data from database (only when dateRange changes or on mount)
  useEffect(() => {
    let active = true;
    let intervalId: number | null = null;

    async function fetchSignals(isInitial = false) {
      try {
        const fetchId = ++fetchIdRef.current;
        console.log('🚀 fetchSignals called, isInitial:', isInitial, 'active:', active, 'fetchId:', fetchId);
        if (isInitial) {
          setLoading(true);
        }
        const envVars = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env ?? import.meta.env;
        const supabaseUrl = envVars?.VITE_SUPABASE_URL;
        const supabaseKey = envVars?.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
        }

        // Calculate date range filter (server-side) only for short ranges to reduce payload
        let dateFilter: string | null = null;
        if (filters?.dateRange === "24h" || filters?.dateRange === "7d") {
          const rangeMs = DATE_RANGE_MS[filters.dateRange];
          if (rangeMs) {
            dateFilter = new Date(Date.now() - rangeMs).toISOString();
          }
        }

        // Build query using PostgREST syntax
        // NOTE: We no longer filter by country at DB level - we fetch all data and filter client-side
        // This allows instant filtering without database round trips
        const selectClause = `*,city,detected_disease_name,diseases!disease_id(name,color_code,description,disease_type),countries!country_id(name,code),news_articles!article_id(title,url,published_at,source_id,news_sources(name))`;
        
        // Build query string - URLSearchParams handles encoding properly
        const queryParams = new URLSearchParams();
        queryParams.set('select', selectClause);
        queryParams.set('latitude', 'not.is.null');
        queryParams.set('longitude', 'not.is.null');
        if (dateFilter) {
          queryParams.set('detected_at', `gte.${dateFilter}`);
        }
        // NO country filter at DB level - fetch all data for client-side filtering
        queryParams.set('order', 'detected_at.desc');
        // Default to last 30 days if no date filter to reduce payload size
        if (!dateFilter) {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          queryParams.set('detected_at', `gte.${thirtyDaysAgo}`);
        }
        queryParams.set('limit', '5000'); // Reduced from 10000 to save bandwidth
        
        let query = `${supabaseUrl}/rest/v1/outbreak_signals?${queryParams.toString()}`;

        console.log('📡 Fetching from:', query.substring(0, 100) + '...');
        
        const response = await fetch(query, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Supabase query error:', response.status, response.statusText, errorText);
          throw new Error(`Failed to fetch outbreak signals: ${response.statusText}`);
        }

        const data: any[] = await response.json();
        console.log('📦 Raw data received:', data.length, 'signals');
        
        // Fetch category and pathogen mappings in parallel for better performance
        const [categoryResponse, pathogenResponse] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/disease_categories?select=disease_id,outbreak_categories!category_id(name,color)`, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }),
          fetch(`${supabaseUrl}/rest/v1/disease_pathogens?select=disease_id,pathogens!pathogen_id(name,type)&is_primary=eq.true`, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          })
        ]);
        
        // Parse category mapping
        let diseaseCategoryMap: Record<string, { name: string; color: string }> = {};
        if (categoryResponse.ok) {
          const categoryData: any[] = await categoryResponse.json();
          categoryData.forEach((cat: any) => {
            const catObj = cat.outbreak_categories;
            let categoryName: string | undefined;
            let categoryColor: string | undefined;
            
            if (Array.isArray(catObj) && catObj.length > 0) {
              categoryName = catObj[0]?.name;
              categoryColor = catObj[0]?.color;
            } else if (catObj && typeof catObj === 'object') {
              categoryName = catObj.name;
              categoryColor = catObj.color;
            }
            
            if (categoryName && cat.disease_id) {
              diseaseCategoryMap[cat.disease_id] = {
                name: categoryName,
                color: categoryColor || '#66dbe1',
              };
            }
          });
        }

        // Parse pathogen mapping
        let diseasePathogenMap: Record<string, string> = {};
        if (pathogenResponse.ok) {
          const pathogenData: any[] = await pathogenResponse.json();
          pathogenData.forEach((p: any) => {
            const pathogenObj = p.pathogens;
            let pathogenName: string | undefined;
            
            if (Array.isArray(pathogenObj) && pathogenObj.length > 0) {
              pathogenName = pathogenObj[0]?.name;
            } else if (pathogenObj && typeof pathogenObj === 'object') {
              pathogenName = pathogenObj.name;
            }
            
            if (pathogenName && p.disease_id) {
              diseasePathogenMap[p.disease_id] = pathogenName;
            }
          });
        }
        
        // Transform to map format
        console.log('🔄 Transforming', data.length, 'raw signals... (fetchId:', fetchId, ')');
        let transformed: OutbreakSignal[] = [];
        try {
          const filtered = data.filter((s: any) => {
            // Ensure we have valid coordinates
            const lat = typeof s.latitude === 'string' ? parseFloat(s.latitude) : s.latitude;
            const lng = typeof s.longitude === 'string' ? parseFloat(s.longitude) : s.longitude;
            const isValid = lat && lng && !isNaN(lat) && !isNaN(lng);
            if (!isValid && data.length < 10) {
              console.warn('⚠️ Invalid coordinates for signal:', s.id, 'lat:', lat, 'lng:', lng);
            }
            return isValid;
          });
          console.log('✓ Filtered to', filtered.length, 'signals with valid coordinates (fetchId:', fetchId, ')');
          
          transformed = filtered.map((signal: any, index: number) => {
            try {
            // Extract nested data from PostgREST format
            // PostgREST returns joined data as nested objects with the table name
            const disease = Array.isArray(signal.diseases) ? signal.diseases[0] : signal.diseases;
            const country = Array.isArray(signal.countries) ? signal.countries[0] : signal.countries;
            const articleRaw = Array.isArray(signal.news_articles) ? signal.news_articles[0] : signal.news_articles;
            // Extract article data and nested source
            const article = articleRaw ? {
              title: articleRaw.title,
              url: articleRaw.url,
              published_at: articleRaw.published_at,
              news_sources: articleRaw.news_sources
            } : null;
            
            // Parse coordinates properly
            const lat = typeof signal.latitude === 'string' ? parseFloat(signal.latitude) : signal.latitude;
            const lng = typeof signal.longitude === 'string' ? parseFloat(signal.longitude) : signal.longitude;
            
            // Get category from mapping - use disease_id if available
            const diseaseId = signal.disease_id || disease?.id;
            const category = diseaseId && diseaseCategoryMap[diseaseId] 
              ? diseaseCategoryMap[diseaseId] 
              : { name: "Other", color: "#66dbe1" };
            
            // Normalize category name to handle variations (e.g., "veterinary outbreak" -> "Veterinary Outbreaks")
            // This ensures consistent filtering regardless of how the category is stored in the database
            const normalizedCategoryName = normalizeCategoryForComparison(category.name);
            
            // Get pathogen from mapping
            const pathogen = diseaseId && diseasePathogenMap[diseaseId] 
              ? diseasePathogenMap[diseaseId] 
              : "";

            // Build location string: city, country or just country
            // Filter out null, undefined, empty strings, and the string "null"
            const cityName = signal.city && 
                             signal.city !== 'null' && 
                             signal.city.trim() !== '' 
                             ? signal.city.trim() 
                             : null;
            
            // Get country name - use the name from the joined countries table
            const countryName = country?.name || "Unknown";
            let locationString = countryName;
            if (cityName) {
              locationString = `${cityName}, ${countryName}`;
            }
            
            // Store country name separately for easier filtering
            const signalCountryName = countryName;

            // If disease is "OTHER", use detected_disease_name from the signal if available
            let displayDiseaseName = disease?.name || "Unknown Disease";
            if (disease?.name === "OTHER" && signal.detected_disease_name) {
              displayDiseaseName = signal.detected_disease_name;
            }
            
            // Get disease_type from disease object
            const diseaseType = disease?.disease_type || "human"; // Default to human if not set

            // Extract news source name
            // PostgREST may return news_sources as an object or array, or it might be nested differently
            let sourceName: string | undefined;
            if (articleRaw) {
              // Try multiple possible structures
              const newsSources = articleRaw.news_sources;
              if (newsSources) {
                if (Array.isArray(newsSources) && newsSources.length > 0) {
                  sourceName = newsSources[0]?.name;
                } else if (typeof newsSources === 'object' && newsSources !== null) {
                  if ('name' in newsSources) {
                    sourceName = (newsSources as any).name;
                  } else if (Array.isArray(Object.values(newsSources)) && Object.values(newsSources)[0]) {
                    // Handle case where it's wrapped in an object with array values
                    const firstValue = Object.values(newsSources)[0] as any;
                    sourceName = firstValue?.name;
                  }
                }
              }
              // If still no source, log for debugging
              if (!sourceName && articleRaw.source_id) {
                console.debug('Source name not found for article with source_id:', articleRaw.source_id);
              }
            }

            const outbreakSignal: OutbreakSignal = {
              id: signal.id,
              disease: displayDiseaseName,
              location: locationString,
              city: cityName || undefined, // Use normalized city name
              category: normalizedCategoryName,
              pathogen: pathogen,
              keywords: signal.detected_disease_name || disease?.name || "", // Use detected_disease_name for better search
              position: [lat, lng] as [number, number],
              date: signal.detected_at || article?.published_at,
              url: article?.url,
              title: article?.title,
              source: sourceName,
              severity: signal.severity_assessment,
              confidence: signal.confidence_score,
            };
            
            // Add country name, detected_disease_name, disease_type, and original category name to the signal for filtering
            (outbreakSignal as any).countryName = signalCountryName;
            (outbreakSignal as any).detectedDiseaseName = signal.detected_disease_name;
            (outbreakSignal as any).diseaseType = diseaseType;
            (outbreakSignal as any).originalCategoryName = category.name; // Store original for composite category matching
            
            return outbreakSignal;
            } catch (signalError: any) {
              console.error(`❌ Error transforming signal ${index} (id: ${signal.id}):`, signalError);
              // Return null for failed signals, we'll filter them out
              return null;
            }
          }).filter((s): s is OutbreakSignal => s !== null);
          
          console.log('✓ Mapped to', transformed.length, 'valid signals (fetchId:', fetchId, ')');
        } catch (transformError: any) {
          console.error('❌ Error in transformation pipeline (fetchId:', fetchId, '):', transformError);
          console.error('Stack:', transformError.stack);
          throw transformError; // Re-throw to be caught by outer catch
        }
        
        console.log(`✅ Transformed ${transformed.length} signals successfully (fetchId: ${fetchId})`);
        
        // Check if component is still mounted before updating state
        if (!active) {
          console.warn('⚠️ Component unmounted during fetch, skipping state update');
          return;
        }
        
        // Skip if a newer fetch has already started
        if (fetchId !== fetchIdRef.current) {
          console.warn('⚠️ Stale fetch result (fetchId:', fetchId, 'current:', fetchIdRef.current, ') - skipping state update');
          return;
        }

        // Always update allSignals with fetched data
        console.log(`📝 Updating allSignals with ${transformed.length} signals (isInitial: ${isInitial}, active: ${active}, fetchId: ${fetchId})`);
        
        // Always update allSignals with fetched data
        // On initial load, always set the data (even if empty) - this ensures we know we've loaded
        // On refresh, preserve existing data if new fetch returns 0 results
        setAllSignals(prev => {
          if (isInitial) {
            // Initial load: always use fetched data (even if empty)
            console.log(`✓ Initial load: Setting allSignals to ${transformed.length} signals (prev had ${prev.length})`);
            if (transformed.length === 0) {
              console.warn('⚠️ Initial load returned 0 signals - check date filter or database');
            }
            return transformed;
          } else {
            // Refresh: update if we have new data, otherwise preserve existing
            if (transformed.length > 0) {
              console.log(`✓ Refresh: Updating allSignals to ${transformed.length} signals (prev had ${prev.length})`);
              return transformed;
            } else if (prev.length > 0) {
              console.warn('⚠️ Refresh returned 0 signals, preserving existing', prev.length, 'signals');
              return prev;
            } else {
              console.warn('⚠️ No signals in refresh and no previous data');
              return [];
            }
          }
        });
        
        // Double-check active before setting error to null
        if (active) {
          setError(null);
        }
      } catch (err: any) {
        if (!active) return;
        console.error("Error fetching outbreak signals:", err);
        setError(err.message || "Failed to load outbreak data");
        // Don't clear allSignals on error - preserve existing data
        // Use functional update to access current allSignals value
        setAllSignals(prev => {
          // Only clear if we never had any data
          if (prev.length === 0) {
            return [];
          }
          // Preserve existing data on error
          return prev;
        });
      } finally {
        if (isInitial) {
          setLoading(false);
        }
      }
    }

    // Only refetch when dateRange changes (affects database query)
    // Country and disease search are handled client-side for instant results
    const currentDateRange = filters?.dateRange || null;
    const dateRangeChanged = lastDateRangeRef.current !== currentDateRange;
    const isInitialFetch = !hasFetchedRef.current;
    
    // Always fetch on initial mount (hasFetchedRef will be false on first render)
    // Also fetch when dateRange changes
    if (isInitialFetch || dateRangeChanged) {
      console.log('🔄 Fetching signals - isInitial:', isInitialFetch, 'dateRangeChanged:', dateRangeChanged, 'dateRange:', currentDateRange, 'allSignals.length:', allSignals.length);
      lastDateRangeRef.current = currentDateRange;
      hasFetchedRef.current = true;
      // Initial fetch shows loading, date range change doesn't
      fetchSignals(isInitialFetch).catch(err => {
        console.error('❌ Fetch error in useEffect:', err);
      });
    } else {
      console.log('⏭️ Skipping fetch - already fetched, dateRange unchanged. allSignals.length:', allSignals.length);
    }

    // Poll for new signals every 10 minutes (reduced from 2 minutes to save bandwidth)
    // Cron runs every 2 hours, so 10 minutes is sufficient for updates
    intervalId = window.setInterval(async () => {
      if (!active) return;
      try {
        // Don't show loading spinner on refresh, just update silently
        await fetchSignals(false);
      } catch (e) {
        // Silent fail on refresh to avoid disrupting user
        console.error('Error refreshing outbreak signals:', e);
      }
    }, 600000); // 10 minutes = 600000ms

    return () => {
      active = false;
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
      // Reset fetch tracking so StrictMode re-run triggers fetch again
      hasFetchedRef.current = false;
      lastDateRangeRef.current = null;
      fetchIdRef.current = 0;
    };
  }, [filters?.dateRange]); // Only depend on dateRange, not all filters

  return { signals, loading, error };
}

