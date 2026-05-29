import { useEffect, useMemo, useState } from "react";
import { Modal, Field } from "./Modal";
import { Icon } from "./Icon";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { geocodeLocation, detectCountryInText } from "../../lib/geocode";
import { geocodeWithOpenCage } from "../../lib/opencage";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Disease {
  id: string;
  name: string;
}

interface FormState {
  email: string;
  url: string;
  headline: string;
  location: string;
  date: string;
  disease: string;
  customDisease: string;
  description: string;
}

const EMPTY: FormState = {
  email: "",
  url: "",
  headline: "",
  location: "",
  date: new Date().toISOString().split("T")[0],
  disease: "",
  customDisease: "",
  description: "",
};

// Themed Add Alert flow. Lets a signed-in user submit a new outbreak signal —
// auto-geocodes the location, writes to user_alert_submissions, and (when the
// row is auto-approved) invokes the process-auto-approved-alerts edge function.
export function AddAlertDialog({ open, onClose }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(() => ({ ...EMPTY, email: user?.email || "" }));
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ autoApproved: boolean } | null>(null);

  const inputStyle = useMemo<React.CSSProperties>(
    () => ({
      width: "100%",
      background: "var(--ln-surface)",
      border: "1px solid var(--ln-line-2)",
      borderRadius: 6,
      padding: "8px 10px",
      color: "var(--ln-ink)",
      fontSize: 13,
      fontFamily: "var(--ln-font-sans)",
    }),
    []
  );

  // Reset / load diseases when the dialog opens.
  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY, email: user?.email || "" });
    setError(null);
    setSuccess(null);
    supabase
      .from("diseases")
      .select("id, name")
      .order("name")
      .then(({ data }) => setDiseases((data as Disease[]) || []));
  }, [open, user]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError("You must be signed in to submit an alert. Use the avatar menu to sign in.");
      return;
    }
    if (!form.url || !form.headline || !form.location || !form.disease || !form.description) {
      setError("Please fill in every field.");
      return;
    }
    if (form.disease === "custom" && !form.customDisease.trim()) {
      setError("Please name the custom disease.");
      return;
    }
    setSubmitting(true);
    try {
      const diseaseName =
        form.disease === "custom"
          ? form.customDisease.trim()
          : diseases.find((d) => d.id === form.disease)?.name || form.disease;

      let diseaseId: string | null = form.disease === "custom" ? null : form.disease;
      if (form.disease === "custom") {
        const { data: existing } = await supabase
          .from("diseases")
          .select("id")
          .eq("name", diseaseName)
          .maybeSingle();
        if (existing) diseaseId = existing.id;
      }

      // Geocode: try local table first, then OpenCage as a fallback.
      let coords = geocodeLocation(form.location);
      let countryName = coords ? detectCountryInText(form.location) : null;
      if (!coords) {
        coords = await geocodeWithOpenCage(form.location);
        if (coords) countryName = detectCountryInText(form.location);
      }
      if (!coords) {
        throw new Error(
          "Could not geocode that location. Try a more specific form — e.g. 'Kampala, Uganda' or 'Lima, Peru'."
        );
      }

      let countryId: string | null = null;
      if (countryName) {
        const { data: c } = await supabase
          .from("countries")
          .select("id")
          .ilike("name", countryName)
          .maybeSingle();
        if (c) countryId = c.id;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("user_alert_submissions")
        .insert({
          user_id: user.id,
          user_email: form.email,
          url: form.url,
          headline: form.headline,
          location: form.location,
          date: form.date,
          disease_id: diseaseId,
          disease_name: diseaseName,
          description: form.description,
          latitude: coords[0],
          longitude: coords[1],
          country_name: countryName,
          country_id: countryId,
          status: "pending_review",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      // The DB may auto-approve safe submissions; pick that up.
      const { data: checked } = await supabase
        .from("user_alert_submissions")
        .select("status, admin_notes")
        .eq("id", inserted.id)
        .single();
      const autoApproved =
        checked?.status === "approved" && String(checked.admin_notes || "").includes("Auto-approved");
      if (autoApproved) {
        await supabase.functions.invoke("process-auto-approved-alerts").catch(() => {});
      }

      setSuccess({ autoApproved });
    } catch (err: any) {
      setError(err?.message || "Failed to submit alert.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Report an outbreak"
      title="Submit a new alert"
      width={620}
    >
      {success ? (
        <SuccessState autoApproved={success.autoApproved} onClose={onClose} />
      ) : (
        <form onSubmit={submit}>
          <p style={{ fontSize: 12.5, color: "var(--ln-ink-3)", margin: "0 0 16px", lineHeight: 1.5 }}>
            Saw something that should be on the map? Share the source URL + a one-line headline. We auto-geocode
            the location and an admin reviews before it joins the live feed (or auto-approves clear-cut cases).
          </p>

          {!user && (
            <div
              style={{
                padding: 10,
                background: "color-mix(in oklab, var(--ln-warn) 14%, transparent)",
                border: "1px solid color-mix(in oklab, var(--ln-warn) 40%, transparent)",
                fontSize: 12.5,
                marginBottom: 14,
              }}
            >
              You need to sign in before submitting an alert.
            </div>
          )}

          <Field label="Email">
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Source URL" hint="The news article, ministry release, or social post.">
            <input
              type="url"
              placeholder="https://…"
              required
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Headline">
            <input
              required
              maxLength={200}
              value={form.headline}
              onChange={(e) => set("headline", e.target.value)}
              style={inputStyle}
              placeholder="e.g. Marburg cluster confirmed in Rwamagana"
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 12 }}>
            <Field label="Location" hint="City + country gives best geocoding.">
              <input
                required
                placeholder="e.g. Kampala, Uganda"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Date detected">
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Disease">
            <select required value={form.disease} onChange={(e) => set("disease", e.target.value)} style={inputStyle}>
              <option value="">Select a disease…</option>
              {diseases.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
              <option value="custom">+ Other (specify)</option>
            </select>
          </Field>

          {form.disease === "custom" && (
            <Field label="Custom disease name">
              <input
                required
                value={form.customDisease}
                onChange={(e) => set("customDisease", e.target.value)}
                style={inputStyle}
              />
            </Field>
          )}

          <Field
            label="What did you see?"
            hint="A short description — symptoms, scale, anything that helps reviewers verify."
          >
            <textarea
              required
              rows={4}
              maxLength={1200}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              style={{ ...inputStyle, resize: "vertical", minHeight: 90, fontFamily: "var(--ln-font-sans)" }}
            />
          </Field>

          {error && (
            <div
              style={{
                padding: 10,
                background: "color-mix(in oklab, var(--ln-crit) 12%, transparent)",
                border: "1px solid color-mix(in oklab, var(--ln-crit) 38%, transparent)",
                color: "var(--ln-crit)",
                fontSize: 12.5,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onClose} className="ln-btn">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !user} className="ln-btn is-primary">
              {submitting ? "Submitting…" : "Submit alert"} <Icon.ArrowR />
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function SuccessState({ autoApproved, onClose }: { autoApproved: boolean; onClose: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "24px 8px" }}>
      <div
        style={{
          width: 40,
          height: 40,
          margin: "0 auto 14px",
          borderRadius: "50%",
          background: "var(--ln-brand)",
          color: "var(--ln-brand-ink)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
        }}
      >
        ✓
      </div>
      <div className="ln-display" style={{ fontSize: 22, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        {autoApproved ? "Alert published" : "Alert submitted"}
      </div>
      <p
        style={{
          fontSize: 13,
          color: "var(--ln-ink-3)",
          lineHeight: 1.5,
          maxWidth: 360,
          margin: "10px auto 18px",
        }}
      >
        {autoApproved
          ? "Your alert auto-approved and is being processed — it should appear on the surveillance map within a few minutes."
          : "Thanks — an admin will review it shortly. You'll get a notification when it's approved or if more info is needed."}
      </p>
      <button onClick={onClose} className="ln-btn is-primary">
        Done <Icon.ArrowR />
      </button>
    </div>
  );
}
