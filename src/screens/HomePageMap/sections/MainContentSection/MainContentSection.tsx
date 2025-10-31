import React from "react";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";

const mapMarkers = [
  { top: "top-[34px]", left: "left-[78px]", src: "/group-978.png" },
  { top: "top-[78px]", left: "left-[130px]", src: "/group-979.png" },
  { top: "top-4", left: "left-[127px]", src: "/group-1019.png" },
  { top: "top-[118px]", left: "left-[305px]", src: "/group-981.png" },
  { top: "top-[50px]", left: "left-[168px]", src: "/group-982.png" },
  { top: "top-[229px]", left: "left-[338px]", src: "/group-984.png" },
  { top: "top-[377px]", left: "left-[255px]", src: "/group-986.png" },
  { top: "top-[218px]", left: "left-[618px]", src: "/group-991.png" },
  { top: "top-[156px]", left: "left-[572px]", src: "/group-993.png" },
  { top: "top-[279px]", left: "left-[637px]", src: "/group-994.png" },
  { top: "top-[268px]", left: "left-[695px]", src: "/group-996.png" },
  { top: "top-12", left: "left-[220px]", src: "/group-1000.png" },
  { top: "top-[77px]", left: "left-[268px]", src: "/group-1001.png" },
  { top: "top-9", left: "left-[596px]", src: "/group-1003.png" },
  { top: "top-[285px]", left: "left-[182px]", src: "/group-1006.png" },
  { top: "top-[453px]", left: "left-[571px]", src: "/group-1007.png" },
  { top: "top-14", left: "left-[746px]", src: "/group-1008.png" },
  { top: "top-[191px]", left: "left-[837px]", src: "/group-1010.png" },
  { top: "top-[342px]", left: "left-[656px]", src: "/group-1012.png" },
  { top: "top-[13px]", left: "left-[781px]", src: "/group-1013.png" },
  { top: "top-[264px]", left: "left-[857px]", src: "/group-1016.png" },
  { top: "top-[396px]", left: "left-[614px]", src: "/group-1371.png" },
  { top: "top-24", left: "left-[784px]", src: "/group-1017.png" },
];

const legendItems = [
  { label: "High severity", color: "bg-high" },
  { label: "Medium severity", color: "bg-medium" },
  { label: "Low severity", color: "bg-low" },
];

const bottomAvatars = [
  "/frame-955.svg",
  "/frame-955.svg",
  "/frame-955.svg",
  "/frame-955.svg",
  "/frame-955.svg",
  "/frame-955.svg",
  "/frame-955.svg",
  "/frame-955.svg",
  "/frame-955.svg",
];

