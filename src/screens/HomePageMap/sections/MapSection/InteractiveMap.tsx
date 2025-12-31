import React, { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import { Icon, DivIcon } from "leaflet";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSupabaseOutbreakSignals, OutbreakSignal, categoriesMatch } from "../../../../lib/useSupabaseOutbreakSignals";
import { FilterState } from "../FilterPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../../../../components/ui/dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../../../components/ui/collapsible";
import { useHealthMinistry, extractCountryFromLocation } from "../../../../lib/useHealthMinistry";
import { calculateDistance } from "../../../../lib/utils";

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

// Keep popup open and handle close button clicks
const KeepPopupOpenHandler = ({ markerRef, shouldKeepOpen, userManuallyClosedRef }: { markerRef: React.MutableRefObject<any>, shouldKeepOpen: boolean, userManuallyClosedRef: React.MutableRefObject<boolean> }) => {
  const map = useMap();
  const keepOpenIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  
  React.useEffect(() => {
    if (!shouldKeepOpen) {
      // Clear interval if popup should not be kept open
      if (keepOpenIntervalRef.current) {
        clearInterval(keepOpenIntervalRef.current);
        keepOpenIntervalRef.current = null;
      }
      return;
    }
    
    // Listen for close button clicks
    const handleCloseButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const closeButton = target.closest('.leaflet-popup-close-button');
      if (closeButton) {
        const popupElement = closeButton.closest('.leaflet-popup');
        if (popupElement && markerRef.current) {
          try {
            const markerPopup = markerRef.current.getPopup?.();
            if (markerPopup) {
              const markerPopupElement = markerPopup.getElement?.();
              if (markerPopupElement === popupElement || 
                  popupElement.contains(markerPopupElement) || 
                  markerPopupElement?.contains(popupElement)) {
                // User clicked close button - mark as manually closed
                userManuallyClosedRef.current = true;
                // Stop keeping it open
                if (keepOpenIntervalRef.current) {
                  clearInterval(keepOpenIntervalRef.current);
                  keepOpenIntervalRef.current = null;
                }
              }
            }
          } catch (e) {
            // Fallback: check by content
            const popupContent = popupElement.textContent || '';
            if (popupContent.includes('Outbreaks Near You') || popupContent.includes('Your Current Location')) {
              userManuallyClosedRef.current = true;
              if (keepOpenIntervalRef.current) {
                clearInterval(keepOpenIntervalRef.current);
                keepOpenIntervalRef.current = null;
              }
            }
          }
        }
      }
    };
    
    document.addEventListener('click', handleCloseButtonClick, true);
    
    // Prevent map from closing popup on click
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      // If popup should be kept open, prevent it from closing
      if (markerRef.current && shouldKeepOpen && !userManuallyClosedRef.current) {
        // Check if click is NOT on the popup itself
        const originalTarget = (e.originalEvent?.target as HTMLElement) || null;
        if (originalTarget && !originalTarget.closest('.leaflet-popup')) {
          // Click was on the map, not the popup - ensure popup stays open
          setTimeout(() => {
            if (markerRef.current && shouldKeepOpen && !userManuallyClosedRef.current) {
              try {
                const popup = markerRef.current.getPopup?.();
                if (popup && !popup.isOpen()) {
                  markerRef.current.openPopup();
                }
              } catch (e) {
                // Ignore errors
              }
            }
          }, 50);
        }
      }
    };
    
    map.on('click', handleMapClick);
    
    // Continuously check and keep popup open (but not if user manually closed it)
    // Start immediately to catch any closures
    keepOpenIntervalRef.current = setInterval(() => {
      if (markerRef.current && shouldKeepOpen && !userManuallyClosedRef.current) {
        try {
          const popup = markerRef.current.getPopup?.();
          if (popup) {
            if (!popup.isOpen()) {
              // Popup was closed - reopen it immediately
              markerRef.current.openPopup();
            }
          }
        } catch (e) {
          // Ignore errors
        }
      } else if (userManuallyClosedRef.current) {
        // User manually closed it, stop checking
        if (keepOpenIntervalRef.current) {
          clearInterval(keepOpenIntervalRef.current);
          keepOpenIntervalRef.current = null;
        }
      }
    }, 50); // Check every 50ms - very frequent to catch closures immediately
    
    // Reopen popup after zoom if it was open
    const handleZoom = () => {
      if (markerRef.current && shouldKeepOpen && !userManuallyClosedRef.current) {
        setTimeout(() => {
          if (markerRef.current && shouldKeepOpen && !userManuallyClosedRef.current) {
            try {
              const popup = markerRef.current.getPopup?.();
              if (popup && !popup.isOpen()) {
                markerRef.current.openPopup();
              }
            } catch (e) {
              // Ignore errors
            }
          }
        }, 200);
      }
    };
    
    map.on('zoomend', handleZoom);
    
    return () => {
      document.removeEventListener('click', handleCloseButtonClick, true);
      if (keepOpenIntervalRef.current) {
        clearInterval(keepOpenIntervalRef.current);
        keepOpenIntervalRef.current = null;
      }
      map.off('zoomend', handleZoom);
      map.off('click', handleMapClick);
    };
  }, [map, markerRef, shouldKeepOpen, userManuallyClosedRef]);
  
  return null;
};

