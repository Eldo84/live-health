import { useLanguage } from "@/contexts/LanguageContext";

export type Partner = {
  name: string;
  url: string;
  logoSrc: string;
  alt: string;
};

const partners: Partner[] = [
  {
    name: "GHQA (Global Health and Quality Alliance)",
    url: "https://www.theghqa.org",
    logoSrc: "/ghqboards.png",
    alt: "GHQA Boards logo – Global Health and Quality Alliance",
  },
  {
    name: "American Board of Comprehensive Clinical Medicine",
    url: "https://abccmedicine.org",
    logoSrc: "/abccmedicine.svg",
    alt: "American Board of Comprehensive Clinical Medicine logo",
  },
  {
    name: "GHDAF (Global Health and Development Aid Foundation)",
    url: "https://www.ghdafoundation.org",
    logoSrc: "/ghdaf.png",
    alt: "GHDAF logo – Global Health and Development Aid Foundation",
  },
  {
    name: "EldoNova+ (Innovations in Health Technology)",
    url: "https://www.eldonovaplus.com",
    logoSrc: "/eldonova.png",
    alt: "EldoNova+ logo – Innovations in Health Technology",
  },
  {
    name: "EldoHealth+ (Bringing a Plus)",
    url: "https://www.theabdm.org",
    logoSrc: "/eldoHealth.png",
    alt: "EldoHealth+ / American Board of Digital Medicine seal",
  },
];

const PartnerRow = () => {
  const { t } = useLanguage();

  return (
    <div className="section py-8">
      <div className="container-prose">
        <h2 className="text-center text-xl font-bold mb-6">
          {t("landing.partners.title")}
        </h2>
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8 px-1 sm:px-2 md:px-0">
          {partners.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-2"
              aria-label={`Visit ${p.name} (opens in new tab)`}
            >
              <div className="w-[140px] h-14 sm:w-[150px] sm:h-16 md:w-[160px] md:h-16 flex items-center justify-center bg-background/50 rounded-lg border border-border px-4 py-3 group-hover:border-primary/50 group-hover:shadow-lg transition-all">
                <img
                  src={p.logoSrc}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <span className="text-[11px] font-medium text-center text-foreground/80 group-hover:text-primary transition-colors leading-tight">
                {p.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PartnerRow;


