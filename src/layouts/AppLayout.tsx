import { Outlet } from "react-router-dom";
import { HeaderSection } from "../screens/HomePageMap/sections/HeaderSection";
import { SidebarMenuSection } from "../screens/HomePageMap/sections/SidebarMenuSection";
import { Footer } from "../components/Footer";
import { useFullscreen } from "../contexts/FullscreenContext";

export const AppLayout = (): JSX.Element => {
  const { isFullscreen } = useFullscreen();
  
  return (
    <div className={`bg-[#2a4149] w-full flex flex-col overflow-x-hidden ${isFullscreen ? 'h-screen overflow-hidden' : 'min-h-screen'} lg:min-w-[1280px]`}>
      {!isFullscreen && <HeaderSection />}
      <div className={`flex ${isFullscreen ? 'flex-1 h-full overflow-hidden' : 'flex-1'}`}>
        {/* Sidebar - hidden on mobile and tablets, shown only on large desktop screens */}
        <div className="hidden xl:block">
          <SidebarMenuSection />
        </div>
        <main className={`flex-1 relative w-full ${isFullscreen ? 'overflow-hidden h-full' : ''}`}>
          <Outlet />
        </main>
      </div>
      {!isFullscreen && <Footer />}
    </div>
  );
};
