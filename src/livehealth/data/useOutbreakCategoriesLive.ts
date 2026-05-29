import { useEffect, useState } from "react";

// One entry per top-level outbreak category (after splitting compound names like
// "Foodborne Outbreaks, Waterborne Outbreaks" into their parts).
export interface LiveCategory {
  id: string;     // slug
  label: string;  // canonical category name (e.g. "Respiratory Outbreaks")
  color: string;  // representative color (most common color across rows)
  diseaseIds: Set<string>;
}

export interface UseOutbreakCategoriesLiveResult {
  categories: LiveCategory[];
  // Test function used by the map screen: does this outbreak's disease belong to the chosen category?
  matchesCategory: (diseaseId: string | null | undefined, categoryId: string) => boolean;
  loading: boolean;
  error: string | null;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function useOutbreakCategoriesLive(): UseOutbreakCategoriesLiveResult {
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase configuration");

        const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

        // Fetch outbreak_categories and disease_categories in parallel.
        const [catRes, joinRes] = await Promise.all([
          fetch(
            `${supabaseUrl}/rest/v1/outbreak_categories?select=id,name,color`,
            { headers }
          ),
          fetch(
            `${supabaseUrl}/rest/v1/disease_categories?select=disease_id,category_id`,
            { headers }
          ),
        ]);

        if (!catRes.ok) throw new Error(`outbreak_categories: ${catRes.statusText}`);
        if (!joinRes.ok) throw new Error(`disease_categories: ${joinRes.statusText}`);

        const rawCats: Array<{ id: string; name: string; color: string }> = await catRes.json();
        const joinRows: Array<{ disease_id: string; category_id: string }> = await joinRes.json();

        // Bucket category rows by each top-level label (split commas).
        const buckets = new Map<string, { label: string; colors: string[]; categoryIds: Set<string> }>();
        for (const c of rawCats) {
          const parts = c.name
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
            // Normalise some near-duplicate labels.
            .map((p) => p.replace(/^veterinary outbreak$/i, "Veterinary Outbreaks"));
          for (const part of parts) {
            const id = slug(part);
            if (!id) continue;
            const cur = buckets.get(id) || { label: part, colors: [], categoryIds: new Set<string>() };
            cur.colors.push(c.color);
            cur.categoryIds.add(c.id);
            buckets.set(id, cur);
          }
        }

        // Build category_id → disease_id set
        const categoryToDiseases = new Map<string, Set<string>>();
        for (const j of joinRows) {
          if (!j.category_id || !j.disease_id) continue;
          const cur = categoryToDiseases.get(j.category_id) || new Set<string>();
          cur.add(j.disease_id);
          categoryToDiseases.set(j.category_id, cur);
        }

        const result: LiveCategory[] = [];
        for (const [id, b] of buckets) {
          // Use the colour that appears most often across the rows that contributed.
          const colorCount = new Map<string, number>();
          for (const col of b.colors) colorCount.set(col, (colorCount.get(col) || 0) + 1);
          const color = [...colorCount.entries()].sort((a, c) => c[1] - a[1])[0]?.[0] || "#66dbe1";

          const diseaseIds = new Set<string>();
          for (const cid of b.categoryIds) {
            const set = categoryToDiseases.get(cid);
            if (set) for (const d of set) diseaseIds.add(d);
          }

          result.push({ id, label: b.label, color, diseaseIds });
        }

        // Sort by disease count descending, drop the "Other" bucket (it's noise).
        result.sort((a, b) => b.diseaseIds.size - a.diseaseIds.size);

        if (!active) return;
        setCategories(result);
        setError(null);
      } catch (e: any) {
        if (!active) return;
        console.error("useOutbreakCategoriesLive error:", e);
        setError(e?.message || "Failed to load categories");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const matchesCategory = (diseaseId: string | null | undefined, categoryId: string) => {
    if (!diseaseId) return false;
    const cat = categories.find((c) => c.id === categoryId);
    return !!cat?.diseaseIds.has(diseaseId);
  };

  return { categories, matchesCategory, loading, error };
}
