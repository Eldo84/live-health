// Curated, interpretable outbreak-category palette — ported from the legacy
// InteractiveMap. Unlike the raw `outbreak_categories.color` values in the DB
// (which are arbitrary and produce uninterpretable colors), these are hand-
// picked, distinguishable colors with a matching on-map legend. Used to paint
// the category breakdown in map cluster donuts.

export const CATEGORY_COLORS: Record<string, string> = {
  "Foodborne Outbreaks": "#f87171",
  "Waterborne Outbreaks": "#66dbe1",
  "Vector-Borne Outbreaks": "#fbbf24",
  "Airborne Outbreaks": "#a78bfa",
  "Contact Transmission": "#fb923c",
  "Healthcare-Associated Infections": "#ef4444",
  "Zoonotic Outbreaks": "#10b981",
  "Sexually Transmitted Infections": "#ec4899",
  "Sexually Transmitted Outbreaks": "#ec4899",
  "Vaccine-Preventable Diseases": "#3b82f6",
  "Emerging Infectious Diseases": "#f59e0b",
  "Emerging & Re-Emerging Disease Outbreaks": "#f59e0b",
  "Veterinary Outbreaks": "#8b5cf6",
  "Neurological Outbreaks": "#dc2626",
  "Respiratory Outbreaks": "#9333ea",
  "Bloodborne Outbreaks": "#dc2626",
  "Gastrointestinal Outbreaks": "#f97316",
  Other: "#4eb7bd",
};

export const OTHER_CATEGORY_COLOR = CATEGORY_COLORS["Other"];

const CATEGORY_MAPPINGS: Record<string, string> = {
  "veterinary outbreak": "Veterinary Outbreaks",
  "veterinary outbreaks": "Veterinary Outbreaks",
  "emerging & re-emerging disease outbreaks": "Emerging Infectious Diseases",
  "emerging and re-emerging disease outbreaks": "Emerging Infectious Diseases",
  "sexually transmitted outbreaks": "Sexually Transmitted Infections",
};

// Normalize a category name to a canonical key in CATEGORY_COLORS. Handles
// composite (comma-separated) names, case variations, and known aliases.
export function normalizeCategoryName(category: string | null | undefined): string {
  if (!category) return "Other";

  let normalized = category.trim();
  const original = normalized;

  // Composite categories ("Foodborne Outbreaks, Waterborne Outbreaks") → first.
  if (normalized.includes(",")) normalized = normalized.split(",")[0].trim();

  if (CATEGORY_COLORS[normalized]) return normalized;

  const lower = normalized.toLowerCase();
  for (const key in CATEGORY_COLORS) {
    if (key.toLowerCase() === lower) return key;
  }
  if (CATEGORY_MAPPINGS[lower]) return CATEGORY_MAPPINGS[lower];

  if (lower.includes("emerging") && (lower.includes("re-emerging") || lower.includes("reemerging"))) {
    return "Emerging Infectious Diseases";
  }
  if (lower.includes("sexually transmitted")) return "Sexually Transmitted Infections";

  // Partial match against any known category name.
  for (const key in CATEGORY_COLORS) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return key;
  }
  const originalLower = original.toLowerCase();
  for (const key in CATEGORY_COLORS) {
    if (originalLower.includes(key.toLowerCase())) return key;
  }
  return "Other";
}

// Curated color for a category name, falling back to the neutral "Other" color.
export function getCategoryColor(category: string | null | undefined): string {
  return CATEGORY_COLORS[normalizeCategoryName(category)] || OTHER_CATEGORY_COLOR;
}
