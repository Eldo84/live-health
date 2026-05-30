// import-gbd-estimates
//
// Reproducible loader for the IHME GBD 2023 estimates that back the Global
// Health Index page. The companion script `data/gbd/run_import.mjs` reads the
// raw IHME CSVs, maps them to our schema, and POSTs them here in batches of
// 1000. This function upserts those rows into `public.gbd_estimates`.
//
// Before this existed, the 122k rows in gbd_estimates were loaded by an
// uncommitted one-off, so the table could not be re-derived from the repo.
// This closes that auditability gap.
//
// Request body: { "rows": [ GbdEstimateRow, ... ] }  (max 5000 per call)
//   GbdEstimateRow = {
//     iso3: string,            // ISO-3166 alpha-3
//     cause_id: string,        // canonical cause slug (see CAUSE_MAP in run_import.mjs)
//     year: number,
//     measure: string,         // Deaths | DALYs | YLLs | YLDs | Incidence | Prevalence
//     sex?: string,            // default "Both"
//     age_group?: string,      // default "Age-standardized"
//     metric?: string,         // default "Rate"
//     rate: number | null,
//     lower: number | null,
//     upper: number | null,
//     source?: string,         // default "IHME GBD 2023"
//   }
//
// Auth: requires the caller to present a valid key. Writes use the service
// role (bypasses RLS) but we only ever touch gbd_estimates.

import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

const supabase = createClient(
  requireEnv("SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_MEASURES = new Set([
  "Deaths",
  "DALYs",
  "YLLs",
  "YLDs",
  "Incidence",
  "Prevalence",
]);

const MAX_ROWS = 5000;

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

interface IncomingRow {
  iso3?: string;
  cause_id?: string;
  year?: number | string;
  measure?: string;
  sex?: string;
  age_group?: string;
  metric?: string;
  rate?: unknown;
  lower?: unknown;
  upper?: unknown;
  source?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), {
      status: 405,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const rows: IncomingRow[] = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "No rows provided" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    if (rows.length > MAX_ROWS) {
      return new Response(
        JSON.stringify({ error: `Too many rows (max ${MAX_ROWS} per call)` }),
        {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" },
        },
      );
    }

    const clean: Record<string, unknown>[] = [];
    const errors: string[] = [];

    rows.forEach((r, i) => {
      const iso3 = (r.iso3 ?? "").toString().trim().toUpperCase();
      const cause_id = (r.cause_id ?? "").toString().trim();
      const year = Number(r.year);
      const measure = (r.measure ?? "").toString().trim();

      if (iso3.length !== 3) return void errors.push(`row ${i}: bad iso3 "${r.iso3}"`);
      if (!cause_id) return void errors.push(`row ${i}: missing cause_id`);
      if (!Number.isInteger(year) || year < 1990 || year > 2100)
        return void errors.push(`row ${i}: bad year "${r.year}"`);
      if (!VALID_MEASURES.has(measure))
        return void errors.push(`row ${i}: bad measure "${r.measure}"`);

      clean.push({
        iso3,
        cause_id,
        year,
        measure,
        sex: (r.sex ?? "Both").toString(),
        age_group: (r.age_group ?? "Age-standardized").toString(),
        metric: (r.metric ?? "Rate").toString(),
        rate: toNumOrNull(r.rate),
        lower: toNumOrNull(r.lower),
        upper: toNumOrNull(r.upper),
        source: (r.source ?? "IHME GBD 2023").toString(),
      });
    });

    if (clean.length === 0) {
      return new Response(
        JSON.stringify({ error: "All rows invalid", details: errors.slice(0, 20) }),
        {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" },
        },
      );
    }

    // Idempotent upsert on the natural key so re-running the import is safe.
    // The conflict target must match the table's unique key, which spans the
    // full row identity (see data/gbd/build_import_sql.py).
    const { error } = await supabase
      .from("gbd_estimates")
      .upsert(clean, {
        onConflict: "iso3,cause_id,year,measure,sex,age_group,metric",
      });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message, hint: error.hint ?? null }),
        {
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        received: rows.length,
        inserted: clean.length,
        skipped: rows.length - clean.length,
        sample_errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      },
    );
  }
});
