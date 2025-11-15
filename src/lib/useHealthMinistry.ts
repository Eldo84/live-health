import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface HealthMinistry {
  id: string;
  country_name: string;
  ministry_name: string;
  phone_number: string | null;
  email_address: string | null;
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
        // Try exact match first
        let { data, error: queryError } = await supabase
          .from('health_ministries')
          .select('id, country_name, ministry_name, phone_number, email_address')
          .eq('country_name', countryName.trim())
          .maybeSingle();

        // If no exact match, try case-insensitive
        if (!data && !queryError) {
          const { data: caseInsensitiveData, error: caseInsensitiveError } = await supabase
            .from('health_ministries')
            .select('id, country_name, ministry_name, phone_number, email_address')
            .ilike('country_name', countryName.trim())
            .maybeSingle();
          
          data = caseInsensitiveData;
          queryError = caseInsensitiveError;
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









