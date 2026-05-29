import { useEffect, useState } from "react";
import { Modal, Field } from "./Modal";
import { Icon } from "./Icon";
import { useAuth } from "../../contexts/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PRESETS = [25, 50, 100, 250];

// Themed donation flow. Posts to the create-donation-session edge function and
// redirects to Stripe Checkout. Lets users give anonymously or with name/email.
export function DonateDialog({ open, onClose }: Props) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(50);
  const [custom, setCustom] = useState<string>("");
  const [anon, setAnon] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(50);
    setCustom("");
    setAnon(false);
    setName(user?.user_metadata?.full_name || "");
    setEmail(user?.email || "");
    setError(null);
  }, [open, user]);

  const effectiveAmount = custom ? parseFloat(custom) : amount;
  const isValid = Number.isFinite(effectiveAmount) && effectiveAmount >= 1;

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

  const submit = async () => {
    setError(null);
    if (!isValid) {
      setError("Enter an amount of at least $1.");
      return;
    }
    setProcessing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase configuration");
      const res = await fetch(`${supabaseUrl}/functions/v1/create-donation-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
        },
        body: JSON.stringify({
          amount: effectiveAmount,
          donor_name: anon ? null : name || null,
          donor_email: anon ? null : email || null,
          is_anonymous: anon,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create donation session");
      // Stripe checkout URL.
      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message || "Failed to initiate donation.");
      setProcessing(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Support open surveillance"
      title="Help keep the map free for everyone"
      width={520}
    >
      <p style={{ fontSize: 12.5, color: "var(--ln-ink-3)", margin: "0 0 16px", lineHeight: 1.5 }}>
        LiveHealth+ is operated by a non-profit cooperative. Your donation funds the surveillance pipeline,
        translations, and the open API — keeping the platform free for ministries, researchers, and the public.
      </p>

      <Field label="Amount (USD)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
          {PRESETS.map((p) => {
            const active = !custom && amount === p;
            return (
              <button
                type="button"
                key={p}
                onClick={() => {
                  setCustom("");
                  setAmount(p);
                }}
                className={`ln-btn ${active ? "is-active" : ""}`}
                style={{ justifyContent: "center", padding: "10px 0", fontSize: 14 }}
              >
                ${p}
              </button>
            );
          })}
        </div>
        <input
          type="number"
          min={1}
          step={1}
          placeholder="Or enter a custom amount"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            if (e.target.value) setAmount(NaN);
          }}
          style={inputStyle}
        />
      </Field>

      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 14px", cursor: "pointer" }}>
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
        <span style={{ fontSize: 13, color: "var(--ln-ink-2)" }}>Give anonymously</span>
      </label>

      {!anon && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Name (optional)">
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Email (optional)">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="receipt + thank-you"
            />
          </Field>
        </div>
      )}

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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--ln-ink-4)", fontFamily: "var(--ln-font-mono)" }}>
          Secure checkout · Stripe · receipts emailed
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onClose} className="ln-btn" disabled={processing}>
            Cancel
          </button>
          <button onClick={submit} disabled={processing || !isValid} className="ln-btn is-primary">
            {processing ? "Redirecting…" : `Donate $${isValid ? effectiveAmount.toFixed(0) : "—"}`} <Icon.ArrowR />
          </button>
        </div>
      </div>
    </Modal>
  );
}
