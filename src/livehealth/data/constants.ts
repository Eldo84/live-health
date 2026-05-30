export interface Partner {
  name: string;
  full: string;
  url: string;
  logo: string;
}

export const PARTNERS: Partner[] = [
  { name: "GHQA", full: "Global Health and Quality Alliance", url: "https://www.theghqa.org", logo: "/livehealth/ghqa.png" },
  { name: "ABCCM", full: "American Board of Comprehensive Clinical Medicine", url: "https://abccmedicine.org", logo: "/livehealth/abccmedicine.svg" },
  { name: "GHDAF", full: "Global Health and Development Aid Foundation", url: "https://www.ghdafoundation.org", logo: "/livehealth/ghdaf.png" },
  { name: "EldoNova+", full: "Innovations in Health Technology", url: "https://www.eldonovaplus.com", logo: "/livehealth/eldonova.png" },
  { name: "ABDM", full: "American Board of Digital Medicine", url: "https://www.theabdm.org", logo: "/livehealth/eldoHealth.png" },
];

export interface OutbreakCategory {
  id: string;
  label: string;
  color: string;
  family: string[];
}

// Categories rolled up from disease family — used by the map's category filter.
export const OUTBREAK_CATEGORIES: OutbreakCategory[] = [
  { id: "respiratory", label: "Respiratory Outbreaks", color: "#6ab7ff", family: ["Respiratory", "Airborne Outbreaks"] },
  { id: "waterborne", label: "Waterborne Outbreaks", color: "#4ee0c4", family: ["Waterborne", "Waterborne Outbreaks"] },
  { id: "vector", label: "Vector-borne Outbreaks", color: "#ff8b6b", family: ["Vector-borne", "Vector-Borne Outbreaks"] },
  { id: "vaccine", label: "Vaccine-preventable", color: "#ffb547", family: ["Vaccine-preventable"] },
  { id: "hemorrhagic", label: "Hemorrhagic Fevers", color: "#ff4a5c", family: ["Hemorrhagic"] },
  { id: "zoonotic", label: "Zoonotic / Animal-origin", color: "#d4a55b", family: ["Zoonotic"] },
  { id: "foodborne", label: "Foodborne Outbreaks", color: "#9bd95b", family: ["Foodborne"] },
  { id: "emerging", label: "Emerging Infectious", color: "#b07cff", family: ["Emerging Infectious Diseases"] },
];
