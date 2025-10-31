import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";

export const GlobalHealthMap = (): JSX.Element => {
  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader className="pb-4">
        <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
          Global Health Heatmap
        </h3>
        <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
          Risk levels by region
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[300px] bg-[#1f2937] rounded-lg overflow-hidden">
          <img
            src="/screenshot-2024-12-31-at-12-19-25-pm-1.png"
            alt="Global health map"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center justify-between bg-[#00000099] backdrop-blur-sm rounded-lg p-3">
              <span className="[font-family:'Roboto',Helvetica] font-medium text-[#ffffff] text-xs">
                Risk Level:
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#4ade80]" />
                  <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs">Low</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#fbbf24]" />
                  <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs">Medium</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#fb923c]" />
                  <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs">High</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#f87171]" />
                  <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs">Critical</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
