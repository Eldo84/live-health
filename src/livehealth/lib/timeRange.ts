// Shared time-range vocabulary for the LiveHealth+ map / analytics screens.

export type TimeRange = "24h" | "7d" | "14d" | "30d" | "6m" | "1y";

const RANGE_HOURS: Record<TimeRange, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "14d": 24 * 14,
  "30d": 24 * 30,
  "6m": 24 * 30 * 6,
  "1y": 24 * 365,
};

export function startDateFor(range: TimeRange, now: Date = new Date()): Date {
  const hours = RANGE_HOURS[range] ?? RANGE_HOURS["30d"];
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

export function rangeToIso(range: TimeRange): string {
  return startDateFor(range).toISOString();
}

// Map our six-bucket range to the four-bucket range used by useDashboardStats /
// useDashboardChart (they only support 24h | 7d | 30d | 1y).
export function toDashboardRange(range: TimeRange): "24h" | "7d" | "30d" | "1y" {
  if (range === "24h") return "24h";
  if (range === "7d") return "7d";
  if (range === "14d" || range === "30d") return "30d";
  return "1y";
}
