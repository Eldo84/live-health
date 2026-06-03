import { useEffect, useState } from "react";
import { Modal, Field } from "./Modal";
import { Icon } from "./Icon";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { T } from "./T";
import { useT } from "../lib/useT";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Tracks where the signup came from so admins can attribute conversions. */
  source?: string;
}

// Themed newsletter signup. Persists to newsletter_subscriptions (one active row
// per email enforced by a partial unique index in the migration).
export function NewsletterDialog({ open, onClose, source = "landing_footer" }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const tEyebrow = useT("Weekly digest");
  const tTitle = useT("Get outbreak alerts in your inbox");
  const tInvalidEmail = useT("Enter a valid email address.");
  const tSubFailed = useT("Subscription failed. Please try again.");
  const tEmailField = useT("Email");
  const [email, setEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail(user?.email || "");
    setError(null);
    setDone(false);
  }, [open, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(tInvalidEmail);
      return;
    }
    setProcessing(true);
    try {
      const { error: insertError } = await supabase.from("newsletter_subscriptions").insert({
        email: trimmed,
        source,
        language,
        user_id: user?.id ?? null,
      });
      if (insertError) {
        // 23505 = unique_violation — already subscribed counts as success from a UX standpoint.
        if ((insertError as any).code === "23505") {
          setDone(true);
          return;
        }
        throw insertError;
      }
      setDone(true);
    } catch (e: any) {
      setError(e?.message || tSubFailed);
    } finally {
      setProcessing(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--ln-surface)",
    border: "1px solid var(--ln-line-2)",
    borderRadius: 6,
    padding: "10px 12px",
    color: "var(--ln-ink)",
    fontSize: 13.5,
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={tEyebrow}
      title={tTitle}
      width={460}
    >
      {done ? (
        <div style={{ textAlign: "center", padding: "12px 0 6px" }}>
          <div
            style={{
              fontSize: 14,
              color: "var(--ln-brand)",
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            <T>You're in.</T>
          </div>
          <p style={{ fontSize: 13, color: "var(--ln-ink-2)", margin: "0 0 18px", lineHeight: 1.5 }}>
            <T>We'll send the weekly digest plus critical alerts. Unsubscribe anytime from the email footer.</T>
          </p>
          <button onClick={onClose} className="ln-btn is-primary" style={{ minWidth: 120 }}>
            <T>Done</T>
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <p style={{ fontSize: 12.5, color: "var(--ln-ink-3)", margin: "0 0 16px", lineHeight: 1.5 }}>
            <T>One short email per week. Critical outbreaks ping you immediately. No spam — promise.</T>
          </p>
          <Field label={tEmailField}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              style={inputStyle}
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
                margin: "12px 0",
              }}
            >
              {error}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
            <button type="button" onClick={onClose} className="ln-btn" disabled={processing}>
              <T>Cancel</T>
            </button>
            <button type="submit" className="ln-btn is-primary" disabled={processing}>
              {processing ? <T>Subscribing…</T> : <T>Subscribe</T>} <Icon.ArrowR />
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
