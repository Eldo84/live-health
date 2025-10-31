import { Outlet } from "react-router-dom";
import { HeaderSection } from "../screens/HomePageMap/sections/HeaderSection";
import { SidebarMenuSection } from "../screens/HomePageMap/sections/SidebarMenuSection";
import { InfoPanelSection } from "../screens/HomePageMap/sections/InfoPanelSection";

export const AppLayout = (): JSX.Element => {
  return (
    <div className="bg-[#2a4149] w-full min-w-[1440px] min-h-screen flex flex-col">
      <HeaderSection />
      <div className="flex flex-1">
        <SidebarMenuSection />
        <main className="flex-1 relative">
          <Outlet />
        </main>
      </div>
      <div className="w-full flex justify-center mt-auto">
        <InfoPanelSection />
      </div>
    </div>
  );
};
