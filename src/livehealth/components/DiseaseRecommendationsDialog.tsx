import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { T } from "./T";
import { useT } from "../lib/useT";
import { Icon } from "./Icon";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { colorForDisease } from "../data/diseaseColors";

interface DiseaseRec {
  disease_name: string;
  user_recommendations: string[];
  medical_personnel_recommendations: string[];
  summary?: string | null;
  generated_at?: string;
  updated_at?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  diseaseName: string;
}

// Themed per-disease recommendations: fetches stored advice from
// disease_recommendations and falls back to the generate-disease-recommendations
// edge function. Two streams: for the public and for clinicians.
export function DiseaseRecommendationsDialog({ open, onClose, diseaseName }: Props) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rec, setRec] = useState<DiseaseRec | null>(null);

  const tEyebrow = useT("AI public-health recommendations");
  const tWhatToDoAbout = useT("What to do about");
  const tRecommendations = useT("Recommendations");
  const tRegenerate = useT("Regenerate");

  const fetchRec = async (forceRegen = false) => {
    if (!diseaseName) return;
    setError(null);
    forceRegen ? setRegenerating(true) : setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) throw new Error("Missing LiveHealth+ database configuration");

      // Cache lookup first (unless we're explicitly regenerating).
      if (!forceRegen) {
        const { data: stored } = await supabase
          .from("disease_recommendations")
          .select("*")
          .eq("disease_name", diseaseName)
          .eq("is_active", true)
          .maybeSingle();
        if (stored) {
          setRec(stored as DiseaseRec);
          return;
        }
      }

      // Otherwise call the generator (needs a JWT — the edge function verifies it).
      if (!session) {
        throw new Error("Sign in to generate fresh recommendations (cached ones still load without sign-in).");
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-disease-recommendations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ disease_name: diseaseName, force_regenerate: forceRegen }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed: ${res.statusText}`);
      }
      const json = await res.json();
      if (json?.success && json?.data) setRec(json.data as DiseaseRec);
      else throw new Error("Unexpected response format");
    } catch (err: any) {
      setError(err?.message || "Failed to load recommendations.");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    if (open && diseaseName) fetchRec(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, diseaseName]);

  const color = colorForDisease(diseaseName);

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={tEyebrow}
      title={diseaseName ? `${tWhatToDoAbout} ${diseaseName}` : tRecommendations}
      width={760}
      headerRight={
        <button
          className="ln-btn"
          onClick={() => fetchRec(true)}
          disabled={regenerating || loading}
          title={tRegenerate}
        >
          <Icon.Refresh /> {regenerating ? <T>Working…</T> : <T>Regenerate</T>}
        </button>
      }
    >
      {loading && !rec ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ln-ink-3)" }}>
          <Spinner /> <T>Loading recommendations…</T>
        </div>
      ) : error && !rec ? (
        <div
          style={{
            padding: 14,
            background: "color-mix(in oklab, var(--ln-crit) 10%, transparent)",
            border: "1px solid color-mix(in oklab, var(--ln-crit) 38%, transparent)",
            color: "var(--ln-ink)",
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 500 }}><T>Couldn't load recommendations</T></div>
          <p style={{ fontSize: 12.5, color: "var(--ln-ink-2)", margin: "6px 0 12px", lineHeight: 1.5 }}>
            <T>{error}</T>
          </p>
          <button className="ln-btn" onClick={() => fetchRec(false)}>
            <Icon.Refresh /> <T>Retry</T>
          </button>
        </div>
      ) : !rec ? (
        <div style={{ padding: 24, fontSize: 13, color: "var(--ln-ink-3)" }}>
          <T>No recommendations stored yet for this disease.</T>
        </div>
      ) : (
        <>
          {rec.summary && (
            <div
              style={{
                padding: 12,
                marginBottom: 18,
                background: "var(--ln-surface)",
                borderLeft: `2px solid ${color}`,
              }}
            >
              <span className="ln-eyebrow"><T>Summary</T></span>
              <p style={{ fontSize: 14, color: "var(--ln-ink)", margin: "6px 0 0", lineHeight: 1.55 }}>
                {rec.summary}
              </p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <Column
              eyebrow="For the public"
              accent="var(--ln-info)"
              items={rec.user_recommendations || []}
            />
            <Column
              eyebrow="For medical personnel"
              accent="var(--ln-warn)"
              items={rec.medical_personnel_recommendations || []}
            />
          </div>

          <div
            style={{
              marginTop: 18,
              paddingTop: 12,
              borderTop: "1px solid var(--ln-line)",
              fontFamily: "var(--ln-font-mono)",
              fontSize: 10.5,
              color: "var(--ln-ink-4)",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>
              <T>Model:</T> <span style={{ color: "var(--ln-ink-3)" }}>DeepSeek Chat · cached</span>
            </span>
            {rec.updated_at && (
              <span><T>Updated</T> {new Date(rec.updated_at).toLocaleString()}</span>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

function Column({ eyebrow, accent, items }: { eyebrow: string; accent: string; items: string[] }) {
  return (
    <div>
      <span className="ln-eyebrow" style={{ color: accent }}>
        <T>{eyebrow}</T>
      </span>
      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {items.length === 0 ? (
          <li style={{ fontSize: 12.5, color: "var(--ln-ink-3)" }}><T>None recorded.</T></li>
        ) : (
          items.map((it, i) => (
            <li key={i} style={{ display: "grid", gridTemplateColumns: "16px 1fr", alignItems: "flex-start", gap: 8 }}>
              <span
                style={{
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 10,
                  color: accent,
                  marginTop: 4,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: 13, color: "var(--ln-ink)", lineHeight: 1.55 }}>{it}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        marginRight: 8,
        border: "2px solid var(--ln-line-3)",
        borderTopColor: "var(--ln-brand)",
        borderRadius: "50%",
        verticalAlign: "-2px",
        animation: "ln-rotate 0.8s linear infinite",
      }}
    />
  );
}
