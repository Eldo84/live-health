import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import { Icon, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSupabaseOutbreakSignals, OutbreakSignal } from "../../../../lib/useSupabaseOutbreakSignals";
import { FilterState } from "../FilterPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../../../../components/ui/dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../../../components/ui/collapsible";
import { useHealthMinistry, extractCountryFromLocation } from "../../../../lib/useHealthMinistry";

const ZoomHandler = ({ onZoomChange }: { onZoomChange: (zoom: number) => void }) => {
  const map = useMap();
  React.useEffect(() => {
    const handleZoom = () => { onZoomChange(map.getZoom()); };
    map.on("zoomend", handleZoom);
    handleZoom();
    return () => { map.off("zoomend", handleZoom); };
  }, [map, onZoomChange]);
  return null;
};

// Component to handle map resize when container size changes
const MapResizeHandler = () => {
  const map = useMap();
  
  React.useEffect(() => {
    // Invalidate map size function with debouncing
    let resizeTimeout: NodeJS.Timeout;
    const invalidateSize = () => {
      clearTimeout(resizeTimeout);
      // Wait for CSS transitions to complete (500ms) plus a small buffer
      resizeTimeout = setTimeout(() => {
        map.invalidateSize();
      }, 550);
    };
    
    // Initial invalidation on mount
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    // Watch for resize events using ResizeObserver
    // This will catch size changes from CSS transitions and other layout changes
    const resizeObserver = new ResizeObserver(() => {
      invalidateSize();
    });
    
    const mapContainer = map.getContainer();
    if (mapContainer) {
      resizeObserver.observe(mapContainer);
    }
    
    // Also listen to window resize events
    window.addEventListener('resize', invalidateSize);
    
    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
      window.removeEventListener('resize', invalidateSize);
    };
  }, [map]);
  
  return null;
};

