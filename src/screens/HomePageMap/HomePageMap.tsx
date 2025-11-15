import "leaflet/dist/leaflet.css";
import React from "react";
import { createPortal } from "react-dom";
import { NavigationTabsSection } from "./sections/NavigationTabsSection";
import { InteractiveMap } from "./sections/MapSection/InteractiveMap";
import { NewsSection } from "./sections/NewsSection";
import { SponsoredSection } from "./sections/SponsoredSection";
import { FilterState } from "./sections/FilterPanel";
import { Input } from "../../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useSupabaseOutbreakSignals, categoriesMatch } from "../../lib/useSupabaseOutbreakSignals";
import { useOutbreakCategories } from "../../lib/useOutbreakCategories";
import { detectCountryInText, geocodeLocation } from "../../lib/geocode";
import { geocodeWithOpenCage } from "../../lib/opencage";
import { useUserLocation } from "../../lib/useUserLocation";
import { Maximize2, Minimize2, X, RefreshCcw, Utensils, Droplet, Bug, Wind, Handshake, Hospital, PawPrint, Heart, Shield, AlertTriangle, MapPin, Brain, Syringe, Activity } from "lucide-react";
import { useFullscreen } from "../../contexts/FullscreenContext";

// Removed demo outbreaks; using data-driven InteractiveMap

