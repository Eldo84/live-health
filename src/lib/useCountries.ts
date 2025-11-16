import { useEffect, useState } from "react";

export interface Country {
  id: string;
  name: string;
  code: string;
  continent: string;
  population: number;
}

export function useCountries() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchCountries() {
      try {
        setLoading(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Missing Supabase configuration");
        }

        // Fetch countries that have outbreak signals (countries with data)
        const params = new URLSearchParams();
        params.set('select', 'id,name,code,continent,population');
        params.set('order', 'name.asc');
        
        const url = `${supabaseUrl}/rest/v1/countries?${params.toString()}`;
        const response = await fetch(url, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch countries: ${response.statusText}`);
        }

        const data: Country[] = await response.json();

        // Also fetch unique countries from outbreak_signals to get countries with data
        const signalsParams = new URLSearchParams();
        signalsParams.set('select', 'country_id,countries!country_id(id,name,code,continent,population)');
        
        const signalsUrl = `${supabaseUrl}/rest/v1/outbreak_signals?${signalsParams.toString()}`;
        const signalsResponse = await fetch(signalsUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (signalsResponse.ok) {
          const signals: any[] = await signalsResponse.json();
          const countriesWithData = new Set<string>();
          const countryMap = new Map<string, Country>();

          // Add all countries from main table
          data.forEach(country => {
            countryMap.set(country.id, country);
          });

          // Add countries that have outbreak signals
          signals.forEach((signal: any) => {
            if (signal.country_id && !countriesWithData.has(signal.country_id)) {
              const country = Array.isArray(signal.countries) ? signal.countries[0] : signal.countries;
              if (country && country.id) {
                countriesWithData.add(country.id);
                countryMap.set(country.id, {
                  id: country.id,
                  name: country.name,
                  code: country.code || '',
                  continent: country.continent || '',
                  population: country.population || 0,
                });
              }
            }
          });

          // Convert to array and sort by name
          const countriesList = Array.from(countryMap.values()).sort((a, b) => 
            a.name.localeCompare(b.name)
          );

          if (!active) return;
          setCountries(countriesList);
        } else {
          // If signals fetch fails, just use countries table
          if (!active) return;
          setCountries(data);
        }

        setError(null);
      } catch (err: any) {
        if (!active) return;
        console.error("Error fetching countries:", err);
        setError(err.message || "Failed to load countries");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchCountries();

    return () => {
      active = false;
    };
  }, []);

  return { countries, loading, error };
}
