import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import outbreakNowLogo from "@/assets/outbreaknow-logo.png";

const resourcesLinks = [
  { label: "Disclaimer" },
  { label: "Data source" },
  { label: "Contact us" },
  { label: "Privacy & Legal" },
];

const quickLinks1 = [
  { label: "Fund projects" },
  { label: "Communities" },
  { label: "Features" },
  { label: "Enterprise" },
];

const quickLinks2 = [
  { label: "Feeds" },
  { label: "Dokta+" },
  { label: "RxMarket" },
  { label: "Explore" },
];

const socialIcons = [
  { src: "/social-platforms-logo-3.svg", alt: "Social platforms" },
  { src: "/social-platforms-logo-1.svg", alt: "Social platforms" },
  { src: "/social-platforms-logo.svg", alt: "Social platforms" },
  { src: "/social-platforms-logo-2.svg", alt: "Social platforms" },
];

export const InfoPanelSection = (): JSX.Element => {
  return (
    <div className="relative w-[1258px] h-[356px] bg-[#35484f]">
      <div className="absolute h-[106px] top-[160px] left-[146px] w-[453px] bg-[#54eef799] rounded-[226.7px/53px] blur-[220.55px]" />

      <div className="absolute h-[106px] top-[232px] right-0 w-[370px] bg-[#54eef799] rounded-[185.21px/53px] blur-[220.55px]" />

      <footer className="flex flex-col w-full h-full items-center px-0 pt-[80px] pb-[80px] md:pb-[80px] bg-[#35484f] relative">
        <div className="flex flex-col w-[1258px] h-[276px] items-start gap-[48px] px-[60px] py-0">
          <div className="flex items-start justify-between w-[1138px] h-[180px]">
            <div className="flex flex-col w-[249px] gap-[10px]">
              <img
                className="h-16 w-auto object-contain"
                alt="OutbreakNow Logo"
                src={outbreakNowLogo}
              />

              <div className="w-[247px] [font-family:'Roboto',Helvetica] font-normal text-[#dbdbdbd9] text-base tracking-[-0.10px] leading-6">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed.
              </div>
            </div>

            <div className="inline-flex flex-col items-start gap-6">
              <div className="inline-flex items-center justify-center gap-1 rounded-[5px] overflow-hidden">
                <div className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[-0.10px] leading-6 whitespace-nowrap">
                  Resources
                </div>
              </div>

              <div className="inline-flex flex-col items-start gap-3">
                {resourcesLinks.map((link, index) => (
                  <button
                    key={index}
                    className="inline-flex items-center justify-center gap-1 rounded-[5px] overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div className="[font-family:'Roboto',Helvetica] font-medium text-[#dbdbdbd9] text-base tracking-[-0.10px] leading-6 whitespace-nowrap">
                      {link.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="inline-flex flex-col items-start gap-6">
              <div className="inline-flex items-center justify-center gap-1 rounded-[5px] overflow-hidden">
                <div className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[-0.10px] leading-6 whitespace-nowrap">
                  Quick links
                </div>
              </div>

              <div className="flex flex-col items-start gap-3">
                {quickLinks1.map((link, index) => (
                  <button
                    key={index}
                    className="inline-flex items-center justify-center gap-1 rounded-[5px] overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div className="[font-family:'Roboto',Helvetica] font-medium text-[#dbdbdbd9] text-base tracking-[-0.10px] leading-6 whitespace-nowrap">
                      {link.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="inline-flex flex-col items-start gap-6">
              <div className="inline-flex items-center justify-center gap-1 rounded-[5px] overflow-hidden">
                <div className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[-0.10px] leading-6 whitespace-nowrap">
                  Quick links
                </div>
              </div>

              <div className="flex flex-col items-start gap-3">
                {quickLinks2.map((link, index) => (
                  <button
                    key={index}
                    className="inline-flex items-center justify-center gap-1 rounded-[5px] overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div className="[font-family:'Roboto',Helvetica] font-medium text-[#dbdbdbd9] text-base tracking-[-0.10px] leading-6 whitespace-nowrap">
                      {link.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="inline-flex flex-col items-start gap-6">
              <div className="inline-flex items-center justify-center gap-1 rounded-[5px] overflow-hidden">
                <div className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[-0.10px] leading-6 whitespace-nowrap">
                  Get Email Notifications
                </div>
              </div>

              <div className="inline-flex flex-col gap-4 items-start">
                <div className="w-[302px] [font-family:'Roboto',Helvetica] font-normal text-[#dbdbdbd9] text-base tracking-[-0.10px] leading-6">
                  Generate outside the box thinking with the possibility to
                  target the low
                </div>

                <div className="flex flex-col w-[302px] items-start gap-2">
                  <div className="flex w-full rounded-md overflow-hidden shadow-[0px_1px_2px_#1018280a] items-start">
                    <Input
                      className="h-[46px] flex-1 bg-[#2A4149] rounded-[6px_0px_0px_6px] border border-solid border-[#dae0e624] [font-family:'Roboto',Helvetica] font-normal text-[#d1d5d9] text-[15px] tracking-[-0.10px] leading-[22px] shadow-none"
                      placeholder="Enter email...."
                    />

                    <Button className="h-[46px] bg-[#4eb7bd] rounded-[0px_6px_6px_0px] px-[18px] py-3 [font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-[15px] tracking-[0] leading-[22px] hover:bg-[#4eb7bd]/90">
                      Submit
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 pb-0 px-0 w-full border-t [border-top-style:solid] border-[#eaebf024]">
            <div className="[font-family:'Roboto',Helvetica] font-normal text-[#dbdbdbd9] text-base text-center tracking-[-0.10px] leading-6 whitespace-nowrap">
              © 2025 Live Health+. All Rights Reserved.
            </div>

            <div className="inline-flex items-start gap-6">
              {socialIcons.map((icon, index) => (
                <button
                  key={index}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <img className="w-6 h-6" alt={icon.alt} src={icon.src} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