export const HomePageMap = (): JSX.Element => {
  const [filters, setFilters] = React.useState<FilterState>({
    country: null,
    dateRange: "7d", // Default to 7 days like dashboard
    category: null,
    diseaseSearch: "",
    diseaseType: "all", // Default to show all disease types
  });
  const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(null);
  const [hoveredCategoryPosition, setHoveredCategoryPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [zoomTarget, setZoomTarget] = React.useState<[number, number] | null>(null);
  const { isFullscreen: isMapFullscreen, setIsFullscreen: setIsMapFullscreen } = useFullscreen();
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const [categoryTop, setCategoryTop] = React.useState<string>('820px');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [showLocationNotification, setShowLocationNotification] = React.useState(false);
  const [showLocationError, setShowLocationError] = React.useState(true);
  const [isUserLocationZoom, setIsUserLocationZoom] = React.useState(false);
  const locationAutoAppliedRef = React.useRef(false);
  
  // Request user location on mount
  const { location, isRequesting: isRequestingLocation, error: locationError } = useUserLocation(true);
  
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
    });
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
    const matchingCountry = queryLower.length >= 3 ? availableCountries.find(country => {
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
  }, [availableCountries]);

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
    'hospital': Hospital,
    'paw-print': PawPrint,
    'heart': Heart,
    'shield': Shield,
    'alert-triangle': AlertTriangle,
    'brain': Brain,
    'syringe': Syringe,
    'activity': Activity,
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
      
      // Map icon name from database to icon component, with fallbacks
      let IconComponent: React.ComponentType<any> = AlertTriangle; // Default icon
      
      if (cat.icon) {
        const iconKey = cat.icon.toLowerCase().replace(/\s+/g, '-');
        IconComponent = iconMap[iconKey] || AlertTriangle;
      } else {
        // Fallback: try to infer icon from normalized category name
        const nameLower = normalizedName.toLowerCase();
        if (nameLower.includes('food')) IconComponent = Utensils;
        else if (nameLower.includes('water')) IconComponent = Droplet;
        else if (nameLower.includes('vector')) IconComponent = Bug;
        else if (nameLower.includes('airborne') || nameLower.includes('respiratory')) IconComponent = Wind;
        else if (nameLower.includes('contact')) IconComponent = Handshake;
        else if (nameLower.includes('healthcare') || nameLower.includes('hospital')) IconComponent = Hospital;
        else if (nameLower.includes('zoonotic') || nameLower.includes('veterinary')) IconComponent = PawPrint;
        else if (nameLower.includes('sexually')) IconComponent = Heart;
        else if (nameLower.includes('vaccine')) IconComponent = Shield;
        else if (nameLower.includes('emerging')) IconComponent = AlertTriangle;
        else if (nameLower.includes('neurological')) IconComponent = Brain;
        else if (nameLower.includes('blood')) IconComponent = Syringe;
        else if (nameLower.includes('gastrointestinal')) IconComponent = Activity;
      }
      
      categoryMap.set(normalizedName, {
        id: cat.id,
        name: normalizedName, // Use normalized name for display
        color: cat.color || '#66dbe1',
        icon: IconComponent,
        originalName: cat.name, // Keep original for reference
      });
    });
    
    // Convert map to array, remove originalName field, and sort by name
    return Array.from(categoryMap.values())
      .map(({ originalName, ...cat }) => cat) // Remove originalName from output
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dbCategories]);

  // Handle category selection from disease category icons
  const handleCategoryClick = (categoryName: string) => {
    setFilters(prev => ({
      ...prev,
      category: prev.category === categoryName ? null : categoryName,
      // Clear country, disease search, and disease type filter when selecting a category
      country: null,
      diseaseSearch: "",
      diseaseType: "all", // Reset disease type filter when category is selected
    }));
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
      // User location detected - automatically filter by country and zoom to location
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
      
      // Check if country exists in our lookup or available countries
      const coords = geocodeLocation(detectedCountry);
      const countryExists = coords || availableCountries.some(c => 
        c.toLowerCase() === detectedCountry.toLowerCase()
      );
      
      if (countryExists && !filters.country) {
        // Set country filter (only if not already set)
        setFilters(prev => ({
          ...prev,
          country: detectedCountry,
        }));
      }
      
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
  }, [location, availableCountries]);
  
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

  // Calculate category position relative to map container
  React.useEffect(() => {
    if (isMapFullscreen) {
      return;
    }

    const updateCategoryPosition = () => {
      const mapContainer = mapContainerRef.current;
      if (!mapContainer) {
        // Responsive fallback based on screen size
        const fallback = window.innerWidth >= 1024 ? '820px' : window.innerWidth >= 768 ? '700px' : window.innerWidth >= 640 ? '600px' : '500px';
        setCategoryTop(fallback);
        return;
      }

      const mapRect = mapContainer.getBoundingClientRect();
      const containerRect = mapContainer.parentElement?.getBoundingClientRect();
      if (!containerRect) {
        // Responsive fallback based on screen size
        const fallback = window.innerWidth >= 1024 ? '820px' : window.innerWidth >= 768 ? '700px' : window.innerWidth >= 640 ? '600px' : '500px';
        setCategoryTop(fallback);
        return;
      }

      // Calculate position: map bottom + 20px spacing
      const mapBottom = mapRect.bottom - containerRect.top;
      // Responsive minimum position based on screen size
      const minPosition = window.innerWidth >= 1024 ? 820 : window.innerWidth >= 768 ? 700 : window.innerWidth >= 640 ? 600 : 500;
      const newTop = Math.max(minPosition, mapBottom + 20); // Ensure minimum position
      setCategoryTop(`${newTop}px`);
    };

    // Initial calculation
    updateCategoryPosition();
    
    // Update on window resize
    window.addEventListener('resize', updateCategoryPosition);
    
    // Update after delays to account for map rendering and transitions
    const timeoutIds = [
      setTimeout(updateCategoryPosition, 100),
      setTimeout(updateCategoryPosition, 600), // After transition completes
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
  }, [isMapFullscreen]); // Recalculate when fullscreen changes

  return (
    <div className={`bg-[#2a4149] relative ${isMapFullscreen ? 'absolute inset-0 w-full h-full overflow-hidden' : 'min-h-screen overflow-x-hidden'}`}>
      <div className="relative w-full h-full min-w-[1280px]">
        {/* Location Detection Notification */}
        {showLocationNotification && location && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1100] bg-[#67DBE2] text-[#2a4149] px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <MapPin className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-sm">
                Showing outbreaks in {location.country}
                {location.city && `, ${location.city}`}
              </div>
              <div className="text-xs opacity-90">
                Your location has been detected. Click to dismiss.
              </div>
            </div>
            <button
              onClick={() => setShowLocationNotification(false)}
              className="ml-2 hover:bg-[#2a4149]/20 rounded p-1 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Location Request Error Notification */}
        {locationError && !location && !isRequestingLocation && showLocationError && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1100] bg-[#ef4444] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 max-w-md">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-sm">Location Access Required</div>
              <div className="text-xs opacity-90">{locationError}</div>
            </div>
            <button
              onClick={() => setShowLocationError(false)}
              className="ml-2 hover:bg-white/20 rounded p-1 transition-colors"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Header Title - Top Left */}
        <div className={`absolute top-[32px] left-[90px] z-[1000] transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <h1 className="[font-family:'Roboto',Helvetica] font-bold text-[#67DBE2] text-[32px] tracking-[-0.5px] leading-[40px] max-w-[500px]">
            Global Outbreak & Disease
            <br />
            Monitoring System
          </h1>
        </div>

        {/* Filters and Navigation - Top Right */}
        <div className={`absolute top-[32px] z-[1000] flex flex-col items-end gap-3 transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ right: '200px' }}>
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

          <div style={{ maxWidth: 'calc(100vw - 100px)' }}>
            <NavigationTabsSection />
          </div>
        </div>

        {/* Map - Main Content Area */}
        <div 
          ref={mapContainerRef}
          className={`absolute rounded-[12px] z-[1000] overflow-hidden shadow-2xl border border-[#67DBE2]/20 transition-all duration-500 ease-in-out ${
            isMapFullscreen 
              ? 'top-0 left-0 right-0 bottom-0 w-full h-full rounded-none' 
              : 'top-[160px] left-[90px] w-[calc(100vw-550px)] h-[calc(100vh-320px)] min-w-[750px] min-h-[650px]'
          }`}
        >
          {/* Fullscreen Toggle Button */}
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
          <InteractiveMap 
            filters={filters}
            isFullscreen={isMapFullscreen}
            zoomTarget={zoomTarget}
            isUserLocation={isUserLocationZoom}
            onClearSearch={() => {
              setFilters(prev => ({ ...prev, diseaseSearch: "", country: null }));
              setZoomTarget(null);
              setIsUserLocationZoom(false);
            }}
            onDialogStateChange={setIsDialogOpen}
          />
        </div>

        {/* News Section - Right Sidebar */}
        <div className={`absolute top-[160px] z-[1000] transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ left: 'calc(90px + min(calc(100vw - 550px), calc(100vw - 260px)) + 10px)', width: '240px' }}>
          <NewsSection />
        </div>

        {/* Sponsored Section - Right Sidebar, Below News */}
        <div className={`absolute top-[560px] z-[1000] transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ left: 'calc(90px + min(calc(100vw - 550px), calc(100vw - 260px)) + 10px)', width: '240px' }}>
          <SponsoredSection />
        </div>

        {/* Disease Category Icons - Left Side, Scrollable */}
        <style>{`
          .category-icons-scrollable::-webkit-scrollbar {
            height: 6px;
          }
          .category-icons-scrollable::-webkit-scrollbar-track {
            background: #2a4149;
            border-radius: 3px;
          }
          .category-icons-scrollable::-webkit-scrollbar-thumb {
            background: #67DBE2;
            border-radius: 3px;
          }
          .category-icons-scrollable::-webkit-scrollbar-thumb:hover {
            background: #5bc5cb;
          }
        `}</style>
        <div 
          className={`absolute z-[1000] transition-all duration-300 ${isMapFullscreen || isDialogOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          style={{
            top: isMapFullscreen ? 'auto' : categoryTop,
            left: '90px',
            right: isMapFullscreen ? 'auto' : '260px', // Leave space for right sidebar (240px + 20px margin)
            height: '44px',
            overflow: 'visible', // Allow tooltips to show outside container
          }}
        >
          {/* Scrollable container for icons */}
          <div 
            className="category-icons-scrollable h-full"
            style={{
              overflowX: 'auto',
              overflowY: 'hidden', // Keep hidden for scrolling, but tooltips will escape via parent
              scrollbarWidth: 'thin',
              scrollbarColor: '#67DBE2 #2a4149',
              paddingRight: '20px', // Add padding to prevent icons from being cut off at the end
              paddingLeft: '0',
              position: 'relative', // Ensure positioning context
            }}
          >
          <div className="flex items-center h-full gap-[18px] flex-nowrap" style={{ minWidth: 'max-content', paddingLeft: '0', paddingRight: '10px' }}>
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
