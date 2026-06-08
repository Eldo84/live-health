import type { Scope, ScopeView } from "./types";
import { PROVINCE_BY_ID, DISTRICT_BY_ID } from "./geo";

// ──────────────────────────────────────────────────────────────────────────
// Two-tier response actions for the demo:
//  • Professional actions — assignable, trackable tasks for Ministry staff.
//  • Public advisories — citizen-facing messages.
// The action list is representative demo content (from the spec's Part 3). It is
// filtered to the current scope so drilling into a province/district shows the
// relevant items. Status is tracked in component state (no backend).
// ──────────────────────────────────────────────────────────────────────────

export type ActionPriority = "immediate" | "short" | "long";
export type ActionStatus = "todo" | "in_progress" | "done";

export interface ProAction {
  id: string;
  priority: ActionPriority;
  title: string;
  owner: string;
  area: string;        // neighborhood / district
  province: string;
  deadline: string;    // ISO date
  status: ActionStatus;
}

export interface PublicAdvisory {
  id: string;
  level: "high" | "medium" | "low";
  area: string;
  province: string;
  message: string;
}

export const PRO_ACTIONS: ProAction[] = [
  { id: "a1", priority: "immediate", title: "Deploy 2,000 mosquito nets to Chawama", owner: "District Health Officer", area: "Chawama", province: "Lusaka", deadline: "2026-06-09", status: "in_progress" },
  { id: "a2", priority: "immediate", title: "Test water sources in Kalingalinga; distribute ORS to 12 households", owner: "Environmental Health Officer", area: "Kalingalinga", province: "Lusaka", deadline: "2026-06-09", status: "todo" },
  { id: "a3", priority: "short", title: "Move 500 malaria RDTs from Chelston Lab to Chawama Clinic", owner: "Hospital Administrator", area: "Lusaka", province: "Lusaka", deadline: "2026-06-11", status: "todo" },
  { id: "a4", priority: "short", title: "Indoor residual spraying — 500 households, George blocks 4–8", owner: "Malaria Control Program", area: "George", province: "Lusaka", deadline: "2026-06-11", status: "todo" },
  { id: "a5", priority: "immediate", title: "Cholera rapid response + chlorination, Maramba", owner: "Provincial Epidemiologist", area: "Livingstone", province: "Southern", deadline: "2026-06-09", status: "in_progress" },
  { id: "a6", priority: "short", title: "Ring vaccination for measles cluster, Wusakile", owner: "EPI Coordinator", area: "Kitwe", province: "Copperbelt", deadline: "2026-06-12", status: "todo" },
  { id: "a7", priority: "short", title: "IRS spraying + RDT resupply, Nchelenge", owner: "District Health Officer", area: "Nchelenge", province: "Luapula", deadline: "2026-06-12", status: "todo" },
  { id: "a8", priority: "long", title: "Train 50 community health workers on OutbreakNow reporting", owner: "Ministry of Health", area: "National", province: "", deadline: "2026-07-08", status: "todo" },
  { id: "a9", priority: "long", title: "Integrate veterinary reporting from 8 livestock markets (One Health)", owner: "One Health Coordinator", area: "National", province: "", deadline: "2026-07-08", status: "todo" },
];

export const PUBLIC_ADVISORIES: PublicAdvisory[] = [
  { id: "p1", level: "high", area: "Chawama", province: "Lusaka", message: "Malaria Alert — sleep under treated nets, clear standing water, seek testing for fever within 24h." },
  { id: "p2", level: "medium", area: "Kalingalinga", province: "Lusaka", message: "Diarrhea advisory — boil or treat drinking water; use ORS for children; wash hands with soap." },
  { id: "p3", level: "high", area: "Livingstone", province: "Southern", message: "Cholera Alert — drink only treated/boiled water; report watery diarrhea to the nearest clinic immediately." },
  { id: "p4", level: "medium", area: "Kitwe", province: "Copperbelt", message: "Measles advisory — ensure under-5s are vaccinated; keep symptomatic children home and seek care." },
  { id: "p5", level: "low", area: "Mbala", province: "Northern", message: "Typhoid watch — practice safe food handling and hand hygiene; report prolonged fever." },
];

// Limit actions/advisories to the current scope (province → its items; district
// → that district's items; national → everything).
function inScope(province: string, area: string, scope: Scope): boolean {
  if (scope.level === "national") return true;
  if (scope.level === "province") {
    const p = scope.provinceId ? PROVINCE_BY_ID[scope.provinceId] : undefined;
    return !province || province === p?.name;
  }
  const d = scope.districtId ? DISTRICT_BY_ID[scope.districtId] : undefined;
  return area === d?.name || (!province && area === "National");
}

export function proActionsForScope(scope: Scope): ProAction[] {
  return PRO_ACTIONS.filter((a) => inScope(a.province, a.area, scope));
}
export function advisoriesForScope(scope: Scope): PublicAdvisory[] {
  return PUBLIC_ADVISORIES.filter((a) => inScope(a.province, a.area, scope));
}

// ── Notification analytics (FABRICATED, scaled off scope volume) ────────────

export interface NotificationStats {
  sent: number;
  recipients: number;
  openRatePct: number;
  ctrPct: number;
  topArea: string;
  topAreaOpenPct: number;
}

export function computeNotificationStats(view: ScopeView): NotificationStats {
  const total = view.kpis.totalCases;
  const sent = Math.round(total * 14.7);
  const recipients = Math.round(sent * 0.66);
  return {
    sent,
    recipients,
    openRatePct: 67,
    ctrPct: 23,
    topArea: view.places[0]?.name ?? "—",
    topAreaOpenPct: 89,
  };
}
