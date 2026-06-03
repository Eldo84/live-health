import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { T } from "./T";
import { useT } from "../lib/useT";
import { SYMPTOM_GROUPS } from "../lib/symptomKnowledgeBase";

interface Props {
  /** Selected symptom ids. */
  value: string[];
  onChange: (next: string[]) => void;
}

// Grouped chip multi-select for the spec's symptom catalog (groups A–J). Groups
// collapse to keep the Add Alert dialog compact; a group header shows how many of
// its symptoms are currently selected.
export function SymptomPicker({ value, onChange }: Props) {
  const selected = useMemo(() => new Set(value), [value]);
  // First group open by default; the rest collapsed.
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({
    [SYMPTOM_GROUPS[0].id]: true,
  }));

  const tNoneHint = useT("Tap any symptoms the reporter observed — predictions update live.");

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--ln-ink-3)", marginBottom: 8 }}>{tNoneHint}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {SYMPTOM_GROUPS.map((group) => {
          const count = group.symptoms.filter((s) => selected.has(s.id)).length;
          const isOpen = !!open[group.id];
          return (
            <div
              key={group.id}
              style={{ border: "1px solid var(--ln-line-2)", borderRadius: 6, overflow: "hidden" }}
            >
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [group.id]: !o[group.id] }))}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "8px 10px",
                  background: "var(--ln-surface)",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ln-ink)",
                  fontFamily: "var(--ln-font-sans)",
                  fontSize: 12.5,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <T>{group.label}</T>
                  {count > 0 && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontFamily: "var(--ln-font-mono)",
                        background: "var(--ln-brand)",
                        color: "var(--ln-brand-ink)",
                        borderRadius: 99,
                        padding: "1px 7px",
                        lineHeight: 1.5,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    transform: isOpen ? "rotate(180deg)" : "none",
                    transition: "transform .15s",
                    color: "var(--ln-ink-3)",
                  }}
                >
                  <Icon.Down />
                </span>
              </button>
              {isOpen && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px" }}>
                  {group.symptoms.map((s) => {
                    const on = selected.has(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggle(s.id)}
                        aria-pressed={on}
                        style={{
                          fontSize: 12,
                          padding: "5px 10px",
                          borderRadius: 99,
                          cursor: "pointer",
                          fontFamily: "var(--ln-font-sans)",
                          border: on
                            ? "1px solid var(--ln-brand)"
                            : "1px solid var(--ln-line-2)",
                          background: on
                            ? "color-mix(in oklab, var(--ln-brand) 18%, transparent)"
                            : "var(--ln-surface)",
                          color: on ? "var(--ln-ink)" : "var(--ln-ink-2)",
                        }}
                      >
                        <T>{s.label}</T>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
