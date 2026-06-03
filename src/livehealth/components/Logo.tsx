import { useId } from "react";

/* ──────────────────────────────────────────────────────────
   OutbreakNow brand logo (vector)
   ────────────────────────────────────────────────────────────
   One source of truth for the logo, rendered as crisp SVG so it
   scales to any size, has no background, and can be split into:
     • <Logo variant="full" />      icon + "OUTBREAK NOW" wordmark
     • <Logo variant="icon" />      just the map-pin + virus mark
     • <Logo variant="wordmark" />  just the text
   plus a `stacked` option for the official two-line lockup.

   Colors come from the brand palette; text uses currentColor so it
   adapts automatically to light / dark backgrounds. Override per use
   with the color/textColor props.
   ────────────────────────────────────────────────────────────── */

export const BRAND_CYAN = "#22c0ce";
export const BRAND_RED = "#f23b43";

type LogoVariant = "full" | "icon" | "wordmark";

interface LogoProps {
  /** Height of the icon in px (wordmark scales with it). */
  size?: number;
  /** Icon (pin ring + virus) color. Defaults to brand cyan. */
  color?: string;
  /** Pin-tip / "NOW" color. Defaults to brand red. */
  accent?: string;
  /** "OUTBREAK" text color. Defaults to currentColor (theme-aware). */
  textColor?: string;
  /** What to render. */
  variant?: LogoVariant;
  /** Two-line "OUTBREAK / NOW" lockup instead of single line. */
  stacked?: boolean;
  className?: string;
  title?: string;
}

/* ── The standalone mark: map-pin (cyan ring + red tip) with a virus glyph ── */
export function LogoMark({
  size = 28,
  color = BRAND_CYAN,
  accent = BRAND_RED,
  title,
}: {
  size?: number;
  color?: string;
  accent?: string;
  title?: string;
}) {
  const maskId = useId();
  const cx = 60;
  const cy = 54;
  const spokeR = 25; // distance from center to spoke ball
  const ballR = 4.6;
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i;
    return { x: cx + spokeR * Math.cos(a), y: cy + spokeR * Math.sin(a) };
  });

  return (
    <svg
      viewBox="0 0 120 144"
      width={(size * 120) / 144}
      height={size}
      fill="none"
      role="img"
      aria-label={title ?? "OutbreakNow"}
      style={{ display: "block", flex: "none" }}
    >
      {title ? <title>{title}</title> : null}

      {/* Red pin tip (drawn first so the cyan ring overlaps it like the artwork) */}
      <path d="M30 72 L90 72 L60 131 Z" fill={accent} />

      {/* Cyan pin ring */}
      <circle cx={cx} cy={cy} r={42} stroke={color} strokeWidth={9} />

      {/* Virus glyph — holes are punched out via mask so they stay transparent */}
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="144">
        <g stroke="#fff" fill="#fff">
          {spokes.map((s, i) => (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={s.x}
              y2={s.y}
              strokeWidth={6.5}
              strokeLinecap="round"
            />
          ))}
          <circle cx={cx} cy={cy} r={15} />
          {spokes.map((s, i) => (
            <circle key={`b${i}`} cx={s.x} cy={s.y} r={ballR} />
          ))}
        </g>
        {/* holes */}
        <g fill="#000">
          <circle cx={56} cy={49} r={3.1} />
          <circle cx={65} cy={53} r={2.4} />
          <circle cx={57} cy={59} r={2.4} />
        </g>
      </mask>
      <rect x="0" y="0" width="120" height="144" fill={color} mask={`url(#${maskId})`} />
    </svg>
  );
}

/* ── Wordmark: "OUTBREAK" + "NOW" ── */
function Wordmark({
  size,
  accent,
  textColor,
  stacked,
}: {
  size: number;
  accent: string;
  textColor: string;
  stacked: boolean;
}) {
  const fontSize = stacked ? size * 0.46 : size * 0.42;
  return (
    <span
      style={{
        fontFamily: "var(--ln-font-sans, system-ui, sans-serif)",
        fontWeight: 800,
        fontSize,
        lineHeight: stacked ? 0.95 : 1,
        letterSpacing: "0.04em",
        display: stacked ? "flex" : "inline-flex",
        flexDirection: stacked ? "column" : "row",
        alignItems: stacked ? "flex-start" : "baseline",
        gap: stacked ? 0 : "0.28em",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: textColor }}>OUTBREAK</span>
      <span style={{ color: accent }}>NOW</span>
    </span>
  );
}

export function Logo({
  size = 26,
  color = BRAND_CYAN,
  accent = BRAND_RED,
  textColor = "currentColor",
  variant = "full",
  stacked = false,
  className,
  title = "OutbreakNow",
}: LogoProps) {
  if (variant === "wordmark") {
    return (
      <span className={className} aria-label={title}>
        <Wordmark size={size} accent={accent} textColor={textColor} stacked={stacked} />
      </span>
    );
  }
  if (variant === "icon") {
    return (
      <span className={className} style={{ display: "inline-flex" }}>
        <LogoMark size={size} color={color} accent={accent} title={title} />
      </span>
    );
  }
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: stacked ? 12 : 10 }}
      aria-label={title}
    >
      <LogoMark size={stacked ? size * 1.55 : size} color={color} accent={accent} />
      <Wordmark size={size} accent={accent} textColor={textColor} stacked={stacked} />
    </span>
  );
}
