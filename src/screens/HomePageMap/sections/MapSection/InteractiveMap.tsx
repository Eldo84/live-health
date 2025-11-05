import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import { Icon, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSupabaseOutbreakSignals, OutbreakSignal } from "../../../../lib/useSupabaseOutbreakSignals";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../../../../components/ui/dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../../../components/ui/collapsible";

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

const FitBounds = ({ points, initialFit }: { points: Array<{ position: [number, number] }>; initialFit: boolean }) => {
  const map = useMap();
  const hasFittedRef = React.useRef(false);
  
  React.useEffect(() => {
    // Only fit bounds initially or when points change significantly
    if (!initialFit && hasFittedRef.current) {
      return;
    }
    
    if (points.length === 0) {
      // If no points, set default view
      map.setView([20, 0], 2);
      return;
    }
    
    // Create bounds from all points
    const bounds = points.map(p => p.position);
    
    if (bounds.length > 0) {
      // Fit map to bounds with padding, but respect maxZoom of 2
      try {
        map.fitBounds(bounds as [number, number][], {
          padding: [50, 50],
          maxZoom: 2,
        });
        hasFittedRef.current = true;
      } catch (e) {
        // Fallback if fitBounds fails
        map.setView([20, 0], 2);
      }
    }
  }, [map, points, initialFit]);
  
  return null;
};

type MapType = 'dark' | 'light' | 'street' | 'topographic' | 'imagery';

