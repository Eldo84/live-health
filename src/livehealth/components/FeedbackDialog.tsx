import { useEffect, useState } from "react";
import { Modal, Field } from "./Modal";
import { Icon } from "./Icon";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { trackContactFormSubmit } from "../../lib/analytics";

interface Props {
  open: boolean;
  onClose: () => void;
}

type FeedbackType = "bug" | "feature" | "suggestion" | "general";

const TYPES: { id: FeedbackType; label: string; icon: string; helper: string }[] = [
  { id: "bug", label: "Bug", icon: "🐞", helper: "Something is broken or wrong" },
  { id: "feature", label: "Feature", icon: "✨", helper: "Idea for something new" },
  { id: "suggestion", label: "Suggestion", icon: "💡", helper: "Smaller tweak / polish" },
  { id: "general", label: "General", icon: "💬", helper: "Anything else" },
];

// Themed feedback form. Anyone can submit (auth optional); rows go to user_feedback
// for admin triage. Mirrors the original FeedbackDialog's data shape.
export function FeedbackDialog({ open, onClose }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<FeedbackType | "">("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType("");
    setMessage("");
    setEmail(user?.email || "");
    setError(null);
    setDone(false);
  }, [open, user]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--ln-surface)",
    border: "1px solid var(--ln-line-2)",
    borderRadius: 6,
    padding: "8px 10px",
    color: "var(--ln-ink)",
    fontSize: 13,
    fontFamily: "var(--ln-font-sans)",
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!type) {
      setError("Pick a feedback type.");
      return;
    }
    if (message.trim().length < 10) {
      setError("Please give us at least a sentence (10+ characters).");
      return;
    }
    if (message.length > 2000) {
      setError("Keep it under 2,000 characters please.");
      return;
    }
    setSubmitting(true);
    try {
      const emailToUse = user?.email || email || "anonymous@outbreaknow.org";
      const { error: insErr } = await supabase.from("user_feedback").insert({
        user_id: user?.id || null,
        user_email: emailToUse,
        feedback_type: type,
        message: message.trim(),
        status: "new",
      });
      if (insErr) throw insErr;
      trackContactFormSubmit(type);
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="Send feedback" title="Tell us what's working — and what isn't.">
      {done ? (
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
            Thanks — got it.
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
            Real humans read every submission. If we need more from you, we'll reach out at the email you
            provided.
          </p>
          <button onClick={onClose} className="ln-btn is-primary">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <Field label="Type">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {TYPES.map((t) => {
                const active = type === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setType(t.id)}
                    style={{
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 6,
                      background: active ? "rgba(255,255,255,0.04)" : "transparent",
                      border: `1px solid ${active ? "var(--ln-brand)" : "var(--ln-line-2)"}`,
                      cursor: "pointer",
                      color: "var(--ln-ink)",
                    }}
                  >
                    <div style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{t.icon}</span>
                      <span style={{ fontWeight: 500 }}>{t.label}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ln-ink-3)", marginTop: 4 }}>{t.helper}</div>
                  </button>
                );
              })}
            </div>
          </Field>

          {!user && (
            <Field
              label="Email (optional)"
              hint="If you'd like a reply. Submitted anonymously otherwise."
            >
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </Field>
          )}

          <Field label="Message" hint={`${message.length}/2000`}>
            <textarea
              required
              rows={6}
              placeholder="Tell us what happened, what you'd expect, or where you'd like the product to go."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ ...inputStyle, resize: "vertical", minHeight: 120, fontFamily: "var(--ln-font-sans)" }}
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
            <button type="submit" disabled={submitting} className="ln-btn is-primary">
              {submitting ? "Sending…" : "Send feedback"} <Icon.ArrowR />
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
