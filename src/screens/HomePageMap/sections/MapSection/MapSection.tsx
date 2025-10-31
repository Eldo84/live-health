import React, { useEffect, useState } from "react";
import { Badge } from "../../../../components/ui/badge";
import { Card, CardContent } from "../../../../components/ui/card";
import { fetchSheetRows, type SheetRow } from "../../../../lib/sheet";

const sponsoredCards = [
  { image: "/image.png", location: "Global", time: "Now", playIcon: "/group-1420.png" },
  { image: "/image-1.png", location: "Global", time: "Now", playIcon: "/group-1420-1.png" },
  { image: "/image-2.png", location: "Global", time: "Now", playIcon: "/group-1420-2.png" },
];

export const MapSection = (): JSX.Element => {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchSheetRows();
        if (!active) return;
        // Derive simple news items: title = Disease + Pathogen, source = Category
        setRows(data.slice(0, 12));
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? "Failed to load news");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <aside className="w-[190px] h-[248px] rounded-[6px] border border-[#EAEBF024] bg-[#FFFFFF14] p-3 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="[font-family:'Roboto',Helvetica] font-bold text-white text-sm pb-2">
          Outbreak News
        </div>
        {loading && (
          <div className="text-[10px] text-[#a7a7a7]">Loading…</div>
        )}
        {error && (
          <div className="text-[10px] text-red-400">{error}</div>
        )}
        {!loading && !error && (
          <div className="space-y-2">
            {rows.map((r, index) => {
              const title = r.Disease || r.Keywords || "Unknown report";
              const source = r["Outbreak Category"] || "General";
              const sourceColor = "bg-[#4eb7bd]";
              const image = "/image.png";
              return (
                <div
                  key={`${title}-${index}`}
                  className="flex items-center gap-2 w-full rounded bg-[#23313c] p-2 hover:bg-[#28424f] cursor-pointer transition"
                >
                  <img className="w-10 h-10 flex-shrink-0 object-cover rounded" src={image} alt={title} />
                  <div className="flex flex-col flex-1 gap-1 min-w-0">
                    <div className="truncate [font-family:'Roboto',Helvetica] font-medium text-white text-[10px] leading-tight">
                      {title}
                    </div>
                    <Badge className={`w-fit px-1.5 py-0 rounded-full text-[8px] font-semibold ${sourceColor} text-white`}>
                      {source}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-[#EAEBF024]">
        <Badge
          variant="secondary"
          className="bg-transparent border-none [font-family:'Inter',Helvetica] font-medium text-[#a7a7a7] text-[10px] mb-1"
        >
          Sponsored
        </Badge>
        <div className="space-y-2">
          {sponsoredCards.map((card, index) => (
            <div key={index} className="relative w-full h-16 rounded overflow-hidden cursor-pointer group">
              <img className="absolute inset-0 w-full h-full object-cover" alt="Sponsored Preview" src={card.image} />
              <div className="absolute inset-0 bg-[linear-gradient(181deg,rgba(42,65,73,0)_0%,rgba(42,65,73,1)_100%)]" />
              <div className="absolute bottom-1 left-1 [font-family:'Roboto',Helvetica] font-medium text-white text-[9px]">
                {card.location}
              </div>
              <div className="absolute bottom-1 right-1 [font-family:'Roboto',Helvetica] font-medium text-white text-[7px]">
                {card.time}
              </div>
              <img className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2" alt="Play" src={card.playIcon} />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