const FitBounds = ({ points, initialFit, zoomTarget, isUserLocation = false }: { points: Array<{ position: [number, number] }>; initialFit: boolean; zoomTarget?: [number, number] | null; isUserLocation?: boolean }) => {
  const map = useMap();
  const hasFittedRef = React.useRef(false);
  const lastZoomTargetRef = React.useRef<[number, number] | null>(null);
  const lastPointsCountRef = React.useRef(0);
  const lastIsUserLocationRef = React.useRef(false);
  const userLocationZoomedRef = React.useRef(false);
  const zoomAttemptsRef = React.useRef(0);
  
  // Helper function to zoom to user location
  const zoomToUserLocation = React.useCallback((target: [number, number], attemptNumber: number = 0) => {
    try {
      console.log(`🎯 Zoom attempt ${attemptNumber + 1} to user location:`, target);
      
      // Ensure map is ready
      if (!map || !map.getContainer()) {
        console.warn('Map not ready yet, will retry');
        return false;
      }
      
      // Validate coordinates
      if (!target || target.length !== 2 || isNaN(target[0]) || isNaN(target[1])) {
        console.error('Invalid coordinates:', target);
        return false;
      }
      
      // Ensure coordinates are within valid range
      const [lat, lng] = target;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.error('Coordinates out of range:', target);
        return false;
      }
      
      // Invalidate map size to ensure it's properly rendered
      map.invalidateSize();
      
      // Set view with zoom level 10
      map.setView([lat, lng], 10, { 
        animate: attemptNumber > 0, // Animate on retries
        duration: 0.5 
      });
      
      // Verify the zoom worked
      setTimeout(() => {
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();
        const latDiff = Math.abs(currentCenter.lat - lat);
        const lngDiff = Math.abs(currentCenter.lng - lng);
        const distance = latDiff + lngDiff;
        
        console.log(`📍 Zoom verification - Center: [${currentCenter.lat}, ${currentCenter.lng}], Zoom: ${currentZoom}, Distance: ${distance}`);
        
        // If we're still far from target, try again (but limit attempts)
        if ((distance > 0.1 || currentZoom < 8) && attemptNumber < 3) {
          console.log(`⚠️ Zoom verification failed, retrying (attempt ${attemptNumber + 1})`);
          setTimeout(() => zoomToUserLocation(target, attemptNumber + 1), 300);
        } else if (distance <= 0.1 && currentZoom >= 8) {
          console.log('✅ Successfully zoomed to user location!');
          userLocationZoomedRef.current = true;
        }
      }, 100);
      
      return true;
    } catch (e) {
      console.error('Error in zoomToUserLocation:', e);
      return false;
    }
  }, [map]);
  
  React.useEffect(() => {
    // PRIORITY 1: If user location is set, ALWAYS zoom to it (highest priority)
    // This must happen even if initialFit would normally show the world
    if (zoomTarget && isUserLocation) {
      const [lat, lng] = zoomTarget;
      const targetChanged = lastZoomTargetRef.current === null || 
        (lastZoomTargetRef.current && (
          Math.abs(lastZoomTargetRef.current[0] - lat) > 0.0001 || 
          Math.abs(lastZoomTargetRef.current[1] - lng) > 0.0001
        )) ||
        lastIsUserLocationRef.current !== isUserLocation;
      
      if (targetChanged || !userLocationZoomedRef.current) {
        console.log('📍 USER LOCATION ZOOM: Setting up zoom to:', zoomTarget, 'points:', points.length);
        lastZoomTargetRef.current = zoomTarget;
        lastPointsCountRef.current = points.length;
        lastIsUserLocationRef.current = true;
        hasFittedRef.current = true; // Mark as fitted to prevent initial fit from running
        zoomAttemptsRef.current = 0;
        
        // Set up zoom attempts with proper cleanup
        const timers: NodeJS.Timeout[] = [];
        
        // Immediate zoom attempt
        const immediateTimer = setTimeout(() => {
          if (map && map.getContainer()) {
            console.log('🚀 Immediate zoom attempt to user location');
            zoomToUserLocation(zoomTarget, 0);
          }
        }, 0);
        timers.push(immediateTimer);
        
        // Backup zoom attempts
        timers.push(setTimeout(() => {
          if (map && map.getContainer()) {
            try {
              const currentCenter = map.getCenter();
              const currentZoom = map.getZoom();
              const latDiff = Math.abs(currentCenter.lat - lat);
              const lngDiff = Math.abs(currentCenter.lng - lng);
              const distance = latDiff + lngDiff;
              
              console.log(`🔍 Backup zoom 1 check - Distance: ${distance}, Zoom: ${currentZoom}`);
              
              if (distance > 0.5 || currentZoom < 8) {
                console.log('🔄 Backup zoom 1: Map not at user location, zooming again');
                map.invalidateSize();
                map.setView([lat, lng], 10, { animate: true, duration: 0.8 });
              }
            } catch (e) {
              console.error('Backup zoom 1 error:', e);
            }
          }
        }, 300));
        
        timers.push(setTimeout(() => {
          if (map && map.getContainer()) {
            try {
              const currentCenter = map.getCenter();
              const currentZoom = map.getZoom();
              const latDiff = Math.abs(currentCenter.lat - lat);
              const lngDiff = Math.abs(currentCenter.lng - lng);
              const distance = latDiff + lngDiff;
              
              console.log(`🔍 Backup zoom 2 check - Distance: ${distance}, Zoom: ${currentZoom}`);
              
              if (distance > 0.5 || currentZoom < 8) {
                console.log('🔄 Backup zoom 2: Map not at user location, forcing zoom');
                map.invalidateSize();
                map.setView([lat, lng], 10, { animate: true, duration: 1 });
              } else {
                console.log('✅ Map successfully at user location');
                userLocationZoomedRef.current = true;
              }
            } catch (e) {
              console.error('Backup zoom 2 error:', e);
            }
          }
        }, 600));
        
        timers.push(setTimeout(() => {
          if (map && map.getContainer()) {
            try {
              const currentCenter = map.getCenter();
              const currentZoom = map.getZoom();
              const latDiff = Math.abs(currentCenter.lat - lat);
              const lngDiff = Math.abs(currentCenter.lng - lng);
              const distance = latDiff + lngDiff;
              
              if (distance > 0.5 || currentZoom < 8) {
                console.log('🔄 Backup zoom 3: Final forced zoom to user location');
                map.invalidateSize();
                map.setView([lat, lng], 10, { animate: true, duration: 1 });
                userLocationZoomedRef.current = true;
              } else {
                console.log('✅ Map successfully at user location (final check)');
                userLocationZoomedRef.current = true;
              }
            } catch (e) {
              console.error('Backup zoom 3 error:', e);
            }
          }
        }, 1000));
        
        // Return cleanup function
        return () => {
          timers.forEach(timer => clearTimeout(timer));
        };
      }
      
      // If points change but we're at user location, maintain the zoom
      if (points.length !== lastPointsCountRef.current && userLocationZoomedRef.current) {
        lastPointsCountRef.current = points.length;
        console.log('User location: points changed to', points.length, '- maintaining zoom at user location');
        // Check if we need to re-zoom (in case something moved the map)
        const maintainTimer = setTimeout(() => {
    if (zoomTarget) {
            const currentCenter = map.getCenter();
            const currentZoom = map.getZoom();
            const latDiff = Math.abs(currentCenter.lat - zoomTarget[0]);
            const lngDiff = Math.abs(currentCenter.lng - zoomTarget[1]);
            const distance = latDiff + lngDiff;
            
            // If we're far from the user location, re-zoom (but don't animate to avoid jarring)
            if (distance > 1 || currentZoom < 8) {
              console.log('🔄 Maintaining zoom: Re-zooming to user location (distance:', distance, 'zoom:', currentZoom, ')');
              map.setView(zoomTarget, 10, { animate: false });
            }
          }
        }, 100);
        return () => clearTimeout(maintainTimer);
      }
      return; // Don't proceed to other zoom logic when user location is active
    }
    
    // PRIORITY 2: If zoom target is provided (but not user location), zoom to that location
    if (zoomTarget && !isUserLocation) {
      // Check if zoom target changed
      const targetChanged = lastZoomTargetRef.current === null || 
        (lastZoomTargetRef.current[0] !== zoomTarget[0] || lastZoomTargetRef.current[1] !== zoomTarget[1]) ||
        lastIsUserLocationRef.current !== isUserLocation;
      
      if (targetChanged) {
        lastZoomTargetRef.current = zoomTarget;
        lastPointsCountRef.current = points.length;
        lastIsUserLocationRef.current = false;
        userLocationZoomedRef.current = false;
        
        console.log('Zooming to target (country search):', zoomTarget, 'with', points.length, 'points');
        
        // For country search, fit bounds to all points in the country
        if (points.length > 0) {
          try {
            const bounds = points.map(p => p.position);
            console.log('Fitting bounds to', bounds.length, 'points (country search)');
            map.fitBounds(bounds as [number, number][], {
              padding: [80, 80],
              maxZoom: 8,
            });
          } catch (e) {
            console.warn('fitBounds failed, using setView:', e);
            map.setView(zoomTarget, 6, { animate: true });
          }
        } else {
          console.log('No points found, zooming to country center at level 6');
          map.setView(zoomTarget, 6, { animate: true });
        }
        hasFittedRef.current = true;
      } else if (points.length !== lastPointsCountRef.current && points.length > 0) {
        // Points changed, refit bounds
        lastPointsCountRef.current = points.length;
        try {
          const bounds = points.map(p => p.position);
          map.fitBounds(bounds as [number, number][], {
            padding: [80, 80],
            maxZoom: 8,
          });
        } catch (e) {
          map.setView(zoomTarget, 6, { animate: true });
        }
      }
      return; // Don't proceed to initial fit logic
    }
    
    // PRIORITY 3: Initial fit or show all points (only if no zoom target is set)
      // Check if zoomTarget was cleared (transitioned from a value to null)
      const wasZoomedToTarget = lastZoomTargetRef.current !== null;
    const wasUserLocation = lastIsUserLocationRef.current;
    
    // If zoomTarget was cleared and user location is explicitly disabled, reset everything
    if (wasZoomedToTarget && !zoomTarget && !isUserLocation) {
      // User explicitly reset (clicked reset button) - reset to world view
      console.log('🔄 Reset detected: Clearing zoom and resetting to world view');
        lastZoomTargetRef.current = null;
        lastPointsCountRef.current = 0;
      lastIsUserLocationRef.current = false;
      userLocationZoomedRef.current = false;
      // Reset hasFittedRef to false so we can refit when data loads
        hasFittedRef.current = false;
      
      // Reset map to world view immediately
      console.log('Resetting map to world view (points:', points.length, ')');
      map.setView([20, 0], 2, { animate: true });
      
      // If we have points, also fit bounds to show all of them
      if (points.length > 0) {
        const bounds = points.map(p => p.position);
        if (bounds.length > 0) {
          try {
            console.log('Resetting: Fitting bounds to all', bounds.length, 'points');
            map.fitBounds(bounds as [number, number][], {
              padding: [50, 50],
              maxZoom: 4, // World view zoom level
              animate: true,
            });
            hasFittedRef.current = true;
          } catch (e) {
            console.warn('fitBounds failed during reset:', e);
            // Already set to world view above, so just mark as fitted
            hasFittedRef.current = true;
          }
        }
      }
      // If no points, hasFittedRef stays false so we can fit when data loads
      return;
    } else if (wasUserLocation && !isUserLocation && !zoomTarget) {
      // User location was active but is now explicitly disabled (reset button clicked)
      console.log('🔄 User location reset: Clearing user location zoom and resetting to world view');
      lastZoomTargetRef.current = null;
      lastPointsCountRef.current = 0;
      lastIsUserLocationRef.current = false;
      userLocationZoomedRef.current = false;
      // Reset hasFittedRef to false so we can refit when data loads
      hasFittedRef.current = false;
      
      // Reset to world view immediately
      console.log('Resetting map to world view (points:', points.length, ')');
      map.setView([20, 0], 2, { animate: true });
      
      // If we have points, also fit bounds to show all of them
      if (points.length > 0) {
        const bounds = points.map(p => p.position);
        if (bounds.length > 0) {
          try {
            console.log('Resetting: Fitting bounds to all', bounds.length, 'points');
            map.fitBounds(bounds as [number, number][], {
              padding: [50, 50],
              maxZoom: 4,
              animate: true,
            });
            hasFittedRef.current = true;
          } catch (e) {
            console.warn('fitBounds failed during reset:', e);
            hasFittedRef.current = true;
          }
        }
      }
      // If no points, hasFittedRef stays false so we can fit when data loads
      return;
    } else if (wasUserLocation || isUserLocation) {
      // If it was/is a user location, preserve the zoom target ref even if zoomTarget prop is null
      // This prevents the reset logic from running UNLESS isUserLocation is explicitly false
      if (lastZoomTargetRef.current === null && zoomTarget) {
        // Restore the zoom target ref if we have coordinates
        lastZoomTargetRef.current = zoomTarget;
        console.log('🔄 Preserving user location zoom target ref');
      }
    }
    
    // CRITICAL: If user location was set, NEVER run initial fit logic
    // This prevents the map from zooming out to show all points
    // BUT: Only if user location is still active (isUserLocation is true)
    if ((wasUserLocation || isUserLocation) && isUserLocation && userLocationZoomedRef.current) {
      console.log('🛡️ User location zoom is active - blocking all initial fit logic');
      // Even if zoomTarget is null temporarily, don't reset - user location should persist
      return; // Don't proceed with initial fit - this is the key fix
    }
    
    // Only do initial fit if we don't have a zoom target and we weren't at user location
    // AND user location is not currently active
    // This handles the case where reset was clicked and we need to fit bounds when data loads
    if (!zoomTarget && !wasUserLocation && !isUserLocation && (initialFit || !hasFittedRef.current)) {
    if (points.length === 0) {
        console.log('No points, setting default view (not user location)');
          map.setView([20, 0], 2, { animate: true });
          hasFittedRef.current = true;
      return;
    }
    
    const bounds = points.map(p => p.position);
    if (bounds.length > 0) {
      try {
          console.log('Fitting bounds to all', bounds.length, 'points (after reset or initial load)');
        map.fitBounds(bounds as [number, number][], {
          padding: [50, 50],
            maxZoom: points.length === 1 ? 10 : 4, // World view for multiple points
            animate: true,
        });
        hasFittedRef.current = true;
      } catch (e) {
            console.warn('fitBounds failed, using default view:', e);
            map.setView([20, 0], 2, { animate: true });
            hasFittedRef.current = true;
      }
    }
      }
    
    // Handle case where reset was clicked but data loads afterward
    // If we reset but points weren't loaded yet, refit when points become available
    // This ensures the map shows all points after reset, even if data was loading when reset was clicked
    if (!zoomTarget && !isUserLocation && !wasUserLocation && points.length > 0) {
      // Check if we need to fit bounds (either hasn't been fitted, or points count changed after reset)
      const shouldRefit = !hasFittedRef.current || 
                         (lastPointsCountRef.current === 0 && points.length > 0);
      
      if (shouldRefit) {
        console.log('🔄 Points loaded after reset - fitting bounds to all', points.length, 'points');
        const bounds = points.map(p => p.position);
        if (bounds.length > 0) {
          try {
            map.fitBounds(bounds as [number, number][], {
              padding: [50, 50],
              maxZoom: 4, // World view
              animate: true,
            });
            hasFittedRef.current = true;
            lastPointsCountRef.current = points.length;
            return; // Don't proceed to other logic
          } catch (e) {
            console.warn('fitBounds failed after reset:', e);
            map.setView([20, 0], 2, { animate: true });
            hasFittedRef.current = true;
            lastPointsCountRef.current = points.length;
            return;
          }
        }
      }
    }
  }, [map, points, initialFit, zoomTarget, isUserLocation]);
  
  return null;
};

type MapType = 'dark' | 'light' | 'street' | 'topographic' | 'imagery';

