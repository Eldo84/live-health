import { useEffect, useRef } from "react";
import { Icon } from "./Icon";
import { T } from "./T";

export interface Ad {
  id: string;
  tag: string;
  sponsor: string;
  title: string;
  body: string;
  cta: string;
  accent: string;
  glyph: string;
  url?: string;
  /** Real media URL (image or video) — when set, replaces the glyph band. */
  imageUrl?: string;
  /** When true, render imageUrl as <video>. */
  isVideo?: boolean;
  /** Optional analytics callbacks (set by useLiveSponsored). */
  trackView?: (id: string) => void;
  trackClick?: (id: string) => void;
}

export const LN_ADS: Ad[] = [
  {
    id: "ad1",
    tag: "PROMOTED · CLINICAL",
    sponsor: "Bio-Rad Diagnostics",
    title: "IH-500 — automated immunohematology with 28-min turnaround",
    body: "Now FDA-cleared for emergency cross-match. Free workflow audit for partner labs.",
    cta: "Request specs",
    accent: "#6ab7ff",
    glyph: "IH·500",
  },
  {
    id: "ad2",
    tag: "PROMOTED · JOURNAL",
    sponsor: "The Lancet Global Health",
    title: "June issue: Climate-driven vector range shifts",
    body: "Peer-reviewed evidence on Aedes expansion across S. Europe and the Sahel.",
    cta: "Read free",
    accent: "#b07cff",
    glyph: "JUNE 26",
  },
  {
    id: "ad3",
    tag: "PROMOTED · NGO",
    sponsor: "Médecins Sans Frontières",
    title: "Field epidemiologists needed — DRC, Sudan",
    body: "4-month deployments. Salary, insurance, R&R covered. Apply by 06/30.",
    cta: "See roles",
    accent: "#ff7a3b",
    glyph: "MSF",
  },
  {
    id: "ad4",
    tag: "PROMOTED · BIOPHARMA",
    sponsor: "AbbVie Research",
    title: "Mpox Clade Ib — Phase III recruitment open",
    body: "Multi-site adaptive trial across 9 countries. Investigator dossier available.",
    cta: "Learn more",
    accent: "#4ee0c4",
    glyph: "PHASE III",
  },
];

type AdVariant = "sidebar" | "inline" | "featured" | "mobile" | "rail-strip";

interface AdCardProps {
  ad: Ad;
  variant?: AdVariant;
  dense?: boolean;
}

