import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { HeaderSection } from "../screens/HomePageMap/sections/HeaderSection";
import { SidebarMenuSection } from "../screens/HomePageMap/sections/SidebarMenuSection";
import { PremiumAdsSection } from "../screens/HomePageMap/sections/PremiumAdsSection";
import { Footer } from "../components/Footer";
import { useFullscreen } from "../contexts/FullscreenContext";
import { FilterPanelProvider } from "../contexts/FilterPanelContext";
import { Home, Map as MapIcon, BarChart3, Database, Newspaper } from "lucide-react";

type MobileNavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  activePaths?: string[];
};

const MOBILE_BOTTOM_NAV_HEIGHT = 72;

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    path: "/",
    activePaths: ["/"],
  },
  {
    id: "map",
    label: "Map",
    icon: MapIcon,
    path: "/map",
    activePaths: ["/map", "/app/map"],
  },
  {
    id: "news",
    label: "News",
    icon: Newspaper,
    path: "/news",
    activePaths: ["/news", "/app/news"],
  },
  {
    id: "stats",
    label: "Trends",
    icon: BarChart3,
    path: "/dashboard",
    activePaths: ["/dashboard", "/app/dashboard"],
  },
  {
    id: "dataset",
    label: "Data",
    icon: Database,
    path: "/dashboard?tab=data",
    activePaths: ["/dashboard"],
  },
];

export const AppLayout = (): JSX.Element => {
  const { isFullscreen } = useFullscreen();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = React.useState(false);

  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isNavItemActive = (item: MobileNavItem) => {
    const targets = item.activePaths || [item.path];
    const isPathMatch = targets.some((path) => location.pathname.startsWith(path));
    
    // Special handling for dataset - check if we're on dashboard with data tab
    if (item.id === "dataset") {
      return location.pathname.startsWith("/dashboard") && 
             new URLSearchParams(location.search).get("tab") === "data";
    }
    
    return isPathMatch;
  };

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  // Check if we're on the dashboard route
  const isDashboard = location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/app/dashboard");
  // Check if we're on the news route
  const isNewsPage = location.pathname.startsWith("/news") || location.pathname.startsWith("/app/news");
  // Check if we're on the map route
  const isMapPage = location.pathname.startsWith("/map") || location.pathname.startsWith("/app/map");
  // Check if we should show sticky ads (dashboard or news on mobile)
  const shouldShowStickyAds = isDashboard || (isMobile && isNewsPage);
  
  return (
    <FilterPanelProvider>
      <div className={`bg-[#2a4149] w-full flex flex-col overflow-x-hidden ${isFullscreen ? 'h-screen overflow-hidden' : isMobile && isMapPage ? 'h-screen overflow-hidden pt-[56px]' : 'min-h-screen pt-[56px]'} lg:min-w-[1280px]`}>
        {!isFullscreen && <HeaderSection />}
      <div className={`flex ${isFullscreen ? 'flex-1 h-full overflow-hidden' : isMobile && isMapPage ? 'flex-1 h-full overflow-hidden' : 'flex-1'}`}>
        {/* Sidebar - hidden on mobile and tablets, shown only on large desktop screens */}
        <div className="hidden xl:block fixed top-[56px] left-0 h-[calc(100vh-56px)] w-[160px] shrink-0 z-40">
          <SidebarMenuSection />
        </div>
        <main className={`flex-1 relative w-full ${isFullscreen ? 'overflow-hidden h-full' : isMobile && isMapPage ? 'overflow-hidden h-full' : ''} xl:ml-[160px]`} style={{ paddingBottom: !isFullscreen && isMobile && shouldShowStickyAds ? `${MOBILE_BOTTOM_NAV_HEIGHT + 90}px` : !isFullscreen && isMobile && !isMapPage ? `${MOBILE_BOTTOM_NAV_HEIGHT}px` : isDashboard && !isMobile ? '130px' : '0' }}>
          <Outlet />
        </main>
      </div>
      {!isFullscreen && <Footer />}
      
      {/* Sticky Premium Ads Section - Dashboard and News (mobile only) */}
      {!isFullscreen && shouldShowStickyAds && (
        <>
          {/* Mobile Ads - Above Bottom Navigation */}
          {isMobile && (
            <div
              className="fixed left-0 right-0 z-[1100] border-t border-[#1f3541] bg-[#2a4149] xl:hidden"
              style={{
                bottom: `${MOBILE_BOTTOM_NAV_HEIGHT}px`,
                height: '90px',
                boxShadow: "0 -4px 12px rgba(0,0,0,0.2)",
              }}
            >
              <PremiumAdsSection floating={false} mobile={true} compact={true} />
            </div>
          )}
          {/* Desktop Ads - At Bottom */}
          {!isMobile && (
            <div
              className="fixed left-0 right-0 xl:left-[160px] z-[1100] border-t border-[#1f3541] bg-[#2a4149] hidden xl:block"
              style={{
                bottom: '0',
                height: 'auto',
                boxShadow: "0 -4px 12px rgba(0,0,0,0.2)",
              }}
            >
              <PremiumAdsSection floating={false} mobile={false} compact={true} />
            </div>
          )}
        </>
      )}

      {/* Mobile & Tablet Bottom Navigation */}
      {!isFullscreen && isMobile && (
        <div
          className="fixed left-0 right-0 z-[1200] border-t border-[#1f3541]"
          style={{
            bottom: 0,
            height: `${MOBILE_BOTTOM_NAV_HEIGHT}px`,
            background: "#0d2433",
            boxShadow: "0 -6px 18px rgba(0,0,0,0.25)",
          }}
        >
          <div className="mx-auto max-w-[960px] grid grid-cols-5 h-full">
            {MOBILE_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(item);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.path)}
                  className={`flex flex-col items-center justify-center gap-1 h-full transition-colors ${
                    active ? "text-white" : "text-[#8ba7b3]"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      active ? "text-[#67DBE2]" : "text-[#8ba7b3]"
                    }`}
                  />
                  <span className="text-[12px] font-semibold tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </FilterPanelProvider>
  );
};
