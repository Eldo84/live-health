import { useEffect, useState } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

// Breakpoints chosen to match the design files:
//   mobile  ≤ 720 px   (matches screen-mobile / screen-landing-mobile)
//   tablet  ≤ 1100 px  (matches screen-tablet)
//   desktop > 1100 px
const TABLET_MAX = 1100;
const MOBILE_MAX = 720;

function read(): Breakpoint {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches) return "mobile";
  if (window.matchMedia(`(max-width: ${TABLET_MAX}px)`).matches) return "tablet";
  return "desktop";
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => read());
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql1 = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const mql2 = window.matchMedia(`(max-width: ${TABLET_MAX}px)`);
    const update = () => setBp(read());
    // Add listeners; both Chrome and Safari are happy with addEventListener.
    mql1.addEventListener?.("change", update);
    mql2.addEventListener?.("change", update);
    return () => {
      mql1.removeEventListener?.("change", update);
      mql2.removeEventListener?.("change", update);
    };
  }, []);
  return bp;
}

export const isAtMost = (bp: Breakpoint, target: Breakpoint) => {
  const order: Record<Breakpoint, number> = { mobile: 0, tablet: 1, desktop: 2 };
  return order[bp] <= order[target];
};

// Sub-mobile sizing for the dedicated mobile screens. Used inside
// MobileLandingScreen and MobileMapScreen to branch layout for narrow
// phones (iPhone SE class) and phablets/portrait small tablets.
//   narrow  ≤ 375 px   (iPhone SE 1–3, small Android)
//   regular 376–540 px (most modern phones)
//   phablet 541–720 px (large phones, small tablets in portrait)
export type MobileSize = "narrow" | "regular" | "phablet";

const NARROW_MAX = 375;
const REGULAR_MAX = 540;

function readMobileSize(): MobileSize {
  if (typeof window === "undefined") return "regular";
  if (window.matchMedia(`(max-width: ${NARROW_MAX}px)`).matches) return "narrow";
  if (window.matchMedia(`(max-width: ${REGULAR_MAX}px)`).matches) return "regular";
  return "phablet";
}

export function useMobileSize(): MobileSize {
  const [size, setSize] = useState<MobileSize>(() => readMobileSize());
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql1 = window.matchMedia(`(max-width: ${NARROW_MAX}px)`);
    const mql2 = window.matchMedia(`(max-width: ${REGULAR_MAX}px)`);
    const update = () => setSize(readMobileSize());
    mql1.addEventListener?.("change", update);
    mql2.addEventListener?.("change", update);
    return () => {
      mql1.removeEventListener?.("change", update);
      mql2.removeEventListener?.("change", update);
    };
  }, []);
  return size;
}
