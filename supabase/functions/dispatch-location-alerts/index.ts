// dispatch-location-alerts
//
// Matches newly detected outbreak_signals to users who opted into
// location-based alerts and delivers an in-app notification (always) plus an
// email (if the user enabled email). Designed to be invoked by pg_cron via
// pg_net every 15 minutes, but can also be POSTed manually with a service-role
// bearer token.
//
// Matching strategy (chosen by product): radius + country fallback.
//   * If both the signal and the user have coordinates -> haversine distance
//     must be <= the user's radius_km.
//   * Otherwise fall back to matching the user's country_code against the
//     signal's country.
// Severity gate: signal severity must be >= the user's min_severity.
// Dedup: location_alert_log has a unique (user_id, signal_id); we skip pairs
// already logged so a user is alerted at most once per outbreak.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SEVERITY_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

interface Pref {
  user_id: string;
  latitude: number | null;
  longitude: number | null;
  country_code: string | null;
  radius_km: number;
  email_enabled: boolean;
  min_severity: string;
}

interface Signal {
  id: string;
  disease_id: string | null;
  detected_disease_name: string | null;
  country_id: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  severity_assessment: string | null;
  case_count_mentioned: number | null;
  detected_at: string;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    const error =
      "RESEND_API_KEY not set as a Supabase Edge Function secret (a value in the repo .env does NOT reach deployed functions)";
    console.warn(error);
    return { ok: false, error };
  }
  const fromEmail =
    Deno.env.get("RESEND_FROM_EMAIL") || "OutbreakNow <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromEmail, to: [to], subject, html }),
  });
  if (!res.ok) {
    const error = `Resend ${res.status} (from=${fromEmail}): ${await res.text()}`;
    console.error(error);
    return { ok: false, error };
  }
  return { ok: true };
}

