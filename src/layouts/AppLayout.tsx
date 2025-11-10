import { Outlet } from "react-router-dom";
import { HeaderSection } from "../screens/HomePageMap/sections/HeaderSection";
import { SidebarMenuSection } from "../screens/HomePageMap/sections/SidebarMenuSection";
import { InfoPanelSection } from "../screens/HomePageMap/sections/InfoPanelSection";
import { useFullscreen } from "../contexts/FullscreenContext";

export const AppLayout = (): JSX.Element => {
  const { isFullscreen } = useFullscreen();
  
  return (
    <div className={`bg-[#2a4149] w-full min-w-[1280px] flex flex-col overflow-x-hidden ${isFullscreen ? 'h-screen' : 'min-h-screen'}`}>
      {!isFullscreen && <HeaderSection />}
      <div className={`flex overflow-hidden ${isFullscreen ? 'flex-1 h-full' : 'flex-1'}`}>
        <SidebarMenuSection />
        <main className="flex-1 relative overflow-hidden">
          <Outlet />
        </main>
      </div>
      {!isFullscreen && (
        <div className="w-full flex justify-center mt-auto">
          <InfoPanelSection />
        </div>
      )}
    </div>
  );
};
