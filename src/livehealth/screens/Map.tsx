import { useBreakpoint } from "../lib/useBreakpoint";
import { SurveillanceMapScreen } from "./SurveillanceMap";
import { MobileMapScreen } from "./MobileMap";

// Route shell: renders the native-feeling MobileMapScreen below ~720px and
// the desktop SurveillanceMapScreen elsewhere. SurveillanceMapScreen already
// handles its own tablet drawer/collapsing.
export function MapScreen() {
  const bp = useBreakpoint();
  return bp === "mobile" ? <MobileMapScreen /> : <SurveillanceMapScreen />;
}
