import "leaflet/dist/leaflet.css";
import React from "react";
import { NavigationTabsSection } from "./sections/NavigationTabsSection";
import { InteractiveMap } from "./sections/MapSection/InteractiveMap";
import { NewsSection } from "./sections/NewsSection";
import { SponsoredSection } from "./sections/SponsoredSection";
import { useSupabaseOutbreakSignals } from "../../lib/useSupabaseOutbreakSignals";
import { Maximize2, Minimize2 } from "lucide-react";
import { useFullscreen } from "../../contexts/FullscreenContext";

// Removed demo outbreaks; using data-driven InteractiveMap

export const HomePageMap = (): JSX.Element => {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(null);
  const { isFullscreen: isMapFullscreen, setIsFullscreen: setIsMapFullscreen } = useFullscreen();
  
  // Fetch signals to calculate category stats
  const { signals } = useSupabaseOutbreakSignals(null);

  const diseaseCategories = [
    { name: "Foodborne Outbreaks", color: "#f87171", icon: "🍽️" },
    { name: "Waterborne Outbreaks", color: "#66dbe1", icon: "💧" },
    { name: "Vector-Borne Outbreaks", color: "#fbbf24", icon: "🦟" },
    { name: "Airborne Outbreaks", color: "#a78bfa", icon: "💨" },
    { name: "Contact Transmission", color: "#fb923c", icon: "🤝" },
    { name: "Healthcare-Associated Infections", color: "#ef4444", icon: "🏥" },
    { name: "Zoonotic Outbreaks", color: "#10b981", icon: "🐾" },
    { name: "Sexually Transmitted Infections", color: "#ec4899", icon: "❤️" },
    { name: "Vaccine-Preventable Diseases", color: "#3b82f6", icon: "🛡️" },
    { name: "Emerging Infectious Diseases", color: "#f59e0b", icon: "⚠️" },
  ];

  // Calculate category statistics
  const categoryStats = React.useMemo(() => {
    const stats: Record<string, { cases: number; severity: string }> = {};
    
    diseaseCategories.forEach(category => {
      const categorySignals = signals.filter(s => s.category === category.name);
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
  const handleMouseEnter = (categoryName: string) => {
    setHoveredCategory(categoryName);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredCategory(null);
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsMapFullscreen(!isMapFullscreen);
  };

  return (
    <div className={`bg-[#2a4149] relative ${isMapFullscreen ? 'absolute inset-0 w-full h-full overflow-hidden' : 'min-h-screen overflow-x-hidden'}`}>
      <div className="relative w-full h-full">
        {/* Header Title - Top Left */}
        <div className={`absolute top-[32px] left-[120px] z-[1000] transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <h1 className="[font-family:'Roboto',Helvetica] font-bold text-[#67DBE2] text-[38px] tracking-[-0.5px] leading-[48px]">
            Global Outbreak & Disease
            <br />
            Monitoring System
          </h1>
        </div>

        {/* Search and Navigation - Top Right */}
        <div className={`absolute top-[32px] right-[20px] z-[1000] flex flex-col gap-3 transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <input
            type="text"
            placeholder="Search here..."
            className="w-[360px] h-[42px] rounded-[8px] border border-[#DAE0E633] bg-[#FFFFFF24] py-[12px] px-4 text-sm text-white placeholder-[#ffffff80] shadow-[0px_2px_4px_0px_rgba(16,24,40,0.08)] focus:outline-none focus:ring-2 focus:ring-[#67DBE2]/50 focus:border-[#67DBE2]/50 transition-all"
          />
          <NavigationTabsSection />
        </div>

        {/* Map - Main Content Area */}
        <div 
          className={`absolute rounded-[12px] z-[1000] overflow-hidden shadow-2xl border border-[#67DBE2]/20 transition-all duration-500 ease-in-out ${
            isMapFullscreen 
              ? 'top-0 left-0 right-0 bottom-0 w-full h-full rounded-none' 
              : 'top-[160px] left-[120px] w-[calc(100vw-680px)] h-[calc(100vh-320px)] min-w-[900px] min-h-[650px]'
          }`}
        >
          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className={`absolute top-4 right-4 z-[1300] bg-[#2a4149] hover:bg-[#305961] text-[#67DBE2] p-2 rounded-lg shadow-lg border border-[#67DBE2]/30 transition-all duration-200 hover:scale-110 hover:border-[#67DBE2]/60 flex items-center justify-center group`}
            title={isMapFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            aria-label={isMapFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isMapFullscreen ? (
              <Minimize2 className="w-5 h-5 group-hover:text-white transition-colors" />
            ) : (
              <Maximize2 className="w-5 h-5 group-hover:text-white transition-colors" />
            )}
          </button>
          <InteractiveMap selectedCategory={selectedCategory} isFullscreen={isMapFullscreen} />
        </div>

        {/* News Section - Right Sidebar */}
        <div className={`absolute top-[160px] right-[20px] z-[1000] transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <NewsSection />
        </div>

        {/* Sponsored Section - Right Sidebar, Below News */}
        <div className={`absolute top-[560px] right-[20px] z-[1000] transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <SponsoredSection />
        </div>

        {/* Disease Category Icons - Bottom Left, Under Map */}
        <div 
          className={`absolute z-[1000] transition-opacity duration-300 ${isMapFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          style={{ top: '820px', left: '120px', width: '790px', height: '52px' }}
        >
          <div className="flex items-center h-full gap-[30px]">
            {diseaseCategories.map((category) => {
              const stats = categoryStats[category.name] || { cases: 0, severity: 'Low' };
              return (
                <div key={category.name} className="relative flex flex-col items-center">
                  <button
                    onClick={() => setSelectedCategory(
                      selectedCategory === category.name ? null : category.name
                    )}
                    onMouseEnter={() => handleMouseEnter(category.name)}
                    onMouseLeave={handleMouseLeave}
                    className={`w-12 h-12 flex items-center justify-center rounded-full text-2xl cursor-pointer transition-all duration-200 ${
                      selectedCategory === category.name
                        ? 'scale-110 ring-2 ring-offset-2 ring-offset-[#2a4149]'
                        : 'hover:scale-110'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === category.name 
                        ? `${category.color}CC` 
                        : `${category.color}80`,
                      borderColor: selectedCategory === category.name ? category.color : 'transparent',
                      boxShadow: selectedCategory === category.name 
                        ? `0 0 16px ${category.color}60, 0 4px 8px rgba(0,0,0,0.3)` 
                        : `0 2px 4px rgba(0,0,0,0.2)`,
                    }}
                  >
                    {category.icon}
                  </button>
                  
                  {/* Tooltip */}
                  {hoveredCategory === category.name && (
                    <div
                      className="absolute z-[2000] pointer-events-none"
                      style={{
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '10px',
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
