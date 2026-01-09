import "leaflet/dist/leaflet.css";
import React from "react";
import { createPortal } from "react-dom";
import { InteractiveMap } from "./sections/MapSection/InteractiveMap";
import { NewsSection } from "./sections/NewsSection";
import { SponsoredSection } from "./sections/SponsoredSection";
import { PremiumAdsSection } from "./sections/PremiumAdsSection";
import { FilterState } from "./sections/FilterPanel";
import { Input } from "../../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../components/ui/collapsible";
import { useSupabaseOutbreakSignals, categoriesMatch } from "../../lib/useSupabaseOutbreakSignals";
import { useOutbreakCategories } from "../../lib/useOutbreakCategories";
import { detectCountryInText, geocodeLocation } from "../../lib/geocode";
import { geocodeWithOpenCage } from "../../lib/opencage";
import { useUserLocation } from "../../lib/useUserLocation";
import { Maximize2, Minimize2, X, RefreshCcw, MapPin, AlertTriangle, Filter, Sparkles } from "lucide-react";
import { useFullscreen } from "../../contexts/FullscreenContext";
import { useFilterPanel } from "../../contexts/FilterPanelContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { calculateDistance } from "../../lib/utils";
import { buildStandardizedCategories, normalizeCategoryForDisplay } from "../../lib/outbreakCategoryUtils";

// Constants
const MOBILE_ADS_HEIGHT = 90;
const MOBILE_BOTTOM_NAV_HEIGHT = 72;

