import "leaflet/dist/leaflet.css";
import React from "react";
import { createPortal } from "react-dom";
// import { NavigationTabsSection } from "./sections/NavigationTabsSection";
import { InteractiveMap } from "./sections/MapSection/InteractiveMap";
import { NewsSection } from "./sections/NewsSection";
import { SponsoredSection } from "./sections/SponsoredSection";
import { PremiumAdsSection } from "./sections/PremiumAdsSection";
import { FilterState } from "./sections/FilterPanel";
import { Input } from "../../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { useSupabaseOutbreakSignals, categoriesMatch } from "../../lib/useSupabaseOutbreakSignals";
import { useOutbreakCategories } from "../../lib/useOutbreakCategories";
import { detectCountryInText, geocodeLocation } from "../../lib/geocode";
import { geocodeWithOpenCage } from "../../lib/opencage";
import { useUserLocation } from "../../lib/useUserLocation";
import { Maximize2, Minimize2, X, RefreshCcw, Utensils, Droplet, Bug, Wind, Handshake, Hospital, PawPrint, Heart, Shield, AlertTriangle, MapPin, Brain, Syringe, Activity, AlertCircle, Beaker, Dna, Stethoscope, Cloud, Waves, Sparkles, Filter } from "lucide-react";
import { useFullscreen } from "../../contexts/FullscreenContext";
import { calculateDistance } from "../../lib/utils";

// Removed demo outbreaks; using data-driven InteractiveMap