function AdGlyph({ ad, size = 60, h }: { ad: Ad; size?: number | string; h?: number }) {
  const isW = size === "100%";
  const height = h || size;
  // When a real image_url / video is set on the row, render it instead of the
  // striped glyph band.
  if (ad.imageUrl) {
    if (ad.isVideo) {
      return (
        <div
          style={{
            width: isW ? "100%" : size,
            height,
            position: "relative",
            overflow: "hidden",
            background: "#000",
            border: `1px solid ${ad.accent}44`,
          }}
        >
          <video
            src={ad.imageUrl}
            autoPlay
            loop
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      );
    }
    return (
      <div
        style={{
          width: isW ? "100%" : size,
          height,
          position: "relative",
          overflow: "hidden",
          background: "#000",
          border: `1px solid ${ad.accent}44`,
        }}
      >
        <img
          src={ad.imageUrl}
          alt={ad.title}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        width: isW ? "100%" : size,
        height,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(135deg, ${ad.accent}22, ${ad.accent}06)`,
        border: `1px solid ${ad.accent}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-linear-gradient(45deg, ${ad.accent}11 0 6px, transparent 6px 12px)`,
        }}
      />
      <span
        style={{
          position: "relative",
          color: ad.accent,
          fontFamily: "var(--ln-font-mono)",
          fontSize: isW ? 14 : Math.max(9, (typeof size === "number" ? size : 60) * 0.22),
          letterSpacing: "0.12em",
        }}
      >
        {ad.glyph}
      </span>
    </div>
  );
}

export function AdCard({ ad, variant = "sidebar", dense = false }: AdCardProps) {
  const href = ad.url || "#";

  // Fire a view event once per mount; rely on the tracker (useSponsoredContent)
  // to skip fallback ids.
  const viewedRef = useRef(false);
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    ad.trackView?.(ad.id);
  }, [ad]);

  const handleClick = () => {
    ad.trackClick?.(ad.id);
  };

  if (variant === "rail-strip") {
    return (
      <a
        href={href}
        target={ad.url ? "_blank" : undefined}
        rel={ad.url ? "noopener noreferrer sponsored" : undefined}
        onClick={handleClick}
        className="ln-ad"
        style={{
          display: "grid",
          gridTemplateColumns: "46px 1fr auto",
          alignItems: "center",
          gap: 12,
          padding: "10px 12px",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <AdGlyph ad={ad} size={46} />
        <div style={{ minWidth: 0 }}>
          <div className="ln-ad-eyebrow">{ad.tag}</div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--ln-ink)",
              lineHeight: 1.3,
              marginTop: 3,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {ad.title}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ln-ink-3)", marginTop: 3 }}>{ad.sponsor}</div>
        </div>
        <Icon.ArrowR style={{ color: "var(--ln-ink-3)" }} />
      </a>
    );
  }
  if (variant === "mobile") {
    return (
      <a
        href={href}
        target={ad.url ? "_blank" : undefined}
        rel={ad.url ? "noopener noreferrer sponsored" : undefined}
        onClick={handleClick}
        className="ln-ad"
        style={{
          display: "grid",
          gridTemplateColumns: "60px 1fr",
          gap: 12,
          padding: 12,
          textDecoration: "none",
          color: "inherit",
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        <AdGlyph ad={ad} size={60} />
        <div style={{ minWidth: 0 }}>
          <div className="ln-ad-eyebrow">{ad.tag}</div>
          <div style={{ fontSize: 13, color: "var(--ln-ink)", lineHeight: 1.3, marginTop: 3 }}>{ad.title}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <span style={{ fontSize: 10.5, color: "var(--ln-ink-3)" }}>{ad.sponsor}</span>
            <span style={{ fontSize: 11, color: ad.accent, fontFamily: "var(--ln-font-mono)" }}>{ad.cta} →</span>
          </div>
        </div>
      </a>
    );
  }
  if (variant === "inline") {
    return (
      <a
        href={href}
        target={ad.url ? "_blank" : undefined}
        rel={ad.url ? "noopener noreferrer sponsored" : undefined}
        onClick={handleClick}
        className="ln-ad"
        style={{
          display: "grid",
          gridTemplateColumns: "88px 1fr auto",
          gap: 16,
          padding: 16,
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <AdGlyph ad={ad} size={88} />
        <div style={{ minWidth: 0 }}>
          <div className="ln-ad-eyebrow">{ad.tag}</div>
          <div style={{ fontSize: 15, color: "var(--ln-ink)", lineHeight: 1.3, marginTop: 4, fontWeight: 500 }}>
            {ad.title}
          </div>
          <div style={{ fontSize: 12, color: "var(--ln-ink-2)", marginTop: 4, lineHeight: 1.4 }}>{ad.body}</div>
          <div style={{ fontSize: 11, color: "var(--ln-ink-3)", marginTop: 6, fontFamily: "var(--ln-font-mono)" }}>
            {ad.sponsor}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ln-ink-4)", fontSize: 11 }}>
            <T>Why this?</T>
          </button>
          <button className="ln-btn" style={{ borderColor: ad.accent, color: ad.accent }}>
            {ad.cta} <Icon.ArrowR />
          </button>
        </div>
      </a>
    );
  }
  // sidebar (default)
  return (
    <a
      href={href}
      className="ln-ad"
      style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, textDecoration: "none", color: "inherit" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="ln-ad-eyebrow">{ad.tag}</span>
        <span style={{ fontSize: 10, color: "var(--ln-ink-4)" }}>✕</span>
      </div>
      <AdGlyph ad={ad} size="100%" h={dense ? 56 : 78} />
      <div style={{ fontSize: 13, color: "var(--ln-ink)", lineHeight: 1.3, fontWeight: 500 }}>{ad.title}</div>
      {!dense && <div style={{ fontSize: 11.5, color: "var(--ln-ink-2)", lineHeight: 1.4 }}>{ad.body}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
        <span style={{ fontSize: 10.5, color: "var(--ln-ink-3)", fontFamily: "var(--ln-font-mono)" }}>{ad.sponsor}</span>
        <span style={{ fontSize: 11, color: ad.accent, fontFamily: "var(--ln-font-mono)" }}>{ad.cta} →</span>
      </div>
    </a>
  );
}
