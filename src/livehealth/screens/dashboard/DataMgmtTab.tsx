import { useMemo, useState } from "react";
import { Icon } from "../../components/Icon";
import { SeverityBar } from "../../components/SeverityBar";
import { SpreadsheetImportDialog } from "../../components/SpreadsheetImportDialog";
import { CityExtractionPanel } from "../../components/CityExtractionPanel";
import { useLiveOutbreaks } from "../../data/useLiveOutbreaks";
import { timeAgo } from "../../lib/utils";
import type { TimeRange } from "../../lib/timeRange";
import { T } from "../../components/T";
import { useT } from "../../lib/useT";

interface Props {
  range: TimeRange;
  isMobile: boolean;
  isTabletDown: boolean;
}

export function DataMgmtTab({ range, isMobile, isTabletDown }: Props) {
  const tChooseRows = useT("Choose how many rows to export");
  const tFilterEvents = useT("Filter events…");
  const tAllData = useT("All data");
  const tFiltered = useT("Filtered");
  const tCurrentPage = useT("Current page");
  const { outbreaks, loading } = useLiveOutbreaks(range, 600);
  const [filter, setFilter] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  // Export scope — mirrors the old DataExportTable's All / Filtered / Current-page choice.
  const [scope, setScope] = useState<"all" | "filtered" | "page">("filtered");

  const PAGE_SIZE = 50;

  const filtered = useMemo(() => {
    if (!filter) return outbreaks;
    const q = filter.toLowerCase();
    return outbreaks.filter(
      (o) =>
        o.disease.toLowerCase().includes(q) ||
        o.country.toLowerCase().includes(q) ||
        (o.city || "").toLowerCase().includes(q) ||
        o.source.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
    );
  }, [outbreaks, filter]);

  // Rows that an export writes, per the selected scope.
  const exportData = useMemo(() => {
    if (scope === "all") return outbreaks;
    if (scope === "page") return filtered.slice(0, PAGE_SIZE);
    return filtered;
  }, [scope, outbreaks, filtered]);

  const handleExportCsv = () => {
    const headers = ["id", "city", "country", "disease", "source", "cases", "deaths", "severity", "updated"];
    const rows = exportData.map((o) =>
      [
        o.id,
        JSON.stringify(o.city),
        JSON.stringify(o.country),
        JSON.stringify(o.disease),
        JSON.stringify(o.source),
        o.cases,
        o.deaths,
        o.severity,
        new Date(o.updated).toISOString(),
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `outbreak-signals-${range}-${scope}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    // Lazy-load jspdf so the bundle doesn't pay for it until someone actually
    // exports a PDF.
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    const stamp = new Date();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("OutbreakNow · Outbreak signals", 40, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(
      `Range: ${range} · scope: ${scope} · ${exportData.length} of ${outbreaks.length} events · generated ${stamp.toLocaleString()}`,
      40,
      58
    );
    doc.setTextColor(0);

    // Manual table — small dependency footprint, plenty for an ops export.
    const cols = [
      { key: "city", header: "Location", width: 110 },
      { key: "disease", header: "Disease", width: 150 },
      { key: "source", header: "Source", width: 110 },
      { key: "cases", header: "Cases", width: 50, align: "right" as const },
      { key: "deaths", header: "Deaths", width: 50, align: "right" as const },
      { key: "severity", header: "Sev", width: 32, align: "right" as const },
      { key: "updated", header: "Updated", width: 90 },
    ];
    let y = 88;
    doc.setFontSize(9);
    doc.setFillColor(240, 240, 240);
    doc.rect(40, y - 12, cols.reduce((s, c) => s + c.width, 0), 16, "F");
    let x = 40;
    doc.setFont("helvetica", "bold");
    cols.forEach((c) => {
      doc.text(c.header, c.align === "right" ? x + c.width - 4 : x + 4, y, {
        align: c.align === "right" ? "right" : "left",
      });
      x += c.width;
    });
    doc.setFont("helvetica", "normal");
    y += 8;
    const fmtDate = (t: number) =>
      new Date(t).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric" });

    exportData.slice(0, 400).forEach((o) => {
      if (y > 540) {
        doc.addPage();
        y = 60;
      }
      x = 40;
      const row: Record<string, string | number> = {
        city: `${o.city || o.country}\n${o.country.toUpperCase()}`,
        disease: o.disease,
        source: o.source,
        cases: o.cases > 0 ? o.cases.toLocaleString() : "—",
        deaths: o.deaths > 0 ? o.deaths.toLocaleString() : "—",
        severity: `${o.severity}/5`,
        updated: fmtDate(o.updated),
      };
      cols.forEach((c) => {
        const txt = String(row[c.key]);
        doc.text(txt, c.align === "right" ? x + c.width - 4 : x + 4, y, {
          align: c.align === "right" ? "right" : "left",
          maxWidth: c.width - 8,
        });
        x += c.width;
      });
      y += 18;
    });

    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      "Source: OutbreakNow surveillance feed · case_count_mentioned / mortality_count_mentioned aggregated by signal.",
      40,
      560
    );
    doc.save(`outbreak-signals-${range}-${scope}.pdf`);
  };

  return (
    <>
      <div style={{ padding: isMobile ? "16px 14px 12px" : "22px 22px 14px", borderBottom: "1px solid var(--ln-line)" }}>
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "flex-end",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="ln-eyebrow"><T>Data management</T></span>
            <h2
              className="ln-display"
              style={{ fontSize: isMobile ? 22 : 30, margin: "6px 0 0", letterSpacing: "-0.02em" }}
            >
              <T>Every event,</T>{" "}
              <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}><T>traceable.</T></span>
            </h2>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "all" | "filtered" | "page")}
              title={tChooseRows}
              style={{
                background: "var(--ln-surface-2)",
                border: "1px solid var(--ln-line-2)",
                padding: "6px 8px",
                fontSize: 12,
                color: "var(--ln-ink)",
                borderRadius: 6,
              }}
            >
              <option value="all">{tAllData} ({outbreaks.length})</option>
              <option value="filtered">{tFiltered} ({filtered.length})</option>
              <option value="page">{tCurrentPage} ({Math.min(PAGE_SIZE, filtered.length)})</option>
            </select>
            <button className="ln-btn" onClick={handleExportCsv}>
              <Icon.ArrowR /> <T>Export CSV</T>
            </button>
            {!isMobile && (
              <button className="ln-btn" onClick={handleExportPdf}>
                <Icon.ArrowR /> <T>Export PDF</T>
              </button>
            )}
            <button className="ln-btn is-primary" onClick={() => setImportOpen(true)}>
              <Icon.Plus /> <T>Import</T>
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: isMobile ? "10px 14px" : "12px 22px",
          borderBottom: "1px solid var(--ln-line)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200, maxWidth: 360 }}>
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ln-ink-4)",
            }}
          >
            <Icon.Search />
          </span>
          <input
            className="ln-input"
            placeholder={tFilterEvents}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <span className="ln-chip is-ok">{filtered.length} <T>rows</T></span>
        <span className="ln-chip">{range} <T>range</T></span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--ln-font-mono)", fontSize: 11, color: "var(--ln-ink-3)" }}>
          {loading ? (
            <T>loading…</T>
          ) : (
            <>
              <T>showing</T> 1–{Math.min(PAGE_SIZE, filtered.length)} <T>of</T> {outbreaks.length}
            </>
          )}
        </span>
      </div>

      <div style={{ borderBottom: "1px solid var(--ln-line)", overflowX: "auto" }}>
        <div style={{ minWidth: isTabletDown ? 760 : "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1.4fr 1.2fr 1fr 80px 80px 100px 80px",
              alignItems: "center",
              gap: 12,
              padding: "10px 22px",
              borderBottom: "1px solid var(--ln-line-2)",
              fontFamily: "var(--ln-font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "var(--ln-ink-4)",
              background: "var(--ln-surface)",
            }}
          >
            <span><T>ID</T></span>
            <span><T>LOCATION</T></span>
            <span><T>DISEASE</T></span>
            <span><T>SOURCE</T></span>
            <span style={{ textAlign: "right" }}><T>CASES</T></span>
            <span style={{ textAlign: "right" }}><T>DEATHS</T></span>
            <span><T>UPDATED</T></span>
            <span style={{ textAlign: "right" }}><T>SEV</T></span>
          </div>
          {filtered.slice(0, PAGE_SIZE).map((o) => (
            <div
              key={o.id}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1.4fr 1.2fr 1fr 80px 80px 100px 80px",
                alignItems: "center",
                gap: 12,
                padding: "8px 22px",
                borderBottom: "1px solid var(--ln-line)",
              }}
            >
              <span
                className="ln-num"
                style={{
                  fontSize: 11,
                  color: "var(--ln-ink-4)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={o.id}
              >
                {o.id.slice(0, 8).toUpperCase()}
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {o.city || o.country}
                </div>
                <div
                  style={{
                    fontFamily: "var(--ln-font-mono)",
                    fontSize: 10,
                    color: "var(--ln-ink-4)",
                  }}
                >
                  {o.country.toUpperCase()}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    background: o.diseaseColor,
                    borderRadius: 1,
                    flex: "0 0 7px",
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--ln-ink-2)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={o.disease}
                >
                  {o.disease}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 11,
                  color: "var(--ln-ink-3)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={o.source}
              >
                {o.source}
              </span>
              <span className="ln-num" style={{ fontSize: 12.5, textAlign: "right" }}>
                {o.cases.toLocaleString()}
              </span>
              <span
                className="ln-num"
                style={{
                  fontSize: 12,
                  textAlign: "right",
                  color: o.deaths > 0 ? "var(--ln-crit)" : "var(--ln-ink-4)",
                }}
              >
                {o.deaths > 0 ? o.deaths.toLocaleString() : "—"}
              </span>
              <span
                style={{
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 11,
                  color: "var(--ln-ink-3)",
                }}
              >
                {timeAgo(o.updated)} <T>ago</T>
              </span>
              <span style={{ textAlign: "right" }}>
                <SeverityBar s={o.severity} />
              </span>
            </div>
          ))}
        </div>
      </div>

      <CityExtractionPanel isMobile={isMobile} />

      <SpreadsheetImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
