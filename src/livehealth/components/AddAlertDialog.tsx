import { useEffect, useMemo, useState } from "react";
import { Modal, Field } from "./Modal";
import { Icon } from "./Icon";
import { T } from "./T";
import { SymptomPicker } from "./SymptomPicker";
import { useT } from "../lib/useT";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { geocodeLocation, detectCountryInText } from "../../lib/geocode";
import { geocodeWithOpenCage } from "../../lib/opencage";
import { predict, type RiskLevel } from "../lib/symptomKnowledgeBase";

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
  symptoms: string[];
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
  symptoms: [],
};

const RISK_META: Record<RiskLevel, { label: string; color: string }> = {
  low: { label: "Low risk", color: "var(--ln-ok, #4ade80)" },
  medium: { label: "Medium risk", color: "var(--ln-warn, #fbbf24)" },
  high: { label: "High risk", color: "var(--ln-crit, #f87171)" },
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

  const tReportOutbreak = useT("Report an outbreak");
  const tSubmitNewAlert = useT("Submit a new alert");
  const tEmail = useT("Email");
  const tSourceUrl = useT("Source URL");
  const tSourceUrlHint = useT("The news article, ministry release, or social post.");
  const tHeadline = useT("Headline");
  const tHeadlinePlaceholder = useT("e.g. Marburg cluster confirmed in Rwamagana");
  const tLocation = useT("Location");
  const tLocationHint = useT("City + country gives best geocoding.");
  const tLocationPlaceholder = useT("e.g. Kampala, Uganda");
  const tDateDetected = useT("Date detected");
  const tDisease = useT("Disease");
  const tSelectDisease = useT("Select a disease…");
  const tOtherSpecify = useT("+ Other (specify)");
  const tCustomDiseaseName = useT("Custom disease name");
  const tWhatDidYouSee = useT("What did you see?");
  const tWhatDidYouSeeHint = useT(
    "A short description — symptoms, scale, anything that helps reviewers verify."
  );
  const tSymptoms = useT("Symptoms observed (optional)");
  const tLikelySyndromes = useT("Likely syndromes");
  const tPredictedDiseases = useT("Predicted diseases");
  const tPredHint = useT("Tap a disease to set it as the reported disease above.");
  const tTriageNote = useT(
    "Community triage estimate from reported symptoms — not a medical diagnosis."
  );
  const tErrSignedIn = useT("You must be signed in to submit an alert. Use the avatar menu to sign in.");
  const tErrFillFields = useT("Please fill in every field.");
  const tErrNameCustom = useT("Please name the custom disease.");
  const tErrGeocode = useT(
    "Could not geocode that location. Try a more specific form — e.g. 'Kampala, Uganda' or 'Lima, Peru'."
  );
  const tErrFailed = useT("Failed to submit alert.");

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

  // Rule-based triage: classify the selected symptoms into syndromes + ranked diseases.
  const prediction = useMemo(() => predict(form.symptoms), [form.symptoms]);

  // Picking a predicted disease fills the Disease select (matched by exact DB name,
  // else falls back to the custom-disease path).
  const pickPredictedDisease = (name: string) => {
    const match = diseases.find((d) => d.name === name);
    if (match) {
      setForm((f) => ({ ...f, disease: match.id, customDisease: "" }));
    } else {
      setForm((f) => ({ ...f, disease: "custom", customDisease: name }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError(tErrSignedIn);
      return;
    }
    if (!form.url || !form.headline || !form.location || !form.disease || !form.description) {
      setError(tErrFillFields);
      return;
    }
    if (form.disease === "custom" && !form.customDisease.trim()) {
      setError(tErrNameCustom);
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
        throw new Error(tErrGeocode);
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
          symptoms: form.symptoms,
          syndromes: prediction.syndromes.map((s) => s.id),
          predicted_diseases: prediction.diseases,
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
      setError(err?.message || tErrFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={tReportOutbreak}
      title={tSubmitNewAlert}
      width={620}
    >
      {success ? (
        <SuccessState autoApproved={success.autoApproved} onClose={onClose} />
      ) : (
        <form onSubmit={submit}>
          <p style={{ fontSize: 12.5, color: "var(--ln-ink-3)", margin: "0 0 16px", lineHeight: 1.5 }}>
            <T>Saw something that should be on the map? Share the source URL + a one-line headline. We auto-geocode the location and an admin reviews before it joins the live feed (or auto-approves clear-cut cases).</T>
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
              <T>You need to sign in before submitting an alert.</T>
            </div>
          )}

          <Field label={tEmail}>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label={tSourceUrl} hint={tSourceUrlHint}>
            <input
              type="url"
              placeholder="https://…"
              required
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label={tHeadline}>
            <input
              required
              maxLength={200}
              value={form.headline}
              onChange={(e) => set("headline", e.target.value)}
              style={inputStyle}
              placeholder={tHeadlinePlaceholder}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 12 }}>
            <Field label={tLocation} hint={tLocationHint}>
              <input
                required
                placeholder={tLocationPlaceholder}
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label={tDateDetected}>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label={tSymptoms}>
            <SymptomPicker value={form.symptoms} onChange={(next) => set("symptoms", next)} />
          </Field>

          {(prediction.syndromes.length > 0 || prediction.diseases.length > 0) && (
            <div
              style={{
                border: "1px solid var(--ln-line-2)",
                borderRadius: 6,
                padding: 12,
                marginBottom: 14,
                background: "color-mix(in oklab, var(--ln-brand) 5%, transparent)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ln-ink)" }}>
                  <Icon.Sparkles /> <T>Syndrome & disease analysis</T>
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontFamily: "var(--ln-font-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    padding: "2px 8px",
                    borderRadius: 99,
                    color: RISK_META[prediction.riskLevel].color,
                    border: `1px solid ${RISK_META[prediction.riskLevel].color}`,
                  }}
                >
                  {RISK_META[prediction.riskLevel].label}
                </span>
              </div>

              {prediction.syndromes.length > 0 && (
                <div style={{ marginBottom: prediction.diseases.length > 0 ? 12 : 0 }}>
                  <div className="ln-eyebrow" style={{ marginBottom: 6 }}>{tLikelySyndromes}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {prediction.syndromes.map((s) => (
                      <span
                        key={s.id}
                        style={{
                          fontSize: 11.5,
                          padding: "3px 9px",
                          borderRadius: 99,
                          background: "var(--ln-surface)",
                          border: "1px solid var(--ln-line-2)",
                          color: "var(--ln-ink-2)",
                        }}
                      >
                        <T>{s.label}</T>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {prediction.diseases.length > 0 && (
                <div>
                  <div className="ln-eyebrow" style={{ marginBottom: 6 }}>{tPredictedDiseases}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {prediction.diseases.map((d) => {
                      const isSelected =
                        diseases.find((x) => x.id === form.disease)?.name === d.name ||
                        (form.disease === "custom" && form.customDisease === d.name);
                      return (
                        <button
                          key={d.name}
                          type="button"
                          onClick={() => pickPredictedDisease(d.name)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            textAlign: "left",
                            padding: "6px 8px",
                            borderRadius: 5,
                            cursor: "pointer",
                            fontFamily: "var(--ln-font-sans)",
                            fontSize: 12,
                            color: "var(--ln-ink)",
                            background: isSelected
                              ? "color-mix(in oklab, var(--ln-brand) 16%, transparent)"
                              : "var(--ln-surface)",
                            border: isSelected
                              ? "1px solid var(--ln-brand)"
                              : "1px solid var(--ln-line-2)",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--ln-font-mono)",
                              fontSize: 11,
                              minWidth: 38,
                              color: "var(--ln-ink-2)",
                            }}
                          >
                            {d.probability}%
                          </span>
                          <span
                            aria-hidden
                            style={{
                              flex: 1,
                              height: 5,
                              borderRadius: 99,
                              background: "var(--ln-line-2)",
                              overflow: "hidden",
                            }}
                          >
                            <span
                              style={{
                                display: "block",
                                height: "100%",
                                width: `${d.probability}%`,
                                background: "var(--ln-brand)",
                              }}
                            />
                          </span>
                          <span style={{ flex: "0 0 auto", maxWidth: "55%" }}>{d.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ln-ink-3)", marginTop: 7 }}>{tPredHint}</div>
                </div>
              )}

              <div style={{ fontSize: 10.5, color: "var(--ln-ink-3)", marginTop: 10, fontStyle: "italic" }}>
                {tTriageNote}
              </div>
            </div>
          )}

          <Field label={tDisease}>
            <select required value={form.disease} onChange={(e) => set("disease", e.target.value)} style={inputStyle}>
              <option value="">{tSelectDisease}</option>
              {diseases.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
              <option value="custom">{tOtherSpecify}</option>
            </select>
          </Field>

          {form.disease === "custom" && (
            <Field label={tCustomDiseaseName}>
              <input
                required
                value={form.customDisease}
                onChange={(e) => set("customDisease", e.target.value)}
                style={inputStyle}
              />
            </Field>
          )}

          <Field
            label={tWhatDidYouSee}
            hint={tWhatDidYouSeeHint}
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
              <T>Cancel</T>
            </button>
            <button type="submit" disabled={submitting || !user} className="ln-btn is-primary">
              {submitting ? <T>Submitting…</T> : <T>Submit alert</T>} <Icon.ArrowR />
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
        {autoApproved ? <T>Alert published</T> : <T>Alert submitted</T>}
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
        {autoApproved ? (
          <T>Your alert auto-approved and is being processed — it should appear on the surveillance map within a few minutes.</T>
        ) : (
          <T>Thanks — an admin will review it shortly. You'll get a notification when it's approved or if more info is needed.</T>
        )}
      </p>
      <button onClick={onClose} className="ln-btn is-primary">
        <T>Done</T> <Icon.ArrowR />
      </button>
    </div>
  );
}
