import React from "react";
import { Badge } from "../../../../components/ui/badge";

const sponsoredCards = [
  { image: "/image.png", location: "Global", time: "Now", playIcon: "/group-1420.png" },
  { image: "/image-1.png", location: "Global", time: "Now", playIcon: "/group-1420-1.png" },
  { image: "/image-2.png", location: "Global", time: "Now", playIcon: "/group-1420-2.png" },
];

export const SponsoredSection = (): JSX.Element => {
  return (
    <div className="w-full lg:w-[240px] rounded-lg border border-[#EAEBF024] bg-[#FFFFFF14] shadow-lg flex flex-col overflow-hidden lg:h-[380px] h-[500px] max-h-[60vh] lg:max-h-[380px]" style={{ boxSizing: 'border-box' }}>
      <div className="px-4 pt-4 pb-3 border-b border-[#EAEBF024]/50">
        <Badge
          variant="secondary"
          className="bg-transparent border-none [font-family:'Inter',Helvetica] font-medium text-[#a7a7a7] text-sm"
        >
          Sponsored
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-4 py-3">
        <div className="space-y-2.5">
          {sponsoredCards.map((card, index) => (
            <div key={index} className="relative w-full h-20 rounded-md overflow-hidden cursor-pointer group hover:opacity-90 hover:scale-[1.02] transition-all duration-200 shadow-sm">
              <img className="absolute inset-0 w-full h-full object-cover" alt="Sponsored Preview" src={card.image} />
              <div className="absolute inset-0 bg-[linear-gradient(181deg,rgba(42,65,73,0)_0%,rgba(42,65,73,1)_100%)]" />
              <div className="absolute bottom-2 left-2 [font-family:'Roboto',Helvetica] font-medium text-white text-xs">
                {card.location}
              </div>
              <div className="absolute bottom-2 right-2 [font-family:'Roboto',Helvetica] font-medium text-white text-[10px]">
                {card.time}
              </div>
              <img className="absolute top-1/2 left-1/2 w-6 h-6 -translate-x-1/2 -translate-y-1/2 opacity-80 group-hover:opacity-100 transition-opacity" alt="Play" src={card.playIcon} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

