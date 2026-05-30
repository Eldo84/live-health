import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "../contexts/AuthContext";

export type Severity = "low" | "medium" | "high" | "critical";

export interface AlertPreferences {
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  country_code: string | null;
  city: string | null;
  radius_km: number;
  alerts_enabled: boolean;
  email_enabled: boolean;
  min_severity: Severity;
}

const DEFAULTS: AlertPreferences = {
  latitude: null,
  longitude: null,
  country: null,
  country_code: null,
  city: null,
  radius_km: 250,
  alerts_enabled: true,
  email_enabled: false,
  min_severity: "high",
};

/**
 * Loads and persists the current user's location-based alert preferences
 * (table: user_alert_preferences, one row per user, RLS-protected).
 */
export function useAlertPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<AlertPreferences | null>(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPrefs(null);
      setExists(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("user_alert_preferences")
      .select(
        "latitude, longitude, country, country_code, city, radius_km, alerts_enabled, email_enabled, min_severity",
      )
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        if (data) {
          setPrefs({ ...DEFAULTS, ...(data as Partial<AlertPreferences>) });
          setExists(true);
        } else {
          setPrefs({ ...DEFAULTS });
          setExists(false);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = useCallback(
    async (patch: Partial<AlertPreferences>) => {
      if (!user) {
        setError("You must be signed in to set alerts.");
        return false;
      }
      setSaving(true);
      setError(null);
      const next = { ...DEFAULTS, ...(prefs ?? {}), ...patch };
      const { error } = await supabase
        .from("user_alert_preferences")
        .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
      setSaving(false);
      if (error) {
        setError(error.message);
        return false;
      }
      setPrefs(next);
      setExists(true);
      return true;
    },
    [user, prefs],
  );

  return { prefs, exists, loading, saving, error, save };
}
