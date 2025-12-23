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
    logoSrc: "/ghqa.png",
    alt: "GHQA logo – Global Health and Quality Alliance",
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
    logoSrc: "/eldohealth.png",
    alt: "EldoHealth+ logo – Bringing a Plus",
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {partners.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-2"
              aria-label={`Visit ${p.name} (opens in new tab)`}
            >
              <div className="w-full aspect-square flex items-center justify-center bg-background/50 rounded-lg border border-border p-3 group-hover:border-primary/50 group-hover:shadow-lg transition-all">
                <img
                  src={p.logoSrc}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xs font-medium text-center text-foreground/80 group-hover:text-primary transition-colors leading-tight">
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

