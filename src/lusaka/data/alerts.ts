import type { LusakaAlert } from "./types";

// Triggered surveillance alerts for the demo week. The Lusaka set comes from the
// original spec (Part 3.4); the rest are representative national signals so the
// country-wide view shows live response activity across provinces.
export const LUSAKA_ALERTS: LusakaAlert[] = [
  // ── Lusaka (spec Part 3.4) ──
  { date: "2026-06-03", level: "warning", province: "Lusaka", district: "Lusaka", neighborhood: "Chawama", trigger: "15 malaria cases in 48 hours", action: "SMS sent to Chawama Clinic" },
  { date: "2026-06-04", level: "alert", province: "Lusaka", district: "Lusaka", neighborhood: "Kalingalinga", trigger: "8 diarrhea cases in children <5", action: "Health team dispatched" },
  { date: "2026-06-05", level: "warning", province: "Lusaka", district: "Lusaka", neighborhood: "Matero", trigger: "Pneumonia cluster in elderly", action: "Mobile alert to residents 65+" },
  { date: "2026-06-06", level: "alert", province: "Lusaka", district: "Lusaka", neighborhood: "Kanyama", trigger: "Typhoid spike (6 cases / 3 days)", action: "Water testing ordered" },
  { date: "2026-06-07", level: "warning", province: "Lusaka", district: "Lusaka", neighborhood: "George", trigger: "Malaria surge (12 cases / 72 hrs)", action: "Mosquito net distribution" },

  // ── National (representative) ──
  { date: "2026-06-02", level: "alert", province: "Southern", district: "Livingstone", neighborhood: "Maramba", trigger: "Cholera suspected — 9 cases / 24h", action: "Rapid response team + chlorination" },
  { date: "2026-06-03", level: "warning", province: "Copperbelt", district: "Kitwe", neighborhood: "Wusakile", trigger: "Measles cluster in under-5s", action: "Ring vaccination scheduled" },
  { date: "2026-06-04", level: "warning", province: "Luapula", district: "Nchelenge", neighborhood: "Nchelenge Central", trigger: "Malaria above seasonal threshold", action: "IRS spraying + RDT resupply" },
  { date: "2026-06-05", level: "alert", province: "Eastern", district: "Chipata", neighborhood: "Kapata", trigger: "Dysentery outbreak at market", action: "Water source testing ordered" },
  { date: "2026-06-06", level: "warning", province: "Northern", district: "Mbala", neighborhood: "Mbala Central", trigger: "Typhoid cases rising (5 / 4 days)", action: "Community health education" },
  { date: "2026-06-06", level: "warning", province: "Copperbelt", district: "Ndola", neighborhood: "Chifubu", trigger: "Pneumonia cluster, cold snap", action: "Oxygen stock check at UTH-Ndola" },
];
