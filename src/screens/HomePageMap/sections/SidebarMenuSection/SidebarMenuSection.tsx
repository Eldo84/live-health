import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../../../components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../../components/ui/collapsible";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";

const menuItems = [
  {
    id: "home",
    label: "Home",
    icon: "home", // Special identifier for Home icon
    isActive: false,
  },
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
      { label: "Disease Tracking", tab: "disease-tracking" },
      { label: "My Advertising", path: "/dashboard/advertising" },
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={`flex flex-col items-center gap-[22px] pt-4 pb-6 px-0 bg-[#2a4149] border-r [border-right-style:solid] border-[#eaebf024] transition-all duration-300 ${isCollapsed ? 'w-[70px]' : 'w-[160px]'}`}>
      {/* Toggle Button */}
      <div className="w-full flex justify-end px-2 mb-2">
        <Button
          variant="ghost"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0 hover:bg-[#ffffff1a] rounded"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-white" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-white" />
          )}
        </Button>
      </div>

      <div className="flex flex-col items-start gap-[5px] flex-1 self-stretch w-full">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className={`flex h-[46px] items-center gap-3 py-0 self-stretch w-full ${isActive("/") ? "bg-[#ffffff1a]" : ""} hover:bg-[#ffffff1a] rounded-none ${isCollapsed ? 'justify-center px-0' : 'justify-start px-7'}`}
          title={isCollapsed ? menuItems[0].label : undefined}
        >
          {menuItems[0].icon === "home" ? (
            <Home className="w-[22px] h-[22px] flex-shrink-0 text-[#ffffff99]" />
          ) : (
            <img
              className="w-[22px] h-[22px] flex-shrink-0"
              alt="Home icon"
              src={menuItems[0].icon as string}
            />
          )}
          {!isCollapsed && (
            <span className={`flex-1 [font-family:'Roboto',Helvetica] ${isActive("/") ? "font-semibold text-[#ffffff]" : "font-normal text-[#ffffff99]"} text-[15px] tracking-[-0.10px] leading-[22px]`}>
              {menuItems[0].label}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          onClick={() => navigate("/map")}
          className={`flex h-[46px] items-center gap-3 py-0 self-stretch w-full ${isActive("/map") ? "bg-[#ffffff1a]" : ""} hover:bg-[#ffffff1a] rounded-none ${isCollapsed ? 'justify-center px-0' : 'justify-start px-7'}`}
          title={isCollapsed ? menuItems[1].label : undefined}
        >
          <img
            className="w-[22px] h-[22px] flex-shrink-0"
            alt="Map icon"
            src={menuItems[1].icon}
          />
          {!isCollapsed && (
            <span className={`flex-1 [font-family:'Roboto',Helvetica] ${isActive("/map") ? "font-semibold text-[#ffffff]" : "font-normal text-[#ffffff99]"} text-[15px] tracking-[-0.10px] leading-[22px]`}>
              {menuItems[1].label}
            </span>
          )}
        </Button>

        <Collapsible
          open={isDashboardOpen && !isCollapsed}
          onOpenChange={(open) => {
            if (!isCollapsed) {
              setIsDashboardOpen(open);
            }
          }}
          className="w-full"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={`flex h-[46px] items-center gap-3 py-0 self-stretch w-full hover:bg-[#ffffff1a] rounded-none ${isCollapsed ? 'justify-center px-0' : 'justify-start px-7'}`}
              title={isCollapsed ? menuItems[2].label : undefined}
              onClick={() => {
                if (isCollapsed) {
                  navigate("/dashboard?tab=overview");
                }
              }}
            >
              <img
                className="w-[22px] h-[22px] flex-shrink-0"
                alt="Dashboard icon"
                src={menuItems[2].icon}
              />
              {!isCollapsed && (
                <>
                  <span className="flex-1 [font-family:'Roboto',Helvetica] font-normal text-[#ffffff99] text-[15px] tracking-[-0.10px] leading-[22px]">
                    {menuItems[2].label}
                  </span>
                  <img
                    className="w-5 h-5 flex-shrink-0"
                    alt="Dropdown icon"
                    src={menuItems[2].dropdownIcon}
                  />
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className={`flex flex-col items-start gap-2 pr-0 py-0 ${isCollapsed ? 'w-[70px] pl-0' : 'w-[160px] pl-6'}`}>
              {menuItems[2].subItems?.map((subItem, index) => {
                const isDashboardActive = isActive("/dashboard");
                const currentTab = new URLSearchParams(location.search).get("tab");
                // Check if this is a path-based item or tab-based
                const isPathBased = 'path' in subItem && subItem.path;
                const isActiveItem = isPathBased 
                  ? location.pathname === subItem.path
                  : isDashboardActive && (
                      index === 0 
                        ? (!currentTab || currentTab === "overview")
                        : currentTab === subItem.tab
                    );
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (isPathBased) {
                        navigate(subItem.path);
                      } else {
                        navigate(`/dashboard?tab=${subItem.tab}`);
                      }
                    }}
                    className={`flex items-start gap-3.5 w-full text-left hover:opacity-80 transition-opacity ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? subItem.label : undefined}
                  >
                    {!isCollapsed && (
                      <div className="flex items-center justify-center w-[5px] h-[22px]">
                        <div className="w-[5px] h-1.5 bg-[#ffffff80] rounded-[5px]" />
                      </div>
                    )}
                    {!isCollapsed && (
                      <span className={`flex-1 [font-family:'Inter',Helvetica] font-semibold text-xs tracking-[-0.10px] leading-[22px] ${isActiveItem ? "text-[#66dbe1]" : "text-[#ffffff80]"}`}>
                        {subItem.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Button
          variant="ghost"
          className={`flex h-[46px] items-center gap-3 py-0 self-stretch w-full hover:bg-[#ffffff1a] rounded-none ${isCollapsed ? 'justify-center px-0' : 'justify-start px-7'}`}
          title={isCollapsed ? menuItems[3].label : undefined}
          onClick={() => navigate("/dashboard?tab=data")}
        >
          <img
            className="w-[22px] h-[22px] flex-shrink-0"
            alt="Dataset icon"
            src={menuItems[3].icon}
          />
          {!isCollapsed && (
            <span className="flex-1 [font-family:'Roboto',Helvetica] font-normal text-[#ffffff99] text-[15px] tracking-[-0.10px] leading-[22px]">
              {menuItems[3].label}
            </span>
          )}
        </Button>
      </div>
    </nav>
  );
};
