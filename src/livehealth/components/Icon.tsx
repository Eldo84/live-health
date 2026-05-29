import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseStroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
};

export const Icon = {
  Search: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...baseStroke} {...p}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" strokeLinecap="round" />
    </svg>
  ),
  Map: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...baseStroke} {...p}>
      <path d="M2 4l4-1.5 4 1.5 4-1.5v9L10 13l-4-1.5L2 13zm4-1.5v9M10 4v9" strokeLinejoin="round" />
    </svg>
  ),
  Chart: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...baseStroke} {...p}>
      <path d="M2 13h12M4 11V7m3 4V4m3 7V8m3 3V5" strokeLinecap="round" />
    </svg>
  ),
  Bell: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...baseStroke} {...p}>
      <path d="M4 12V7a4 4 0 0 1 8 0v5M2 12h12M7 14h2" strokeLinecap="round" />
    </svg>
  ),
  News: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...baseStroke} {...p}>
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <path d="M4 6h8M4 8.5h8M4 11h4" strokeLinecap="round" />
    </svg>
  ),
  Filter: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...baseStroke} {...p}>
      <path d="M2 4h12L9 9v4l-2 1V9z" strokeLinejoin="round" />
    </svg>
  ),
  Plus: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...baseStroke} {...p}>
      <path d="M8 3v10M3 8h10" strokeLinecap="round" />
    </svg>
  ),
  Down: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...baseStroke} {...p}>
      <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ArrowR: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...baseStroke} {...p}>
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ArrowU: (p: IconProps) => (
    <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth={1.6} {...p}>
      <path d="M6 9V3M3 6l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ArrowD: (p: IconProps) => (
    <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth={1.6} {...p}>
      <path d="M6 3v6M3 6l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Pulse: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...baseStroke} {...p}>
      <path d="M1 8h3l2-5 4 10 2-5h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Globe: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.4} {...p}>
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" />
    </svg>
  ),
  Layers: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...baseStroke} {...p}>
      <path d="m8 2 6 3-6 3-6-3zm-6 6 6 3 6-3M2 11l6 3 6-3" strokeLinejoin="round" />
    </svg>
  ),
  X: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={1.6} {...p}>
      <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  ),
  Sparkles: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.4} {...p}>
      <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" />
    </svg>
  ),
  Refresh: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...baseStroke} {...p}>
      <path d="M3 8a5 5 0 0 1 8.6-3.5M13 4v3h-3M13 8a5 5 0 0 1-8.6 3.5M3 12V9h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Menu: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.6} {...p}>
      <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
    </svg>
  ),
  Sun: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...baseStroke} {...p}>
      <circle cx="8" cy="8" r="3" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M13 3l-1.4 1.4M4.4 11.6 3 13"
        strokeLinecap="round"
      />
    </svg>
  ),
  Moon: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...baseStroke} {...p}>
      <path d="M13.5 9.5A5.5 5.5 0 1 1 6.5 2.5a4.5 4.5 0 0 0 7 7z" strokeLinejoin="round" />
    </svg>
  ),
};
