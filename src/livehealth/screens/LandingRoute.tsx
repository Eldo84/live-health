import { useBreakpoint } from "../lib/useBreakpoint";
import { LandingScreen } from "./Landing";
import { MobileLandingScreen } from "./MobileLanding";

// Route shell that picks the dedicated mobile Landing (with re-ordered
// partner block + sticky-bottom hero stats) below ~720px, and the desktop
// Landing elsewhere. Both are responsive but the mobile variant is a
// pixel-true match to screen-landing-mobile.jsx in the design bundle.
export function LandingRoute() {
  const bp = useBreakpoint();
  return bp === "mobile" ? <MobileLandingScreen /> : <LandingScreen />;
}
