import { ChevronDownIcon } from "lucide-react";
import React from "react";
import { Button } from "../../../../components/ui/button";

const navigationItems = [
  { label: "About", hasDropdown: false },
  { label: "Resources", hasDropdown: true },
  { label: "Contact", hasDropdown: false },
  { label: "Help", hasDropdown: false },
  { label: "ENG", hasDropdown: true },
];

export const HeaderSection = (): JSX.Element => {
  return (
    <div className="w-full bg-[#2a4149] border-b border-[#89898947]">
      <header className="flex items-center justify-center bg-transparent">
        <div className="flex w-[1280px] h-[56px] items-center justify-between px-4">
          <img
            className="w-[82px] h-14 object-cover"
            alt="Group"
            src="/group-1062-2-1.png"
          />

          <nav className="flex items-center gap-10">
            <div className="flex items-center gap-8">
              {navigationItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 whitespace-nowrap">
                    {item.label}
                  </span>
                  {item.hasDropdown && (
                    <ChevronDownIcon className="w-5 h-5 text-white" />
                  )}
                </div>
              ))}
            </div>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="h-auto px-[18px] py-2.5 rounded-lg [font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 hover:bg-white/10"
            >
              Log in
            </Button>

            <Button className="h-auto bg-app-primary border border-solid border-[#4eb7bd] shadow-shadow-xs px-[18px] py-2.5 rounded-lg [font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 hover:bg-app-primary/90">
              Sign up
            </Button>
          </div>
        </div>
      </header>
    </div>
  );
};