const MapControls = ({ mapType, onMapTypeChange, isOpen, onOpenChange, isFullscreen = false }: { mapType: MapType; onMapTypeChange: (type: MapType) => void; isOpen: boolean; onOpenChange: (open: boolean) => void; isFullscreen?: boolean }) => {
  const mapTypes: { id: MapType; label: string }[] = [
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
    { id: 'street', label: 'Street' },
    { id: 'topographic', label: 'Topographic' },
    { id: 'imagery', label: 'Imagery' },
  ];

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={onOpenChange} 
      className={`absolute z-[1200] rounded-lg border border-[#EAEBF024] bg-[#FFFFFF14] shadow-lg backdrop-blur-sm overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'bottom-12' : 'bottom-4 right-4'
      }`}
      style={isFullscreen ? { right: '80px' } : undefined}
    >
      <CollapsibleTrigger asChild>
        <div className="w-full hover:bg-[#305961]/50 transition-colors cursor-pointer">
        <div className="px-3 py-2 border-b border-[#EAEBF024]/20 flex items-center justify-between gap-2">
          <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-white text-xs tracking-[-0.10px] leading-4">
            Map Settings
          </h3>
            <div className="w-4 h-4 p-0 flex-shrink-0 flex items-center justify-center">
            <img
              className="w-4 h-4 transition-transform duration-200"
              alt="Dropdown"
              src="/group-938.svg"
              style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
            </div>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-2 p-2">
          {mapTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => onMapTypeChange(type.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                mapType === type.id
                  ? 'bg-[#67DBE2] text-[#2a4149]'
                  : 'bg-[#23313c] text-white hover:bg-[#28424f]'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const MapTileLayer = ({ mapType }: { mapType: MapType }) => {
  const tileConfigs: Record<MapType, { url: string; attribution: string; labels?: string }> = {
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    light: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    topographic: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri',
    },
    imagery: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri',
      labels: 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
    },
  };

  const config = tileConfigs[mapType];

  return (
    <>
      <TileLayer url={config.url} attribution={config.attribution} />
      {config.labels && (
        <TileLayer url={config.labels} attribution='&copy; OpenStreetMap' />
      )}
    </>
  );
};

// Component to display health ministry contact info (reusable)
const HealthMinistryContact = ({ ministry, loading }: { ministry: any; loading: boolean }) => {
  if (loading) {
    return (
      <div className="mt-3 pt-3 border-t border-[#67DBE2]/20">
        {/* <div className="text-xs text-white/60">Loading contact info...</div> */}
      </div>
    );
  }
  
  if (!ministry) return null;
  
  return (
    // <div className="mt-3 pt-3 border-t border-[#67DBE2]/20">
    //   <div className="text-xs font-semibold text-[#67DBE2] mb-1">Health Ministry Contact</div>
    //   <div className="text-xs text-white/90">{ministry.ministry_name}</div>
    //   {ministry.phone_number && (
    //     <div className="text-xs text-white/80 mt-1">
    //       <strong>Phone:</strong> <a href={`tel:${ministry.phone_number}`} className="text-[#67DBE2] hover:underline">{ministry.phone_number}</a>
    //     </div>
    //   )}
    //   {ministry.email_address && (
    //     <div className="text-xs text-white/80 mt-1">
    //       <strong>Email:</strong> <a href={`mailto:${ministry.email_address}`} className="text-[#67DBE2] hover:underline break-all">{ministry.email_address}</a>
    //     </div>
    //   )}
    // </div>

  <div>

  </div>
  );
};

// Component for collapsible diseases list
const CollapsibleDiseasesList = ({ diseases }: { diseases: string[] }) => {
  const [showAllDiseases, setShowAllDiseases] = React.useState(false);
  const displayDiseases = showAllDiseases ? diseases : diseases.slice(0, 3);
  const hasMore = diseases.length > 3;
  
  if (diseases.length === 0) return null;
  
  return (
    <div className="text-[10px] mb-1">
      <strong>Diseases ({diseases.length}):</strong>{' '}
      <span className="text-white/80">
        {displayDiseases.join(', ')}
        {hasMore && !showAllDiseases && '...'}
      </span>
      {hasMore && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAllDiseases(!showAllDiseases);
          }}
          className="ml-1 text-[#67DBE2] hover:underline text-[10px]"
        >
          {showAllDiseases ? 'show less' : 'show all'}
        </button>
      )}
    </div>
  );
};

// Component for grouped outbreaks health ministry
const GroupedOutbreakHealthMinistry = ({ countryName }: { countryName: string }) => {
  const { ministry, loading } = useHealthMinistry(countryName);
  return <HealthMinistryContact ministry={ministry} loading={loading} />;
};

