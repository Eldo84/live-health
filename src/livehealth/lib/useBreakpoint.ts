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