export const MainContentSection = (): JSX.Element => {
  return (
    <section className="relative w-full h-[603px]">
      <div className="absolute h-[44.61%] top-[15.42%] left-[calc(50.00%_-_217px)] w-[589px] bg-[#54eef7] rounded-[294.5px/134.5px] blur-[220.55px]" />

      <img
        className="absolute top-[542px] left-[-9px] w-[810px] h-[72px]"
        alt="Frame"
        src="/frame-955.svg"
      />

      <img
        className="absolute top-0 left-0 w-full h-[533px] object-cover"
        alt="Screenshot"
        src="/screenshot-2024-12-31-at-12-19-25-pm-1.png"
      />

      <div className="absolute top-[27px] left-9 w-[3px] h-[3px] bg-[#7c7c7c] rounded-[1.31px]" />


      <div className="absolute top-[494px] left-[799px] w-[98px] h-[29px]">
        <div className="absolute w-[95.92%] h-full top-0 left-0 bg-[#ffffff] rounded shadow-[0px_1px_3px_#00000033]" />

        <button className="absolute w-[40.82%] h-[44.83%] top-[27.59%] left-[46.94%] [font-family:'Roboto',Helvetica] font-normal text-[#565656] text-[11px] text-center tracking-[0] leading-[normal] whitespace-nowrap">
          Satellite
        </button>

        <img
          className="absolute w-0 h-full top-0 left-[38.78%] object-cover"
          alt="Line"
          src="/line.svg"
        />

        <button className="absolute w-[22.45%] h-[44.83%] top-[27.59%] left-[8.16%] [font-family:'Roboto',Helvetica] font-medium text-black text-[11px] text-center tracking-[0] leading-[normal] whitespace-nowrap">
          Map
        </button>
      </div>

      <Button className="absolute top-[494px] left-[900px] w-7 h-7 bg-[#ffffff] hover:bg-[#f5f5f5] rounded-sm shadow-[0px_1px_3px_#00000033] p-0">
        <img
          className="w-3 h-5 object-cover"
          alt="Pegman offscreen"
          src="/pegman-offscreen-2x.png"
        />
      </Button>

      <div className="absolute top-[436px] left-[900px] w-7 h-[53px] bg-[#ffffff] rounded-sm shadow-[0px_1px_3px_#00000033] flex flex-col items-center justify-between py-2">
        <Button
          variant="ghost"
          className="w-full h-auto p-0 hover:bg-transparent"
        >
          <img className="w-[10px] h-[10px]" alt="Union" src="/union-1.svg" />
        </Button>

        <div className="w-5 h-0 bg-[#e6e6e6] border-t border-[#e6e6e6]" />

        <Button
          variant="ghost"
          className="w-full h-auto p-0 hover:bg-transparent"
        >
          <img className="w-[10px] h-[2px]" alt="Union" src="/union.svg" />
        </Button>
      </div>

      {mapMarkers.map((marker, index) => (
        <img
          key={`marker-${index}`}
          className={`absolute ${marker.top} ${marker.left} w-[15px] h-6`}
          alt="Group"
          src={marker.src}
        />
      ))}

     

      <Card className="absolute top-[242px] left-[1026px] w-[124px] h-[142px] bg-[#315C64B2] rounded-[0px_10px_0px_10px] border border-solid border-[#EAEBF024] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.04)] overflow-hidden">
        <CardContent className="p-0 h-full">
          <div className="flex w-full h-9 items-center gap-4 px-2.5 py-4 bg-[#305961] border-b border-solid border-[#eaebf033]">
            <div className="flex flex-col items-start flex-1">
              <h3 className="[font-family:'Roboto',Helvetica] font-medium text-[#ffffff] text-sm tracking-[-0.10px] leading-6">
                Legend
              </h3>
            </div>

            <Button
              variant="ghost"
              className="w-[18px] h-[18px] p-0 hover:bg-transparent"
            >
              <img
                className="w-[18px] h-[18px]"
                alt="Group"
                src="/group-938.svg"
              />
            </Button>
          </div>

          {legendItems.map((item, index) => (
            <div
              key={`legend-${index}`}
              className="flex w-[106px] items-center justify-between px-0 py-1.5 mx-[9px] border-b border-solid border-[#eaebf02e] last:border-0 last:w-[104px] last:mx-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="[font-family:'Roboto',Helvetica] font-medium text-[#ffffff] text-xs tracking-[-0.10px] leading-[22px] whitespace-nowrap">
                  {item.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 ${item.color} rounded-[3px]`} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="absolute top-[150px] left-[897px] flex flex-col gap-2">
        <Button className="w-[30px] h-[30px] p-0 bg-white hover:bg-gray-100 rounded shadow">
          <img
            className="w-[30px] h-[30px]"
            alt="Card header"
            src="/-card-header-1.svg"
          />
        </Button>

        <Button className="w-[30px] h-[30px] p-0 bg-white hover:bg-gray-100 rounded shadow">
          <img
            className="w-[30px] h-[30px]"
            alt="Card header"
            src="/-card-header.svg"
          />
        </Button>
      </div>

      <div className="absolute top-[459px] left-[52px] w-28 h-[86px]">
        <Card className="absolute top-0 left-0 w-28 h-[78px] rounded-lg shadow-[-4px_-1px_67.3px_#00000040] border-0">
          <CardContent className="flex flex-col items-center gap-2 px-4 py-3">
            <div className="flex flex-col items-center justify-center gap-[5px] rounded-lg">
              <div className="w-fit [font-family:'Roboto',Helvetica] font-bold text-gray-700 text-xs text-center tracking-[0] leading-[18px] whitespace-nowrap">
                Covid
              </div>

              <div className="flex flex-col w-20 h-[31px] items-start gap-3">
                <div className="flex items-center justify-center self-stretch [font-family:'Roboto',Helvetica] font-normal text-gray-500 text-xs tracking-[0] leading-[5px]">
                  <span className="[font-family:'Roboto',Helvetica] font-normal text-[#667084] text-xs tracking-[0] leading-[5px]">
                    Cases: 25
                  </span>
                </div>

                <div className="flex items-center justify-center self-stretch [font-family:'Roboto',Helvetica] font-normal text-gray-500 text-xs tracking-[0] leading-[5px]">
                  <span className="[font-family:'Roboto',Helvetica] font-normal text-[#667084] text-xs tracking-[0] leading-[5px]">
                    Severity: High
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <img
          className="absolute left-[calc(50.00%_-_8px)] bottom-px w-[17px] h-[17px]"
          alt="Bottom center"
          src="/bottom-center.svg"
        />
      </div>
    </section>
  );
};
