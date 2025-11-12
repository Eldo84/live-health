import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../../../components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../../components/ui/collapsible";

const menuItems = [
  {
    id: "map",
    label: "Map",
    icon: "/group-1377.png",
    isActive: true,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "/group-1378.png",
    dropdownIcon: "/group-1589.png",
    isActive: false,
    subItems: [
      { label: "Disease Outbreak", tab: "overview" },
      { label: "AI Powered Prediction", tab: "predictions" },
      { label: "Global Population Health Index", tab: "health-index" },
    ],
  },
  {
    id: "dataset",
    label: "Dataset",
    icon: "/group-969.png",
    isActive: false,
  },
];

export const SidebarMenuSection = (): JSX.Element => {
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="flex flex-col w-[160px] items-center gap-[22px] pt-4 pb-6 px-0 bg-[#2a4149] border-r [border-right-style:solid] border-[#eaebf024]">
      <div className="flex flex-col items-start gap-[5px] flex-1 self-stretch w-full">
        <Button
          variant="ghost"
          onClick={() => navigate("/map")}
          className={`flex h-[46px] items-center gap-3 px-7 py-0 self-stretch w-full ${isActive("/map") ? "bg-[#ffffff1a]" : ""} hover:bg-[#ffffff1a] rounded-none justify-start`}
        >
          <img
            className="w-[22px] h-[22px]"
            alt="Map icon"
            src={menuItems[0].icon}
          />
          <span className={`flex-1 [font-family:'Roboto',Helvetica] ${isActive("/map") ? "font-semibold text-[#ffffff]" : "font-normal text-[#ffffff99]"} text-[15px] tracking-[-0.10px] leading-[22px]`}>
            {menuItems[0].label}
          </span>
        </Button>

        <Collapsible
          open={isDashboardOpen}
          onOpenChange={setIsDashboardOpen}
          className="w-full"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-[46px] items-center gap-3 px-7 py-0 self-stretch w-full hover:bg-[#ffffff1a] rounded-none justify-start"
            >
              <img
                className="w-[22px] h-[22px]"
                alt="Dashboard icon"
                src={menuItems[1].icon}
              />
              <span className="flex-1 [font-family:'Roboto',Helvetica] font-normal text-[#ffffff99] text-[15px] tracking-[-0.10px] leading-[22px]">
                {menuItems[1].label}
              </span>
              <img
                className="w-5 h-5"
                alt="Dropdown icon"
                src={menuItems[1].dropdownIcon}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col w-[160px] items-start gap-2 pl-6 pr-0 py-0">
              {menuItems[1].subItems?.map((subItem, index) => {
                const isDashboardActive = isActive("/dashboard");
                const currentTab = new URLSearchParams(location.search).get("tab");
                // First item (Disease Outbreak/overview) is active if no tab param or tab=overview
                const isActiveItem = isDashboardActive && (
                  index === 0 
                    ? (!currentTab || currentTab === "overview")
                    : currentTab === subItem.tab
                );
                
                return (
                  <button
                    key={index}
                    onClick={() => navigate(`/dashboard?tab=${subItem.tab}`)}
                    className="flex items-start gap-3.5 w-full text-left hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center justify-center w-[5px] h-[22px]">
                      <div className="w-[5px] h-1.5 bg-[#ffffff80] rounded-[5px]" />
                    </div>
                    <span className={`flex-1 [font-family:'Inter',Helvetica] font-semibold text-xs tracking-[-0.10px] leading-[22px] ${isActiveItem ? "text-[#66dbe1]" : "text-[#ffffff80]"}`}>
                      {subItem.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Button
          variant="ghost"
          className="flex h-[46px] items-center gap-3 px-7 py-0 self-stretch w-full hover:bg-[#ffffff1a] rounded-none justify-start"
        >
          <img
            className="w-[22px] h-[22px]"
            alt="Dataset icon"
            src={menuItems[2].icon}
          />
          <span className="flex-1 [font-family:'Roboto',Helvetica] font-normal text-[#ffffff99] text-[15px] tracking-[-0.10px] leading-[22px]">
            {menuItems[2].label}
          </span>
        </Button>
      </div>
    </nav>
  );
};
