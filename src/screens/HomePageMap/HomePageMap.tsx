import "leaflet/dist/leaflet.css";
import React from "react";
import { MainContentSection } from "./sections/MainContentSection";
import { MapSection } from "./sections/MapSection";
import { NavigationTabsSection } from "./sections/NavigationTabsSection";
import { InteractiveMap } from "./sections/MapSection/InteractiveMap";

// Removed demo outbreaks; using data-driven InteractiveMap

export const HomePageMap = (): JSX.Element => {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

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

  return (
    <div className="flex min-h-screen bg-[#2a4149] relative">
      <div className="flex-1 relative w-full">
        <div className="absolute top-[242px] left-[212px] w-[938px] h-[533px] rounded-[10px] z-[1000] overflow-hidden">
          <InteractiveMap selectedCategory={selectedCategory} />
        </div>

        <div className="absolute top-[115px] left-[212px] z-[1000]">
          <h1 className="w-[455px] h-[97px] [font-family:'Roboto',Helvetica] font-bold text-[#67DBE2] text-[38px] tracking-[0] leading-[48.06px]">
            Global Outbreak & Disease
            <br />
            Monitoring System
          </h1>
        </div>

        <div className="absolute top-[115px] left-[1000px] z-[1000]">
          <input
            type="text"
            placeholder="Search here..."
            className="w-[360px] h-[40px] rounded-[6px] border border-[#DAE0E633] bg-[#FFFFFF24] py-[10px] px-3 text-base text-white placeholder-[#ffffff80] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.04)] focus:outline-none focus:ring-2 focus:ring-[#4eb7bd] transition-all duration-0"
          />
        </div>

        <div className="absolute top-[171px] left-[867px] z-[1000]">
          <NavigationTabsSection />
        </div>
{/* 
        <div className="absolute bottom-6 left-6 z-[1000]">
          <MainContentSection />
        </div> */}

        <div className="absolute top-[242px] left-[1170px] z-[1000]">
          <MapSection />
        </div>

        <div className="absolute top-[502px] left-[1170px] z-[1000] w-[190px] h-[328px] border border-[#EAEBF024] rounded-lg bg-transparent">
          {/* Group 1424 content will go here */}
        </div>

        {/* Disease category icons below the map */}
        <div className="absolute top-[793px] left-[212px] z-[1000] w-[790px] h-[52px]">
          <div className="flex gap-[30px] items-center">
            {diseaseCategories.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(
                  selectedCategory === category.name ? null : category.name
                )}
                className={`w-[52px] h-[52px] rounded-lg flex items-center justify-center text-2xl transition-all ${
                  selectedCategory === category.name
                    ? 'bg-[#ffffff14] border-2'
                    : 'bg-transparent border-0 hover:bg-[#ffffff0a]'
                }`}
                style={{
                  borderColor: selectedCategory === category.name ? category.color : 'transparent',
                  boxShadow: selectedCategory === category.name 
                    ? `0 0 10px ${category.color}33` 
                    : 'none',
                  opacity: 1
                }}
                title={category.name}
              >
                {category.icon}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
