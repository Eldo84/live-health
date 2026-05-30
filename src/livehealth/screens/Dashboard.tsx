import { useBreakpoint } from "../lib/useBreakpoint";
import { AnalyticsDashboardScreen } from "./AnalyticsDashboard";
import { MobileDashboardScreen } from "./MobileDashboard";

// Route shell: below ~1100px (tablet + mobile) renders the single-column
// MobileDashboardScreen which fits cleanly across narrow viewports. The wider
// AnalyticsDashboardScreen is reserved for desktop where its multi-column
// panels actually have room to breathe.
export function DashboardScreen() {
  const bp = useBreakpoint();
  return bp === "desktop" ? <AnalyticsDashboardScreen /> : <MobileDashboardScreen />;
}
