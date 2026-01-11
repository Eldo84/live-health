import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../lib/analytics";

/**
 * Component that tracks page views in Google Analytics
 * Should be placed inside BrowserRouter to track route changes
 */
export function PageTracking() {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null; // This component doesn't render anything
}

