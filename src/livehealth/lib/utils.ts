export function fmtClock(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

export function timeAgo(ts: number | string | Date, now: number = Date.now()): string {
  const t = typeof ts === "number" ? ts : ts instanceof Date ? ts.getTime() : Date.parse(ts);
  if (!Number.isFinite(t)) return "—";
  const d = Math.max(0, now - t);
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const SEVERITY_COLORS = ["#2d6b5e", "#c2a02b", "#d97539", "#ff7a3b", "#ff4a5c"];
const SEVERITY_LABELS = ["low", "low", "moderate", "high", "critical"];

export function severityColor(s: number): string {
  return SEVERITY_COLORS[Math.min(4, Math.max(0, s - 1))];
}

export function severityLabel(s: number): string {
  return SEVERITY_LABELS[Math.min(4, Math.max(0, s - 1))];
}

export function levelToSeverityNum(level?: string): number {
  switch ((level || "").toLowerCase()) {
    case "critical": return 5;
    case "high": return 4;
    case "medium": return 3;
    case "moderate": return 3;
    case "low": return 2;
    default: return 1;
  }
}

export function haversineKm([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function compactNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}
