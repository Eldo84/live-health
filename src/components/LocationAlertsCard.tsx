import React, { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { useUserLocation } from "../lib/useUserLocation";
import { useAlertPreferences, Severity } from "../lib/useAlertPreferences";
import { useAuth } from "../contexts/AuthContext";

const SEVERITIES: { value: Severity; label: string }[] = [
  { value: "low", label: "All severities" },
  { value: "medium", label: "Medium and above" },
  { value: "high", label: "High & Critical" },
  { value: "critical", label: "Critical only" },
];

const RADII = [50, 100, 250, 500, 1000];

/**
 * Lets a signed-in user grant location access and opt into outbreak alerts
 * near them. In-app notifications are always on when alerts are enabled; email
 * is a separate opt-in. Styled with the LiveHealth+ (--ln-*) design tokens.
 */
export default function LocationAlertsCard() {
  const { user } = useAuth();
  const { prefs, loading, saving, error, save } = useAlertPreferences();
  // Don't auto-prompt for location; only on explicit button click.
  const { requestLocation, isRequesting, error: geoError } = useUserLocation(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!user) {
    return (
      <Card>
        <Header />
        <p style={muted}>Sign in to get alerts when outbreaks are detected near you.</p>
      </Card>
    );
  }

  if (loading || !prefs) {
    return (
      <Card>
        <Header />
        <p style={muted}>Loading…</p>
      </Card>
    );
  }

  const hasLocation = prefs.latitude != null && prefs.longitude != null;

  const enableWithLocation = async () => {
    setStatus(null);
    const loc = await requestLocation();
    if (!loc) return; // geoError is surfaced below
    const [lat, lng] = loc.coordinates;
    const ok = await save({
      latitude: lat,
      longitude: lng,
      country: loc.country ?? null,
      city: loc.city ?? null,
      alerts_enabled: true,
    });
    setStatus(ok ? "Location saved — you'll be alerted about nearby outbreaks." : null);
  };

  return (
    <Card>
      <Header />

      {!hasLocation ? (
        <>
          <p style={{ ...muted, marginBottom: 14 }}>
            Allow location access and we'll notify you when an outbreak is detected near you —
            in-app, and by email if you turn that on. Your coordinates are stored only on your
            account and used solely for matching alerts.
          </p>
          <button onClick={enableWithLocation} disabled={isRequesting || saving} style={btnPrimary}>
            {isRequesting ? <Loader2 size={16} className="spin" /> : <MapPin size={16} />}
            {isRequesting ? "Requesting location…" : "Enable location alerts"}
          </button>
          {geoError && <Note tone="error">{geoError}</Note>}
        </>
      ) : (
        <>
          <Row label="Location alerts" hint="Notify me about outbreaks near my location">
            <Toggle checked={prefs.alerts_enabled} onChange={(v) => save({ alerts_enabled: v })} disabled={saving} />
          </Row>
          <Row label="Email me alerts" hint="Also send these alerts to my email address">
            <Toggle
              checked={prefs.email_enabled}
              onChange={(v) => save({ email_enabled: v })}
              disabled={saving || !prefs.alerts_enabled}
            />
          </Row>
          <Row label="Alert radius" hint="How close an outbreak must be">
            <select
              value={prefs.radius_km}
              onChange={(e) => save({ radius_km: Number(e.target.value) })}
              disabled={saving || !prefs.alerts_enabled}
              style={select}
            >
              {RADII.map((r) => (
                <option key={r} value={r}>{r} km</option>
              ))}
            </select>
          </Row>
          <Row label="Minimum severity" hint="Only alert me at or above this level">
            <select
              value={prefs.min_severity}
              onChange={(e) => save({ min_severity: e.target.value as Severity })}
              disabled={saving || !prefs.alerts_enabled}
              style={select}
            >
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Row>
          <div style={{ ...muted, fontSize: 12, marginTop: 6 }}>
            {prefs.city ? `${prefs.city}, ` : ""}{prefs.country || "Saved location"}{" · "}
            <button onClick={enableWithLocation} disabled={isRequesting || saving} style={linkBtn}>
              update location
            </button>
          </div>
        </>
      )}

      {status && <Note tone="ok">{status}</Note>}
      {error && <Note tone="error">{error}</Note>}
    </Card>
  );
}

/* ---------- presentational helpers using --ln-* tokens ---------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "var(--ln-surface-2)",
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
        border: "1px solid var(--ln-line-2)",
      }}
    >
      {children}
    </section>
  );
}

function Header() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <MapPin size={20} color="var(--ln-ink)" />
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--ln-ink)" }}>Outbreak alerts near me</h2>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: "10px 0",
        borderTop: "1px solid var(--ln-line)",
      }}
    >
      <div>
        <div style={{ fontWeight: 500, color: "var(--ln-ink)" }}>{label}</div>
        <div style={{ fontSize: 13, color: "var(--ln-ink-3)" }}>{hint}</div>
      </div>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      style={{ width: 20, height: 20, cursor: disabled ? "not-allowed" : "pointer", accentColor: "#4ee0c4" }}
    />
  );
}

function Note({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p style={{ marginTop: 12, fontSize: 13, color: tone === "error" ? "var(--ln-crit, #b42318)" : "#0a7" }}>
      {children}
    </p>
  );
}

const muted: React.CSSProperties = { fontSize: 13, color: "var(--ln-ink-3)" };

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "#4ee0c4",
  color: "#06231d",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const select: React.CSSProperties = {
  background: "var(--ln-surface)",
  color: "var(--ln-ink)",
  border: "1px solid var(--ln-line-2)",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 13,
};

const linkBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#4ee0c4",
  cursor: "pointer",
  textDecoration: "underline",
  fontSize: 12,
  padding: 0,
};