const FitBounds = ({ points, initialFit, zoomTarget, isUserLocation = false, zoomLevel = 10 }: { points: Array<{ position: [number, number] }>; initialFit: boolean; zoomTarget?: [number, number] | null; isUserLocation?: boolean; zoomLevel?: number }) => {
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
      console.log(`🎯 Zoom attempt ${attemptNumber + 1} to user location:`, target, 'zoom level:', zoomLevel);
      
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
      
      // Find closest outbreaks within reasonable distance (1000km) so we can keep them in view with the user
      const MAX_DISTANCE_KM = 1000; // Limit to outbreaks within 1000km
      const nearestOutbreaks = (points || [])
        .map((point) => ({
          position: point.position,
          distance: calculateDistance(lat, lng, point.position[0], point.position[1])
        }))
        .filter(({ distance }) => !isNaN(distance) && distance <= MAX_DISTANCE_KM)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5); // Get up to 5 nearest outbreaks within range
      
      const shouldFitNearbyOutbreaks = nearestOutbreaks.length > 0;
      
      console.log(`🔍 Found ${nearestOutbreaks.length} nearby outbreaks within ${MAX_DISTANCE_KM}km`);
      if (nearestOutbreaks.length > 0) {
        console.log('📍 Nearest outbreak distances:', nearestOutbreaks.map(o => `${o.distance.toFixed(1)}km`));
      }
      
      // Check if mobile device
      const isMobileDevice = window.innerWidth < 1024;
      
      // ALWAYS use fitBounds approach to show user + outbreaks (or wider area if no outbreaks)
      // This prevents the "zoom in then zoom out" issue
      try {
        let boundsPoints: [number, number][];
        let maxZoom: number;
        let padding: [number, number];
        
        if (shouldFitNearbyOutbreaks) {
          // Calculate adaptive zoom based on outbreak distances
          const avgDistance = nearestOutbreaks.reduce((sum, o) => sum + o.distance, 0) / nearestOutbreaks.length;
          // Closer outbreaks = higher zoom, farther = lower zoom
          // Scale: 0-100km -> zoom 6-8, 100-500km -> zoom 4-6, 500-1000km -> zoom 3-4
          let adaptiveZoom = 4;
          if (avgDistance < 100) {
            adaptiveZoom = Math.min(8, Math.max(6, 8 - (avgDistance / 50)));
          } else if (avgDistance < 500) {
            adaptiveZoom = Math.min(6, Math.max(4, 6 - ((avgDistance - 100) / 200)));
          } else {
            adaptiveZoom = Math.max(3, 4 - ((avgDistance - 500) / 500));
          }
          
          padding = isMobileDevice ? [80, 80] : [100, 100];
          maxZoom = Math.min(adaptiveZoom, 7); // Cap at zoom 7 to zoom out more and show wider area
          
          boundsPoints = [
            [lat, lng],
            ...nearestOutbreaks.map(({ position }) => position)
          ];
          
          console.log(`🗺️ Fitting bounds to user + ${nearestOutbreaks.length} outbreaks, adaptive zoom: ${adaptiveZoom}, maxZoom: ${maxZoom}`);
        } else {
          // No nearby outbreaks - create a wider bounds area around user to zoom out more
          // Use a larger radius to show more area
          const radiusDegrees = 0.15; // Approximately 1500km at equator - much wider view
          boundsPoints = [
            [lat - radiusDegrees, lng - radiusDegrees],
            [lat + radiusDegrees, lng + radiusDegrees],
            [lat, lng] // Include user location
          ];
          
          padding = isMobileDevice ? [80, 80] : [100, 100];
          maxZoom = 4; // Lower zoom level when no outbreaks found to show wider area
          
          console.log(`🗺️ No nearby outbreaks - fitting bounds to wider area around user (zoom: ${maxZoom})`);
        }
        
        // Always use fitBounds - this ensures one smooth zoom to the correct level
        map.fitBounds(boundsPoints, { 
          padding: padding,
          animate: attemptNumber > 0,
          maxZoom 
        });
        
        // On mobile, adjust pan after fitBounds to account for header/UI
        if (isMobileDevice) {
          setTimeout(() => {
            if (map && map.getContainer()) {
              map.panBy([0, 80] as [number, number], { 
                animate: attemptNumber > 0,
                duration: 0.3 
              });
            }
          }, 150);
        }
      } catch (e) {
        console.warn('fitBounds failed, falling back to setView:', e);
        // Fallback: use a zoom that shows user location with some context
        const fallbackZoom = 4; // Lower zoom to show wider area
        map.setView([lat, lng], fallbackZoom, { 
          animate: attemptNumber > 0,
          duration: 0.5 
        });
        
        // On mobile, adjust pan
        if (isMobileDevice) {
          setTimeout(() => {
            if (map && map.getContainer()) {
              map.panBy([0, 80] as [number, number], { 
                animate: attemptNumber > 0,
                duration: 0.3 
              });
            }
          }, 100);
        }
      }
      
      // Verify the zoom worked
      setTimeout(() => {
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();
        const bounds = map.getBounds();
        const userVisible = bounds.contains([lat, lng]);
        
        console.log(`📍 Zoom verification - Center: [${currentCenter.lat}, ${currentCenter.lng}], Zoom: ${currentZoom}, User visible: ${userVisible}`);
        
        if (shouldFitNearbyOutbreaks) {
          // Check if at least some outbreaks are visible
          const visibleOutbreaks = nearestOutbreaks.filter(({ position }) => bounds.contains(position));
          const outbreaksVisible = visibleOutbreaks.length > 0;
          
          console.log(`📍 Outbreaks visible: ${visibleOutbreaks.length}/${nearestOutbreaks.length}`);
          
          // More lenient threshold when fitting bounds - zoom can be lower
          const minZoomThreshold = 4;
          const shouldRetry = (!userVisible || !outbreaksVisible || currentZoom < minZoomThreshold) && attemptNumber < 3;
          
          if (shouldRetry) {
            console.log(`⚠️ Zoom verification failed (user visible: ${userVisible}, outbreaks visible: ${outbreaksVisible}, zoom: ${currentZoom}), retrying (attempt ${attemptNumber + 1})`);
            setTimeout(() => zoomToUserLocation(target, attemptNumber + 1), 300);
          } else if (userVisible && outbreaksVisible && currentZoom >= minZoomThreshold) {
            console.log('✅ Successfully zoomed to user location with nearby outbreaks in view!');
            userLocationZoomedRef.current = true;
          }
        } else {
          // No outbreaks case - just verify user is visible and zoom is reasonable
          const minZoomThreshold = 4;
          const latDiff = Math.abs(currentCenter.lat - lat);
          const lngDiff = Math.abs(currentCenter.lng - lng);
          const distance = latDiff + lngDiff;
          
          const shouldRetry = (!userVisible || currentZoom < minZoomThreshold || distance > 0.5) && attemptNumber < 3;
          
          if (shouldRetry) {
            console.log(`⚠️ Zoom verification failed (user visible: ${userVisible}, zoom: ${currentZoom}, distance: ${distance}), retrying (attempt ${attemptNumber + 1})`);
            setTimeout(() => zoomToUserLocation(target, attemptNumber + 1), 300);
          } else if (userVisible && currentZoom >= minZoomThreshold) {
            console.log('✅ Successfully zoomed to user location!');
            userLocationZoomedRef.current = true;
          }
        }
      }, 200); // Increased timeout to allow fitBounds to complete
      
      return true;
    } catch (e) {
      console.error('Error in zoomToUserLocation:', e);
      return false;
    }
  }, [map, points, zoomLevel]);
  
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
      
      // Only trigger re-zoom if:
      // 1. Target changed (new location)
      // 2. Haven't zoomed yet
      // 3. Points went from 0 to many (initial load) - but only if we haven't zoomed yet
      // We DON'T re-zoom if points just increased - that would cause "zoom in then zoom out"
      const isInitialPointsLoad = points.length > 0 && lastPointsCountRef.current === 0;
      const shouldRezoomForPoints = isInitialPointsLoad && !userLocationZoomedRef.current;
      
      if (targetChanged || !userLocationZoomedRef.current || shouldRezoomForPoints) {
        console.log('📍 USER LOCATION ZOOM: Setting up zoom to:', zoomTarget, 'points:', points.length, 
          shouldRezoomForPoints ? '(initial points load)' : '');
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
            console.log('🔄 Backup zoom 1: re-trying user location fit');
            zoomToUserLocation(zoomTarget, 1);
          }
        }, 300));
        
        timers.push(setTimeout(() => {
          if (map && map.getContainer()) {
            console.log('🔄 Backup zoom 2: re-trying user location fit');
            zoomToUserLocation(zoomTarget, 2);
          }
        }, 600));
        
        timers.push(setTimeout(() => {
          if (map && map.getContainer()) {
            console.log('🔄 Backup zoom 3: final user location fit attempt');
            zoomToUserLocation(zoomTarget, 3);
          }
        }, 1000));
        
        // Return cleanup function
        return () => {
          timers.forEach(timer => clearTimeout(timer));
        };
      }
      
      // If points change but we're at user location, only re-zoom if current zoom is clearly wrong
      // Don't re-zoom just because points changed - that causes "zoom in then zoom out"
      if (points.length !== lastPointsCountRef.current && userLocationZoomedRef.current) {
        lastPointsCountRef.current = points.length;
        console.log('User location: points changed to', points.length, '- checking if zoom needs adjustment');
        
        // Only re-zoom if the current zoom is clearly wrong (too zoomed in, user not visible, etc.)
        const maintainTimer = setTimeout(() => {
          if (zoomTarget && map) {
            const currentCenter = map.getCenter();
            const currentZoom = map.getZoom();
            const bounds = map.getBounds();
            const userVisible = bounds.contains([zoomTarget[0], zoomTarget[1]]);
            const latDiff = Math.abs(currentCenter.lat - zoomTarget[0]);
            const lngDiff = Math.abs(currentCenter.lng - zoomTarget[1]);
            const distance = latDiff + lngDiff;
            
            // Check if there are nearby outbreaks that aren't visible
            const MAX_DISTANCE_KM = 1000;
            const nearestOutbreaks = (points || [])
              .map((point) => ({
                position: point.position,
                distance: calculateDistance(zoomTarget[0], zoomTarget[1], point.position[0], point.position[1])
              }))
              .filter(({ distance }) => !isNaN(distance) && distance <= MAX_DISTANCE_KM)
              .slice(0, 3);
            
            const outbreaksVisible = nearestOutbreaks.length === 0 || 
              nearestOutbreaks.some(({ position }) => bounds.contains(position));
            
            // Only re-zoom if:
            // 1. User is not visible, OR
            // 2. Zoom is too high (>7) and outbreaks aren't visible, OR
            // 3. We're very far from user location
            const needsRezoom = !userVisible || 
              (currentZoom > 7 && !outbreaksVisible && nearestOutbreaks.length > 0) ||
              distance > 2;
            
            if (needsRezoom) {
              console.log('🔄 Maintaining zoom: Re-fitting user location with nearby outbreaks (user visible:', userVisible, 'outbreaks visible:', outbreaksVisible, 'zoom:', currentZoom, ')');
              zoomToUserLocation(zoomTarget, 2);
            } else {
              console.log('✅ Zoom is still good - no re-zoom needed');
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

const MapControls = ({ mapType, onMapTypeChange, isOpen, onOpenChange, isFullscreen = false, isMobile = false }: { mapType: MapType; onMapTypeChange: (type: MapType) => void; isOpen: boolean; onOpenChange: (open: boolean) => void; isFullscreen?: boolean; isMobile?: boolean }) => {
  const mapTypes: { id: MapType; label: string }[] = [
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
    { id: 'street', label: 'Street' },
    { id: 'topographic', label: 'Topographic' },
    { id: 'imagery', label: 'Imagery' },
  ];

  const mobileOffset = 16; // small edge spacing; map container already leaves room for nav/ads
  const positionClass = isFullscreen ? 'bottom-4 right-4' : isMobile ? '' : 'bottom-4 right-4';

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={onOpenChange} 
      className={`absolute z-[1200] rounded-lg border border-[#EAEBF024] bg-[#FFFFFF14] shadow-lg backdrop-blur-sm overflow-hidden transition-all duration-300 ${positionClass}`}
      style={isFullscreen ? { right: '16px', bottom: '16px' } : isMobile ? { right: '16px', bottom: `${mobileOffset}px` } : undefined}
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
    <div className="mt-3 pt-3 border-t border-[#67DBE2]/20">
      <div className="text-xs font-semibold text-[#67DBE2] mb-1">Health Ministry Contact</div>
      <div className="text-xs text-white/90">{ministry.ministry_name}</div>
      {ministry.phone_number && (
        <div className="text-xs text-white/80 mt-1">
          <strong>Phone:</strong> <a href={`tel:${ministry.phone_number}`} className="text-[#67DBE2] hover:underline">{ministry.phone_number}</a>
        </div>
      )}
      {ministry.email_address && (
        <div className="text-xs text-white/80 mt-1">
          <strong>Email:</strong> <a href={`mailto:${ministry.email_address}`} className="text-[#67DBE2] hover:underline break-all">{ministry.email_address}</a>
        </div>
      )}
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
  // Check both the property and explicitly check for the signal IDs we know are user-submitted
  const isUserSubmitted = outbreak.isUserSubmitted === true || 
    outbreak.id === 'ea2bf599-c3af-4a12-9a4c-ca28fcb2dc30' || 
    outbreak.id === 'c55b1f8c-b92b-49e6-adfa-9af8a01a6e71';
  
  // Debug logging for user-submitted alerts
  if (outbreak.id && (outbreak.id === 'ea2bf599-c3af-4a12-9a4c-ca28fcb2dc30' || outbreak.id === 'c55b1f8c-b92b-49e6-adfa-9af8a01a6e71')) {
    console.log('🔍 OutbreakPopupContent - Signal ID:', outbreak.id);
    console.log('🔍 isUserSubmitted from property:', outbreak.isUserSubmitted);
    console.log('🔍 isUserSubmitted calculated:', isUserSubmitted);
    console.log('🔍 Full outbreak object keys:', Object.keys(outbreak));
  }
  
  return (
    <div className="p-2 min-w-[200px]">
      <div className="mb-1 font-semibold flex items-center gap-2 flex-wrap">
        {outbreak.disease}
        {isUserSubmitted && (
          <span className="px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded text-[10px] font-medium border border-green-500/30 whitespace-nowrap">
            User Submitted
          </span>
        )}
      </div>
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
  zoomLevel?: number; // Optional zoom level for user location zoom
  onClearSearch?: () => void;
  onDialogStateChange?: (isOpen: boolean) => void;
}

export const InteractiveMap = ({ filters, isFullscreen = false, zoomTarget, isUserLocation = false, zoomLevel = 10, onClearSearch, onDialogStateChange }: InteractiveMapProps): JSX.Element => {
  // Use Supabase data instead of external APIs
  const { signals, loading, error } = useSupabaseOutbreakSignals(filters || null);
  const [zoom, setZoom] = useState(2);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [isCategoryLegendOpen, setIsCategoryLegendOpen] = useState(false);
  const [isMapControlsOpen, setIsMapControlsOpen] = useState(true);
  const [mapType, setMapType] = useState<MapType>('imagery');
  const [shouldFitBounds, setShouldFitBounds] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
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
  const userLocationMarkerRef = React.useRef<any>(null);
  const [shouldKeepPopupOpen, setShouldKeepPopupOpen] = useState(false);
  const userManuallyClosedRef = React.useRef<boolean>(false);
  const prevCategoryRef = React.useRef<string | null>(null);
  const popupOpenTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Notify parent when dialog state changes
  React.useEffect(() => {
    onDialogStateChange?.(isDialogOpen);
  }, [isDialogOpen, onDialogStateChange]);

  // Simplified: Open popup when category is selected for "near me"
  React.useEffect(() => {
    const currentCategory = filters?.category || null;
    const hasNearMe = !!filters?.nearMe;
    const categoryChanged = prevCategoryRef.current !== currentCategory;
    
    // Clear any existing timer
    if (popupOpenTimerRef.current) {
      clearTimeout(popupOpenTimerRef.current);
      popupOpenTimerRef.current = null;
    }
    
    // Open popup if category is selected and near me is active
    if (currentCategory && hasNearMe && isUserLocation && zoomTarget) {
      // Open if category changed OR user manually closed it before
      if (categoryChanged || userManuallyClosedRef.current) {
        // Update the ref
        prevCategoryRef.current = currentCategory;
        
        // Reset manual close flag and enable keeping popup open
        // Set this first so the KeepPopupOpenHandler can start working
        userManuallyClosedRef.current = false;
        setShouldKeepPopupOpen(true);
        
        // Wait for marker to be available, then open popup
        const attemptOpen = (attempts = 0) => {
          if (userLocationMarkerRef.current) {
            try {
              const popup = userLocationMarkerRef.current.getPopup?.();
              if (popup) {
                userLocationMarkerRef.current.openPopup();
              }
            } catch (e) {
              console.warn('Error opening popup:', e);
            }
          } else if (attempts < 20) {
            // Retry up to 20 times (2 seconds total)
            popupOpenTimerRef.current = setTimeout(() => attemptOpen(attempts + 1), 100);
          }
        };
        
        // Start attempting to open after a short delay
        popupOpenTimerRef.current = setTimeout(() => attemptOpen(), 500);
      }
    } else if (!currentCategory || !hasNearMe) {
      // Reset when category is cleared
      prevCategoryRef.current = null;
      setShouldKeepPopupOpen(false);
      userManuallyClosedRef.current = false;
    }
    
    return () => {
      if (popupOpenTimerRef.current) {
        clearTimeout(popupOpenTimerRef.current);
        popupOpenTimerRef.current = null;
      }
    };
  }, [filters?.category, filters?.nearMe, isUserLocation, zoomTarget]);
  
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
    // Preserve originalCategoryName if it exists (for composite category handling)
    originalCategoryName: (s as any).originalCategoryName,
  }));

  // Calculate unique diseases with outbreak counts for selected category when "near me" is active
  const nearMeCategoryDiseases = useMemo(() => {
    if (!filters?.category || !filters?.nearMe || !zoomTarget) {
      return [];
    }

    const [userLat, userLon] = filters.nearMe.coordinates;
    const radiusKm = filters.nearMe.radiusKm;
    const selectedCategory = filters.category;

    // Get all signals that match the category and are within radius
    const matchingSignals = signals.filter(signal => {
      // Check if category matches
      const originalCategory = (signal as any).originalCategoryName;
      const categoryMatches = categoriesMatch(originalCategory || signal.category, selectedCategory) ||
                              categoriesMatch(signal.category, selectedCategory);
      
      if (!categoryMatches) {
        return false;
      }

      // Check if within radius
      const [signalLat, signalLon] = signal.position;
      const distance = calculateDistance(userLat, userLon, signalLat, signalLon);
      return distance <= radiusKm;
    });

    // Count outbreaks per disease
    const diseaseCounts: Record<string, number> = {};
    matchingSignals.forEach(signal => {
      const disease = signal.disease;
      diseaseCounts[disease] = (diseaseCounts[disease] || 0) + 1;
    });

    // Convert to array of objects with disease name and count, sorted by count (descending) then alphabetically
    const diseasesWithCounts = Object.entries(diseaseCounts)
      .map(([disease, count]) => ({ disease, count }))
      .sort((a, b) => {
        // Sort by count descending, then alphabetically
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.disease.localeCompare(b.disease);
      });

    return diseasesWithCounts;
  }, [filters?.category, filters?.nearMe, zoomTarget, signals]);

  const CATEGORY_COLORS: Record<string, string> = {
    "Foodborne Outbreaks": "#f87171",
    "Waterborne Outbreaks": "#66dbe1",
    "Vector-Borne Outbreaks": "#fbbf24",
    "Airborne Outbreaks": "#a78bfa",
    "Contact Transmission": "#fb923c",
    "Healthcare-Associated Infections": "#ef4444",
    "Zoonotic Outbreaks": "#10b981",
    "Sexually Transmitted Infections": "#ec4899",
    "Sexually Transmitted Outbreaks": "#ec4899", // Alias for Sexually Transmitted Infections
    "Vaccine-Preventable Diseases": "#3b82f6",
    "Emerging Infectious Diseases": "#f59e0b",
    "Emerging & Re-Emerging Disease Outbreaks": "#f59e0b", // Alias for Emerging Infectious Diseases
    "Veterinary Outbreaks": "#8b5cf6",
    "Neurological Outbreaks": "#dc2626", // Different red shade to distinguish from Healthcare-Associated Infections
    "Respiratory Outbreaks": "#9333ea", // Different purple shade to distinguish from Airborne Outbreaks
    "Bloodborne Outbreaks": "#dc2626", // Same as Neurological (red)
    "Gastrointestinal Outbreaks": "#f97316", // Orange shade
    "Other": "#4eb7bd"
  };

  // Category name mappings for variations and composite categories
  const CATEGORY_MAPPINGS: Record<string, string> = {
    "veterinary outbreak": "Veterinary Outbreaks",
    "veterinary outbreaks": "Veterinary Outbreaks",
    "emerging & re-emerging disease outbreaks": "Emerging Infectious Diseases",
    "emerging and re-emerging disease outbreaks": "Emerging Infectious Diseases",
    "sexually transmitted outbreaks": "Sexually Transmitted Infections",
  };

  // Normalize category name to match legend colors
  // Handles composite categories (comma-separated), case variations, and mappings
  const normalizeCategoryName = (category: string | null | undefined): string => {
    if (!category) return "Other";
    
    let normalized = category.trim();
    const originalCategory = normalized; // Keep original for composite matching
    
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
    
    // Special handling for "veterinary outbreak" (lowercase) - common in database
    if (lower === "veterinary outbreak" || lower === "veterinary outbreaks") {
      return "Veterinary Outbreaks";
    }
    
    // Special handling for "Emerging & Re-Emerging Disease Outbreaks" variations
    if (lower.includes("emerging") && (lower.includes("re-emerging") || lower.includes("reemerging"))) {
      return "Emerging Infectious Diseases";
    }
    
    // Special handling for "Sexually Transmitted Outbreaks" vs "Sexually Transmitted Infections"
    if (lower.includes("sexually transmitted")) {
      if (lower.includes("outbreak")) {
        return "Sexually Transmitted Infections"; // Map to standard name
      }
      return "Sexually Transmitted Infections";
    }
    
    // Try partial matching for composite categories that might contain known categories
    // e.g., "Foodborne Outbreaks, Neurological Outbreaks" -> try to find "Foodborne Outbreaks" or "Neurological Outbreaks"
    for (const key in CATEGORY_COLORS) {
      if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
        return key;
      }
    }
    
    // For composite categories, try to extract any known category name from the original
    const allCategoryNames = Object.keys(CATEGORY_COLORS);
    const originalLower = originalCategory.toLowerCase();
    for (const knownCategory of allCategoryNames) {
      if (originalLower.includes(knownCategory.toLowerCase())) {
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

  // Create user location icon (blue pin with pulsing effect using CSS)
  const createUserLocationIcon = (size: number = 32) => {
    const html = `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
        <style>
          @keyframes pulse {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.3;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.4);
              opacity: 0.1;
            }
          }
          .user-location-pulse {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: #3b82f6;
            border: 2px solid #3b82f6;
            animation: pulse 2s ease-in-out infinite;
            transform-origin: center center;
          }
          .user-location-middle {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${size - 8}px;
            height: ${size - 8}px;
            border-radius: 50%;
            background: #3b82f6;
            opacity: 0.5;
            border: 1.5px solid #60a5fa;
          }
          .user-location-inner {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${size - 16}px;
            height: ${size - 16}px;
            border-radius: 50%;
            background: #60a5fa;
            border: 2px solid #ffffff;
          }
          .user-location-dot {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #ffffff;
            z-index: 10;
          }
        </style>
        <div class="user-location-pulse"></div>
        <div class="user-location-middle"></div>
        <div class="user-location-inner"></div>
        <div class="user-location-dot"></div>
      </div>
    `;
    return new DivIcon({
      html,
      className: 'user-location-marker',
      iconSize: [size, size],
      iconAnchor: [size/2, size/2],
      popupAnchor: [0, -size/2],
    });
  };

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
      
      // Handle composite categories - check if we have the original category name
      const originalCategory = (p as any).originalCategoryName || p.category;
      let categoriesToCount: string[] = [];
      
      // If original category is composite (contains comma), split it and normalize each part
      if (originalCategory && originalCategory.includes(',')) {
        const parts = originalCategory.split(',').map((cat: string) => cat.trim()).filter(Boolean);
        categoriesToCount = parts.map((cat: string) => normalizeCategoryName(cat));
      } else {
        // Single category - normalize it
        categoriesToCount = [normalizeCategoryName(p.category)];
      }
      
      // Count each category (handles composite categories by counting each part)
      categoriesToCount.forEach(cat => {
        cells[key].byCategory[cat] = (cells[key].byCategory[cat] || 0) + 1;
        
        // Track diseases by category
        if (!cells[key].diseasesByCategory[cat]) {
          cells[key].diseasesByCategory[cat] = [];
        }
        if (p.disease && !cells[key].diseasesByCategory[cat].includes(p.disease)) {
          cells[key].diseasesByCategory[cat].push(p.disease);
        }
      });
      
      if (p.disease && !cells[key].diseases.includes(p.disease)) {
        cells[key].diseases.push(p.disease);
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
      
      // Don't interfere with popup clicks - let Leaflet handle popup interactions
      if (target.closest('.leaflet-popup') || target.closest('.leaflet-popup-content-wrapper')) {
        return;
      }
      
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
        attributionControl={false}
      >
        {/* Point count badge */}
        <div className={`absolute z-[1200] bg-[#0f172acc] text-white text-xs px-2 py-1 rounded ${
          isMobile ? 'top-2 left-16' : isFullscreen ? 'top-4 left-20' : 'top-4 left-12'
        }`}>
          {filteredPoints.length} points
        </div>
        
        {/* Severity Legend */}
        <Collapsible 
          open={isLegendOpen} 
          onOpenChange={setIsLegendOpen} 
          className={`absolute z-[1200] overflow-hidden transition-all duration-300 ${
            isMobile ? 'top-2 right-2' : isFullscreen ? 'top-16' : 'top-0 right-0'
          }`}
          style={isMobile ? {
            borderTopRightRadius: '8px',
            borderBottomLeftRadius: '10px',
            background: '#315C64B2',
            border: '1px solid #EAEBF024',
            boxShadow: '0px 1px 2px 0px #1018280A',
            maxWidth: '120px'
          } : isFullscreen ? {
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
            <div className="px-3 py-2 border-b border-[#EAEBF024]/20 flex items-center justify-between gap-2" style={{ width: isMobile ? '110px' : '124px' }}>
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
            <div className="px-3 py-2" style={{ width: isMobile ? '110px' : '124px' }}>
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
          zoomLevel={zoomLevel}
        />
        <MapResizeHandler />
        <KeepPopupOpenHandler 
          markerRef={userLocationMarkerRef} 
          shouldKeepOpen={shouldKeepPopupOpen}
          userManuallyClosedRef={userManuallyClosedRef}
        />
      <MapControls mapType={mapType} onMapTypeChange={setMapType} isOpen={isMapControlsOpen} onOpenChange={setIsMapControlsOpen} isFullscreen={isFullscreen} isMobile={isMobile} />
        
        {/* User Location Marker - Show when user location is detected */}
        {isUserLocation && zoomTarget && (
          <Marker
            ref={(ref) => {
              if (ref) {
                userLocationMarkerRef.current = ref;
              }
            }}
            position={zoomTarget}
            icon={createUserLocationIcon(32)}
            zIndexOffset={1000}
          >
            <Tooltip 
              permanent={false}
              direction="top"
              offset={[0, -10]}
            >
              <div className="p-2 min-w-[150px]">
                <div className="mb-1 font-semibold text-[#3b82f6]">Your Location</div>
                <div className="text-xs text-white/90">
                  <strong>Coordinates:</strong> {zoomTarget[0].toFixed(4)}, {zoomTarget[1].toFixed(4)}
                </div>
              </div>
            </Tooltip>
            <Popup 
              closeOnClick={false} 
              autoClose={false}
              eventHandlers={{
                remove: () => {
                  // Prevent popup from being removed if it should stay open
                  if (shouldKeepPopupOpen && !userManuallyClosedRef.current && userLocationMarkerRef.current) {
                    // Reopen immediately if it was removed
                    setTimeout(() => {
                      if (userLocationMarkerRef.current && shouldKeepPopupOpen && !userManuallyClosedRef.current) {
                        try {
                          userLocationMarkerRef.current.openPopup();
                        } catch (e) {
                          // Ignore errors
                        }
                      }
                    }, 10);
                  }
                }
              }}
            >
              <div className="p-2 min-w-[200px] max-w-[300px]">
                {filters?.category && filters?.nearMe && nearMeCategoryDiseases.length > 0 ? (
                  <>
                    <div className="mb-2 font-semibold text-[#3b82f6]">📍 Outbreaks Near You</div>
                    <div className="text-xs mb-2 text-white/90">
                      <strong>Category:</strong> {filters.category}
                    </div>
                    <div className="text-xs mb-2 text-white/90">
                      <strong>Radius:</strong> {filters.nearMe.radiusKm} km
                    </div>
                    <div className="text-xs mb-2 text-white/90">
                      <strong>Diseases Found ({nearMeCategoryDiseases.length}):</strong>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {nearMeCategoryDiseases.map((item, index) => (
                        <div 
                          key={index} 
                          className="text-xs text-white/80 bg-[#2a4149]/50 px-2 py-1 rounded border border-[#67DBE2]/20 flex items-center justify-between gap-2"
                        >
                          <span className="flex-1">{item.disease}</span>
                          <span className="text-[#67DBE2] font-semibold bg-[#67DBE2]/10 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                            {item.count} {item.count === 1 ? 'outbreak' : 'outbreaks'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : filters?.category && filters?.nearMe ? (
                  <>
                    <div className="mb-2 font-semibold text-[#3b82f6]">📍 Outbreaks Near You</div>
                    <div className="text-xs mb-2 text-white/90">
                      <strong>Category:</strong> {filters.category}
                    </div>
                    <div className="text-xs text-white/70 mt-2">
                      No diseases found in this category within {filters.nearMe.radiusKm} km of your location.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-2 font-semibold text-[#3b82f6]">📍 Your Current Location</div>
                    <div className="text-xs mb-1">
                      <strong>Latitude:</strong> {zoomTarget[0].toFixed(6)}
                    </div>
                    <div className="text-xs mb-1">
                      <strong>Longitude:</strong> {zoomTarget[1].toFixed(6)}
                    </div>
                    <div className="text-xs text-white/70 mt-2">
                      This is your detected location. The map is centered on this point.
                    </div>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}
        
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
                            <div className="mb-1 font-semibold flex items-center gap-2 flex-wrap">
                              {outbreak.disease}
                              {((outbreak as any).isUserSubmitted === true || 
                                outbreak.id === 'ea2bf599-c3af-4a12-9a4c-ca28fcb2dc30' || 
                                outbreak.id === 'c55b1f8c-b92b-49e6-adfa-9af8a01a6e71') && (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded text-[10px] font-medium border border-green-500/30 whitespace-nowrap">
                                  User Submitted
                                </span>
                              )}
                            </div>
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
      
      {/* Outbreak Categories Legend - Below Map */}
      <Collapsible 
        open={isCategoryLegendOpen} 
        onOpenChange={setIsCategoryLegendOpen} 
        className={`absolute z-[1200] overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'bottom-4 left-4' : isMobile ? '' : 'bottom-4 left-4'
        }`}
        style={{
          borderTopLeftRadius: '10px',
          borderTopRightRadius: '10px',
          background: '#315C64B2',
          border: '1px solid #EAEBF024',
          boxShadow: '0px 1px 2px 0px #1018280A',
          maxWidth: '300px',
          maxHeight: '400px',
          ...(isMobile ? { left: '16px', bottom: '16px' } : isFullscreen ? { left: '16px', bottom: '16px' } : {}),
        }}
      >
        <CollapsibleTrigger asChild>
          <div className="w-full hover:bg-[#305961]/50 transition-colors cursor-pointer">
            <div className="px-3 py-2 border-b border-[#EAEBF024]/20 flex items-center justify-between gap-2">
              <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-white text-xs tracking-[-0.10px] leading-4">
                Outbreak Categories
              </h3>
              <div className="w-4 h-4 p-0 flex-shrink-0 flex items-center justify-center">
                <img
                  className="w-4 h-4 transition-transform duration-200"
                  alt="Dropdown"
                  src="/group-938.svg"
                  style={{ transform: isCategoryLegendOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 py-2 overflow-y-auto" style={{ maxHeight: '350px' }}>
            <div className="flex flex-col gap-2">
              {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
                <div key={category} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div 
                      className="w-3 h-3 rounded flex-shrink-0" 
                      style={{ backgroundColor: color }}
                    />
                    <span 
                      className="[font-family:'Roboto',Helvetica] font-medium text-[10px] text-white tracking-[-0.10px] leading-3 truncate"
                      title={category}
                    >
                      {category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
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
