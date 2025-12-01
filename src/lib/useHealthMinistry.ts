import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface HealthMinistry {
  id: string;
  country_name: string;
  ministry_name: string;
  phone_number: string | null;
  email_address: string | null;
}

// Country name aliases - maps common variations to database names
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  'Congo': 'Congo (Republic of the)',
  'Republic of Congo': 'Congo (Republic of the)',
  'Republic of the Congo': 'Congo (Republic of the)',
  'Congo-Brazzaville': 'Congo (Republic of the)',
  'Congo Brazzaville': 'Congo (Republic of the)',
  'DRC': 'Democratic Republic of the Congo',
  'DR Congo': 'Democratic Republic of the Congo',
  'Congo-Kinshasa': 'Democratic Republic of the Congo',
  'Congo Kinshasa': 'Democratic Republic of the Congo',
  'USA': 'United States',
  'US': 'United States',
  'America': 'United States',
  'UK': 'United Kingdom',
  'Britain': 'United Kingdom',
  'Great Britain': 'United Kingdom',
};

/**
 * Normalize country name using aliases
 */
function normalizeCountryName(name: string): string {
  const trimmed = name.trim();
  // Check for exact alias match
  if (COUNTRY_NAME_ALIASES[trimmed]) {
    return COUNTRY_NAME_ALIASES[trimmed];
  }
  // Check case-insensitive alias match
  const lowerName = trimmed.toLowerCase();
  for (const [alias, canonical] of Object.entries(COUNTRY_NAME_ALIASES)) {
    if (alias.toLowerCase() === lowerName) {
      return canonical;
    }
  }
  return trimmed;
}

/**
 * Hook to fetch health ministry contact information by country name
 * @param countryName - The name of the country to look up
 * @returns Health ministry data or null if not found
 */
export function useHealthMinistry(countryName: string | null | undefined) {
  const [ministry, setMinistry] = useState<HealthMinistry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!countryName || !countryName.trim()) {
      setMinistry(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchMinistry() {
      try {
        // Normalize country name using aliases (e.g., "Congo" -> "Congo (Republic of the)")
        const normalizedName = normalizeCountryName(countryName);
        
        // Try exact match first with normalized name
        let { data, error: queryError } = await supabase
          .from('health_ministries')
          .select('id, country_name, ministry_name, phone_number, email_address')
          .eq('country_name', normalizedName)
          .maybeSingle();

        // If no exact match, try case-insensitive with normalized name
        if (!data && !queryError) {
          const { data: caseInsensitiveData, error: caseInsensitiveError } = await supabase
            .from('health_ministries')
            .select('id, country_name, ministry_name, phone_number, email_address')
            .ilike('country_name', normalizedName)
            .maybeSingle();
          
          data = caseInsensitiveData;
          queryError = caseInsensitiveError;
        }
        
        // If still no match and name was normalized, also try the original name
        if (!data && !queryError && normalizedName !== countryName.trim()) {
          const { data: originalData, error: originalError } = await supabase
            .from('health_ministries')
            .select('id, country_name, ministry_name, phone_number, email_address')
            .ilike('country_name', countryName.trim())
            .maybeSingle();
          
          data = originalData;
          queryError = originalError;
        }

        if (cancelled) return;

        if (queryError) {
          throw queryError;
        }

        setMinistry(data);
        setError(null);
      } catch (err: any) {
        if (cancelled) return;
        console.error('Error fetching health ministry:', err);
        setError(err.message || 'Failed to fetch health ministry');
        setMinistry(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchMinistry();

    return () => {
      cancelled = true;
    };
  }, [countryName]);

  return { ministry, loading, error };
}

/**
 * Extract country name from location string (format: "City, Country" or "Country")
 */
export function extractCountryFromLocation(location: string): string | null {
  if (!location || !location.trim()) return null;
  
  const parts = location.split(',').map(p => p.trim());
  // If there's a comma, the last part is usually the country
  // Otherwise, the whole string might be the country
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}




















