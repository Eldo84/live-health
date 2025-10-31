import React from "react";
import { Tabs, TabsList, TabsTrigger } from "../../../../components/ui/tabs";

const navigationTabs = [
  { id: "feed", label: "Feed" },
  { id: "community", label: "Community" },
  { id: "fund-project", label: "Fund project" },
  { id: "docta-plus", label: "Docta +" },
  { id: "rxmarkets", label: "RxMarkets" },
  { id: "explore", label: "Explore" },
];

export const NavigationTabsSection = (): JSX.Element => {
  return (
    <nav className="w-[493px] h-[44px] border-b border-[#FFFFFF33]">
      <Tabs defaultValue="feed" className="w-full h-full">
        <TabsList className="inline-flex items-start gap-[13px] bg-transparent h-auto p-0 border-0">
          {navigationTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="inline-flex h-[46px] items-center justify-center gap-2 pt-0 pb-2 px-[5px] bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=inactive]:bg-transparent font-text-m-medium font-[number:var(--text-m-medium-font-weight)] text-[length:var(--text-m-medium-font-size)] tracking-[var(--text-m-medium-letter-spacing)] leading-[var(--text-m-medium-line-height)] data-[state=active]:text-neutral-800 data-[state=inactive]:text-[#ffffff7d] whitespace-nowrap [font-style:var(--text-m-medium-font-style)] [font-family:'Roboto',Helvetica] font-medium text-[15px] tracking-[-0.10px] leading-[22px]"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </nav>
  );
};
