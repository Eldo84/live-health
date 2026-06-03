import { useState } from "react";
import { Modal } from "./Modal";
import { T } from "./T";
import { useT } from "../lib/useT";
import { Icon } from "./Icon";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ImportResult {
  total?: number;
  processed?: number;
  skipped?: number;
  errors?: { row: string | number; error: string }[];
}

// Themed wrapper around the import-spreadsheet-data edge function. The function
// pulls from a maintained Google Sheet and upserts diseases / pathogens /
// outbreak categories. Idempotent, so re-running is safe.
const SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1HU-AANvAkXXLqga2rsSMyy5Hhn3_uJ2ewVZ1UrNbC30/edit";

export function SpreadsheetImportDialog({ open, onClose }: Props) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tEyebrow = useT("Reference data sync");
  const tTitle = useT("Import disease taxonomy");

  const runImport = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) throw new Error("Missing LiveHealth+ database configuration");

      const res = await fetch(`${supabaseUrl}/functions/v1/import-spreadsheet-data`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`Import failed: ${res.status} ${res.statusText}`);
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Import failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={tEyebrow}
      title={tTitle}
      width={520}
    >
      <p style={{ fontSize: 12.5, color: "var(--ln-ink-3)", margin: "0 0 14px", lineHeight: 1.55 }}>
        <T>
          Pulls the canonical disease / pathogen / outbreak category sheet and upserts changes into the
          database. Existing rows are updated; new rows are inserted. Safe to re-run.
        </T>
      </p>

      <div
        style={{
          padding: "12px 14px",
          background: "color-mix(in oklab, var(--ln-brand) 8%, transparent)",
          border: "1px solid color-mix(in oklab, var(--ln-brand) 30%, transparent)",
          marginBottom: 16,
        }}
      >
        <div className="ln-eyebrow" style={{ marginBottom: 6 }}>
          <T>What it does</T>
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--ln-ink-2)", lineHeight: 1.5 }}>
          <li><T>Creates or updates diseases, pathogens, and outbreak categories</T></li>
          <li><T>Links diseases to their pathogens and outbreak categories</T></li>
          <li><T>Extracts keywords for better disease detection in news ingestion</T></li>
        </ul>
        <a
          href={SPREADSHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            fontSize: 11.5,
            color: "var(--ln-brand)",
            textDecoration: "none",
            fontFamily: "var(--ln-font-mono)",
            letterSpacing: "0.04em",
          }}
        >
          <T>OPEN SOURCE SHEET</T> <Icon.ArrowR />
        </a>
      </div>

      {result && (
        <div
          style={{
            padding: "12px 14px",
            border: "1px solid color-mix(in oklab, var(--ln-brand) 38%, transparent)",
            background: "color-mix(in oklab, var(--ln-brand) 10%, transparent)",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 13, color: "var(--ln-brand)", fontWeight: 500, marginBottom: 6 }}>
            <T>Import succeeded</T>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              fontFamily: "var(--ln-font-mono)",
              fontSize: 12,
              color: "var(--ln-ink-2)",
            }}
          >
            <span>
              <span style={{ color: "var(--ln-ink-4)" }}><T>TOTAL</T></span> {result.total ?? "—"}
            </span>
            <span>
              <span style={{ color: "var(--ln-ink-4)" }}><T>PROCESSED</T></span> {result.processed ?? "—"}
            </span>
            <span>
              <span style={{ color: "var(--ln-ink-4)" }}><T>SKIPPED</T></span> {result.skipped ?? "—"}
            </span>
          </div>
          {result.errors && result.errors.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--ln-warn)",
                  fontFamily: "var(--ln-font-mono)",
                  letterSpacing: "0.04em",
                }}
              >
                {result.errors.length} <T>ERRORS</T>
              </summary>
              <div style={{ marginTop: 8, maxHeight: 160, overflowY: "auto" }}>
                {result.errors.map((err, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: 11,
                      color: "var(--ln-ink-3)",
                      fontFamily: "var(--ln-font-mono)",
                      padding: "3px 0",
                      borderBottom: "1px dashed var(--ln-line-2)",
                    }}
                  >
                    <span style={{ color: "var(--ln-ink-4)" }}>{err.row}</span> · {err.error}
                  </div>
                ))}
              </div>
            </details>
          )}
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
          <T>{error}</T>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onClose} className="ln-btn" disabled={running}>
          <T>Close</T>
        </button>
        <button onClick={runImport} className="ln-btn is-primary" disabled={running}>
          {running ? <T>Importing…</T> : <T>Run import</T>} <Icon.ArrowR />
        </button>
      </div>
    </Modal>
  );
}