function alertHtml(diseaseName: string, where: string, sev: string, cases: number | null, when: string): string {
  const caseLine = cases && cases > 0 ? `<p><strong>Reported cases:</strong> ${cases}</p>` : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:600px;margin:0 auto;padding:20px}
    .card{background:#fff;border:1px solid #eee;border-radius:8px;padding:24px}
    .sev{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;text-transform:uppercase;background:#fde8e8;color:#b42318}
    .footer{text-align:center;color:#888;font-size:12px;margin-top:16px}
    a.btn{display:inline-block;margin-top:12px;background:#0b7;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px}
  </style></head><body><div class="card">
    <span class="sev">${sev} severity</span>
    <h2>⚠️ ${diseaseName} reported near you</h2>
    <p><strong>Location:</strong> ${where}</p>
    ${caseLine}
    <p><strong>Detected:</strong> ${when}</p>
    <a class="btn" href="https://outbreaknow.org/map">View on the live map</a>
  </div><div class="footer">
    <p>You're receiving this because you enabled location-based outbreak alerts on OutbreakNow.
    Manage or turn these off anytime in Settings.</p>
  </div></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Only the cron job (or an operator) with the service-role key may run this.
  const auth = req.headers.get("Authorization") || "";
  if (auth.replace("Bearer ", "") !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { windowHours = 6 } = await req.json().catch(() => ({}));
    const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();

    // Candidate signals newly INGESTED in the recent window (any severity; we
    // gate per-user). NOTE: window on `created_at` (when we surfaced the
    // signal), NOT `detected_at` (the source article's publish date). Articles
    // are frequently days old when ingested, so filtering on detected_at meant
    // freshly-ingested outbreaks were already outside the window and never
    // alerted. location_alert_log dedups so a user is alerted at most once.
    const { data: signalsRaw, error: sigErr } = await supabase
      .from("outbreak_signals")
      .select(
        "id, disease_id, detected_disease_name, country_id, city, latitude, longitude, severity_assessment, case_count_mentioned, detected_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    if (sigErr) throw sigErr;
    const signals = (signalsRaw || []) as Signal[];

    // Users who opted in.
    const { data: prefsRaw, error: prefErr } = await supabase
      .from("user_alert_preferences")
      .select(
        "user_id, latitude, longitude, country_code, radius_km, email_enabled, min_severity",
      )
      .eq("alerts_enabled", true);
    if (prefErr) throw prefErr;
    const prefs = (prefsRaw || []) as Pref[];

    if (signals.length === 0 || prefs.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, signals: signals.length, users: prefs.length, sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve disease + country lookups once.
    const diseaseIds = [...new Set(signals.map((s) => s.disease_id).filter(Boolean))] as string[];
    const countryIds = [...new Set(signals.map((s) => s.country_id).filter(Boolean))] as string[];

    const diseaseName = new Map<string, string>();
    if (diseaseIds.length) {
      const { data } = await supabase.from("diseases").select("id, name").in("id", diseaseIds);
      (data || []).forEach((d: any) => diseaseName.set(d.id, d.name));
    }
    const countryById = new Map<string, { code: string; name: string }>();
    if (countryIds.length) {
      const { data } = await supabase.from("countries").select("id, name, code").in("id", countryIds);
      (data || []).forEach((c: any) => countryById.set(c.id, { code: (c.code || "").toUpperCase(), name: c.name }));
    }

    // Existing log rows for these signals, to dedup.
    const signalIds = signals.map((s) => s.id);
    const { data: logRows } = await supabase
      .from("location_alert_log")
      .select("user_id, signal_id")
      .in("signal_id", signalIds);
    const already = new Set((logRows || []).map((r: any) => `${r.user_id}|${r.signal_id}`));

    const notifications: any[] = [];
    const logInserts: any[] = [];
    let emailsSent = 0;
    const emailErrors = new Set<string>(); // distinct failure reasons, surfaced in the response
    const emailCache = new Map<string, string | null>(); // user_id -> email

    for (const pref of prefs) {
      const userRank = SEVERITY_RANK[pref.min_severity] ?? 3;
      for (const sig of signals) {
        if (already.has(`${pref.user_id}|${sig.id}`)) continue;

        const sigRank = SEVERITY_RANK[(sig.severity_assessment || "").toLowerCase()] ?? 0;
        if (sigRank < userRank) continue;

        // Match: radius first, country fallback.
        let matched = false;
        if (
          pref.latitude != null && pref.longitude != null &&
          sig.latitude != null && sig.longitude != null
        ) {
          const dist = haversineKm(pref.latitude, pref.longitude, sig.latitude, sig.longitude);
          matched = dist <= pref.radius_km;
        } else if (pref.country_code && sig.country_id) {
          const c = countryById.get(sig.country_id);
          matched = !!c && c.code === pref.country_code.toUpperCase();
        }
        if (!matched) continue;

        const dName = (sig.disease_id && diseaseName.get(sig.disease_id)) || sig.detected_disease_name || "Outbreak";
        const country = sig.country_id ? countryById.get(sig.country_id)?.name : undefined;
        const where = [sig.city, country].filter(Boolean).join(", ") || "your area";
        const sev = (sig.severity_assessment || "elevated").toLowerCase();
        const when = new Date(sig.detected_at).toUTCString();

        notifications.push({
          user_id: pref.user_id,
          type: "location_alert",
          title: `⚠️ ${dName} reported near you`,
          message: `${dName} (${sev} severity) detected in ${where}.` +
            (sig.case_count_mentioned ? ` ~${sig.case_count_mentioned} cases reported.` : ""),
          action_url: "/map",
          action_label: "View on map",
          priority: sev === "critical" ? "urgent" : "high",
          read: false,
        });

        let emailed = false;
        if (pref.email_enabled) {
          if (!emailCache.has(pref.user_id)) {
            const { data: u } = await supabase.auth.admin.getUserById(pref.user_id);
            emailCache.set(pref.user_id, u?.user?.email ?? null);
          }
          const email = emailCache.get(pref.user_id);
          if (email) {
            const r = await sendEmailViaResend(
              email,
              `⚠️ ${dName} reported near you`,
              alertHtml(dName, where, sev, sig.case_count_mentioned, when),
            );
            emailed = r.ok;
            if (r.ok) emailsSent++;
            else if (r.error) emailErrors.add(r.error);
          }
        }

        logInserts.push({ user_id: pref.user_id, signal_id: sig.id, emailed });
        already.add(`${pref.user_id}|${sig.id}`);
      }
    }

    if (notifications.length) {
      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;
    }
    if (logInserts.length) {
      // Ignore unique-violation races; the log is best-effort dedup.
      const { error } = await supabase.from("location_alert_log").upsert(logInserts, {
        onConflict: "user_id,signal_id",
        ignoreDuplicates: true,
      });
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        signals: signals.length,
        users: prefs.length,
        notificationsCreated: notifications.length,
        emailsSent,
        // Self-diagnosing config snapshot so a 200 with 0 emails is no longer a mystery.
        resendConfigured: !!Deno.env.get("RESEND_API_KEY"),
        fromEmail: Deno.env.get("RESEND_FROM_EMAIL") ||
          "OutbreakNow <onboarding@resend.dev> (fallback — only delivers to the Resend account owner)",
        emailErrors: emailErrors.size ? [...emailErrors] : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("dispatch-location-alerts error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
