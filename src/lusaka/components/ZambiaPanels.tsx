import { useMemo, useState, type ReactNode } from "react";
import type { Scope, ScopeView } from "../data/types";
import type { ZambiaPredictions } from "../data/zambiaPredictions";
import {
  advisoriesForScope,
  computeNotificationStats,
  proActionsForScope,
  type ActionStatus,
} from "../data/actions";

const ACCENT = "#4ee0c4";

// ── Shared block wrapper ────────────────────────────────────────────────────
function PanelBlock({
  eyebrow,
  title,
  illustrative,
  right,
  children,
}: {
  eyebrow: string;
  title: string;
  illustrative?: boolean;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={{ borderBottom: "1px solid var(--ln-line)", padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span className="ln-eyebrow">{eyebrow}</span>
          <span style={{ fontSize: 15, color: "var(--ln-ink)", fontWeight: 500 }}>{title}</span>
          {illustrative && (
            <span
              className="ln-chip"
              style={{ fontSize: 9.5, padding: "2px 7px", background: "rgba(176,124,255,0.12)", borderColor: "rgba(176,124,255,0.4)", color: "#c9a0ff" }}
              title="Demo heuristic, not a live model / live messaging system"
            >
              ◆ Illustrative
            </span>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <span style={{ height: 8, background: "var(--ln-surface-2)", borderRadius: 4, overflow: "hidden", display: "block" }}>
      <span style={{ display: "block", height: "100%", width: `${(value / (max || 1)) * 100}%`, background: color }} />
    </span>
  );
}

// ── AI predictions ─────────────────────────────────────────────────────────
export function AIPredictions({ pred }: { pred: ZambiaPredictions }) {
  return (
    <PanelBlock
      eyebrow="Foresight · next 7 days"
      title="AI predictions"
      illustrative
      right={
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--ln-font-mono)", fontSize: 10.5, color: "var(--ln-ink-3)" }}>
          confidence
          <span style={{ width: 54, height: 6, background: "var(--ln-surface-2)", borderRadius: 3, overflow: "hidden", display: "inline-block" }}>
            <span style={{ display: "block", height: "100%", width: `${pred.confidence * 100}%`, background: ACCENT }} />
          </span>
          {Math.round(pred.confidence * 100)}%
        </div>
      }
    >
      <Forecast pred={pred} />

      <div style={{ fontSize: 12, color: "var(--ln-ink-2)", margin: "8px 0 14px", fontFamily: "var(--ln-font-mono)" }}>
        Expected next 7 days: <span style={{ color: "var(--ln-ink)" }}>{pred.expectedNext7.toLocaleString()}</span>{" "}
        <span style={{ color: pred.changeVsCurrentPct >= 0 ? "#ff8b97" : "#4eb7bd" }}>
          ({pred.changeVsCurrentPct >= 0 ? "+" : ""}
          {Math.round(pred.changeVsCurrentPct * 100)}% vs current week)
        </span>
      </div>

      <div className="ln-eyebrow" style={{ marginBottom: 8 }}>Hotspot risk (next 7 days)</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {pred.hotspots.map((h) => (
          <div key={h.name} style={{ display: "grid", gridTemplateColumns: "120px 1fr 42px", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12.5, color: "var(--ln-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {h.name} <span style={{ color: "var(--ln-ink-4)", fontSize: 11 }}>· {h.disease}</span>
            </span>
            <Bar value={h.probability} max={1} color={h.probability >= 0.8 ? "#ff4a5c" : h.probability >= 0.65 ? "#ffb547" : "#4eb7bd"} />
            <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink-2)", textAlign: "right" }}>{Math.round(h.probability * 100)}%</span>
          </div>
        ))}
      </div>

      <div className="ln-eyebrow" style={{ marginBottom: 8 }}>Resource forecast</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {pred.resources.map((r) => (
          <div key={r.label} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, marginTop: 4, flex: "0 0 auto", background: r.severity === "high" ? "#ff4a5c" : r.severity === "medium" ? "#ffb547" : "#4eb7bd" }} />
            <span style={{ fontSize: 12.5 }}>
              <span style={{ color: "var(--ln-ink)" }}>{r.label}:</span>{" "}
              <span style={{ color: "var(--ln-ink-3)" }}>{r.detail}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="ln-eyebrow" style={{ marginBottom: 8 }}>AI insights</div>
      <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 5 }}>
        {pred.insights.map((t, i) => (
          <li key={i} style={{ fontSize: 12.5, color: "var(--ln-ink-2)", lineHeight: 1.5 }}>{t}</li>
        ))}
      </ul>
    </PanelBlock>
  );
}

function Forecast({ pred }: { pred: ZambiaPredictions }) {
  const w = 460;
  const h = 130;
  const padX = 8;
  const padY = 14;
  const pts = pred.series;
  const n = pts.length;
  const max = Math.max(1, ...pts.map((p) => p.upper));
  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (w - padX * 2);
  const y = (v: number) => padY + (1 - v / max) * (h - padY * 2);
  const firstForecast = pts.findIndex((p) => p.forecast);
  const histLine = pts.filter((p) => !p.forecast).map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const fcLine = pts.map((p, i) => (i >= firstForecast - 1 ? `${i === firstForecast - 1 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}` : "")).join(" ");
  const bandTop = pts.map((p, i) => (i >= firstForecast - 1 ? `${i === firstForecast - 1 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.upper).toFixed(1)}` : "")).join(" ");
  const bandBot = pts.slice().reverse().map((p, ri) => { const i = n - 1 - ri; return i >= firstForecast - 1 ? `L ${x(i).toFixed(1)} ${y(p.lower).toFixed(1)}` : ""; }).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <path d={`${bandTop} ${bandBot} Z`} fill={ACCENT} opacity={0.1} />
      <path d={histLine} fill="none" stroke={ACCENT} strokeWidth={2} />
      <path d={fcLine} fill="none" stroke={ACCENT} strokeWidth={2} strokeDasharray="4 3" opacity={0.85} />
      {pts.map((p, i) => (
        <text key={i} x={x(i)} y={h - 2} textAnchor="middle" fill="var(--ln-ink-4)" fontSize={8.5} fontFamily="var(--ln-font-mono)">{p.label}</text>
      ))}
    </svg>
  );
}

// ── Actions (two-tier) ───────────────────────────────────────────────────────
const PRIORITY_LABEL: Record<string, string> = { immediate: "Immediate · 24h", short: "Short-term · 72h", long: "Long-term · 30d" };
const STATUS_NEXT: Record<ActionStatus, ActionStatus> = { todo: "in_progress", in_progress: "done", done: "todo" };
const STATUS_LABEL: Record<ActionStatus, string> = { todo: "Not started", in_progress: "In progress", done: "Complete" };
const STATUS_COLOR: Record<ActionStatus, string> = { todo: "var(--ln-ink-4)", in_progress: "#ffb547", done: "#4eb7bd" };

export function ActionsPanel({ scope }: { scope: Scope }) {
  const actions = useMemo(() => proActionsForScope(scope), [scope]);
  const advisories = useMemo(() => advisoriesForScope(scope), [scope]);
  const [status, setStatus] = useState<Record<string, ActionStatus>>({});
  const cycle = (id: string, cur: ActionStatus) => setStatus((s) => ({ ...s, [id]: STATUS_NEXT[s[id] ?? cur] }));

  return (
    <PanelBlock eyebrow="Response · two tiers" title="Recommended actions">
      <div className="ln-eyebrow" style={{ marginBottom: 8 }}>For health teams ({actions.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {actions.length === 0 && <Empty>No actions queued in this scope.</Empty>}
        {actions.map((a) => {
          const st = status[a.id] ?? a.status;
          return (
            <div key={a.id} style={{ border: "1px solid var(--ln-line-2)", borderRadius: 6, padding: "8px 10px", background: "var(--ln-surface)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <span className="ln-chip" style={{ fontSize: 9.5, padding: "2px 7px", background: a.priority === "immediate" ? "rgba(255,74,92,0.12)" : "var(--ln-surface-2)", borderColor: a.priority === "immediate" ? "rgba(255,74,92,0.4)" : "var(--ln-line-2)", color: a.priority === "immediate" ? "#ff8b97" : "var(--ln-ink-3)" }}>
                  {PRIORITY_LABEL[a.priority]}
                </span>
                <button onClick={() => cycle(a.id, a.status)} className="ln-btn" style={{ fontSize: 10.5, padding: "3px 8px", color: STATUS_COLOR[st] }} title="Click to advance status">
                  ● {STATUS_LABEL[st]}
                </button>
              </div>
              <div style={{ fontSize: 13, color: "var(--ln-ink)", margin: "6px 0 3px" }}>{a.title}</div>
              <div style={{ fontSize: 11, color: "var(--ln-ink-4)", fontFamily: "var(--ln-font-mono)" }}>
                {a.owner} · {a.area} · due {a.deadline.slice(5)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ln-eyebrow" style={{ marginBottom: 8 }}>For the public ({advisories.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {advisories.length === 0 && <Empty>No public advisories in this scope.</Empty>}
        {advisories.map((a) => {
          const color = a.level === "high" ? "#ff4a5c" : a.level === "medium" ? "#ffb547" : "#4eb7bd";
          return (
            <div key={a.id} style={{ border: "1px solid var(--ln-line-2)", borderLeft: `3px solid ${color}`, borderRadius: 6, padding: "8px 10px", background: "var(--ln-surface)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--ln-ink)", fontWeight: 500 }}>{a.area}</span>
                <span style={{ fontSize: 10, color, fontFamily: "var(--ln-font-mono)", textTransform: "uppercase" }}>{a.level}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ln-ink-2)", marginTop: 3, lineHeight: 1.45 }}>📣 {a.message}</div>
            </div>
          );
        })}
      </div>
    </PanelBlock>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, color: "var(--ln-ink-4)", fontFamily: "var(--ln-font-mono)" }}>{children}</div>;
}

// ── Notification analytics ──────────────────────────────────────────────────
function openRateFor(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return 55 + ((h >>> 0) % 35); // 55–89%
}

export function NotificationAnalytics({ view }: { view: ScopeView }) {
  const stats = useMemo(() => computeNotificationStats(view), [view]);
  const areas = view.places.filter((p) => p.cases > 0).slice(0, 5);
  return (
    <PanelBlock
      eyebrow="Reach · last 7 days"
      title="Notification performance"
      illustrative
      right={<button className="ln-btn" style={{ fontSize: 11, padding: "5px 9px" }}>⤓ Export</button>}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--ln-line)", marginBottom: 14 }}>
        <Metric label="Alerts sent" value={stats.sent.toLocaleString()} />
        <Metric label="Recipients" value={stats.recipients.toLocaleString()} sub="unique users" />
        <Metric label="Open rate" value={`${stats.openRatePct}%`} sub={`${Math.round((stats.recipients * stats.openRatePct) / 100).toLocaleString()} opens`} accent="#4eb7bd" />
        <Metric label="Click-through" value={`${stats.ctrPct}%`} sub={`${Math.round((stats.recipients * stats.ctrPct) / 100).toLocaleString()} clicks`} accent="#6ab7ff" />
      </div>
      <div className="ln-eyebrow" style={{ marginBottom: 8 }}>Engagement by area</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {areas.map((a) => {
          const open = openRateFor(a.name);
          return (
            <div key={a.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr 38px", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12.5, color: "var(--ln-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
              <Bar value={open} max={100} color="#4eb7bd" />
              <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink-2)", textAlign: "right" }}>{open}%</span>
            </div>
          );
        })}
      </div>
    </PanelBlock>
  );
}

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: "var(--ln-surface)", padding: "10px 12px" }}>
      <div className="ln-eyebrow">{label}</div>
      <div className="ln-num" style={{ fontSize: 20, color: accent ?? "var(--ln-ink)", fontWeight: 500, marginTop: 3 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: "var(--ln-ink-4)", fontFamily: "var(--ln-font-mono)", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}