export const HomePageMap = (): JSX.Element => {
  const [filters, setFilters] = React.useState<FilterState>({
    country: null,
    dateRange: "7d", // Default to 7 days like dashboard
    category: null,
    diseaseSearch: "",
    diseaseType: "all", // Default to show all disease types
  });
  const [zoomTarget, setZoomTarget] = React.useState<[number, number] | null>(null);
  const { isFullscreen: isMapFullscreen, setIsFullscreen: setIsMapFullscreen } = useFullscreen();
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const [categoryTop, setCategoryTop] = React.useState<string>('820px');
  const [adsTop, setAdsTop] = React.useState<string>('calc(100vh - 136px)');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [showLocationNotification, setShowLocationNotification] = React.useState(false);
  const [showLocationError, setShowLocationError] = React.useState(true);
  const [isUserLocationZoom, setIsUserLocationZoom] = React.useState(false);
  const locationAutoAppliedRef = React.useRef(false);
  const [nearMeRadius, setNearMeRadius] = React.useState<number>(500); // Default 500km
  const [nearMeCategory, setNearMeCategory] = React.useState<string | null>(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = React.useState(false);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(null);
  const [hoveredCategoryPosition, setHoveredCategoryPosition] = React.useState<{ x: number; y: number } | null>(null);
  
  // Request user location on mount
  const { location, isRequesting: isRequestingLocation, error: locationError } = useUserLocation(true);
  
  // Detect mobile screen size
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Detect when any Sheet (mobile menu or filters) is open
  React.useEffect(() => {
    const checkSheetOpen = () => {
      const overlay = document.querySelector('[data-radix-dialog-overlay]');
      setIsSheetOpen(overlay !== null && overlay.getAttribute('data-state') === 'open');
    };

    // Check initially
    checkSheetOpen();

    // Watch for changes using MutationObserver
    const observer = new MutationObserver(checkSheetOpen);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state'],
    });

    return () => observer.disconnect();
  }, []);
  
  // Fetch signals to calculate category stats (use filters but don't filter by category for stats)
  const statsFilters = { ...filters, category: null };
  const { signals } = useSupabaseOutbreakSignals(statsFilters);
  
  // Fetch categories from database
  const { categories: dbCategories } = useOutbreakCategories();

  // Extract available countries from signals for search matching
  const availableCountries = React.useMemo(() => {
    const countries = new Set<string>();
    signals.forEach(s => {
      // Extract country from location (format: "City, Country" or "Country")
      const parts = s.location.split(',').map(p => p.trim());
      const country = parts.length > 1 ? parts[parts.length - 1] : parts[0];
      if (country && country !== "Unknown") {
        countries.add(country);
      }
    });
    return Array.from(countries).sort();
  }, [signals]);

  // Store availableCountries in a ref to avoid recreating processSearch callback
  const availableCountriesRef = React.useRef<string[]>(availableCountries);
  React.useEffect(() => {
    availableCountriesRef.current = availableCountries;
  }, [availableCountries]);

  // Handle search input change - just update the input value, don't process yet
  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, diseaseSearch: value }));
  };

  const handleResetFilters = () => {
    console.log('🔄 Resetting filters and map to world view');
    setFilters({
      country: null,
      dateRange: "7d",
      category: null,
      diseaseSearch: "",
      diseaseType: "all",
      nearMe: null, // Clear near-me filter on reset
    });
    // Clear near me category selection
    setNearMeCategory(null);
    // Clear zoom target and user location zoom to reset map to world view
    setZoomTarget(null);
    setIsUserLocationZoom(false);
    // Keep locationAutoAppliedRef as true to prevent auto-re-applying location after reset
    // User can manually search for their location if they want it back
    // locationAutoAppliedRef.current remains true to prevent auto-apply
  };

  // Handle search processing (determine if it's a country or disease)
  const processSearch = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery || !searchQuery.trim()) {
      setFilters(prev => ({ ...prev, country: null }));
      setZoomTarget(null);
      return;
    }

    const query = searchQuery.trim();
    const queryLower = query.toLowerCase();
    
    console.log('Processing search:', query);
    
    // First, check if it's a country name in our lookup
    const detectedCountry = detectCountryInText(queryLower);
    console.log('Detected country from lookup:', detectedCountry);
    
    if (detectedCountry) {
      // Try to get coordinates for the country (fast local lookup)
      let coords = geocodeLocation(detectedCountry);
      console.log('Coordinates from lookup:', coords);
      
      // Set country filter immediately if we have coordinates (optimistic update)
      if (coords) {
        console.log('Setting country filter to:', detectedCountry, 'with coordinates:', coords);
        setFilters(prev => ({ ...prev, country: detectedCountry, diseaseSearch: prev.diseaseSearch }));
        setIsUserLocationZoom(false); // Country search, not user location
        setZoomTarget(coords);
        return;
      }
      
      // Even without coordinates, set the country filter immediately so filtering can start
      // The map will use available countries from signals if coordinates aren't found
      setFilters(prev => ({ ...prev, country: detectedCountry, diseaseSearch: prev.diseaseSearch }));
      setIsUserLocationZoom(false); // Country search, not user location
      
      // Try OpenCage API in background (non-blocking - update if found)
      // Don't wait for this - let user see results immediately
      geocodeWithOpenCage(detectedCountry).then(coords => {
        if (coords) {
          console.log('Coordinates from OpenCage:', coords);
          // Update zoom target if country filter is still set to this country
          setFilters(prev => {
            if (prev.country === detectedCountry) {
              setZoomTarget(coords);
              setIsUserLocationZoom(false);
            }
            return prev;
          });
        }
      }).catch(e => {
        console.warn('Failed to geocode country:', e);
      });
      
      return;
    }

    // Check if any signal location matches the search (case-insensitive partial match)
    // This helps find countries that might be in the database but not in our lookup
    // But only if query is at least 3 characters to avoid false matches with single letters
    // Use ref to avoid recreating this callback when availableCountries changes
    const currentAvailableCountries = availableCountriesRef.current;
    const matchingCountry = queryLower.length >= 3 ? currentAvailableCountries.find(country => {
      const countryLower = country.toLowerCase();
      // Only match if country starts with query or query starts with country (exact/prefix match)
      // This prevents "c" from matching "Democratic Republic of Congo"
      return countryLower === queryLower || 
             countryLower.startsWith(queryLower) ||
             queryLower.startsWith(countryLower) ||
             // Handle common aliases (these are always valid)
             (queryLower === 'usa' && countryLower.includes('united states')) ||
             (queryLower === 'us' && countryLower.includes('united states')) ||
             (queryLower === 'uk' && countryLower.includes('united kingdom'));
    }) : null;

    console.log('Matching country from available countries:', matchingCountry);

    if (matchingCountry) {
      let coords = geocodeLocation(matchingCountry);
      
      // Set country filter immediately if we have coordinates
      if (coords) {
        console.log('Setting country filter to matching country:', matchingCountry, 'with coordinates:', coords);
        setFilters(prev => ({ ...prev, country: matchingCountry, diseaseSearch: prev.diseaseSearch }));
        setIsUserLocationZoom(false); // Country search, not user location
        setZoomTarget(coords);
        return;
      }
      
      // Set country filter immediately even without coordinates
      setFilters(prev => ({ ...prev, country: matchingCountry, diseaseSearch: prev.diseaseSearch }));
      setIsUserLocationZoom(false); // Country search, not user location
      
      // Try OpenCage in background (non-blocking)
      geocodeWithOpenCage(matchingCountry).then(coords => {
        if (coords) {
          setFilters(prev => {
            if (prev.country === matchingCountry) {
              setZoomTarget(coords);
              setIsUserLocationZoom(false);
            }
            return prev;
          });
        }
      }).catch(e => {
        console.warn('Failed to geocode country:', e);
      });
      
      return;
    }

    // If not found in lookup or available countries, try OpenCage API directly with the query
    // BUT: Only do this if the query looks like it could be a country name
    // Skip OpenCage for common disease names to avoid false positives
    // Common disease names that might geocode to places (like "Malaria" town in Greece)
    const commonDiseaseNames = [
      'malaria', 'dengue', 'cholera', 'ebola', 'covid', 'flu', 'influenza',
      'measles', 'mumps', 'tuberculosis', 'tb', 'hiv', 'aids', 'hepatitis',
      'typhoid', 'yellow fever', 'zika', 'chikungunya', 'plague', 'anthrax'
    ];
    const looksLikeDisease = commonDiseaseNames.some(disease => 
      queryLower === disease || queryLower.startsWith(disease) || queryLower.includes(disease)
    );
    
    if (!detectedCountry && !matchingCountry && !looksLikeDisease) {
      // Try OpenCage in background (non-blocking) - don't wait for it
      geocodeWithOpenCage(query).then(coords => {
        if (coords) {
          console.log('Found coordinates via OpenCage, treating as location:', query);
          const countryName = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase();
          setFilters(prev => {
            // Only update if search hasn't changed
            if (prev.diseaseSearch === query) {
              return { ...prev, country: countryName };
            }
            return prev;
          });
          setIsUserLocationZoom(false); // Country search, not user location
          setZoomTarget(coords);
        }
      }).catch(e => {
        console.warn('OpenCage geocoding failed for query:', query, e);
      });
      // Don't return - let it fall through to disease search immediately
    } else if (looksLikeDisease) {
      console.log('Query looks like a disease name, skipping OpenCage geocoding:', query);
    }

    // If not a country, treat it as a disease search - clear country filter
    console.log('Treating as disease search:', query);
    setFilters(prev => {
      // Clear country filter if it was set, but keep the diseaseSearch value
      if (prev.country !== null) {
        console.log('Clearing country filter, keeping disease search:', query);
        return { ...prev, country: null };
      }
      // Ensure diseaseSearch is set (it should already be set by handleSearchChange, but just in case)
      return prev;
    });
    setZoomTarget(null);
    setIsUserLocationZoom(false);
  }, []); // No dependencies - uses ref for availableCountries to prevent infinite loop

  // Minimal debounce for search processing - instant for known countries, 150ms for others
  React.useEffect(() => {
    const currentSearch = filters.diseaseSearch;
    
    // For known countries in lookup, process immediately (no debounce)
    if (currentSearch && currentSearch.trim()) {
      const queryLower = currentSearch.toLowerCase().trim();
      const detectedCountry = detectCountryInText(queryLower);
      
      if (detectedCountry && geocodeLocation(detectedCountry)) {
        // Known country - process immediately
        processSearch(currentSearch);
        return;
      }
    }
    
    // For other searches, use minimal debounce
    const timer = setTimeout(() => {
      processSearch(currentSearch);
    }, 150); // 150ms delay for typing

    return () => clearTimeout(timer);
  }, [filters.diseaseSearch, processSearch]);

  // Reset map to world view when date range filter changes
  const prevDateRangeRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    // Skip on initial mount
    if (prevDateRangeRef.current === null) {
      prevDateRangeRef.current = filters.dateRange;
      return;
    }
    
    // If date range changed, reset map to world view
    if (prevDateRangeRef.current !== filters.dateRange) {
      console.log('📅 Date range changed, resetting map to world view');
      prevDateRangeRef.current = filters.dateRange;
      // Clear zoom target and user location zoom to reset to world view
      setZoomTarget(null);
      setIsUserLocationZoom(false);
    }
  }, [filters.dateRange]);

  // Map icon names from database to icon components
  const iconMap: Record<string, React.ComponentType<any>> = {
    'utensils': Utensils,
    'droplet': Droplet,
    'bug': Bug,
    'wind': Wind,
    'handshake': Handshake,
    'hand': Handshake,
    'hospital': Hospital,
    'paw-print': PawPrint,
    'paw': PawPrint,
    'heart': Heart,
    'shield': Shield,
    'alert-triangle': AlertTriangle,
    'alert-circle': AlertCircle,
    'brain': Brain,
    'syringe': Syringe,
    'activity': Activity,
    'flask': Beaker,
    'beaker': Beaker,
    'virus': Dna,
    'dna': Dna,
    'stethoscope': Stethoscope,
    'cloud': Cloud,
    'waves': Waves,
    'sparkles': Sparkles,
  };

  // Unique icon assignment map to ensure each normalized category gets a unique icon
  const categoryIconMap: Record<string, React.ComponentType<any>> = {
    'Foodborne Outbreaks': Utensils,
    'Waterborne Outbreaks': Droplet,
    'Vector-Borne Outbreaks': Bug,
    'Airborne Outbreaks': Wind,
    'Contact Transmission': Handshake,
    'Healthcare-Associated Infections': Hospital,
    'Zoonotic Outbreaks': PawPrint,
    'Veterinary Outbreaks': PawPrint,
    'Sexually Transmitted Infections': Heart,
    'Vaccine-Preventable Diseases': Shield,
    'Emerging Infectious Diseases': AlertTriangle,
    'Neurological Outbreaks': Brain,
    'Bloodborne Outbreaks': Syringe,
    'Gastrointestinal Outbreaks': Activity,
    'Respiratory Outbreaks': Cloud,
    'Skin and Soft Tissue Outbreaks': Stethoscope,
    'Hemorrhagic Fever Outbreaks': Dna,
    'Antimicrobial-Resistant Outbreaks': Beaker,
    'Other': AlertCircle,
  };

  // Normalize category name to handle variations and duplicates
  const normalizeCategoryForDisplay = (categoryName: string): string => {
    const nameLower = categoryName.toLowerCase().trim();
    
    // Handle composite categories - extract first category
    if (categoryName.includes(',')) {
      const firstCategory = categoryName.split(',')[0].trim();
      return normalizeCategoryForDisplay(firstCategory); // Recursively normalize
    }
    
    // Normalize variations - handle duplicates FIRST before capitalization
    // Veterinary variations
    if (nameLower === 'veterinary outbreak' || nameLower === 'veterinary outbreaks') {
      return 'Veterinary Outbreaks';
    }
    
    // Sexually transmitted variations
    if (nameLower.includes('sexually transmitted')) {
      // Normalize both "Infections" and "Outbreaks" to "Infections"
      if (nameLower.includes('infection')) {
        return 'Sexually Transmitted Infections';
      }
      return 'Sexually Transmitted Infections'; // Default to Infections
    }
    
    // Emerging diseases variations
    if (nameLower.includes('emerging')) {
      if (nameLower.includes('infectious diseases')) {
        return 'Emerging Infectious Diseases';
      }
      if (nameLower.includes('re-emerging') || nameLower.includes('reemerging')) {
        return 'Emerging Infectious Diseases';
      }
      // If it just says "emerging" without more context, assume "Emerging Infectious Diseases"
      return 'Emerging Infectious Diseases';
    }
    
    // Standard base categories - capitalize properly
    const standardCategories: Record<string, string> = {
      'foodborne outbreaks': 'Foodborne Outbreaks',
      'waterborne outbreaks': 'Waterborne Outbreaks',
      'vector-borne outbreaks': 'Vector-Borne Outbreaks',
      'airborne outbreaks': 'Airborne Outbreaks',
      'contact transmission': 'Contact Transmission',
      'healthcare-associated infections': 'Healthcare-Associated Infections',
      'zoonotic outbreaks': 'Zoonotic Outbreaks',
      'vaccine-preventable diseases': 'Vaccine-Preventable Diseases',
      'respiratory outbreaks': 'Respiratory Outbreaks',
      'neurological outbreaks': 'Neurological Outbreaks',
      'bloodborne outbreaks': 'Bloodborne Outbreaks',
      'gastrointestinal outbreaks': 'Gastrointestinal Outbreaks',
      'other': 'Other',
    };
    
    // Check if it matches a standard category
    if (standardCategories[nameLower]) {
      return standardCategories[nameLower];
    }
    
    // Capitalize first letter of each word for consistency (fallback)
    return categoryName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Transform database categories to component format with icons, removing duplicates
  const diseaseCategories = React.useMemo(() => {
    // Map to store unique normalized categories
    const categoryMap = new Map<string, {
      id: string;
      name: string;
      color: string;
      icon: React.ComponentType<any>;
      originalName: string; // Keep original for reference
    }>();
    
    // Process each category and deduplicate by normalized name
    dbCategories.forEach(cat => {
      // Normalize the category name (handles composites, variations, etc.)
      const normalizedName = normalizeCategoryForDisplay(cat.name);
      
      // Skip if we already have this normalized category
      if (categoryMap.has(normalizedName)) {
        const existing = categoryMap.get(normalizedName)!;
        // Prefer the exact match if available (better capitalization)
        // Or prefer the one without commas if both are similar
        const isExactMatch = cat.name === normalizedName;
        const existingIsExact = existing.originalName === normalizedName;
        const hasComma = cat.name.includes(',');
        const existingHasComma = existing.originalName.includes(',');
        
        // Keep this one if: it's an exact match and existing isn't, OR
        // this one has no comma and existing has comma
        if (!((isExactMatch && !existingIsExact) || (!hasComma && existingHasComma))) {
          return; // Skip duplicate - keep existing
        }
        // Otherwise, continue to replace with better version
      }
      
      // Map icon name from database to icon component, ensuring uniqueness
      let IconComponent: React.ComponentType<any> = AlertCircle; // Default icon
      
      // First, check if we have a predefined unique icon for this normalized category
      if (categoryIconMap[normalizedName]) {
        IconComponent = categoryIconMap[normalizedName];
      } else if (cat.icon) {
        // Try to map the database icon name
        const iconKey = cat.icon.toLowerCase().replace(/\s+/g, '-');
        IconComponent = iconMap[iconKey] || AlertCircle;
      } else {
        // Fallback: try to infer icon from normalized category name
        const nameLower = normalizedName.toLowerCase();
        if (nameLower.includes('food')) IconComponent = Utensils;
        else if (nameLower.includes('water')) IconComponent = Droplet;
        else if (nameLower.includes('vector')) IconComponent = Bug;
        else if (nameLower.includes('airborne')) IconComponent = Wind;
        else if (nameLower.includes('respiratory')) IconComponent = Cloud;
        else if (nameLower.includes('contact')) IconComponent = Handshake;
        else if (nameLower.includes('healthcare') || nameLower.includes('hospital')) IconComponent = Hospital;
        else if (nameLower.includes('zoonotic')) IconComponent = PawPrint;
        else if (nameLower.includes('veterinary')) IconComponent = PawPrint;
        else if (nameLower.includes('sexually')) IconComponent = Heart;
        else if (nameLower.includes('vaccine')) IconComponent = Shield;
        else if (nameLower.includes('emerging')) IconComponent = AlertTriangle;
        else if (nameLower.includes('neurological')) IconComponent = Brain;
        else if (nameLower.includes('blood')) IconComponent = Syringe;
        else if (nameLower.includes('gastrointestinal')) IconComponent = Activity;
        else if (nameLower.includes('skin') || nameLower.includes('soft tissue')) IconComponent = Stethoscope;
        else if (nameLower.includes('hemorrhagic') || nameLower.includes('fever')) IconComponent = Dna;
        else if (nameLower.includes('antimicrobial') || nameLower.includes('resistant')) IconComponent = Beaker;
      }
      
      // Use database color, but ensure we have a valid color
      let categoryColor = cat.color || '#66dbe1';
      
      // If color is missing or invalid, assign based on normalized name to match pie chart
      if (!cat.color || cat.color === '#66dbe1') {
        // Try to match colors from the pie chart's CATEGORY_COLORS
        const colorMap: Record<string, string> = {
          'Foodborne Outbreaks': '#f87171',
          'Waterborne Outbreaks': '#66dbe1',
          'Vector-Borne Outbreaks': '#fbbf24',
          'Airborne Outbreaks': '#a78bfa',
          'Contact Transmission': '#fb923c',
          'Healthcare-Associated Infections': '#ef4444',
          'Zoonotic Outbreaks': '#10b981',
          'Veterinary Outbreaks': '#8b5cf6',
          'Sexually Transmitted Infections': '#ec4899',
          'Vaccine-Preventable Diseases': '#3b82f6',
          'Emerging Infectious Diseases': '#f59e0b',
          'Neurological Outbreaks': '#dc2626',
          'Respiratory Outbreaks': '#9333ea',
          'Bloodborne Outbreaks': '#dc2626',
          'Gastrointestinal Outbreaks': '#f97316',
          'Other': '#4eb7bd',
        };
        if (colorMap[normalizedName]) {
          categoryColor = colorMap[normalizedName];
        }
      }
      
      categoryMap.set(normalizedName, {
        id: cat.id,
        name: normalizedName, // Use normalized name for display
        color: categoryColor,
        icon: IconComponent,
        originalName: cat.name, // Keep original for reference
      });
    });
    
    // Define the standard categories from map dropdown (CATEGORY_COLORS)
    const standardCategories = [
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
      "Bloodborne Outbreaks",
      "Gastrointestinal Outbreaks",
      "Other"
    ];
    
    // Filter to only include categories that match the standard categories from map dropdown
    // and ensure they're in the same order
    const filteredCategories = standardCategories
      .map(categoryName => {
        // Find matching category from database (exact match or normalized match)
        const found = Array.from(categoryMap.values()).find(cat => 
          cat.name === categoryName || 
          normalizeCategoryForDisplay(cat.name) === categoryName
        );
        
        if (found) {
          return found;
        }
        
        // If not found in database, create a default entry with standard color
        const standardColors: Record<string, string> = {
          'Foodborne Outbreaks': '#f87171',
          'Waterborne Outbreaks': '#66dbe1',
          'Vector-Borne Outbreaks': '#fbbf24',
          'Airborne Outbreaks': '#a78bfa',
          'Contact Transmission': '#fb923c',
          'Healthcare-Associated Infections': '#ef4444',
          'Zoonotic Outbreaks': '#10b981',
          'Sexually Transmitted Infections': '#ec4899',
          'Vaccine-Preventable Diseases': '#3b82f6',
          'Emerging Infectious Diseases': '#f59e0b',
          'Veterinary Outbreaks': '#8b5cf6',
          'Neurological Outbreaks': '#dc2626',
          'Respiratory Outbreaks': '#9333ea',
          'Bloodborne Outbreaks': '#dc2626',
          'Gastrointestinal Outbreaks': '#f97316',
          'Other': '#4eb7bd',
        };
        
        // Get icon for this category
        let IconComponent = AlertCircle;
        if (categoryIconMap[categoryName]) {
          IconComponent = categoryIconMap[categoryName];
        }
        
        return {
          id: categoryName.toLowerCase().replace(/\s+/g, '-'),
          name: categoryName,
          color: standardColors[categoryName] || '#4eb7bd',
          icon: IconComponent,
        };
      })
      .filter(Boolean); // Remove any undefined entries
    
    // Convert to array and remove originalName field
    return filteredCategories.map(({ originalName, ...cat }) => cat);
  }, [dbCategories]);

  // Handle category selection from disease category icons
  const handleCategoryClick = (categoryName: string) => {
    setFilters(prev => {
      const isClearing = prev.category === categoryName;
      // Clear near me category selection when manually clicking category icon to clear it
      if (isClearing) {
        setNearMeCategory(null);
      }
      return {
        ...prev,
        category: isClearing ? null : categoryName,
        // Clear country, disease search, disease type filter, and near-me filter when selecting a category
        country: null,
        diseaseSearch: "",
        diseaseType: "all", // Reset disease type filter when category is selected
        nearMe: null, // Clear near-me filter when manually selecting a category
      };
    });
    setZoomTarget(null);
    setIsUserLocationZoom(false);
  };

  // Calculate category statistics
  const categoryStats = React.useMemo(() => {
    const stats: Record<string, { cases: number; severity: string }> = {};
    
    diseaseCategories.forEach(category => {
      // Match categories using the same logic as the filter
      const categorySignals = signals.filter(s => {
        // Check both normalized category and original category name for composite categories
        const originalCategory = (s as any).originalCategoryName;
        if (originalCategory && originalCategory !== s.category) {
          // If we have the original category (which might be composite), check it too
          return categoriesMatch(originalCategory, category.name) || categoriesMatch(s.category, category.name);
        }
        return categoriesMatch(s.category, category.name);
      });
      const cases = categorySignals.length;
      
      // Calculate severity based on case count and severity assessments
      const severities = categorySignals.map(s => s.severity || 'medium');
      const criticalCount = severities.filter(s => s.toLowerCase().includes('critical') || s.toLowerCase().includes('high')).length;
      const severityRatio = cases > 0 ? criticalCount / cases : 0;
      
      let severity = 'Low';
      if (severityRatio > 0.3 || cases > 50) {
        severity = 'Critical';
      } else if (severityRatio > 0.15 || cases > 20) {
        severity = 'High';
      } else if (cases > 5) {
        severity = 'Medium';
      }
      
      stats[category.name] = { cases, severity };
    });
    
    return stats;
  }, [signals]);

  // Filter categories that have outbreaks within radius of user's location
  const nearbyCategories = React.useMemo(() => {
    if (!location?.coordinates || signals.length === 0) {
      return [];
    }

    const [userLat, userLon] = location.coordinates;
    const categoryMap = new Map<string, boolean>();

    // Check each signal to see if it's within radius
    signals.forEach(signal => {
      const [signalLat, signalLon] = signal.position;
      const distance = calculateDistance(userLat, userLon, signalLat, signalLon);
      
      if (distance <= nearMeRadius) {
        // This signal is within radius, mark its category as nearby
        const categoryName = normalizeCategoryForDisplay(signal.category);
        categoryMap.set(categoryName, true);
      }
    });

    // Return only categories that have at least one nearby outbreak
    return diseaseCategories
      .filter(category => categoryMap.has(category.name))
      .map(category => category.name)
      .sort();
  }, [location, signals, nearMeRadius, diseaseCategories]);

  // Calculate zoom level based on radius (larger radius = lower zoom level)
  // Zoom levels approximate: 10=~50km, 9=~100km, 8=~200km, 7=~500km, 6=~1000km, 5=~2000km, 4=~5000km
  const getZoomLevelForRadius = (radiusKm: number): number => {
    if (radiusKm <= 100) return 9;   // ~100km visible - good for local area
    if (radiusKm <= 500) return 7;   // ~500km visible - good for regional
    if (radiusKm <= 1000) return 6;  // ~1000km visible - good for country/region
    return 5; // ~5000km visible - good for continent-wide
  };

  // Handle near me category selection
  const handleNearMeCategoryChange = (categoryName: string | null) => {
    setNearMeCategory(categoryName);
    if (categoryName && location?.coordinates) {
      // Apply the selected category to the main filter WITH near-me distance filtering
      setFilters(prev => ({
        ...prev,
        category: categoryName,
        country: null,
        diseaseSearch: "",
        diseaseType: "all",
        nearMe: {
          coordinates: location.coordinates,
          radiusKm: nearMeRadius,
        },
      }));
      // Zoom to user location with appropriate zoom level for the selected radius
      setZoomTarget(location.coordinates);
      setIsUserLocationZoom(true);
      
      // Popup will open automatically via the effect in InteractiveMap
      // No need to force it - the effect will detect the category change
    } else {
      // Clear category filter and near-me filtering
      setFilters(prev => ({
        ...prev,
        category: null,
        nearMe: null,
      }));
      // If clearing, don't reset zoom - let user keep their current view
    }
  };

  // Sync nearMeCategory with filters.category when category is changed elsewhere
  React.useEffect(() => {
    // If category filter is cleared or changed to something not in nearby categories, clear near me selection
    if (!filters.category || !nearbyCategories.includes(filters.category)) {
      if (nearMeCategory) {
        setNearMeCategory(null);
        // Also clear nearMe filter if it was set
        setFilters(prev => prev.nearMe ? { ...prev, nearMe: null } : prev);
      }
    } else if (filters.category && nearbyCategories.includes(filters.category)) {
      // If category matches a nearby category, sync the near me selection
      setNearMeCategory(prev => prev !== filters.category ? filters.category : prev);
    }
  }, [filters.category, nearbyCategories, nearMeCategory]);

  // Handle mouse enter for tooltip
  const handleMouseEnter = (categoryName: string, event: React.MouseEvent<HTMLDivElement>) => {
    setHoveredCategory(categoryName);
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredCategoryPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredCategory(null);
    setHoveredCategoryPosition(null);
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsMapFullscreen(!isMapFullscreen);
  };

  // Auto-apply location when detected (only once on initial load)
  React.useEffect(() => {
    if (location && !locationAutoAppliedRef.current) {
      // User location detected - zoom to their location (but keep all global outbreaks visible)
      const detectedCountry = location.country;
      const userCoords = location.coordinates;
      
      console.log('📍 User location detected:', {
        country: detectedCountry,
        city: location.city,
        coordinates: userCoords,
        lat: userCoords[0],
        lng: userCoords[1]
      });
      
      // Validate coordinates
      if (!userCoords || userCoords.length !== 2 || isNaN(userCoords[0]) || isNaN(userCoords[1])) {
        console.error('❌ Invalid user coordinates:', userCoords);
        return;
      }
      
      const [lat, lng] = userCoords;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.error('❌ User coordinates out of range:', userCoords);
        return;
      }
      
      // Don't set country filter on page load - show ALL outbreaks globally
      // Just zoom to user's location so they can see nearby outbreaks in context
      // Users can manually filter by country if they want
      
      // ALWAYS zoom to user's location (regardless of country existence)
      // Use their actual coordinates, not country center
      // IMPORTANT: Set both flags and zoom target together to prevent clearing
      console.log('🎯 Setting zoom target to user location:', userCoords);
      setIsUserLocationZoom(true);
      setZoomTarget(userCoords);
      
      // Show notification
      setShowLocationNotification(true);
      locationAutoAppliedRef.current = true;
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setShowLocationNotification(false);
      }, 5000);
    }
  }, [location]); // Use ref for availableCountries to prevent dependency cycle
  
  // Ensure zoom target and user location flag stay set even if filters change
  React.useEffect(() => {
    // If user location was applied, maintain the zoom target
    if (locationAutoAppliedRef.current && location && isUserLocationZoom) {
      // Ensure zoom target is still set to user location
      if (!zoomTarget || 
          Math.abs(zoomTarget[0] - location.coordinates[0]) > 0.0001 ||
          Math.abs(zoomTarget[1] - location.coordinates[1]) > 0.0001) {
        console.log('🔄 Restoring user location zoom target');
        setZoomTarget(location.coordinates);
        setIsUserLocationZoom(true);
      }
    }
  }, [location, isUserLocationZoom, zoomTarget]);

  // Calculate category position relative to map container (Desktop only)
  React.useEffect(() => {
    if (isMapFullscreen || isMobile) {
      return;
    }

    const updateCategoryPosition = () => {
      const mapContainer = mapContainerRef.current;
      if (!mapContainer) {
        // Responsive fallback based on screen size - ensure it's visible
        const fallback = window.innerWidth >= 1024 ? '820px' : window.innerWidth >= 768 ? '700px' : window.innerWidth >= 640 ? '600px' : '500px';
        setCategoryTop(fallback);
        return;
      }

      const mapRect = mapContainer.getBoundingClientRect();
      const containerRect = mapContainer.parentElement?.getBoundingClientRect();
      if (!containerRect) {
        // Responsive fallback based on screen size - ensure it's visible
        const fallback = window.innerWidth >= 1024 ? '820px' : window.innerWidth >= 768 ? '700px' : window.innerWidth >= 640 ? '600px' : '500px';
        setCategoryTop(fallback);
        return;
      }

      // Calculate position: map bottom + 20px spacing
      const mapBottom = mapRect.bottom - containerRect.top;
      // Responsive minimum position based on screen size
      const minPosition = window.innerWidth >= 1024 ? 820 : window.innerWidth >= 768 ? 700 : window.innerWidth >= 640 ? 600 : 500;
      const newTop = Math.max(minPosition, mapBottom + 20); // Ensure minimum position
      
      // Ensure categories are not positioned below viewport
      const viewportHeight = window.innerHeight;
      const maxTop = viewportHeight - 100; // Leave some space at bottom
      const finalTop = Math.min(newTop, maxTop);
      
      setCategoryTop(`${finalTop}px`);
    };

    // Initial calculation
    updateCategoryPosition();
    
    // Update on window resize
    window.addEventListener('resize', updateCategoryPosition);
    
    // Update after delays to account for map rendering and transitions
    const timeoutIds = [
      setTimeout(updateCategoryPosition, 100),
      setTimeout(updateCategoryPosition, 600), // After transition completes
      setTimeout(updateCategoryPosition, 1000), // Extra delay to ensure map is fully rendered
    ];

    // Use ResizeObserver to watch for map container size changes
    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateCategoryPosition();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateCategoryPosition);
      timeoutIds.forEach(id => clearTimeout(id));
      if (resizeObserver && mapContainerRef.current) {
        resizeObserver.unobserve(mapContainerRef.current);
      }
    };
  }, [isMapFullscreen, isMobile]); // Recalculate when fullscreen or mobile changes

  // Calculate ads position relative to map container bottom (Desktop only)
  React.useEffect(() => {
    if (isMapFullscreen || isMobile) {
      return;
    }

    const updateAdsPosition = () => {
      const mapContainer = mapContainerRef.current;
      if (!mapContainer) {
        setAdsTop('calc(100vh - 136px)');
        return;
      }

      const mapRect = mapContainer.getBoundingClientRect();
      const containerRect = mapContainer.parentElement?.getBoundingClientRect();
      if (!containerRect) {
        setAdsTop('calc(100vh - 136px)');
        return;
      }

      // Calculate position: map bottom + 24px spacing
      const mapBottom = mapRect.bottom - containerRect.top;
      const newTop = mapBottom + 24; // 24px gap below map
      
      setAdsTop(`${newTop}px`);
    };

    // Initial calculation
    updateAdsPosition();
    
    // Update on window resize
    window.addEventListener('resize', updateAdsPosition);
    
    // Update after delays to account for map rendering and transitions
    const timeoutIds = [
      setTimeout(updateAdsPosition, 100),
      setTimeout(updateAdsPosition, 600), // After transition completes
      setTimeout(updateAdsPosition, 1000), // Extra delay to ensure map is fully rendered
    ];

    // Use ResizeObserver to watch for map container size changes
    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateAdsPosition();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateAdsPosition);
      timeoutIds.forEach(id => clearTimeout(id));
      if (resizeObserver && mapContainerRef.current) {
        resizeObserver.unobserve(mapContainerRef.current);
      }
    };
  }, [isMapFullscreen, isMobile]); // Recalculate when fullscreen or mobile changes

  return (
    <div className={`bg-[#2a4149] relative ${isMapFullscreen ? 'fixed inset-0 w-full h-full overflow-hidden z-[2000]' : isMobile ? 'absolute inset-0 w-full h-screen overflow-hidden' : 'min-h-screen'}`}>
      <div className={`relative w-full ${isMobile ? 'h-screen' : ''} ${isMobile ? '' : 'lg:min-w-[1280px]'}`} style={{ minHeight: isMobile ? '100vh' : 'calc(100vh + 320px)', paddingBottom: isMobile ? '0' : '320px', marginBottom: isMobile ? '0' : '0px' }}>
        {/* Location Detection Notification */}
        {showLocationNotification && location && (
          <div className={`absolute ${isMobile ? 'top-16' : 'top-20'} left-1/2 transform -translate-x-1/2 z-[1100] bg-[#67DBE2] text-[#2a4149] px-3 py-2 ${isMobile ? 'text-xs' : 'px-4 py-3'} rounded-lg shadow-lg flex items-center gap-2 ${isMobile ? 'max-w-[90vw]' : ''} animate-in fade-in slide-in-from-top-2 duration-300`}>
            <MapPin className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className={`${isMobile ? 'text-xs' : 'font-semibold text-sm'} truncate`}>
                Zoomed to your location: {location.country}
                {location.city && `, ${location.city}`}
              </div>
              {!isMobile && (
                <div className="text-xs opacity-90">
                  Showing all global outbreaks. Use filters to narrow down.
                </div>
              )}
            </div>
            <button
              onClick={() => setShowLocationNotification(false)}
              className="ml-2 hover:bg-[#2a4149]/20 rounded p-1 transition-colors flex-shrink-0"
              aria-label="Dismiss notification"
            >
              <X className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
            </button>
          </div>
        )}
        
        {/* Location Request Error Notification */}
        {locationError && !location && !isRequestingLocation && showLocationError && (
          <div className={`absolute ${isMobile ? 'top-16' : 'top-20'} left-1/2 transform -translate-x-1/2 z-[1100] bg-[#ef4444] text-white px-3 py-2 ${isMobile ? 'text-xs' : 'px-4 py-3'} rounded-lg shadow-lg flex items-center gap-2 ${isMobile ? 'max-w-[90vw]' : 'max-w-md'} animate-in fade-in slide-in-from-top-2 duration-300`}>
            <AlertTriangle className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className={`${isMobile ? 'text-xs' : 'font-semibold text-sm'}`}>Location Access Required</div>
              {!isMobile && (
                <div className="text-xs opacity-90">{locationError}</div>
              )}
            </div>
            <button
              onClick={() => setShowLocationError(false)}
              className="ml-2 hover:bg-white/20 rounded p-1 transition-colors flex-shrink-0"
              aria-label="Dismiss error"
            >
              <X className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
            </button>
          </div>
        )}
        
        {/* Header Title - Top Left - Desktop Only */}
        <div className={`hidden lg:absolute top-[32px] left-[90px] z-[1000] transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <h1 className="[font-family:'Roboto',Helvetica] font-bold text-[#67DBE2] text-[32px] tracking-[-0.5px] leading-[40px] max-w-[500px]">
            Global Outbreak & Disease
            <br />
            Monitoring System
          </h1>
        </div>
        
        {/* Mobile Header Title - Hidden when Sheet overlay is visible */}
        {!isMapFullscreen && isMobile && !isSheetOpen && !isMobileFiltersOpen && (
          <div className="absolute top-2 left-2 right-2 z-40 lg:hidden">
            <h1 className="[font-family:'Roboto',Helvetica] font-bold text-[#67DBE2] text-lg leading-tight">
              Global Outbreak & Disease Monitoring
            </h1>
          </div>
        )}

        {/* Mobile Filter Button */}
        {!isMapFullscreen && isMobile && (
          <div className="absolute top-2 right-2 z-40 lg:hidden flex gap-2">
            <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
              <SheetTrigger asChild>
                <button className="bg-[#2a4149] hover:bg-[#305961] text-[#67DBE2] p-2 rounded-lg shadow-lg border border-[#67DBE2]/30 flex items-center justify-center">
                  <Filter className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="top" className="bg-[#2a4149] border-[#67DBE2]/20 max-h-[80vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-[#67DBE2]">Filters & Search</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  {/* Date Range Tabs */}
                  <div>
                    <label className="text-white text-sm mb-2 block">Time Range</label>
                    <div className="flex items-center h-[38px] rounded-[6px] border border-[#DAE0E633] bg-transparent px-1 py-1 shadow-[0px_1px_2px_#1018280a]">
                      <Tabs
                        value={filters.dateRange || "7d"}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
                        className="w-full"
                      >
                        <TabsList className="grid w-full h-full grid-cols-6 bg-transparent border-0 gap-1">
                          {["24h", "7d", "14d", "30d", "6m", "1y"].map((range) => (
                            <TabsTrigger
                              key={range}
                              value={range}
                              className="text-xs font-semibold text-[#EBEBEBCC] data-[state=active]:bg-[#FFFFFF24] data-[state=active]:text-white rounded-[4px] h-full"
                            >
                              {range}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                  
                  {/* Search Bar */}
                  <div>
                    <label className="text-white text-sm mb-2 block">Search</label>
                    <div className="flex h-[40px] items-center gap-2 px-2.5 bg-[#FFFFFF24] rounded-[6px] overflow-hidden border border-solid border-[#DAE0E633] shadow-[0px_1px_2px_#1018280A]">
                      <img
                        className="relative w-[16px] h-[16px] flex-shrink-0"
                        alt="Search"
                        src="/zoom-search.svg"
                      />
                      <Input
                        type="text"
                        placeholder="Search..."
                        value={filters.diseaseSearch || ""}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-1 bg-transparent border-0 text-[#EBEBEB] text-xs [font-family:'Roboto',Helvetica] font-medium tracking-[-0.10px] leading-5 placeholder:text-[#EBEBEB] focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0 min-w-0"
                      />
                      {filters.diseaseSearch && (
                        <button
                          onClick={() => {
                            setFilters(prev => ({ ...prev, diseaseSearch: "", country: null }));
                            setZoomTarget(null);
                          }}
                          className="flex items-center justify-center w-4 h-4 text-[#EBEBEB99] hover:text-[#EBEBEB] transition-colors flex-shrink-0"
                          aria-label="Clear search"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Disease Type Filter */}
                  <div>
                    <label className="text-white text-sm mb-2 block">Disease Type</label>
                    <select
                      value={filters.diseaseType || "all"}
                      onChange={(e) => {
                        const newValue = e.target.value === "all" ? "all" : e.target.value as "human" | "veterinary" | "zoonotic";
                        setFilters(prev => ({ 
                          ...prev, 
                          diseaseType: newValue,
                          category: null,
                        }));
                        if (newValue === "all") {
                          setZoomTarget(null);
                          setIsUserLocationZoom(false);
                        }
                      }}
                      className="w-full h-[40px] px-2.5 bg-[#FFFFFF24] rounded-[6px] border border-solid border-[#DAE0E633] text-[#EBEBEB] text-xs [font-family:'Roboto',Helvetica] font-medium tracking-[-0.10px] shadow-[0px_1px_2px_#1018280A] focus:outline-none focus:ring-2 focus:ring-[#67DBE2]/50 [&>option]:bg-[#2a4149] [&>option]:text-white"
                    >
                      <option value="all">All Types</option>
                      <option value="human">Human Only</option>
                      <option value="veterinary">Veterinary Only</option>
                      <option value="zoonotic">Zoonotic (Both)</option>
                    </select>
                  </div>
                  
                  
                  {/* Reset Button */}
                  <button
                    onClick={() => {
                      handleResetFilters();
                      setIsMobileFiltersOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 h-[40px] rounded-[6px] border border-[#DAE0E633] bg-[#FFFFFF14] text-[#EBEBEBCC] hover:text-white hover:bg-[#FFFFFF24] transition-colors shadow-[0px_1px_2px_#1018280A]"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    <span className="text-xs">Reset Filters</span>
                  </button>
                  
                  {/* Navigation Tabs - Commented out */}
                  {/* <div className="pt-4 border-t border-[#DAE0E633]">
                    <NavigationTabsSection />
                  </div> */}
                </div>
              </SheetContent>
            </Sheet>
            
          </div>
        )}

        {/* Filters and Navigation - Top Right - Desktop Only */}
        <div className={`hidden lg:absolute top-[32px] z-[1000] lg:flex flex-col items-end gap-3 transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ right: '200px' }}>
          <div className="flex items-center gap-1" style={{ maxWidth: 'calc(50vw - 100px)' }}>
            {/* Date Range Tabs */}
            <div className="flex items-center h-[38px] rounded-[6px] border border-[#DAE0E633] bg-transparent px-1 py-1 shadow-[0px_1px_2px_#1018280a]" style={{ width: '220px', minWidth: '220px', borderBottomColor: "#FFFFFF33", borderBottomWidth: "1px" }}>
              <Tabs
                value={filters.dateRange || "7d"}
                onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
                className="w-full"
              >
                <TabsList className="grid w-full h-full grid-cols-6 bg-transparent border-0 gap-1">
                  {["24h", "7d", "14d", "30d", "6m", "1y"].map((range) => (
                    <TabsTrigger
                      key={range}
                      value={range}
                      className="text-xs font-semibold text-[#EBEBEBCC] data-[state=active]:bg-[#FFFFFF24] data-[state=active]:text-white rounded-[4px] h-full"
                    >
                      {range}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            {/* Search Bar */}
            <div className="flex h-[40px] items-center gap-2 px-2.5 bg-[#FFFFFF24] rounded-[6px] overflow-hidden border border-solid border-[#DAE0E633] shadow-[0px_1px_2px_#1018280A]" style={{ width: '160px', minWidth: '160px', flexShrink: 0, marginLeft: '30px' }}>
              <img
                className="relative w-[16px] h-[16px] flex-shrink-0"
                alt="Search"
                src="/zoom-search.svg"
              />
              <Input
            type="text"
                placeholder="Search..."
                value={filters.diseaseSearch || ""}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="flex-1 bg-transparent border-0 text-[#EBEBEB] text-xs [font-family:'Roboto',Helvetica] font-medium tracking-[-0.10px] leading-5 placeholder:text-[#EBEBEB] focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0 min-w-0"
              />
              {filters.diseaseSearch && (
                <button
                  onClick={() => {
                    setFilters(prev => ({ ...prev, diseaseSearch: "", country: null }));
                    setZoomTarget(null);
                  }}
                  className="flex items-center justify-center w-4 h-4 text-[#EBEBEB99] hover:text-[#EBEBEB] transition-colors flex-shrink-0"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* Disease Type Filter */}
            <select
              value={filters.diseaseType || "all"}
              onChange={(e) => {
                const newValue = e.target.value === "all" ? "all" : e.target.value as "human" | "veterinary" | "zoonotic";
                setFilters(prev => ({ 
                  ...prev, 
                  diseaseType: newValue,
                  category: null, // Clear category filter when disease type is selected
                }));
                // Reset map when "All Types" is selected
                if (newValue === "all") {
                  setZoomTarget(null);
                  setIsUserLocationZoom(false);
                }
              }}
              className="h-[40px] px-2.5 bg-[#FFFFFF24] rounded-[6px] border border-solid border-[#DAE0E633] text-[#EBEBEB] text-xs [font-family:'Roboto',Helvetica] font-medium tracking-[-0.10px] shadow-[0px_1px_2px_#1018280A] focus:outline-none focus:ring-2 focus:ring-[#67DBE2]/50 [&>option]:bg-[#2a4149] [&>option]:text-white"
              style={{ width: '140px', minWidth: '140px', flexShrink: 0, marginLeft: '10px' }}
            >
              <option value="all">All Types</option>
              <option value="human">Human Only</option>
              <option value="veterinary">Veterinary Only</option>
              <option value="zoonotic">Zoonotic (Both)</option>
            </select>
            
            
            <button
              onClick={handleResetFilters}
              className="flex items-center ml-2 justify-center w-10 h-[40px] rounded-[6px] border border-[#DAE0E633] bg-[#FFFFFF14] text-[#EBEBEBCC] hover:text-white hover:bg-[#FFFFFF24] transition-colors shadow-[0px_1px_2px_#1018280A] flex-shrink-0"
              title="Reset filters"
              aria-label="Reset filters"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Navigation Tabs - Commented out */}
          {/* <div style={{ maxWidth: 'calc(100vw - 100px)' }}>
            <NavigationTabsSection />
          </div> */}
        </div>

        {/* Outbreak Categories - Above Map */}
        <style>{`
          .category-icons-scrollable::-webkit-scrollbar {
            display: none;
          }
          .category-icons-scrollable {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        
        {/* Desktop Category Icons - Above Map */}
        <div 
          className={`hidden lg:block lg:absolute z-[1000] transition-all duration-300 ${isMapFullscreen || isDialogOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          style={{
            top: isMapFullscreen ? 'auto' : '120px',
            left: '90px',
            right: isMapFullscreen ? 'auto' : '260px',
            height: 'auto',
            minHeight: '60px',
            overflow: 'visible',
            position: 'absolute',
            visibility: isMapFullscreen || isDialogOpen ? 'hidden' : 'visible',
            paddingBottom: '25px',
            marginBottom: '15px',
          }}
        >
          {/* Scrollable container for icons */}
          <div 
            className="category-icons-scrollable"
            style={{
              overflowX: 'auto',
              overflowY: 'visible',
              scrollbarWidth: 'none',
              paddingRight: '20px',
              paddingLeft: '0',
              paddingBottom: '5px',
              paddingTop: '0',
              position: 'relative',
              height: '60px',
            }}
          >
            <div className="flex items-center gap-[18px] flex-nowrap" style={{ minWidth: 'max-content', paddingLeft: '0', paddingRight: '10px', paddingBottom: '0', paddingTop: '0', alignItems: 'center', display: 'flex', marginBottom: '0', height: '48px' }}>
              {diseaseCategories.map((category) => {
                return (
                  <div 
                    key={category.name} 
                    className="relative flex flex-col items-center flex-shrink-0" 
                    style={{ minWidth: '44px' }}
                    onMouseEnter={(e) => handleMouseEnter(category.name, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      onClick={() => handleCategoryClick(category.name)}
                      className="flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 relative"
                      style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: '#FFFFFF',
                        border: 'none',
                        boxShadow: filters.category === category.name 
                          ? `0 0 14px ${category.color}60, 0 4px 8px rgba(0,0,0,0.3)` 
                          : `0 2px 4px rgba(0,0,0,0.2)`,
                      }}
                    >
                      <div 
                        className="absolute inset-0 rounded-full"
                        style={{
                          backgroundColor: category.color,
                          width: filters.category === category.name ? '44px' : '40px',
                          height: filters.category === category.name ? '44px' : '40px',
                          margin: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                      >
                        {React.createElement(category.icon, {
                          style: {
                            width: '26px',
                            height: '26px',
                            color: '#FFFFFF',
                            stroke: '#FFFFFF',
                            fill: 'none',
                            strokeWidth: 2.5,
                          }
                        })}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Category Icons - Above Map */}
        {!isMapFullscreen && isMobile && (
          <div 
            className={`absolute z-[1000] transition-all duration-300 ${isDialogOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-[#2a4149]/95 backdrop-blur-sm`}
            style={{
              top: '60px',
              left: '0',
              right: '0',
              height: 'auto',
              minHeight: '80px',
              paddingTop: '8px',
              paddingBottom: '25px',
              marginBottom: '15px',
              overflow: 'visible',
            }}
          >
            {/* Scrollable container for icons */}
            <div 
              className="category-icons-scrollable h-full"
              style={{
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollbarWidth: 'none',
                paddingLeft: '12px',
                paddingRight: '12px',
                position: 'relative',
              }}
            >
              <div className="flex items-center gap-3 flex-nowrap" style={{ minWidth: 'max-content', height: '64px', alignItems: 'center', display: 'flex' }}>
                {diseaseCategories.map((category) => {
                  return (
                    <div 
                      key={category.name} 
                      className="relative flex flex-col items-center flex-shrink-0" 
                      style={{ minWidth: '50px' }}
                      onTouchStart={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredCategory(category.name);
                        setHoveredCategoryPosition({
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onTouchEnd={() => {
                        setTimeout(() => {
                          setHoveredCategory(null);
                          setHoveredCategoryPosition(null);
                        }, 2000);
                      }}
                    >
                      <button
                        onClick={() => handleCategoryClick(category.name)}
                        className="flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 relative"
                        style={{
                          width: '50px',
                          height: '50px',
                          backgroundColor: '#FFFFFF',
                          border: 'none',
                          boxShadow: filters.category === category.name 
                            ? `0 0 14px ${category.color}60, 0 4px 8px rgba(0,0,0,0.3)` 
                            : `0 2px 4px rgba(0,0,0,0.2)`,
                        }}
                      >
                        <div 
                          className="absolute inset-0 rounded-full"
                          style={{
                            backgroundColor: category.color,
                            width: filters.category === category.name ? '50px' : '46px',
                            height: filters.category === category.name ? '50px' : '46px',
                            margin: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}
                        >
                          {React.createElement(category.icon, {
                            style: {
                              width: '28px',
                              height: '28px',
                              color: '#FFFFFF',
                              stroke: '#FFFFFF',
                              fill: 'none',
                              strokeWidth: 2.5,
                            }
                          })}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Map - Main Content Area */}
        <div 
          ref={mapContainerRef}
          className={`${
            isMobile 
              ? 'absolute left-0 right-0 w-full rounded-none z-10' 
              : 'absolute rounded-[12px] z-[1000] overflow-hidden shadow-2xl border border-[#67DBE2]/20 transition-all duration-500 ease-in-out'
          } ${
            isMapFullscreen 
              ? 'top-0 left-0 right-0 bottom-0 w-full h-full rounded-none' 
              : isMobile
                ? ''
                : 'top-[190px] left-[90px] w-[calc(100vw-550px)] h-[calc(100vh-350px)] min-w-[750px] min-h-[650px]'
          }`}
          style={isMobile && !isMapFullscreen ? { 
            position: 'absolute', 
            top: '160px', 
            left: 0, 
            right: 0, 
            bottom: 0, 
            width: '100%',
            zIndex: 10
          } : isMobile && isMapFullscreen ? {
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            width: '100%', 
            height: '100%',
            zIndex: 10
          } : undefined}
        >
          {/* Fullscreen Toggle Button - Desktop Only */}
          {!isMobile && (
            <button
              onClick={toggleFullscreen}
              className={`absolute top-4 z-[1300] bg-[#2a4149] hover:bg-[#305961] text-[#67DBE2] p-2 rounded-lg shadow-lg border border-[#67DBE2]/30 transition-all duration-200 hover:scale-110 hover:border-[#67DBE2]/60 flex items-center justify-center group`}
              style={isMapFullscreen ? { right: '80px' } : { right: '16px' }}
              title={isMapFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              aria-label={isMapFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isMapFullscreen ? (
                <Minimize2 className="w-5 h-5 group-hover:text-white transition-colors" />
              ) : (
                <Maximize2 className="w-5 h-5 group-hover:text-white transition-colors" />
              )}
            </button>
          )}

          {/* Desktop Near Me Controls - anchored inline with map controls */}
          {location?.coordinates && !isMobile && (
            <div
              className={`hidden lg:flex absolute z-[1300] items-center gap-2 bg-[#23313c]/90 backdrop-blur-sm border border-[#EAEBF024] rounded-md px-3 py-2 transition-opacity duration-300 ${
                isMapFullscreen || isDialogOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
              style={{
                top: '12px',
                left: '120px', // align near the points count badge for tighter grouping
              }}
            >
              <label className="[font-family:'Roboto',Helvetica] text-xs font-semibold text-white whitespace-nowrap">
                Near Me:
              </label>
              <select
                value={nearMeRadius}
                onChange={(e) => {
                  const newRadius = Number(e.target.value);
                  setNearMeRadius(newRadius);
                  // If a category is currently selected, update the radius in the filter
                  if (nearMeCategory && location?.coordinates) {
                    setFilters(prev => ({
                      ...prev,
                      nearMe: {
                        coordinates: location.coordinates,
                        radiusKm: newRadius,
                      },
                    }));
                  } else {
                    // Clear near me category selection when radius changes and no category selected
                    setNearMeCategory(null);
                    handleNearMeCategoryChange(null);
                  }
                }}
                className="bg-[#23313c] border border-[#EAEBF024] text-white text-xs h-7 px-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#67DBE2]/50 [&>option]:bg-[#23313c] [&>option]:text-white"
                style={{ minWidth: '100px' }}
              >
                <option value={100}>100 km</option>
                <option value={500}>500 km</option>
                <option value={1000}>1000 km</option>
                <option value={5000}>5000 km</option>
              </select>
              <select
                value={nearMeCategory || ""}
                onChange={(e) => handleNearMeCategoryChange(e.target.value || null)}
                disabled={nearbyCategories.length === 0}
                className="bg-[#23313c] border border-[#EAEBF024] text-white text-xs h-7 px-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#67DBE2]/50 [&>option]:bg-[#23313c] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minWidth: '200px' }}
              >
                <option value="">
                  {nearbyCategories.length === 0 
                    ? location ? "No outbreaks nearby" : "Loading location..."
                    : `Select category (${nearbyCategories.length} available)`}
                </option>
                {nearbyCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          )}

          <InteractiveMap 
            filters={filters}
            isFullscreen={isMapFullscreen || isMobile}
            zoomTarget={zoomTarget}
            isUserLocation={isUserLocationZoom}
            zoomLevel={
              isUserLocationZoom && nearMeCategory 
                ? getZoomLevelForRadius(nearMeRadius) 
                : isUserLocationZoom && isMobile
                ? 10  // Zoom level 10 on mobile to show user location pin
                : isUserLocationZoom
                ? 13  // Default zoom for desktop
                : undefined
            }
            onClearSearch={() => {
              setFilters(prev => ({ ...prev, diseaseSearch: "", country: null }));
              setZoomTarget(null);
              setIsUserLocationZoom(false);
            }}
            onDialogStateChange={setIsDialogOpen}
          />
        </div>

        {/* Premium Ads Section - Below Map (Normal Mode) */}
        {!isMapFullscreen && !isMobile && (
          <div 
            className="hidden lg:block absolute z-[1400] transition-opacity duration-300 overflow-visible"
            style={{ 
              top: adsTop, // Dynamically calculated based on map container bottom
              left: '90px',
              right: '260px',
              width: 'calc(100vw - 550px)',
              minWidth: '750px',
              paddingRight: '0',
            }}
          >
            <PremiumAdsSection />
          </div>
        )}

        {/* Premium Ads Section - Center of Map (Fullscreen Mode) */}
        {isMapFullscreen && !isMobile && (
          <div 
            className="hidden lg:block fixed z-[1400] transition-opacity duration-300 overflow-visible pointer-events-none"
            style={{ 
              top: '90%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'calc(100vw - 150px)',
              maxWidth: '1200px',
              paddingLeft: '120px',
              paddingRight: '120px',
            }}
          >
            <div className="pointer-events-auto">
              <PremiumAdsSection floating={true} />
            </div>
          </div>
        )}

        {/* News Section - Right Sidebar - Desktop Only */}
        <div 
          className={`hidden lg:block absolute z-[1000] transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
          style={{ 
            // Align the top of the outbreak news section with the map container on laptop/desktop
            top: '190px',
            left: 'calc(90px + min(calc(100vw - 550px), calc(100vw - 260px)) + 10px)', 
            width: '240px' 
          }}
        >
          <NewsSection />
        </div>

        {/* Sponsored Section - Right Sidebar, Below News - Desktop Only */}
        <div 
          className={`hidden lg:block absolute z-[1000] transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
          style={{ 
            // Position below the news section with extra spacing so they aren't visually attached
            top: '580px', 
            left: 'calc(90px + min(calc(100vw - 550px), calc(100vw - 260px)) + 10px)', 
            width: '240px' 
          }}
        >
          <SponsoredSection />
        </div>

        {/* Mobile Near Me Controls */}
        {location?.coordinates && isMobile && !isMapFullscreen && (
          <div className="absolute bottom-20 left-2 right-2 z-[1000] bg-[#23313c] border border-[#EAEBF024] rounded-lg p-3 space-y-2 lg:hidden">
            <label className="[font-family:'Roboto',Helvetica] text-xs font-semibold text-white block">
              Show Outbreaks Near My Location:
            </label>
            <div className="flex gap-2">
              <select
                value={nearMeRadius}
                onChange={(e) => {
                  const newRadius = Number(e.target.value);
                  setNearMeRadius(newRadius);
                  if (nearMeCategory && location?.coordinates) {
                    setFilters(prev => ({
                      ...prev,
                      nearMe: {
                        coordinates: location.coordinates,
                        radiusKm: newRadius,
                      },
                    }));
                  } else {
                    setNearMeCategory(null);
                    handleNearMeCategoryChange(null);
                  }
                }}
                className="flex-1 bg-[#2a4149] border border-[#EAEBF024] text-white text-xs h-8 px-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#67DBE2]/50 [&>option]:bg-[#2a4149] [&>option]:text-white"
              >
                <option value={100}>100 km</option>
                <option value={500}>500 km</option>
                <option value={1000}>1000 km</option>
                <option value={5000}>5000 km</option>
              </select>
              <select
                value={nearMeCategory || ""}
                onChange={(e) => handleNearMeCategoryChange(e.target.value || null)}
                disabled={nearbyCategories.length === 0}
                className="flex-1 bg-[#2a4149] border border-[#EAEBF024] text-white text-xs h-8 px-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#67DBE2]/50 [&>option]:bg-[#2a4149] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {nearbyCategories.length === 0 
                    ? location ? "No outbreaks nearby" : "Loading location..."
                    : `Select category (${nearbyCategories.length} available)`}
                </option>
                {nearbyCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Mobile Bottom Section Container - News/Sponsored */}
        {!isMapFullscreen && isMobile && (
          <div 
            className={`absolute bottom-0 left-0 right-0 z-[1000] transition-all duration-300 ${isDialogOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-[#2a4149]/95 backdrop-blur-sm`}
            style={{
              maxHeight: '40vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Scrollable content area for News/Sponsored */}
            <div 
              className="overflow-y-auto flex-shrink-0 border-t border-[#67DBE2]/20"
              style={{
                maxHeight: '40vh',
              }}
            >
              {/* Two-column layout: Sponsored (left) and News (right) */}
              <div className="flex gap-2 px-2 pt-2 pb-2">
                {/* Sponsored Section - Left */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <SponsoredSection />
                </div>
                
                {/* News Section - Right */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <NewsSection />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Tooltip Portal - Render tooltip outside scrollable container */}
        {hoveredCategory && hoveredCategoryPosition && (() => {
          const category = diseaseCategories.find(c => c.name === hoveredCategory);
          if (!category) return null;
          const stats = categoryStats[category.name] || { cases: 0, severity: 'Low' };
          
          return createPortal(
            <div
              className="fixed z-[2000] pointer-events-none"
              style={{
                left: `${hoveredCategoryPosition.x}px`,
                top: `${hoveredCategoryPosition.y - 10}px`,
                transform: 'translate(-50%, -100%)',
                whiteSpace: 'nowrap',
              }}
            >
              <div className="bg-white text-gray-800 rounded-md shadow-lg border border-gray-200 p-3 min-w-[200px]">
                <div className="mb-2 font-semibold text-sm text-gray-900 border-b border-gray-200 pb-1">
                  {category.name}
                </div>
                <div className="text-xs mb-1">
                  <strong className="text-gray-700">Cases:</strong> <span className="text-gray-900">{stats.cases.toLocaleString()}</span>
                </div>
                <div className="text-xs">
                  <strong className="text-gray-700">Severity:</strong> <span className={`font-semibold ${
                    stats.severity === 'Critical' ? 'text-red-600' :
                    stats.severity === 'High' ? 'text-orange-600' :
                    stats.severity === 'Medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>{stats.severity}</span>
                </div>
              </div>
              {/* Tooltip arrow */}
              <div
                className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent"
                style={{
                  borderTopColor: '#ffffff',
                  bottom: '-8px',
                }}
              />
            </div>,
            document.body
          );
        })()}
      </div>
    </div>
  );
};