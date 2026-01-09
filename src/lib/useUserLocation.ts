import { useState, useEffect, useRef } from "react";
import { reverseGeocodeWithOpenCage, ReverseGeocodeResult } from "./opencage";

export interface UserLocation {
  coordinates: [number, number];
  country: string;
  city?: string;
  error?: string;
}

export function useUserLocation(autoRequest = true) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRequestedRef = useRef(false);

  const requestLocation = async () => {
    if (hasRequestedRef.current && location) {
      // Already have location, don't request again
      return;
    }

    if (!navigator.geolocation) {
      const errorMsg = "Geolocation is not supported by your browser";
      setError(errorMsg);
      return;
    }

    setIsRequesting(true);
    setError(null);

    try {
      // Request location with high accuracy enabled for precise positioning
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true, // Use GPS for more accurate location
            timeout: 10000, // 10 seconds timeout
            maximumAge: 300000, // 5 minutes cache
          }
        );
      });

      const { latitude, longitude } = position.coords;
      const coordinates: [number, number] = [latitude, longitude];

      // Reverse geocode to get country
      const geocodeResult = await reverseGeocodeWithOpenCage(latitude, longitude);

      if (geocodeResult) {
        setLocation({
          coordinates,
          country: geocodeResult.country,
          city: geocodeResult.city,
        });
        hasRequestedRef.current = true;
      } else {
        // If reverse geocoding fails, we still have coordinates
        // Try to find country from our lookup table (this is a fallback)
        setLocation({
          coordinates,
          country: "Unknown",
        });
        setError("Could not determine country from location");
      }
    } catch (err: any) {
      let errorMessage = "Failed to get your location";
      
      if (err.code === err.PERMISSION_DENIED) {
        errorMessage = "Location permission denied. Please allow location access to see outbreaks in your area.";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        errorMessage = "Location information unavailable";
      } else if (err.code === err.TIMEOUT) {
        errorMessage = "Location request timed out";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      console.error("Geolocation error:", err);
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    if (autoRequest && !hasRequestedRef.current && !location && !error) {
      // Only auto-request once on mount
      requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequest]); // Intentionally only depend on autoRequest to prevent re-requesting on tab focus

  return {
    location,
    isRequesting,
    error,
    requestLocation,
  };
}

