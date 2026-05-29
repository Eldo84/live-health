import { useBreakpoint } from "../lib/useBreakpoint";
import { AnalyticsDashboardScreen } from "./AnalyticsDashboard";
import { MobileDashboardScreen } from "./MobileDashboard";

// Route shell: below ~720px renders the native-feeling MobileDashboardScreen
// (matches the design's 03b · Analytics Dashboard · Mobile artboard).
// Tablet and desktop continue to use the responsive AnalyticsDashboardScreen.
export function DashboardScreen() {
  const bp = useBreakpoint();
  return bp === "mobile" ? <MobileDashboardScreen /> : <AnalyticsDashboardScreen />;
}