// Component to display outbreak popup content with health ministry contact info
const OutbreakPopupContent = ({ outbreak }: { outbreak: OutbreakSignal | any }) => {
  const countryName = extractCountryFromLocation(outbreak.location);
  const { ministry, loading } = useHealthMinistry(countryName);
  
  return (
    <div className="p-2 min-w-[200px]">
      <div className="mb-1 font-semibold">{outbreak.disease}</div>
      <div className="text-xs">
        <strong>Location:</strong> {outbreak.location}
        {outbreak.city && (
          <span className="ml-1 px-1.5 py-0.5 bg-[#67DBE2]/20 text-[#67DBE2] rounded text-[10px] font-medium">
            City-Level
          </span>
        )}
      </div>
      <div className="text-xs"><strong>Category:</strong> {outbreak.category}</div>
      {(outbreak as OutbreakSignal).source && (
        <div className="text-xs"><strong>Source:</strong> <span className="text-[#67DBE2]">{(outbreak as OutbreakSignal).source}</span></div>
      )}
      <div className="text-xs"><strong>Date:</strong> {outbreak.date ? new Date(outbreak.date).toLocaleDateString() : 'N/A'}</div>
      {outbreak.url && (
        <a href={outbreak.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#67DBE2] hover:underline mt-1 block">
          Read article →
        </a>
      )}
      
      {/* Health Ministry Contact Information */}
      <HealthMinistryContact ministry={ministry} loading={loading && !!countryName} />
    </div>
  );
};

interface InteractiveMapProps {
  filters?: FilterState | null;
  isFullscreen?: boolean;
  zoomTarget?: [number, number] | null;
  isUserLocation?: boolean;
  onClearSearch?: () => void;
  onDialogStateChange?: (isOpen: boolean) => void;
}

export const InteractiveMap = ({ filters, isFullscreen = false, zoomTarget, isUserLocation = false, onClearSearch, onDialogStateChange }: InteractiveMapProps): JSX.Element => {
  // Use Supabase data instead of external APIs
  const { signals, loading, error } = useSupabaseOutbreakSignals(filters || null);
  const [zoom, setZoom] = useState(2);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [isMapControlsOpen, setIsMapControlsOpen] = useState(true);
  const [mapType, setMapType] = useState<MapType>('imagery');
  const [shouldFitBounds, setShouldFitBounds] = useState(true);
  const [hoveredCategories, setHoveredCategories] = useState<Set<string>>(new Set());
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);
  const [hoveredSliceCategory, setHoveredSliceCategory] = useState<string | null>(null);
  const [selectedPieData, setSelectedPieData] = useState<{
    points: OutbreakSignal[];
    position: [number, number];
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const pieClickHandlersRef = React.useRef<Record<number, () => void>>({});
  const prevZoomTargetRef = React.useRef<[number, number] | null>(null);

  // Notify parent when dialog state changes
  React.useEffect(() => {
    onDialogStateChange?.(isDialogOpen);
  }, [isDialogOpen, onDialogStateChange]);
  
  // Track when zoomTarget is cleared (search is cleared) to refit bounds
  React.useEffect(() => {
    // If zoomTarget was set and is now null, user cleared the search - refit to show all
    // BUT: NEVER do this if it was/is a user location (to preserve user location zoom)
    if (prevZoomTargetRef.current !== null && zoomTarget === null && !isUserLocation) {
      console.log('Zoom target cleared (not user location), triggering refit to show all points');
      setShouldFitBounds(true);
      // Reset after a short delay
      const timer = setTimeout(() => setShouldFitBounds(false), 100);
      prevZoomTargetRef.current = null;
      return () => clearTimeout(timer);
    }
    // If user location is set, NEVER clear the previous zoom target ref
    // This prevents the "zoom target cleared" logic from running
    if (isUserLocation && zoomTarget) {
      prevZoomTargetRef.current = zoomTarget;
    } else if (!isUserLocation) {
    prevZoomTargetRef.current = zoomTarget || null;
    }
  }, [zoomTarget, isUserLocation]);
  
  // Track when data changes to refit bounds (only if no zoom target and not user location)
  // IMPORTANT: When user location is set, NEVER trigger initial fit, even if data loads
  React.useEffect(() => {
    // CRITICAL: If user location is active, NEVER trigger initial fit
    if (isUserLocation && zoomTarget) {
      console.log('User location active - preventing initial fit');
      setShouldFitBounds(false);
      return;
    }
    
    // Only auto-refit if:
    // 1. There's no zoom target (not searching for a country, and reset was clicked)
    // 2. It's NOT a user location zoom
    // 3. We have signals
    // This ensures that after reset, when data loads, we fit bounds to show all points
    if (signals.length > 0 && zoomTarget === null && !isUserLocation) {
      console.log('Data loaded after reset - triggering fit bounds to show all points');
      // Only auto-refit if there's no zoom target (not searching for a country) and not user location
      setShouldFitBounds(true);
      // Reset after a short delay to allow initial fit
      const timer = setTimeout(() => setShouldFitBounds(false), 100);
      return () => clearTimeout(timer);
    }
  }, [signals.length, zoomTarget, isUserLocation]);

  // Prevent map interactions when scrolling inside Leaflet popups
  React.useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Check if the event target is inside a Leaflet popup
      const target = e.target as HTMLElement;
      if (target.closest('.leaflet-popup-content-wrapper') || 
          target.closest('.popup-scrollable') ||
          target.closest('.leaflet-popup')) {
        // Stop the event from propagating to the map
        e.stopPropagation();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Check if the event target is inside a Leaflet popup
      const target = e.target as HTMLElement;
      if (target.closest('.leaflet-popup-content-wrapper') || 
          target.closest('.popup-scrollable') ||
          target.closest('.leaflet-popup')) {
        // Stop the event from propagating to the map
        e.stopPropagation();
      }
    };

    // Use capture phase to catch events before they reach the map
    document.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    document.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });

    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true });
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });
    };
  }, []);

  // Transform signals to points format (for compatibility with existing code)
  const points = signals.map(s => ({
    id: s.id,
    disease: s.disease,
    location: s.location,
    city: s.city, // Include city field for city-level display
    category: s.category,
    pathogen: s.pathogen || "",
    keywords: s.keywords || "",
    position: s.position,
    date: s.date,
    url: s.url,
  }));

  const CATEGORY_COLORS: Record<string, string> = {
    "Foodborne Outbreaks": "#f87171",
    "Waterborne Outbreaks": "#66dbe1",
    "Vector-Borne Outbreaks": "#fbbf24",
    "Airborne Outbreaks": "#a78bfa",
    "Contact Transmission": "#fb923c",
    "Healthcare-Associated Infections": "#ef4444",
    "Zoonotic Outbreaks": "#10b981",
    "Sexually Transmitted Infections": "#ec4899",
    "Vaccine-Preventable Diseases": "#3b82f6",
    "Emerging Infectious Diseases": "#f59e0b",
    "Veterinary Outbreaks": "#8b5cf6",
    "Neurological Outbreaks": "#dc2626", // Different red shade to distinguish from Healthcare-Associated Infections
    "Respiratory Outbreaks": "#9333ea", // Different purple shade to distinguish from Airborne Outbreaks
    "Other": "#4eb7bd"
  };

  // Category name mappings for variations and composite categories
  const CATEGORY_MAPPINGS: Record<string, string> = {
    "veterinary outbreak": "Veterinary Outbreaks",
    "veterinary outbreaks": "Veterinary Outbreaks",
    "emerging & re-emerging disease outbreaks": "Emerging Infectious Diseases",
    "emerging and re-emerging disease outbreaks": "Emerging Infectious Diseases",
  };

  // Normalize category name to match legend colors
  // Handles composite categories (comma-separated), case variations, and mappings
  const normalizeCategoryName = (category: string | null | undefined): string => {
    if (!category) return "Other";
    
    let normalized = category.trim();
    
    // Handle composite categories (e.g., "Foodborne Outbreaks, Waterborne Outbreaks")
    // Extract the first category from comma-separated list
    if (normalized.includes(',')) {
      const firstCategory = normalized.split(',')[0].trim();
      normalized = firstCategory;
    }
    
    // Check exact match first
    if (CATEGORY_COLORS[normalized]) return normalized;
    
    // Check case-insensitive match
    const lower = normalized.toLowerCase();
    for (const key in CATEGORY_COLORS) {
      if (key.toLowerCase() === lower) return key;
    }
    
    // Check category mappings (handles variations like "veterinary outbreak" -> "Veterinary Outbreaks")
    if (CATEGORY_MAPPINGS[lower]) {
      return CATEGORY_MAPPINGS[lower];
    }
    
    // Try partial matching for composite categories that might contain known categories
    // e.g., "Foodborne Outbreaks, Neurological Outbreaks" -> try to find "Foodborne Outbreaks" or "Neurological Outbreaks"
    for (const key in CATEGORY_COLORS) {
      if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
        return key;
      }
    }
    
    // For composite categories, try to extract any known category name
    const allCategoryNames = Object.keys(CATEGORY_COLORS);
    for (const knownCategory of allCategoryNames) {
      if (category.toLowerCase().includes(knownCategory.toLowerCase())) {
        return knownCategory;
      }
    }
    
    // Return original if no match found
    return normalized;
  };

  // Get color for a category, with fallback
  // Uses database color if available, otherwise uses hardcoded colors
  const getCategoryColor = (category: string | null | undefined): string => {
    if (!category) return CATEGORY_COLORS["Other"];
    
    const normalized = normalizeCategoryName(category);
    const color = CATEGORY_COLORS[normalized] || CATEGORY_COLORS["Other"];
    
    // Debug: log if using fallback color (only in development)
    if (!CATEGORY_COLORS[normalized] && category && category !== "Other" && process.env.NODE_ENV === 'development') {
      console.warn(`Category "${category}" (normalized: "${normalized}") not found in legend colors, using fallback color`);
    }
    
    return color;
  };

  // Get severity color based on outbreak count
  // Low: < 10 (green), Medium: >= 10 and < 50 (yellow), High: >= 50 (red)
  const getSeverityColor = (outbreakCount: number): string => {
    if (outbreakCount >= 50) {
      return "#ef4444"; // High severity - red
    } else if (outbreakCount >= 10) {
      return "#fbbf24"; // Medium severity - yellow
    } else {
      return "#10b981"; // Low severity - green
    }
  };
  
  // Points are already filtered by the hook based on filters
  const filteredPoints = points;

  const createCustomIcon = (color: string, size: number) => new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-1}"
          fill="${color}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      </svg>`
    )}`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
    className: 'smooth-marker-icon',
  });

  // Compute simple grid aggregation for pies at low zoom
  const getCellKey = (lat: number, lng: number, step: number) => {
    const latKey = Math.floor(lat / step) * step;
    const lngKey = Math.floor(lng / step) * step;
    return `${latKey.toFixed(2)}:${lngKey.toFixed(2)}`;
  };

  // Larger grid cells at low zoom to aggregate more points into each pie
  // Only used when zoom <= 5 (when showing pies)
  const aggregationStep = zoom <= 2 ? 60 : zoom <= 3 ? 30 : zoom <= 4 ? 15 : zoom <= 5 ? 8 : 0; // degrees per cell
  const aggregated = React.useMemo(() => {
    const cells: Record<string, {
      latSum: number;
      lngSum: number;
      count: number;
      byCategory: Record<string, number>;
      diseases: string[];
      diseasesByCategory: Record<string, string[]>;
      points: OutbreakSignal[];
    }> = {};
    for (const p of filteredPoints) {
      const key = getCellKey(p.position[0], p.position[1], aggregationStep);
      if (!cells[key]) {
        cells[key] = { latSum: 0, lngSum: 0, count: 0, byCategory: {}, diseases: [], diseasesByCategory: {}, points: [] };
      }
      cells[key].latSum += p.position[0];
      cells[key].lngSum += p.position[1];
      cells[key].count += 1;
      cells[key].byCategory[p.category] = (cells[key].byCategory[p.category] || 0) + 1;
      if (p.disease && !cells[key].diseases.includes(p.disease)) {
        cells[key].diseases.push(p.disease);
      }
      // Track diseases by category
      if (!cells[key].diseasesByCategory[p.category]) {
        cells[key].diseasesByCategory[p.category] = [];
      }
      if (p.disease && !cells[key].diseasesByCategory[p.category].includes(p.disease)) {
        cells[key].diseasesByCategory[p.category].push(p.disease);
      }
      // Store the full point data
      cells[key].points.push(p);
    }
    return Object.entries(cells).map(([key, v]) => {
      const [latKey, lngKey] = key.split(":");
      // For aggregated cells, use the first point's position instead of averaging
      // This preserves the actual outbreak locations instead of creating artificial center points
      // Only average if we have no points (shouldn't happen)
      let lat: number, lng: number;
      if (v.points.length > 0) {
        // Use the first point's exact position to preserve real outbreak locations
        lat = v.points[0].position[0];
        lng = v.points[0].position[1];
      } else {
        // Fallback: use cell center
        lat = v.latSum / v.count || parseFloat(latKey);
        lng = v.lngSum / v.count || parseFloat(lngKey);
      }
      return { 
        position: [lat, lng] as [number, number], 
        totals: v.byCategory, 
        totalCount: v.count,
        diseases: v.diseases.slice(0, 5),
        diseasesByCategory: v.diseasesByCategory,
        points: v.points
      };
    });
  }, [filteredPoints, aggregationStep]);

  // Cleanup global pie click handlers when aggregated data changes
  React.useEffect(() => {
    return () => {
      // Clean up all global pie click handlers
      Object.keys(pieClickHandlersRef.current).forEach((key) => {
        const idx = parseInt(key, 10);
        delete (window as any)[`pieClickHandler_${idx}`];
      });
      pieClickHandlersRef.current = {};
    };
  }, [aggregated]);

  // Use event delegation to catch pie slice hover
  React.useEffect(() => {
    let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
    const attachedListeners = new WeakMap<Element, () => void>();

    const clearHoverState = () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      setHoveredSliceCategory(null);
      setHoveredPieIndex(null);
      setHoveredCategories(new Set());
    };

    const attachListenersToPaths = () => {
      // Find all pie slice paths in the DOM
      const paths = document.querySelectorAll('path[data-category][data-pie-index]');
      paths.forEach((path) => {
        if (attachedListeners.has(path)) return; // Already attached

        const handleMouseEnter = () => {
          if (hoverTimeout) clearTimeout(hoverTimeout);
          const category = path.getAttribute('data-category');
          const pieIndexStr = path.getAttribute('data-pie-index');
          if (category && pieIndexStr) {
            setHoveredSliceCategory(category);
            setHoveredPieIndex(parseInt(pieIndexStr, 10));
            setHoveredCategories(new Set([category]));
          }
        };

        const handleMouseLeave = (e: Event) => {
          const mouseEvent = e as MouseEvent;
          // Check if we're moving to another pie-related element
          const relatedTarget = mouseEvent.relatedTarget as Element | null;
          const isMovingToPieElement = relatedTarget && (
            (relatedTarget.tagName === 'path' && relatedTarget.hasAttribute('data-category')) ||
            relatedTarget.hasAttribute('data-clear-area') ||
            relatedTarget.closest('.pie-chart-icon')
          );

          // If not moving to another pie element, clear immediately
          if (!isMovingToPieElement) {
            clearHoverState();
          } else {
            // Give a small delay in case we're moving between slices
            if (hoverTimeout) clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
              // Double-check we're still not over a pie element
              const currentTarget = document.elementFromPoint(mouseEvent.clientX, mouseEvent.clientY);
              const isOverPieElement = currentTarget && (
                (currentTarget.tagName === 'path' && currentTarget.hasAttribute('data-category')) ||
                currentTarget.hasAttribute('data-clear-area') ||
                currentTarget.closest('.pie-chart-icon')
              );
              if (!isOverPieElement) {
                clearHoverState();
              }
            }, 50);
          }
        };

        path.addEventListener('mouseenter', handleMouseEnter);
        path.addEventListener('mouseout', handleMouseLeave);
        
        const cleanup = () => {
          path.removeEventListener('mouseenter', handleMouseEnter);
          path.removeEventListener('mouseout', handleMouseLeave);
        };
        attachedListeners.set(path, cleanup);
      });

      // Also handle clear area circles
      const clearAreas = document.querySelectorAll('[data-clear-area]');
      clearAreas.forEach((area) => {
        if (attachedListeners.has(area)) return;

        const handleMouseEnter = () => {
          clearHoverState();
        };

        area.addEventListener('mouseenter', handleMouseEnter);
        const cleanup = () => {
          area.removeEventListener('mouseenter', handleMouseEnter);
        };
        attachedListeners.set(area, cleanup);
      });

      // Also attach to pie chart containers to detect when mouse leaves the entire pie
      const pieContainers = document.querySelectorAll('[class*="pie-chart-container"]');
      pieContainers.forEach((container) => {
        if (attachedListeners.has(container)) return;

        const handleMouseLeave = () => {
          // When leaving the entire pie container, clear hover state
          clearHoverState();
        };

        container.addEventListener('mouseout', handleMouseLeave);
        const cleanup = () => {
          container.removeEventListener('mouseout', handleMouseLeave);
        };
        attachedListeners.set(container, cleanup);
      });
    };

    // Initial attach
    attachListenersToPaths();

    // Watch for new paths being added (when map markers are rendered)
    const observer = new MutationObserver(() => {
      attachListenersToPaths();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also use event delegation as fallback - handle mouseover on document
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as SVGPathElement | SVGCircleElement | HTMLElement | null;
      if (!target) {
        clearHoverState();
        return;
      }
      
      // Check if target is a pie slice path
      if (target.tagName === 'path' && target.hasAttribute('data-category')) {
        const category = target.getAttribute('data-category');
        const pieIndexStr = target.getAttribute('data-pie-index');
        if (category && pieIndexStr) {
          if (hoverTimeout) clearTimeout(hoverTimeout);
          setHoveredSliceCategory(category);
          setHoveredPieIndex(parseInt(pieIndexStr, 10));
          setHoveredCategories(new Set([category]));
        }
      } else if (target.hasAttribute('data-clear-area')) {
        clearHoverState();
      } else {
        // Check if we're not over any pie-related element
        const isOverPieElement = target.closest('.pie-chart-icon') || 
                                  target.closest('[class*="pie-chart-container"]') ||
                                  (target.tagName === 'path' && target.hasAttribute('data-category')) ||
                                  target.hasAttribute('data-clear-area');
        
        // If we have a hover state but we're not over a pie element, clear it
        if (!isOverPieElement) {
          if (hoverTimeout) clearTimeout(hoverTimeout);
          hoverTimeout = setTimeout(() => {
            clearHoverState();
          }, 100);
        }
      }
    };

    // Also handle mousemove to detect when mouse leaves pie areas
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) {
        clearHoverState();
        return;
      }

      // Check if we're not over any pie-related element
      const isOverPieElement = target.closest('.pie-chart-icon') || 
                                target.closest('[class*="pie-chart-container"]') ||
                                (target.tagName === 'path' && target.hasAttribute('data-category')) ||
                                target.hasAttribute('data-clear-area');
      
      // If we're outside pie elements and have hover state, clear it
      if (!isOverPieElement && hoveredSliceCategory) {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
          clearHoverState();
        }, 50);
      }
    };

    // Handle clicks on pie chart containers - use capture phase and check multiple event types
    const handlePieClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      
      console.log('Click detected on:', target.tagName, target.className, target);
      
      // Check if clicking on a pie chart container or SVG
      const pieContainer = target.closest('[class*="pie-chart-container"]');
      if (pieContainer) {
        const pieIndexAttr = pieContainer.getAttribute('data-pie-index');
        console.log('Pie container found! Index:', pieIndexAttr, 'Handler exists:', !!(window as any)[`pieClickHandler_${pieIndexAttr}`]);
        if (pieIndexAttr !== null) {
          const handler = (window as any)[`pieClickHandler_${pieIndexAttr}`];
          if (handler) {
            e.stopPropagation();
            e.preventDefault();
            console.log('Calling pie click handler', pieIndexAttr);
            handler();
            return;
          } else {
            console.log('Handler not found for pie index:', pieIndexAttr);
            console.log('Available handlers:', Object.keys(pieClickHandlersRef.current));
          }
        }
      }
      
      // Also check if clicking directly on SVG path, circle, or SVG itself
      if (target.tagName === 'path' || target.tagName === 'svg' || target.tagName === 'circle') {
        const pieContainer = target.closest('[class*="pie-chart-container"]') || 
                             target.closest('.pie-chart-icon') ||
                             target.closest('[data-pie-index]');
        if (pieContainer) {
          const pieIndexAttr = pieContainer.getAttribute('data-pie-index');
          if (pieIndexAttr !== null) {
            const handler = (window as any)[`pieClickHandler_${pieIndexAttr}`];
            if (handler) {
              e.stopPropagation();
              e.preventDefault();
              console.log('Calling pie click handler from SVG element', pieIndexAttr);
              handler();
            }
          }
        }
      }
    };

    // Also try mousedown as fallback
    const handlePieMouseDown = (e: MouseEvent) => {
      handlePieClick(e);
    };

    document.addEventListener('mouseover', handleMouseOver as EventListener, true);
    document.addEventListener('mousemove', handleMouseMove as EventListener, true);
    document.addEventListener('click', handlePieClick as EventListener, true);
    document.addEventListener('mousedown', handlePieMouseDown as EventListener, true);

    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      observer.disconnect();
      document.removeEventListener('mouseover', handleMouseOver as EventListener, true);
      document.removeEventListener('mousemove', handleMouseMove as EventListener, true);
      document.removeEventListener('click', handlePieClick as EventListener, true);
      document.removeEventListener('mousedown', handlePieMouseDown as EventListener, true);
      // Cleanup: remove all listeners from tracked elements
      const allPaths = document.querySelectorAll('path[data-category][data-pie-index]');
      const allClearAreas = document.querySelectorAll('[data-clear-area]');
      const allContainers = document.querySelectorAll('[class*="pie-chart-container"]');
      [...allPaths, ...allClearAreas, ...allContainers].forEach((el) => {
        const cleanup = attachedListeners.get(el);
        if (cleanup) cleanup();
      });
    };
  }, [hoveredSliceCategory]);

  const createPieDivIcon = (counts: Record<string, number>, size: number, hoveredCategory: string | null, pieIndex: number, onPieClick?: () => void) => {
    const entries = Object.entries(counts).filter(([, n]) => n > 0);
    const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
    let cumulative = 0;
    const radius = size / 2;
    const cx = radius;
    const cy = radius;
    
    const slices = entries.map(([category, count], sliceIdx) => {
      const value = count / total;
      const startAngle = cumulative * 2 * Math.PI;
      cumulative += value;
      const endAngle = cumulative * 2 * Math.PI;
      
      // Calculate slice radius - enlarge hovered slice
      const sliceRadius = hoveredCategory === category ? radius * 1.15 : radius;
      
      const x1 = cx + sliceRadius * Math.cos(startAngle);
      const y1 = cy + sliceRadius * Math.sin(startAngle);
      const x2 = cx + sliceRadius * Math.cos(endAngle);
      const y2 = cy + sliceRadius * Math.sin(endAngle);
      const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
      const color = getCategoryColor(category);
      const isHovered = hoveredCategory === category;
      
      // Create hoverable path with unique ID
      const pathId = `pie-${pieIndex}-slice-${sliceIdx}`;
      const clickAttr = onPieClick ? `onclick="(function() { window.pieClickHandler_${pieIndex}(); })();"` : '';
      return `<path 
        id="${pathId}"
        d="M ${cx} ${cy} L ${x1} ${y1} A ${sliceRadius} ${sliceRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z" 
        fill="${color}" 
        opacity="${isHovered ? '1' : '0.9'}" 
        stroke="${isHovered ? '#ffffff' : 'none'}" 
        stroke-width="${isHovered ? '2' : '0'}"
        style="cursor: pointer; transition: all 0.2s; pointer-events: all;"
        data-category="${category.replace(/"/g, '&quot;')}"
        data-pie-index="${pieIndex}"
        ${clickAttr}
      />`;
    }).join("");
    
    const clickHandler = onPieClick ? `onclick="(function(e) { e.preventDefault(); e.stopPropagation(); if(window.pieClickHandler_${pieIndex}) { window.pieClickHandler_${pieIndex}(); } return false; })(); return false;"` : '';
    const html = `
      <div style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)); cursor: pointer;" class="pie-chart-container-${pieIndex}" data-pie-index="${pieIndex}" ${clickHandler}>
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="pointer-events: all; display: block; cursor: pointer;" ${clickHandler}>
          <!-- Background circle for visual -->
          <circle cx="${cx}" cy="${cy}" r="${radius}" fill="white" opacity="0.12" pointer-events="none" />
          <!-- Pie slices - these handle hover and click -->
          ${slices}
          <!-- Center circle - detect hover to clear tooltip when hovering center -->
          <circle cx="${cx}" cy="${cy}" r="${Math.max(10, radius * 0.45)}" fill="#0f172a" opacity="0.7" pointer-events="all" data-clear-area="true" ${clickHandler} />
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="${Math.max(10, radius * 0.6)}" fill="#ffffff" pointer-events="none">${total}</text>
        </svg>
      </div>`;
    return new DivIcon({ 
      html, 
      className: `pie-chart-icon pie-${pieIndex}`, 
      iconSize: [size, size], 
      iconAnchor: [radius, radius], 
      popupAnchor: [0, -radius] 
    });
  };

  return (
    <>
    <div className="relative w-full h-full">
      {(loading || error) && (
        <div className="absolute top-1/2 left-1/2 z-[2000] bg-[#2a4149cc] text-white p-4 rounded shadow-lg">
          {loading ? "Loading map..." : error}
        </div>
      )}
      
      {/* No Results Message - Show when search is active but no results */}
      {/* Don't show for user location detection or very short queries (1-2 chars) to avoid false positives while typing */}
      {!loading && !error && signals.length === 0 && (filters?.diseaseSearch || filters?.country) && 
       (filters?.diseaseSearch?.trim().length >= 3 || filters?.country) && !isUserLocation && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1100] bg-[#2a4149] border border-[#67DBE2]/30 rounded-lg p-6 shadow-xl max-w-md">
          <div className="text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-[#67DBE2] text-xl font-semibold mb-2">No Results Found</h3>
            {filters?.country ? (
              <>
                <p className="text-[#ebebeb] text-sm mb-4">
                  No outbreak signals found for <span className="font-semibold">"{filters.country}"</span>
                </p>
                <p className="text-[#ebebeb99] text-xs mb-4">
                  There are no recent outbreak reports for this country in the database.
                </p>
                <p className="text-[#ebebeb99] text-xs mb-4">
                  The map has been zoomed to {filters.country}. Try searching for a different country or disease, or check back later for new data.
                </p>
              </>
            ) : filters?.diseaseSearch ? (
              <>
                <p className="text-[#ebebeb] text-sm mb-4">
                  No outbreak signals found for <span className="font-semibold">"{filters.diseaseSearch}"</span>
                </p>
                <p className="text-[#ebebeb99] text-xs mb-4">
                  This disease may not be in the database yet, or there are no recent outbreaks reported.
                </p>
                <p className="text-[#ebebeb99] text-xs mb-4">
                  Try searching for a different disease or country, or check back later for new data.
                </p>
              </>
            ) : null}
            {onClearSearch && (
              <button
                onClick={onClearSearch}
                className="mt-2 px-4 py-2 bg-[#67DBE2] hover:bg-[#67DBE2]/80 text-[#2a4149] rounded-md text-sm font-medium transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>
      )}
      
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={18}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={0.5}
        worldCopyJump={true}
        style={{ height: "100%", width: "100%", background: "#1a2332" }}
        zoomControl={true}
      >
        {/* Point count badge */}
        <div className={`absolute z-[1200] bg-[#0f172acc] text-white text-xs px-2 py-1 rounded ${
          isFullscreen ? 'top-4 left-20' : 'top-4 left-4'
        }`}>
          {filteredPoints.length} points
        </div>
        
        {/* Severity Legend */}
        <Collapsible 
          open={isLegendOpen} 
          onOpenChange={setIsLegendOpen} 
          className={`absolute z-[1200] overflow-hidden transition-all duration-300 ${
            isFullscreen ? 'top-16' : 'top-0 right-0'
          }`}
          style={isFullscreen ? {
            borderTopRightRadius: '8px',
            borderBottomLeftRadius: '10px',
            background: '#315C64B2',
            border: '1px solid #EAEBF024',
            boxShadow: '0px 1px 2px 0px #1018280A',
            right: '80px',
            maxWidth: '140px'
          } : {
            borderTopRightRadius: '10px',
            borderBottomLeftRadius: '10px',
            background: '#315C64B2',
            border: '1px solid #EAEBF024',
            boxShadow: '0px 1px 2px 0px #1018280A',
          }}
        >
          <CollapsibleTrigger asChild>
            <div className="w-full hover:bg-[#305961]/50 transition-colors cursor-pointer">
            <div className="px-3 py-2 border-b border-[#EAEBF024]/20 flex items-center justify-between gap-2" style={{ width: '124px' }}>
              <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-white text-xs tracking-[-0.10px] leading-4">
                Legend
              </h3>
                <div className="w-4 h-4 p-0 flex-shrink-0 flex items-center justify-center">
                <img
                  className="w-4 h-4 transition-transform duration-200"
                  alt="Dropdown"
                  src="/group-938.svg"
                  style={{ transform: isLegendOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 py-2" style={{ width: '124px' }}>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="[font-family:'Roboto',Helvetica] font-medium text-[10px] text-white tracking-[-0.10px] leading-3">
                    High Severity
                  </span>
                  <div className="w-3 h-3 rounded-full bg-red-600 flex-shrink-0"></div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="[font-family:'Roboto',Helvetica] font-medium text-[10px] text-white tracking-[-0.10px] leading-3">
                    Medium Severity
                  </span>
                  <div className="w-3 h-3 rounded-full bg-yellow-600 flex-shrink-0"></div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="[font-family:'Roboto',Helvetica] font-medium text-[10px] text-white tracking-[-0.10px] leading-3">
                    Low Severity
                  </span>
                  <div className="w-3 h-3 rounded-full bg-green-600 flex-shrink-0"></div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
        <MapTileLayer mapType={mapType} />
        <ZoomHandler onZoomChange={setZoom} />
        <FitBounds 
          points={filteredPoints} 
          initialFit={shouldFitBounds && filteredPoints.length > 0 && !isUserLocation && !zoomTarget} 
          zoomTarget={zoomTarget} 
          isUserLocation={isUserLocation} 
        />
        <MapResizeHandler />
        <MapControls mapType={mapType} onMapTypeChange={setMapType} isOpen={isMapControlsOpen} onOpenChange={setIsMapControlsOpen} isFullscreen={isFullscreen} />
        {
          // Low zoom: show aggregated pies grouped by category (skip single-point cells, show them as pins)
          zoom <= 5 ? (
            <>
              {/* Render single-point cells as colored markers */}
              {aggregated.filter(cell => cell.totalCount === 1).map((cell) => {
                const outbreak = cell.points[0];
                // Use severity color based on count (1 outbreak = low severity)
                const color = getSeverityColor(cell.totalCount);
                return (
                  <Marker
                    key={`single-${outbreak.id}`}
                    position={outbreak.position}
                    icon={createCustomIcon(color, 16)}
                  >
                    <Tooltip 
                      permanent={false}
                      direction="top"
                      offset={[0, -10]}
                    >
                      <div className="p-2 min-w-[200px]">
                        <div className="mb-1 font-semibold">{outbreak.disease}</div>
                        <div className="text-xs">
                          <strong>Location:</strong> {outbreak.location}
                          {outbreak.city && (
                            <span className="ml-1 px-1.5 py-0.5 bg-[#67DBE2]/20 text-[#67DBE2] rounded text-[10px] font-medium">
                              City
                            </span>
                          )}
                        </div>
                        <div className="text-xs"><strong>Category:</strong> {outbreak.category}</div>
                      </div>
                    </Tooltip>
                    <Popup>
                      <OutbreakPopupContent outbreak={outbreak} />
                    </Popup>
                  </Marker>
                );
              })}
              {/* Render multi-point cells as pie charts */}
              {aggregated.filter(cell => cell.totalCount > 1).map((cell, idx) => {
              const categoriesInPie = new Set(Object.keys(cell.totals));
              const isPieHovered = hoveredPieIndex === idx;
              const isCategoryHovered = Array.from(categoriesInPie).some(cat => hoveredCategories.has(cat));
              
              // Get outbreak names for the hovered slice category, or all if no slice hovered
              const hoveredCategoryDiseases = hoveredSliceCategory && cell.diseasesByCategory?.[hoveredSliceCategory] 
                ? cell.diseasesByCategory[hoveredSliceCategory] 
                : cell.diseases || [];
              
              const displayNames = hoveredCategoryDiseases.slice(0, 3).join(", ");
              const remainingOutbreaks = hoveredCategoryDiseases.length - 3;
              const tooltipText = remainingOutbreaks > 0
                ? `${displayNames}${remainingOutbreaks > 0 ? ` +${remainingOutbreaks} more` : ''}`
                : displayNames || "Multiple outbreaks";

              // Create click handler for this pie (not using hooks - just a regular function)
              const handlePieClick = () => {
                console.log('Pie clicked handler called', idx, cell.points.length, 'points');
                const newData = { points: cell.points, position: cell.position };
                console.log('Setting selected pie data:', newData);
                setSelectedPieData(newData);
                console.log('Setting dialog open to true');
                setIsDialogOpen(true);
                // Force a re-render check
                setTimeout(() => {
                  console.log('Dialog open state after timeout:', isDialogOpen);
                }, 100);
              };

              // Store click handler in ref and globally so inline onclick can access it
              pieClickHandlersRef.current[idx] = handlePieClick;
              (window as any)[`pieClickHandler_${idx}`] = handlePieClick;
              console.log(`Registered pie click handler for index ${idx}, total handlers:`, Object.keys(pieClickHandlersRef.current).length);

              return (
                <Marker
                  key={`pie-${idx}-${hoveredSliceCategory || 'none'}`}
                  position={cell.position}
                  icon={createPieDivIcon(
                    cell.totals, 
                    isPieHovered || isCategoryHovered ? 64 : 56,
                    isPieHovered ? hoveredSliceCategory : null,
                    idx,
                    handlePieClick
                  )}
                  eventHandlers={{
                    click: (e) => {
                      console.log('Marker click event fired!', idx, 'Points:', cell.points.length);
                      e.originalEvent?.stopPropagation?.();
                      e.originalEvent?.preventDefault?.();
                      console.log('About to call handlePieClick');
                      handlePieClick();
                      console.log('handlePieClick called');
                    },
                    dblclick: (e) => {
                      console.log('Marker double click event fired!', idx);
                      e.originalEvent?.stopPropagation?.();
                      handlePieClick();
                    },
                    mousedown: (e) => {
                      console.log('Marker mousedown event fired!', idx);
                      e.originalEvent?.stopPropagation?.();
                      handlePieClick();
                    }
                  }}
                  interactive={true}
                  bubblingMouseEvents={false}
                >
                  {isPieHovered && hoveredSliceCategory && (
                    <Tooltip 
                      permanent={true}
                      direction="top"
                      offset={[0, -10]}
                      className="!bg-[#2a4149] !border-[#67DBE2]/30 !text-white !px-3 !py-2 !rounded !shadow-lg !backdrop-blur-sm !border outbreak-tooltip"
                      opacity={0.95}
                    >
                      <div className="max-w-full box-border" style={{ 
                        wordBreak: 'break-word', 
                        overflowWrap: 'break-word'
                      }}>
                        <div className="font-semibold text-[#67DBE2] text-[11px] mb-1.5 max-w-full" style={{ 
                          wordBreak: 'break-word', 
                          overflowWrap: 'break-word'
                        }}>
                          {hoveredSliceCategory}
                        </div>
                        <div className="text-[10px] text-white/90 leading-tight whitespace-normal max-w-full" style={{ 
                          wordBreak: 'break-word', 
                          overflowWrap: 'break-word'
                        }}>
                          {tooltipText || 'No outbreaks'}
                        </div>
                      </div>
                    </Tooltip>
                  )}
                  <Popup closeOnClick={true} autoClose={false}>
                    <div className="p-2 min-w-[220px]">
                      <div className="mb-2 font-semibold">Outbreak categories</div>
                      {Object.entries(cell.totals).sort((a,b)=>b[1]-a[1]).map(([cat, n]) => (
                        <div key={cat} className="text-xs flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded" style={{ background: getCategoryColor(cat) }} />
                          <span>{cat}</span>
                          <span className="ml-auto font-semibold">{n}</span>
                        </div>
                      ))}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('View Details button clicked!', cell.points.length);
                          setSelectedPieData({ points: cell.points, position: cell.position });
                          setIsDialogOpen(true);
                          console.log('Button: Dialog state set to open');
                        }}
                        className="mt-3 w-full px-3 py-1.5 bg-[#67DBE2] hover:bg-[#5bc5cb] text-[#2a4149] text-xs font-semibold rounded transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
              })}
            </>
          ) : (
            // High zoom: Show individual pins for each outbreak, grouped by coordinates with slight offset
            <>
              {(() => {
                // Group by coordinates first, then show each signal separately
                // This allows multiple signals at same location to be visible
                const coordinateGroups: Map<string, typeof filteredPoints> = new Map();
                
                filteredPoints.forEach((outbreak: any) => {
                  // Create a key from coordinates (rounded to 4 decimal places for grouping nearby points)
                  const lat = typeof outbreak.position[0] === 'number' ? outbreak.position[0] : parseFloat(outbreak.position[0]);
                  const lng = typeof outbreak.position[1] === 'number' ? outbreak.position[1] : parseFloat(outbreak.position[1]);
                  const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
                  
                  if (!coordinateGroups.has(coordKey)) {
                    coordinateGroups.set(coordKey, []);
                  }
                  coordinateGroups.get(coordKey)!.push(outbreak);
                });
                
                // Create markers - if multiple signals at same coordinates, show them with slight offset
                const markers: JSX.Element[] = [];
                coordinateGroups.forEach((outbreaks, coordKey) => {
                  // const [lat, lng] = coordKey.split(',').map(Number); // Not used, but kept for reference
                  
                  if (outbreaks.length === 1) {
                    // Single outbreak - show as individual pin
                    const outbreak = outbreaks[0];
                    const locationName = outbreak.location || 'Unknown';
                    const isCityLevel = !!outbreak.city; // City exists and is not null/undefined
                    
                    markers.push(
                      <Marker
                        key={`outbreak-${outbreak.id}`}
                        position={outbreak.position}
                        icon={createCustomIcon(getSeverityColor(1), isCityLevel ? 18 : 16)}
                      >
                        <Tooltip 
                          permanent={false}
                          direction="top"
                          offset={[0, -10]}
                        >
                          <div className="p-2 min-w-[200px]">
                            <div className="mb-1 font-semibold">{outbreak.disease}</div>
                            <div className="text-xs">
                              <strong>Location:</strong> {locationName}
                              {isCityLevel && (
                                <span className="ml-1 px-1.5 py-0.5 bg-[#67DBE2]/20 text-[#67DBE2] rounded text-[10px] font-medium">
                                  City
                                </span>
                              )}
                            </div>
                            <div className="text-xs"><strong>Category:</strong> {outbreak.category}</div>
                          </div>
                        </Tooltip>
                        <Popup>
                          <OutbreakPopupContent outbreak={outbreak} />
                        </Popup>
                      </Marker>
                    );
                  } else {
                    // Multiple outbreaks at same coordinates - group them but show as one marker with details
                    const uniqueLocations = [...new Set(outbreaks.map((o: any) => o.location))];
                    const locationName = uniqueLocations.length === 1 ? uniqueLocations[0] : `${uniqueLocations.length} locations`;
                    const totalCount = outbreaks.length;
                    const isCityLevel = outbreaks.some((o: any) => !!o.city); // At least one outbreak has a city
                    const uniqueDiseases = [...new Set(outbreaks.map((o: any) => o.disease))];
                    const uniqueCategories = [...new Set(outbreaks.map((o: any) => o.category))];
                    
                    markers.push(
                    <Marker
                        key={`group-${coordKey}`}
                        position={outbreaks[0].position}
                        icon={createCustomIcon(getSeverityColor(totalCount), isCityLevel ? 20 : 18)}
                    >
                      <Tooltip 
                        permanent={false}
                        direction="top"
                        offset={[0, -10]}
                      >
                        <div className="p-2 min-w-[200px]">
                          <div className="mb-1 font-semibold">
                            {totalCount} Outbreak{totalCount !== 1 ? 's' : ''} - {locationName}
                            {isCityLevel && (
                              <span className="ml-1 px-1.5 py-0.5 bg-[#67DBE2]/20 text-[#67DBE2] rounded text-[10px] font-medium">
                                City
                              </span>
                            )}
                          </div>
                          <div className="text-xs mt-1">
                            <strong>Diseases:</strong> {uniqueDiseases.slice(0, 5).join(', ')}{uniqueDiseases.length > 5 ? '...' : ''}
                          </div>
                          <div className="text-xs"><strong>Categories:</strong> {uniqueCategories.slice(0, 3).join(', ')}{uniqueCategories.length > 3 ? '...' : ''}</div>
                        </div>
                      </Tooltip>
                      <Popup closeOnClick={false} autoClose={false}>
                        <div 
                          className="p-1.5 min-w-[200px] max-h-[400px] flex flex-col"
                          onMouseDown={(e) => {
                            // Prevent map drag when clicking inside popup
                            e.stopPropagation();
                          }}
                        >
                          {/* Fixed Header Section - Compact */}
                          <div className="flex-shrink-0 mb-1">
                            <div className="mb-1 font-semibold text-sm flex items-center gap-1 flex-wrap">
                              <span>{locationName}</span>
                              {isCityLevel && (
                                <span className="px-1.5 py-0.5 bg-[#67DBE2]/20 text-[#67DBE2] rounded text-[10px] font-medium">
                                  City
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-yellow-400 mb-1">
                              ⚠ {totalCount} outbreak{totalCount !== 1 ? 's' : ''}
                            </div>
                            <CollapsibleDiseasesList diseases={uniqueDiseases} />
                          </div>
                          
                          {/* Scrollable Outbreaks List */}
                          <div 
                            className="flex-1 overflow-y-auto popup-scrollable min-h-0 border-t border-gray-600 pt-1.5"
                            onWheel={(e) => {
                              // Prevent scroll events from propagating to map
                              e.stopPropagation();
                            }}
                            onTouchMove={(e) => {
                              // Prevent touch scroll events from propagating to map
                              e.stopPropagation();
                            }}
                            style={{
                              overscrollBehavior: 'contain',
                              WebkitOverflowScrolling: 'touch',
                              maxHeight: '240px',
                              minHeight: '180px'
                            }}
                          >
                            <div className="space-y-1.5 pr-1">
                              {outbreaks.map((outbreak: OutbreakSignal, idx: number) => (
                                <div key={idx} className="text-xs border-b border-gray-700 pb-1.5 last:border-0">
                                  <div className="font-semibold mb-0.5">{outbreak.disease}</div>
                                  <div className="text-white/70"><strong>Location:</strong> {outbreak.location}</div>
                                  <div className="text-white/70"><strong>Category:</strong> {outbreak.category}</div>
                                  {outbreak.source && (
                                    <div className="text-white/70"><strong>Source:</strong> <span className="text-[#67DBE2]">{outbreak.source}</span></div>
                                  )}
                                  <div className="text-white/70"><strong>Date:</strong> {outbreak.date ? new Date(outbreak.date).toLocaleDateString() : 'N/A'}</div>
                                  {outbreak.url && (
                                    <a href={outbreak.url} target="_blank" rel="noopener noreferrer" className="text-[#67DBE2] hover:underline text-[11px] mt-0.5 inline-block">
                                    Read article →
                                  </a>
                                )}
                              </div>
                            ))}
                            </div>
                          </div>
                          
                          {/* Fixed Health Ministry Contact Section */}
                          <div className="flex-shrink-0 mt-2 border-t border-gray-600 pt-1.5">
                            {outbreaks.length > 0 && (() => {
                              const firstCountry = extractCountryFromLocation(outbreaks[0].location);
                              return firstCountry ? <GroupedOutbreakHealthMinistry countryName={firstCountry} /> : null;
                            })()}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                  }
                });
                
                return markers;
              })()}
            </>
          )
        }
      </MapContainer>
    </div>

    {/* Outbreak Details Dialog - Outside MapContainer */}
    {console.log('Rendering dialog, isDialogOpen:', isDialogOpen, 'selectedPieData:', selectedPieData)}
    <Dialog open={isDialogOpen} onOpenChange={(open) => {
      console.log('Dialog onOpenChange called with:', open);
      setIsDialogOpen(open);
      if (!open) {
        // Clear selected pie data when dialog closes
        setSelectedPieData(null);
      }
    }}>
      <DialogContent className="max-w-4xl flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">Outbreak Details</DialogTitle>
          <DialogClose />
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6">
        {selectedPieData && (() => {
            const { points } = selectedPieData;
            
            // Get unique locations with counts
            const locationCounts: Record<string, number> = {};
            points.forEach(p => {
              locationCounts[p.location] = (locationCounts[p.location] || 0) + 1;
            });
            const locations = Object.keys(locationCounts);
            const totalCount = points.length;
            const locationText = locations.length > 0 
              ? `${locations.join(", ")} (${totalCount})`
              : `Unknown Location (${totalCount})`;
            
            // Get unique diseases
            const uniqueDiseases = Array.from(new Set(points.map(p => p.disease).filter(Boolean)));
            
            // Sort points by date (newest first)
            const sortedPoints = [...points].sort((a, b) => {
              const dateA = a.date ? new Date(a.date).getTime() : 0;
              const dateB = b.date ? new Date(b.date).getTime() : 0;
              return dateB - dateA;
            });
            
            // Format date for display
            const formatDate = (dateStr?: string) => {
              if (!dateStr) return "N/A";
              try {
                const date = new Date(dateStr);
                return date.toISOString().split('T')[0];
              } catch {
                return dateStr;
              }
            };
            
            return (
              <div className="space-y-4">
                {/* Locations */}
                <div className="text-base font-semibold text-white break-words pr-8">
                  {locationText}
                </div>
                
                {/* Diseases */}
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {uniqueDiseases.map((disease, idx) => (
                    <span key={idx} className="text-xs text-white/90 lowercase px-2 py-1 bg-[#67DBE2]/20 rounded border border-[#67DBE2]/30 break-words">
                      {disease}
                    </span>
                  ))}
                </div>
                
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-2 pt-4 border-t border-[#67DBE2]/20 min-w-0">
                  <div className="text-xs font-semibold text-[#67DBE2] min-w-0 truncate">Date</div>
                  <div className="text-xs font-semibold text-[#67DBE2] min-w-0 truncate">Location</div>
                  <div className="text-xs font-semibold text-[#67DBE2] min-w-0 truncate">Report</div>
                  <div className="text-xs font-semibold text-[#67DBE2] min-w-0 truncate">Disease</div>
                  <div className="text-xs font-semibold text-[#67DBE2] min-w-0 truncate">Category</div>
                </div>
                
                {/* Table Rows */}
                <div className="space-y-2">
                  {sortedPoints.map((point, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2 py-2 border-b border-[#67DBE2]/10 min-w-0">
                      <div className="text-xs text-white/80 min-w-0 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        {formatDate(point.date)}
                      </div>
                      <div className="text-xs text-white/90 min-w-0 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        {point.location}
                      </div>
                      <div className="text-xs text-white/90 min-w-0 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        {point.url ? (
                          <a 
                            href={point.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#67DBE2] hover:underline break-words"
                            title={point.title || point.disease || "Outbreak Report"}
                            style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                          >
                            {point.title || point.disease || "Outbreak Report"}
                          </a>
                        ) : (
                          <span className="break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{point.title || point.disease || "Outbreak Report"}</span>
                        )}
                      </div>
                      <div className="text-xs text-white/80 lowercase min-w-0 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        {point.disease || "N/A"}
                      </div>
                      <div className="text-xs text-white/80 min-w-0 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        {point.category || point.keywords || "N/A"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
