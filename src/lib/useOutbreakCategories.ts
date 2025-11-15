import { useEffect, useState } from "react";

export interface OutbreakCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
}

export function useOutbreakCategories() {
  const [categories, setCategories] = useState<OutbreakCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const envVars = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env ?? import.meta.env;
        const supabaseUrl = envVars?.VITE_SUPABASE_URL;
        const supabaseKey = envVars?.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Missing Supabase configuration");
        }

        const response = await fetch(
          `${supabaseUrl}/rest/v1/outbreak_categories?select=id,name,description,color,icon&order=name.asc`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.statusText}`);
        }

        const data: OutbreakCategory[] = await response.json();
        setCategories(data);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching outbreak categories:", err);
        setError(err.message || "Failed to load categories");
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  return { categories, loading, error };
}