export const HomePageMap = (): JSX.Element => {
  // State management
  const [filters, setFilters] = React.useState<FilterState>({
    country: null,
    dateRange: "7d",
    category: null,
    diseaseSearch: "",
    diseaseType: "all",
  });
  
  const [zoomTarget, setZoomTarget] = React.useState<[number, number] | null>(null);
  const { isFullscreen: isMapFullscreen, setIsFullscreen: setIsMapFullscreen } = useFullscreen();
  const { sidebarWidth } = useSidebar();
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [showLocationNotification, setShowLocationNotification] = React.useState(false);
  const [showLocationError, setShowLocationError] = React.useState(true);
  const [isUserLocationZoom, setIsUserLocationZoom] = React.useState(false);
  const locationAutoAppliedRef = React.useRef(false);
  
  // Persist location auto-applied state across component re-mounts to prevent re-zooming on tab focus
  React.useEffect(() => {
    const wasApplied = sessionStorage.getItem('locationAutoApplied') === 'true';
    if (wasApplied) {
      locationAutoAppliedRef.current = true;
    }
  }, []);
  const [nearMeRadius, setNearMeRadius] = React.useState<number>(500);
  const [nearMeCategory, setNearMeCategory] = React.useState<string | null>(null);
  const { isMobileFiltersOpen, setIsMobileFiltersOpen } = useFilterPanel();
  const [isCategoriesPanelOpen, setIsCategoriesPanelOpen] = React.useState(false);
  const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(null);
  const [hoveredCategoryPosition, setHoveredCategoryPosition] = React.useState<{ x: number; y: number } | null>(null);
  
  // Request user location on mount
  const { location, isRequesting: isRequestingLocation, error: locationError } = useUserLocation(true);
  
  // Responsive detection
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);
  const [isSmallHeight, setIsSmallHeight] = React.useState(false);
  const [viewportHeight, setViewportHeight] = React.useState(
    typeof window !== "undefined" ? window.innerHeight : 1080
  );
  const [viewportWidth, setViewportWidth] = React.useState(
    typeof window !== "undefined" ? window.innerWidth : 1920
  );
  
  React.useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(width < 1024);
      setIsTablet(width >= 1024 && (width < 1600 || height < 1100));
      setIsSmallHeight(height < 900);
      setViewportHeight(height);
      setViewportWidth(width);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Detect when any Sheet is open
  React.useEffect(() => {
    const checkSheetOpen = () => {
      const overlay = document.querySelector('[data-radix-dialog-overlay]');
      const isOpen = overlay !== null && overlay.getAttribute('data-state') === 'open';
    };
    checkSheetOpen();
    const observer = new MutationObserver(checkSheetOpen);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state'],
    });
    return () => observer.disconnect();
  }, []);

  // Broadcast current category selection
  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('outbreakCategorySelectionChanged', {
        detail: { category: filters.category },
      })
    );
  }, [filters.category]);
  
  // Fetch data
  const statsFilters = { ...filters, category: null };
  const { signals } = useSupabaseOutbreakSignals(statsFilters);
  const { categories: dbCategories } = useOutbreakCategories();

  // Extract available countries
  const availableCountries = React.useMemo(() => {
    const countries = new Set<string>();
    signals.forEach(s => {
      const parts = s.location.split(',').map(p => p.trim());
      const country = parts.length > 1 ? parts[parts.length - 1] : parts[0];
      if (country && country !== "Unknown") {
        countries.add(country);
      }
    });
    return Array.from(countries).sort();
  }, [signals]);

  const availableCountriesRef = React.useRef<string[]>(availableCountries);
  React.useEffect(() => {
    availableCountriesRef.current = availableCountries;
  }, [availableCountries]);

  // Search handlers
  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, diseaseSearch: value }));
  };

  const handleResetFilters = () => {
    console.log('🔄 Resetting filters');
    setFilters({
      country: null,
      dateRange: "7d",
      category: null,
      diseaseSearch: "",
      diseaseType: "all",
      nearMe: null,
    });
    setNearMeCategory(null);
    setZoomTarget(null);
    setIsUserLocationZoom(false);
    // Clear location auto-applied flag so location can be re-applied if needed
    locationAutoAppliedRef.current = false;
    sessionStorage.removeItem('locationAutoApplied');
  };

  // Process search (country or disease)
  const processSearch = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery || !searchQuery.trim()) {
      setFilters(prev => ({ ...prev, country: null }));
      setZoomTarget(null);
      return;
    }

    const query = searchQuery.trim();
    const queryLower = query.toLowerCase();
    
    const detectedCountry = detectCountryInText(queryLower);
    
    if (detectedCountry) {
      let coords = geocodeLocation(detectedCountry);
      
      if (coords) {
        setFilters(prev => ({ ...prev, country: detectedCountry, diseaseSearch: prev.diseaseSearch }));
        setIsUserLocationZoom(false);
        setZoomTarget(coords);
        return;
      }
      
      setFilters(prev => ({ ...prev, country: detectedCountry, diseaseSearch: prev.diseaseSearch }));
      setIsUserLocationZoom(false);
      
      geocodeWithOpenCage(detectedCountry).then(coords => {
        if (coords) {
          setFilters(prev => {
            if (prev.country === detectedCountry) {
              setZoomTarget(coords);
              setIsUserLocationZoom(false);
            }
            return prev;
          });
        }
      }).catch(e => console.warn('Failed to geocode:', e));
      
      return;
    }

    const currentAvailableCountries = availableCountriesRef.current;
    const matchingCountry = queryLower.length >= 3 ? currentAvailableCountries.find(country => {
      const countryLower = country.toLowerCase();
      return countryLower === queryLower || 
             countryLower.startsWith(queryLower) ||
             queryLower.startsWith(countryLower) ||
             (queryLower === 'usa' && countryLower.includes('united states')) ||
             (queryLower === 'us' && countryLower.includes('united states')) ||
             (queryLower === 'uk' && countryLower.includes('united kingdom')) ||
             (queryLower === 'china' && countryLower.includes('china')) ||
             (queryLower === 'chn' && countryLower.includes('china'));
    }) : null;

    if (matchingCountry) {
      let coords = geocodeLocation(matchingCountry);
      
      if (coords) {
        setFilters(prev => ({ ...prev, country: matchingCountry, diseaseSearch: prev.diseaseSearch }));
        setIsUserLocationZoom(false);
        setZoomTarget(coords);
        return;
      }
      
      setFilters(prev => ({ ...prev, country: matchingCountry, diseaseSearch: prev.diseaseSearch }));
      setIsUserLocationZoom(false);
      
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
      }).catch(e => console.warn('Failed to geocode:', e));
      
      return;
    }

    const commonDiseaseNames = [
      'malaria', 'dengue', 'cholera', 'ebola', 'covid', 'flu', 'influenza',
      'measles', 'mumps', 'tuberculosis', 'tb', 'hiv', 'aids', 'hepatitis',
      'typhoid', 'yellow fever', 'zika', 'chikungunya', 'plague', 'anthrax'
    ];
    const looksLikeDisease = commonDiseaseNames.some(disease => 
      queryLower === disease || queryLower.startsWith(disease) || queryLower.includes(disease)
    );
    
    if (!detectedCountry && !matchingCountry && !looksLikeDisease) {
      geocodeWithOpenCage(query).then(coords => {
        if (coords) {
          const countryName = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase();
          setFilters(prev => {
            if (prev.diseaseSearch === query) {
              return { ...prev, country: countryName };
            }
            return prev;
          });
          setIsUserLocationZoom(false);
          setZoomTarget(coords);
        }
      }).catch(e => console.warn('OpenCage failed:', e));
    }

    setFilters(prev => {
      if (prev.country !== null) {
        return { ...prev, country: null };
      }
      return prev;
    });
    setZoomTarget(null);
    setIsUserLocationZoom(false);
  }, []);

  // Debounced search processing
  React.useEffect(() => {
    const currentSearch = filters.diseaseSearch;
    
    if (currentSearch && currentSearch.trim()) {
      const queryLower = currentSearch.toLowerCase().trim();
      const detectedCountry = detectCountryInText(queryLower);
      
      if (detectedCountry && geocodeLocation(detectedCountry)) {
        processSearch(currentSearch);
        return;
      }
    }
    
    const timer = setTimeout(() => {
      processSearch(currentSearch);
    }, 150);

    return () => clearTimeout(timer);
  }, [filters.diseaseSearch, processSearch]);

  // Reset map when date range changes
  const prevDateRangeRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (prevDateRangeRef.current === null) {
      prevDateRangeRef.current = filters.dateRange;
      return;
    }
    
    if (prevDateRangeRef.current !== filters.dateRange) {
      prevDateRangeRef.current = filters.dateRange;
      setZoomTarget(null);
      setIsUserLocationZoom(false);
    }
  }, [filters.dateRange]);

  // Disease categories
  const diseaseCategories = React.useMemo(
    () => buildStandardizedCategories(dbCategories),
    [dbCategories]
  );

  // Category handlers
  const handleCategoryClick = (categoryName: string) => {
    setFilters(prev => {
      const isClearing = prev.category === categoryName;
      if (isClearing) {
        setNearMeCategory(null);
      }
      return {
        ...prev,
        category: isClearing ? null : categoryName,
        country: null,
        diseaseSearch: "",
        diseaseType: "all",
        nearMe: null,
      };
    });
    setZoomTarget(null);
    setIsUserLocationZoom(false);
  };

  // Listen for category selection from header
  React.useEffect(() => {
    const handleCategoryEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ categoryName: string }>;
      if (customEvent.detail?.categoryName) {
        const categoryName = customEvent.detail.categoryName;
        setFilters(prev => {
          const isClearing = prev.category === categoryName;
          if (isClearing) {
            setNearMeCategory(null);
          }
          return {
            ...prev,
            category: isClearing ? null : categoryName,
            country: null,
            diseaseSearch: "",
            diseaseType: "all",
            nearMe: null,
          };
        });
        setZoomTarget(null);
        setIsUserLocationZoom(false);
      }
    };

    window.addEventListener('outbreakCategorySelected', handleCategoryEvent);
    return () => {
      window.removeEventListener('outbreakCategorySelected', handleCategoryEvent);
    };
  }, []);

  // Category statistics
  const categoryStats = React.useMemo(() => {
    const stats: Record<string, { cases: number; severity: string }> = {};
    
    diseaseCategories.forEach(category => {
      const categorySignals = signals.filter(s => {
        const originalCategory = (s as any).originalCategoryName;
        if (originalCategory && originalCategory !== s.category) {
          return categoriesMatch(originalCategory, category.name) || categoriesMatch(s.category, category.name);
        }
        return categoriesMatch(s.category, category.name);
      });
      const cases = categorySignals.length;
      
      const severities = categorySignals.map(s => s.severity || 'medium');
      const criticalCount = severities.filter(s => s.toLowerCase().includes('critical') || s.toLowerCase().includes('high')).length;
      const severityRatio = cases > 0 ? criticalCount / cases : 0;
      
      let severity = 'Low';
      if (severityRatio > 0.3 || cases > 20) {
        severity = 'Critical';
      } else if (severityRatio > 0.15 || cases > 10) {
        severity = 'High';
      } else if (cases > 2) {
        severity = 'Medium';
      }
      
      stats[category.name] = { cases, severity };
    });
    
    return stats;
  }, [signals, diseaseCategories]);

  // Broadcast category stats
  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('outbreakCategoryStatsUpdated', {
        detail: categoryStats,
      })
    );
  }, [categoryStats]);

  // Nearby categories
  const nearbyCategories = React.useMemo(() => {
    if (!location?.coordinates || signals.length === 0) {
      return [];
    }

    const [userLat, userLon] = location.coordinates;
    const categoryMap = new Map<string, boolean>();

    signals.forEach(signal => {
      const [signalLat, signalLon] = signal.position;
      const distance = calculateDistance(userLat, userLon, signalLat, signalLon);
      
      if (distance <= nearMeRadius) {
        const categoryName = normalizeCategoryForDisplay(signal.category);
        categoryMap.set(categoryName, true);
      }
    });

    return diseaseCategories
      .filter(category => categoryMap.has(category.name))
      .map(category => category.name)
      .sort();
  }, [location, signals, nearMeRadius, diseaseCategories]);

  // Zoom level for radius
  const getZoomLevelForRadius = (radiusKm: number): number => {
    if (radiusKm <= 100) return 9;
    if (radiusKm <= 500) return 7;
    if (radiusKm <= 1000) return 6;
    return 5;
  };

  // Near me category handler
  const handleNearMeCategoryChange = (categoryName: string | null) => {
    setNearMeCategory(categoryName);
    if (categoryName && location?.coordinates) {
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
      setZoomTarget(location.coordinates);
      setIsUserLocationZoom(true);
    } else {
      setFilters(prev => ({
        ...prev,
        category: null,
        nearMe: null,
      }));
    }
  };

  // Sync nearMeCategory with filters
  React.useEffect(() => {
    if (!filters.category || !nearbyCategories.includes(filters.category)) {
      if (nearMeCategory) {
        setNearMeCategory(null);
        setFilters(prev => prev.nearMe ? { ...prev, nearMe: null } : prev);
      }
    } else if (filters.category && nearbyCategories.includes(filters.category)) {
      setNearMeCategory(prev => prev !== filters.category ? filters.category : prev);
    }
  }, [filters.category, nearbyCategories, nearMeCategory]);

  // Tooltip handlers
  const handleMouseEnter = (categoryName: string, event: React.MouseEvent<HTMLElement>) => {
    setHoveredCategory(categoryName);
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredCategoryPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => {
    setHoveredCategory(null);
    setHoveredCategoryPosition(null);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    setIsMapFullscreen(!isMapFullscreen);
  };

  // Auto-apply location (only once, prevent re-application on tab focus)
  React.useEffect(() => {
    if (location && !locationAutoAppliedRef.current) {
      const userCoords = location.coordinates;
      
      if (!userCoords || userCoords.length !== 2 || isNaN(userCoords[0]) || isNaN(userCoords[1])) {
        return;
      }
      
      const [lat, lng] = userCoords;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return;
      }
      
      // Only auto-apply if we don't already have a zoom target set to this location
      // This prevents re-zooming when user switches tabs and comes back
      if (zoomTarget && 
          Math.abs(zoomTarget[0] - userCoords[0]) < 0.0001 &&
          Math.abs(zoomTarget[1] - userCoords[1]) < 0.0001) {
        // Already zoomed to this location, just mark as applied
        locationAutoAppliedRef.current = true;
        sessionStorage.setItem('locationAutoApplied', 'true');
        return;
      }
      
      setIsUserLocationZoom(true);
      setZoomTarget(userCoords);
      setShowLocationNotification(true);
      locationAutoAppliedRef.current = true;
      sessionStorage.setItem('locationAutoApplied', 'true');
      
      setTimeout(() => {
        setShowLocationNotification(false);
      }, 5000);
    }
  }, [location, zoomTarget]);
  
  // Maintain user location zoom
  React.useEffect(() => {
    if (locationAutoAppliedRef.current && location && isUserLocationZoom) {
      if (!zoomTarget || 
          Math.abs(zoomTarget[0] - location.coordinates[0]) > 0.0001 ||
          Math.abs(zoomTarget[1] - location.coordinates[1]) > 0.0001) {
        setZoomTarget(location.coordinates);
        setIsUserLocationZoom(true);
      }
    }
  }, [location, isUserLocationZoom, zoomTarget]);

  // Simplified layout calculations
  const SIDEBAR_GAP = 12;
  const MAP_LEFT_OFFSET = 90;
  const HEADER_HEIGHT = isTablet && isSmallHeight ? 70 : isTablet ? 74 : 79;
  
  // Right sidebar dimensions - increased width to give more space to sponsored and news sections
  const RIGHT_SIDEBAR_WIDTH = !isMapFullscreen && !isMobile
    ? (isTablet ? 450 : 400) // Increased width for sponsored and news sections
    : 0;
  
  const SIDEBAR_RIGHT_PADDING = !isMapFullscreen && !isMobile
    ? (isTablet ? 20 : 24) // Consistent padding
    : 0;
  
  // Total space needed on right side
  const totalRightSpace = !isMapFullscreen && !isMobile
    ? RIGHT_SIDEBAR_WIDTH + SIDEBAR_RIGHT_PADDING + SIDEBAR_GAP
    : 0;

  // Map positioning - simplified
  // Add extra top padding for tablets to prevent header from covering map controls/legend
  const mapTopPadding = isTablet ? (isSmallHeight ? 20 : 40) : 0;
  const mapTop = isMobile ? 0 : HEADER_HEIGHT + mapTopPadding;
  
  // Sidebar positioning - align with map top
  const sidebarTop = !isMapFullscreen && !isMobile ? mapTop : 0;
  
  // Calculate sidebar heights - simplified to ensure full visibility
  const maxSidebarHeight = !isMapFullscreen && !isMobile
    ? viewportHeight - sidebarTop - 80 // Leave 80px bottom padding
    : 0;
  
  const sidebarCardHeight = !isMapFullscreen && !isMobile
    ? Math.max(300, Math.floor((maxSidebarHeight - SIDEBAR_GAP) / 2)) // Each card gets equal space
    : 0;
  
  const newsTop = sidebarTop + sidebarCardHeight + SIDEBAR_GAP;
  const mapMinHeight = isMobile ? 0 : (isTablet ? 480 : 600);
  // Adjust height calculation - reduce map height for tablets to prevent it from going too low
  const mapHeightValue = isMobile || isMapFullscreen
    ? null
    : Math.max(mapMinHeight, viewportHeight - mapTop - (isTablet ? (isSmallHeight ? 220 : 240) : 200)); // Increased bottom space for tablets to reduce map height
  
  const mapRightOffset = isMobile || isMapFullscreen ? 0 : totalRightSpace;

  const mapInlineStyle = React.useMemo(() => {
    if (isMapFullscreen) {
      return {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: 10,
      };
    }

    if (isMobile) {
      return {
        position: 'fixed' as const,
        top: '56px',
        left: 0,
        right: 0,
        bottom: `${MOBILE_BOTTOM_NAV_HEIGHT + MOBILE_ADS_HEIGHT}px`,
        width: '100%',
        height: `calc(100vh - 56px - ${MOBILE_BOTTOM_NAV_HEIGHT + MOBILE_ADS_HEIGHT}px)`,
        zIndex: 10,
      };
    }

    return {
      top: `${mapTop}px`,
      left: `${MAP_LEFT_OFFSET}px`,
      right: `${mapRightOffset}px`,
      height: mapHeightValue ? `${mapHeightValue}px` : undefined,
      minWidth: isTablet ? '0px' : (sidebarWidth === 160 ? '500px' : '600px'),
      minHeight: mapMinHeight ? `${mapMinHeight}px` : undefined,
      maxWidth: totalRightSpace > 0 ? `calc(100% - ${MAP_LEFT_OFFSET}px - ${totalRightSpace}px)` : `calc(100% - ${MAP_LEFT_OFFSET}px)`,
      width: totalRightSpace > 0 ? `calc(100% - ${MAP_LEFT_OFFSET}px - ${totalRightSpace}px)` : `calc(100% - ${MAP_LEFT_OFFSET}px)`,
    };
  }, [isMapFullscreen, isMobile, mapTop, MAP_LEFT_OFFSET, mapRightOffset, mapHeightValue, isTablet, mapMinHeight, totalRightSpace, sidebarWidth]);

  return (
    <div className={`bg-[#2a4149] relative ${isMapFullscreen ? 'fixed inset-0 w-full h-full overflow-hidden z-[2000]' : isMobile ? 'fixed inset-0 w-full h-full overflow-hidden' : 'min-h-screen'}`}>
      <div className={`relative w-full ${isMobile ? 'h-full' : ''} ${isMobile ? '' : 'xl:min-w-[1280px]'}`} style={{ minHeight: isMobile ? '100%' : 'calc(100vh + 320px)', paddingBottom: isMobile ? '0' : '320px' }}>
        {/* Location Notification */}
        {showLocationNotification && location && (
          <div className={`absolute ${isMobile ? 'top-16' : 'top-20'} left-1/2 transform -translate-x-1/2 z-[10002] bg-[#67DBE2] text-[#2a4149] px-3 py-2 ${isMobile ? 'text-xs' : 'px-4 py-3'} rounded-lg shadow-lg flex items-center gap-2 ${isMobile ? 'max-w-[90vw]' : ''} animate-in fade-in slide-in-from-top-2 duration-300`}>
            <MapPin className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className={`${isMobile ? 'text-xs' : 'font-semibold text-sm'} truncate`}>
                Zoomed to: {location.country}{location.city && `, ${location.city}`}
              </div>
            </div>
            <button
              onClick={() => setShowLocationNotification(false)}
              className="ml-2 hover:bg-[#2a4149]/20 rounded p-1 transition-colors flex-shrink-0"
            >
              <X className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
            </button>
          </div>
        )}
        
        {/* Location Error */}
        {locationError && !location && !isRequestingLocation && showLocationError && (
          <div className={`absolute ${isMobile ? 'top-16' : 'top-20'} left-1/2 transform -translate-x-1/2 z-[10002] bg-[#ef4444] text-white px-3 py-2 ${isMobile ? 'text-xs' : 'px-4 py-3'} rounded-lg shadow-lg flex items-center gap-2 ${isMobile ? 'max-w-[90vw]' : 'max-w-md'} animate-in fade-in slide-in-from-top-2 duration-300`}>
            <AlertTriangle className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className={`${isMobile ? 'text-xs' : 'font-semibold text-sm'}`}>Location Access Required</div>
              {!isMobile && <div className="text-xs opacity-90">{locationError}</div>}
            </div>
            <button onClick={() => setShowLocationError(false)} className="ml-2 hover:bg-white/20 rounded p-1 transition-colors flex-shrink-0">
              <X className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
            </button>
          </div>
        )}
        
        {/* Desktop Filters - Top */}
        <div className={`hidden lg:absolute z-[10001] lg:flex flex-col gap-1 transition-opacity duration-300 bg-[#2a4149] ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ 
          top: '0px',
          left: '90px', 
          right: isTablet && isSmallHeight ? '200px' : isTablet ? '200px' : '200px',
          paddingTop: '24px',
          paddingBottom: '6px',
        }}>
          <div className="w-full flex items-center justify-between gap-6">
            <h1 className={`[font-family:'Roboto',Helvetica] font-bold text-[#67DBE2] tracking-[-0.5px] ${isTablet && isSmallHeight ? 'text-[22px] leading-[28px]' : isTablet ? 'text-[24px] leading-[30px]' : 'text-[28px] leading-[36px]'}`}>
              Global Outbreak & Disease Monitoring System
            </h1>
            <div className={`flex items-center gap-1 justify-end ${isTablet && isSmallHeight ? 'gap-0.5' : ''}`} style={{ maxWidth: isTablet && isSmallHeight ? 'calc(45vw - 100px)' : 'calc(50vw - 100px)' }}>
            {/* Date Range */}
            <div className={`flex items-center rounded-[6px] border border-[#DAE0E633] bg-transparent px-1 py-1 shadow-[0px_1px_2px_#1018280a] ${isTablet && isSmallHeight ? 'h-[32px]' : 'h-[38px]'}`} style={{ 
              width: isTablet && isSmallHeight ? '180px' : '220px', 
              minWidth: isTablet && isSmallHeight ? '180px' : '220px', 
              borderBottomColor: "#FFFFFF33", 
              borderBottomWidth: "1px" 
            }}>
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
                      className={`font-semibold text-[#EBEBEBCC] data-[state=active]:bg-[#FFFFFF24] data-[state=active]:text-white rounded-[4px] h-full ${isTablet && isSmallHeight ? 'text-[10px]' : 'text-xs'}`}
                    >
                      {range}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            {/* Search */}
            <div className={`flex items-center gap-2 px-2.5 bg-[#FFFFFF24] rounded-[6px] overflow-hidden border border-solid border-[#DAE0E633] shadow-[0px_1px_2px_#1018280A] ${isTablet && isSmallHeight ? 'h-[32px]' : 'h-[40px]'}`} style={{ 
              width: isTablet && isSmallHeight ? '140px' : '160px', 
              minWidth: isTablet && isSmallHeight ? '140px' : '160px', 
              flexShrink: 0, 
              marginLeft: isTablet && isSmallHeight ? '10px' : '30px' 
            }}>
              <img className="relative w-[16px] h-[16px] flex-shrink-0" alt="Search" src="/zoom-search.svg" />
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
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* Disease Type */}
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
              className={`px-2.5 bg-[#FFFFFF24] rounded-[6px] border border-solid border-[#DAE0E633] text-[#EBEBEB] [font-family:'Roboto',Helvetica] font-medium tracking-[-0.10px] shadow-[0px_1px_2px_#1018280A] focus:outline-none focus:ring-2 focus:ring-[#67DBE2]/50 [&>option]:bg-[#2a4149] [&>option]:text-white ${isTablet && isSmallHeight ? 'h-[32px] text-[10px]' : 'h-[40px] text-xs'}`}
              style={{ 
                width: isTablet && isSmallHeight ? '120px' : '140px', 
                minWidth: isTablet && isSmallHeight ? '120px' : '140px', 
                flexShrink: 0, 
                marginLeft: isTablet && isSmallHeight ? '8px' : '10px' 
              }}
            >
              <option value="all">All Types</option>
              <option value="human">Human Only</option>
              <option value="veterinary">Veterinary Only</option>
              <option value="zoonotic">Zoonotic (Both)</option>
            </select>
            
            {/* Reset */}
            <button
              onClick={handleResetFilters}
              className={`flex items-center justify-center rounded-[6px] border border-[#DAE0E633] bg-[#FFFFFF14] text-[#EBEBEBCC] hover:text-white hover:bg-[#FFFFFF24] transition-colors shadow-[0px_1px_2px_#1018280A] flex-shrink-0 ${isTablet && isSmallHeight ? 'ml-1 w-8 h-[32px]' : 'ml-2 w-10 h-[40px]'}`}
              title="Reset filters"
            >
              <RefreshCcw className={isTablet && isSmallHeight ? "w-3 h-3" : "w-3.5 h-3.5"} />
            </button>
            </div>
          </div>
        </div>

        {/* Mobile Filters */}
        {!isMapFullscreen && isMobile && (
          <>
            {isMobileFiltersOpen && (
              <div 
                className="lg:hidden fixed inset-0 bg-black/50 z-[1190]"
                onClick={() => setIsMobileFiltersOpen(false)}
              />
            )}

            {isMobileFiltersOpen && (
              <div className="lg:hidden fixed top-[56px] left-0 right-0 z-[1200] bg-[#2a4149] border-b border-[#EAEBF024] shadow-xl max-h-[calc(80vh-56px)] overflow-y-auto animate-in slide-in-from-top-2 duration-300">
                <div className="sticky top-0 bg-[#315C64B2] border-b border-[#EAEBF024] px-4 py-3 flex items-center justify-between backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-[#67DBE2]" />
                    <h3 className="text-base font-semibold text-white">Filters</h3>
                  </div>
                  <button onClick={() => setIsMobileFiltersOpen(false)} className="w-8 h-8 flex items-center justify-center text-white hover:bg-[#305961]/50 rounded transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {/* Date Range */}
                  <div>
                    <label className="text-xs font-semibold text-white mb-2 block">Date Range</label>
                    <div className="flex items-center h-[36px] rounded-[6px] border border-[#DAE0E633] bg-transparent px-1 py-1 shadow-[0px_1px_2px_#1018280a]">
                      <Tabs value={filters.dateRange || "7d"} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))} className="w-full">
                        <TabsList className="grid w-full h-full grid-cols-6 bg-transparent border-0 gap-1">
                          {["24h", "7d", "14d", "30d", "6m", "1y"].map((range) => (
                            <TabsTrigger key={range} value={range} className="text-xs font-semibold text-[#EBEBEBCC] data-[state=active]:bg-[#FFFFFF24] data-[state=active]:text-white rounded-[4px] h-full">
                              {range}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>

                  {/* Search */}
                  <div>
                    <label className="text-xs font-semibold text-white mb-2 block">Search</label>
                    <div className="flex h-[36px] items-center gap-2 px-2.5 bg-[#FFFFFF24] rounded-[6px] overflow-hidden border border-solid border-[#DAE0E633] shadow-[0px_1px_2px_#1018280A]">
                      <img className="relative w-[14px] h-[14px] flex-shrink-0" alt="Search" src="/zoom-search.svg" />
                      <Input
                        type="text"
                        placeholder="Search disease or country..."
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
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Disease Type */}
                  <div>
                    <label className="text-xs font-semibold text-white mb-2 block">Disease Type</label>
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
                      className="w-full h-[36px] px-2.5 bg-[#FFFFFF24] rounded-[6px] border border-solid border-[#DAE0E633] text-[#EBEBEB] text-xs [font-family:'Roboto',Helvetica] font-medium tracking-[-0.10px] shadow-[0px_1px_2px_#1018280A] focus:outline-none focus:ring-2 focus:ring-[#67DBE2]/50 [&>option]:bg-[#2a4149] [&>option]:text-white"
                    >
                      <option value="all">All Types</option>
                      <option value="human">Human Only</option>
                      <option value="veterinary">Veterinary Only</option>
                      <option value="zoonotic">Zoonotic (Both)</option>
                    </select>
                  </div>

                  {/* Reset */}
                  <button
                    onClick={handleResetFilters}
                    className="w-full flex items-center justify-center gap-2 h-[36px] rounded-[6px] border border-[#DAE0E633] bg-[#FFFFFF14] text-[#EBEBEBCC] hover:text-white hover:bg-[#FFFFFF24] transition-colors shadow-[0px_1px_2px_#1018280A]"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Reset Filters</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Categories Panel - Desktop (Hidden on tablet) */}
        {!isMapFullscreen && !isMobile && !isTablet && (
          <Collapsible 
            open={isCategoriesPanelOpen} 
            onOpenChange={setIsCategoriesPanelOpen} 
            className={`hidden lg:block absolute z-[1000] transition-opacity duration-300 ${isDialogOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            style={{ top: '79px', right: '200px', width: '280px' }}
          >
            <div className="bg-[#315C64B2] border border-[#EAEBF024] rounded-lg shadow-lg backdrop-blur-sm overflow-hidden">
              <CollapsibleTrigger className="w-full hover:bg-[#305961]/50 transition-colors">
                <div className="px-3 py-2 border-b border-[#EAEBF024]/20 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#67DBE2]" />
                    <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-white text-sm tracking-[-0.10px] leading-4">Categories</h3>
                    {filters.category && <span className="w-2 h-2 bg-[#67DBE2] rounded-full"></span>}
                  </div>
                  <button className="w-4 h-4 p-0 hover:bg-transparent flex-shrink-0">
                    <img className="w-4 h-4 transition-transform duration-200" alt="Dropdown" src="/group-938.svg" style={{ transform: isCategoriesPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 py-3 overflow-y-auto" style={{ maxHeight: '400px' }}>
                  <div className="grid grid-cols-4 gap-3">
                    {diseaseCategories.map((category) => (
                      <button
                        key={category.name}
                        onClick={() => handleCategoryClick(category.name)}
                        onMouseEnter={(e) => handleMouseEnter(category.name, e)}
                        onMouseLeave={handleMouseLeave}
                        className="flex flex-col items-center gap-2 p-2 rounded-lg transition-all hover:bg-[#305961]/50"
                        style={{ backgroundColor: filters.category === category.name ? `${category.color}20` : 'transparent' }}
                        title={category.name}
                      >
                        <div 
                          className="rounded-full flex items-center justify-center transition-all"
                          style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: category.color,
                            boxShadow: filters.category === category.name ? `0 0 12px ${category.color}60` : `0 2px 4px rgba(0,0,0,0.2)`,
                          }}
                        >
                          {React.createElement(category.icon, {
                            style: { width: '22px', height: '22px', color: '#FFFFFF', stroke: '#FFFFFF', fill: 'none', strokeWidth: 2.5 }
                          })}
                        </div>
                        <span className="text-[10px] text-white text-center line-clamp-2" style={{ maxWidth: '60px' }}>{category.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* Map */}
        <div 
          ref={mapContainerRef}
          className={`${
            isMobile 
              ? 'absolute left-0 right-0 w-full rounded-none z-10' 
              : 'absolute rounded-[12px] z-[1000] overflow-hidden shadow-2xl border border-[#67DBE2]/20'
          } ${isMapFullscreen ? 'top-0 left-0 right-0 bottom-0 w-full h-full rounded-none' : ''}`}
          style={mapInlineStyle}
        >
          {/* Fullscreen Toggle */}
          {!isMobile && (
            <button
              onClick={toggleFullscreen}
              className={`absolute top-4 z-[1300] bg-[#2a4149] hover:bg-[#305961] text-[#67DBE2] p-2 rounded-lg shadow-lg border border-[#67DBE2]/30 transition-all duration-200 hover:scale-110 hover:border-[#67DBE2]/60 flex items-center justify-center group`}
              style={isMapFullscreen ? { right: '80px' } : { right: '16px' }}
              title={isMapFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isMapFullscreen ? <Minimize2 className="w-5 h-5 group-hover:text-white transition-colors" /> : <Maximize2 className="w-5 h-5 group-hover:text-white transition-colors" />}
            </button>
          )}

          {/* Desktop Near Me Controls */}
          {location?.coordinates && !isMobile && (
            <div
              className={`hidden lg:flex absolute z-[1300] items-center gap-2 bg-[#23313c]/90 backdrop-blur-sm border border-[#EAEBF024] rounded-md px-3 py-2 transition-opacity duration-300 ${
                isMapFullscreen || isDialogOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
              style={{ top: '12px', left: '120px' }}
            >
              <label className="[font-family:'Roboto',Helvetica] text-xs font-semibold text-white whitespace-nowrap">Near Me:</label>
              <select
                value={nearMeRadius}
                onChange={(e) => {
                  const newRadius = Number(e.target.value);
                  setNearMeRadius(newRadius);
                  if (nearMeCategory && location?.coordinates) {
                    setFilters(prev => ({ ...prev, nearMe: { coordinates: location.coordinates, radiusKm: newRadius } }));
                  } else {
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
                <option value="">{nearbyCategories.length === 0 ? location ? "No outbreaks nearby" : "Loading..." : `Select category (${nearbyCategories.length})`}</option>
                {nearbyCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
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
                : isUserLocationZoom && isMobile ? 10 : isUserLocationZoom ? 13 : undefined
            }
            onClearSearch={() => {
              setFilters(prev => ({ ...prev, diseaseSearch: "", country: null }));
              setZoomTarget(null);
              setIsUserLocationZoom(false);
            }}
            onDialogStateChange={setIsDialogOpen}
          />
        </div>

        {/* Mobile Premium Ads */}
        {!isMapFullscreen && isMobile && (
          <div
            className="fixed left-0 right-0 z-[1200] bg-[#2a4149] border-t border-[#1f3541] lg:hidden overflow-hidden"
            style={{ bottom: `${MOBILE_BOTTOM_NAV_HEIGHT}px`, height: `${MOBILE_ADS_HEIGHT}px`, boxShadow: "0 -4px 12px rgba(0,0,0,0.2)" }}
          >
            <PremiumAdsSection mobile={true} compact={true} />
          </div>
        )}

        {/* Desktop Premium Ads - Normal Mode */}
        {!isMapFullscreen && !isMobile && (
          <div 
            className="hidden lg:block absolute z-[1400] transition-opacity duration-300"
            style={{ 
              top: `${mapTop + (mapHeightValue || 600) + 24}px`,
              left: `${MAP_LEFT_OFFSET}px`,
              right: `${mapRightOffset}px`,
              minWidth: isTablet ? '420px' : '760px',
            }}
          >
            <PremiumAdsSection />
          </div>
        )}

        {/* Desktop Premium Ads - Fullscreen Mode */}
        {isMapFullscreen && !isMobile && (
          <div 
            className="hidden lg:block fixed z-[1400] transition-opacity duration-300 pointer-events-none"
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

        {/* Sponsored Section - Right Sidebar */}
        <div 
          className={`hidden lg:block absolute z-[1000] transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
          style={{ 
            top: `${sidebarTop}px`,
            right: `${SIDEBAR_RIGHT_PADDING}px`,
            width: `${RIGHT_SIDEBAR_WIDTH}px`,
            height: `${sidebarCardHeight}px`,
            maxHeight: `${sidebarCardHeight}px`,
          }}
        >
          <SponsoredSection 
            width={RIGHT_SIDEBAR_WIDTH} 
            height={sidebarCardHeight} 
            maxHeight={sidebarCardHeight} 
          />
        </div>

        {/* News Section - Right Sidebar */}
        <div 
          className={`hidden lg:block absolute z-[1000] transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
          style={{ 
            top: `${newsTop}px`, 
            right: `${SIDEBAR_RIGHT_PADDING}px`, 
            width: `${RIGHT_SIDEBAR_WIDTH}px`,
            height: `${sidebarCardHeight}px`,
            maxHeight: `${sidebarCardHeight}px`,
          }}
        >
          <NewsSection 
            width={RIGHT_SIDEBAR_WIDTH} 
            height={sidebarCardHeight} 
            maxHeight={sidebarCardHeight} 
          />
        </div>

        {/* Mobile Near Me Controls */}
        {location?.coordinates && isMobile && !isMapFullscreen && (
          <div className="absolute bottom-20 left-2 right-2 z-[1000] bg-[#23313c] border border-[#EAEBF024] rounded-lg p-3 space-y-2 lg:hidden">
            <label className="[font-family:'Roboto',Helvetica] text-xs font-semibold text-white block">Show Outbreaks Near My Location:</label>
            <div className="flex gap-2">
              <select
                value={nearMeRadius}
                onChange={(e) => {
                  const newRadius = Number(e.target.value);
                  setNearMeRadius(newRadius);
                  if (nearMeCategory && location?.coordinates) {
                    setFilters(prev => ({ ...prev, nearMe: { coordinates: location.coordinates, radiusKm: newRadius } }));
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
                <option value="">{nearbyCategories.length === 0 ? location ? "No outbreaks nearby" : "Loading..." : `Select category (${nearbyCategories.length})`}</option>
                {nearbyCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        {/* Tooltip */}
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
                <div className="mb-2 font-semibold text-sm text-gray-900 border-b border-gray-200 pb-1">{category.name}</div>
                <div className="text-xs mb-1"><strong className="text-gray-700">Cases:</strong> <span className="text-gray-900">{stats.cases.toLocaleString()}</span></div>
                <div className="text-xs">
                  <strong className="text-gray-700">Severity:</strong> <span className={`font-semibold ${
                    stats.severity === 'Critical' ? 'text-red-600' :
                    stats.severity === 'High' ? 'text-orange-600' :
                    stats.severity === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                  }`}>{stats.severity}</span>
                </div>
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent" style={{ borderTopColor: '#ffffff', bottom: '-8px' }} />
            </div>,
            document.body
          );
        })()}
      </div>
    </div>
  );
};