const MapControls = ({ mapType, onMapTypeChange, isOpen, onOpenChange }: { mapType: MapType; onMapTypeChange: (type: MapType) => void; isOpen: boolean; onOpenChange: (open: boolean) => void }) => {
  const mapTypes: { id: MapType; label: string }[] = [
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
    { id: 'street', label: 'Street' },
    { id: 'topographic', label: 'Topographic' },
    { id: 'imagery', label: 'Imagery' },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange} className="absolute bottom-4 right-4 z-[1200] rounded-lg border border-[#EAEBF024] bg-[#FFFFFF14] shadow-lg backdrop-blur-sm overflow-hidden">
      <CollapsibleTrigger className="w-full hover:bg-[#305961]/50 transition-colors">
        <div className="px-3 py-2 border-b border-[#EAEBF024]/20 flex items-center justify-between gap-2">
          <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-white text-xs tracking-[-0.10px] leading-4">
            Map Settings
          </h3>
          <button className="w-4 h-4 p-0 hover:bg-transparent flex-shrink-0">
            <img
              className="w-4 h-4 transition-transform duration-200"
              alt="Dropdown"
              src="/group-938.svg"
              style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>
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

interface InteractiveMapProps {
  selectedCategory?: string | null;
}

export const InteractiveMap = ({ selectedCategory: externalCategory }: InteractiveMapProps): JSX.Element => {
  // Use Supabase data instead of external APIs
  const { signals, loading, error } = useSupabaseOutbreakSignals(externalCategory || null);
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
  
  // Use external category if provided, otherwise use internal state
  const selectedCategory = externalCategory !== undefined ? externalCategory : null;
  
  // Track when data changes to refit bounds
  React.useEffect(() => {
    if (signals.length > 0) {
      setShouldFitBounds(true);
      // Reset after a short delay to allow initial fit
      const timer = setTimeout(() => setShouldFitBounds(false), 100);
      return () => clearTimeout(timer);
    }
  }, [signals.length]);

  // Transform signals to points format (for compatibility with existing code)
  const points = signals.map(s => ({
    id: s.id,
    disease: s.disease,
    location: s.location,
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
    "Other": "#4eb7bd"
  };

  // Normalize category name to match legend colors (case-insensitive, trim whitespace)
  const normalizeCategoryName = (category: string | null | undefined): string => {
    if (!category) return "Other";
    const normalized = category.trim();
    // Try exact match first
    if (CATEGORY_COLORS[normalized]) return normalized;
    // Try case-insensitive match
    const lower = normalized.toLowerCase();
    for (const key in CATEGORY_COLORS) {
      if (key.toLowerCase() === lower) return key;
    }
    // Return original if no match found
    return normalized;
  };

  // Get color for a category, with fallback
  const getCategoryColor = (category: string | null | undefined): string => {
    const normalized = normalizeCategoryName(category);
    const color = CATEGORY_COLORS[normalized] || CATEGORY_COLORS["Other"];
    // Debug: log if using fallback color
    if (!CATEGORY_COLORS[normalized] && category && category !== "Other") {
      console.warn(`Category "${category}" (normalized: "${normalized}") not found in legend colors, using fallback color`);
    }
    return color;
  };

  // Get severity color based on outbreak count
  // Low: < 20 (green), Medium: 20-99 (yellow), High: >= 100 (red)
  const getSeverityColor = (outbreakCount: number): string => {
    if (outbreakCount >= 100) {
      return "#ef4444"; // High severity - red
    } else if (outbreakCount >= 20) {
      return "#fbbf24"; // Medium severity - yellow
    } else {
      return "#10b981"; // Low severity - green
    }
  };
  
  const filteredPoints = selectedCategory ? points.filter(o => o.category === selectedCategory) : points;

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
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={18}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
        worldCopyJump={true}
        style={{ height: "100%", width: "100%", background: "#1a2332" }}
        zoomControl={false}
      >
        {/* Point count badge */}
        <div className="absolute top-4 left-4 z-[1200] bg-[#0f172acc] text-white text-xs px-2 py-1 rounded">
          {filteredPoints.length} points
        </div>
        
        {/* Severity Legend */}
        <Collapsible 
          open={isLegendOpen} 
          onOpenChange={setIsLegendOpen} 
          className="absolute top-0 right-0 z-[1200] overflow-hidden"
          style={{
            borderTopRightRadius: '10px',
            borderBottomLeftRadius: '10px',
            background: '#315C64B2',
            border: '1px solid #EAEBF024',
            boxShadow: '0px 1px 2px 0px #1018280A',
          }}
        >
          <CollapsibleTrigger className="w-full hover:bg-[#305961]/50 transition-colors">
            <div className="px-3 py-2 border-b border-[#EAEBF024]/20 flex items-center justify-between gap-2" style={{ width: '124px' }}>
              <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-white text-xs tracking-[-0.10px] leading-4">
                Legend
              </h3>
              <button className="w-4 h-4 p-0 hover:bg-transparent flex-shrink-0">
                <img
                  className="w-4 h-4 transition-transform duration-200"
                  alt="Dropdown"
                  src="/group-938.svg"
                  style={{ transform: isLegendOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
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
        <FitBounds points={filteredPoints} initialFit={shouldFitBounds && filteredPoints.length > 0} />
        <MapControls mapType={mapType} onMapTypeChange={setMapType} isOpen={isMapControlsOpen} onOpenChange={setIsMapControlsOpen} />
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
                        <div className="text-xs"><strong>Keywords:</strong> {outbreak.keywords}</div>
                        <div className="text-xs"><strong>Pathogen:</strong> {outbreak.pathogen}</div>
                      </div>
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
            // High zoom: Show pins grouped by city or country for better precision
            <>
              {(() => {
                // Group all outbreaks by location (city, country format) to preserve city-level detail
                const locationGroups: Map<string, typeof filteredPoints> = new Map();
                
                filteredPoints.forEach((outbreak: any) => {
                  // Use full location string (e.g., "City, Country" or just "Country")
                  const location = outbreak.location || 'Unknown';
                  if (!locationGroups.has(location)) {
                    locationGroups.set(location, []);
                  }
                  locationGroups.get(location)!.push(outbreak);
                });
                
                // Create one marker per location (city or country)
                return Array.from(locationGroups.entries()).map(([locationName, locationOutbreaks]) => {
                  // Use the first outbreak's position as the representative location
                  const representativePosition = locationOutbreaks[0].position;
                  const totalCount = locationOutbreaks.length;
                  
                  // Check if this is a city-level outbreak
                  const isCityLevel = locationOutbreaks.some((o: any) => o.city);
                  
                  // Get unique diseases and categories
                  const uniqueDiseases = [...new Set(locationOutbreaks.map((o: any) => o.disease))];
                  const uniqueCategories = [...new Set(locationOutbreaks.map((o: any) => o.category))];
                  
                  // Determine color based on outbreak count (severity-based)
                  // Low: < 20 (green), Medium: 20-99 (yellow), High: >= 100 (red)
                  const color = getSeverityColor(totalCount);
                  
                  // Determine marker size based on zoom level and city-level status
                  // City-level outbreaks get slightly larger markers for visibility
                  const markerSize = isCityLevel 
                    ? (zoom > 7 ? 20 : 18)
                    : (zoom > 7 ? 18 : 16);
                  
                  return (
                    <Marker
                      key={locationName}
                      position={representativePosition}
                      icon={createCustomIcon(color, markerSize)}
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
                      <Popup>
                        <div className="p-2 min-w-[200px] max-h-[400px] overflow-y-auto">
                          <div className="mb-2 font-semibold text-base">
                            {locationName}
                            {isCityLevel && (
                              <span className="ml-2 px-2 py-1 bg-[#67DBE2]/20 text-[#67DBE2] rounded text-xs font-medium">
                                City-Level Outbreak
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-yellow-400 mb-3">
                            <strong>⚠ {totalCount} total outbreak{totalCount !== 1 ? 's' : ''} at this location</strong>
                          </div>
                          <div className="text-xs mb-2">
                            <strong>Diseases ({uniqueDiseases.length}):</strong> {uniqueDiseases.join(', ')}
                          </div>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {locationOutbreaks.map((o: any, idx: number) => (
                              <div key={idx} className="border-b border-gray-200 pb-2 last:border-0">
                                <div className="text-xs font-semibold">{o.disease}</div>
                                <div className="text-xs"><strong>Location:</strong> {o.location}</div>
                                <div className="text-xs"><strong>Category:</strong> {o.category}</div>
                                {o.pathogen && (
                                  <div className="text-xs"><strong>Pathogen:</strong> {o.pathogen}</div>
                                )}
                                {o.date && (
                                  <div className="text-xs text-gray-500">Date: {new Date(o.date).toLocaleDateString()}</div>
                                )}
                                {o.url && (
                                  <a href={o.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline block mt-1">
                                    Read more
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                });
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
    }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Outbreak Details</DialogTitle>
          <DialogClose />
        </DialogHeader>
        
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
              <div className="p-6 space-y-4">
                {/* Locations */}
                <div className="text-base font-semibold text-white">
                  {locationText}
                </div>
                
                {/* Diseases */}
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {uniqueDiseases.map((disease, idx) => (
                    <span key={idx} className="text-xs text-white/90 lowercase px-2 py-1 bg-[#67DBE2]/20 rounded border border-[#67DBE2]/30">
                      {disease}
                    </span>
                  ))}
                </div>
                
                {/* Table Header */}
                <div className="grid grid-cols-4 gap-4 pt-4 border-t border-[#67DBE2]/20">
                  <div className="text-xs font-semibold text-[#67DBE2]">Date</div>
                  <div className="text-xs font-semibold text-[#67DBE2]">Report</div>
                  <div className="text-xs font-semibold text-[#67DBE2]">Diseases</div>
                  <div className="text-xs font-semibold text-[#67DBE2]">Syndromes</div>
                </div>
                
                {/* Table Rows */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {sortedPoints.map((point, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-4 py-2 border-b border-[#67DBE2]/10">
                      <div className="text-xs text-white/80">
                        {formatDate(point.date)}
                      </div>
                      <div className="text-xs text-white/90">
                        {point.url ? (
                          <a 
                            href={point.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#67DBE2] hover:underline line-clamp-2"
                            title={point.title || point.disease || "Outbreak Report"}
                          >
                            {point.title || point.disease || "Outbreak Report"}
                          </a>
                        ) : (
                          <span>{point.title || point.disease || "Outbreak Report"}</span>
                        )}
                      </div>
                      <div className="text-xs text-white/80 lowercase">
                        {point.disease || "N/A"}
                      </div>
                      <div className="text-xs text-white/80">
                        {point.keywords || point.category || "N/A"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};
