import type { GeoData, Scope } from "../data/types";

// Cascading geographic filter: Province → District → Neighborhood, plus quick
// presets and a reset. Complements the map/breadcrumb drill-down — sets the same
// `scope` state, so the two stay in sync.

const selStyle: React.CSSProperties = {
  background: "var(--ln-surface-2)",
  border: "1px solid var(--ln-line-2)",
  borderRadius: 6,
  color: "var(--ln-ink)",
  fontSize: 12,
  fontFamily: "var(--ln-font-mono)",
  padding: "6px 8px",
  cursor: "pointer",
  maxWidth: 170,
};

const PRESETS: Array<{ label: string; provinceId?: string }> = [
  { label: "All Zambia" },
  { label: "Lusaka", provinceId: "lusaka" },
  { label: "Copperbelt", provinceId: "copperbelt" },
  { label: "Southern", provinceId: "southern" },
];

export function FilterBar({
  geo,
  scope,
  onChange,
}: {
  geo: GeoData;
  scope: Scope;
  onChange: (s: Scope) => void;
}) {
  const provinceId = scope.provinceId ?? "";
  const districtId = scope.districtId ?? "";
  const districts = geo.districts.filter((d) => d.provinceId === provinceId);
  const localities = geo.localities.filter((l) => l.districtId === districtId);

  const onProvince = (id: string) =>
    onChange(id ? { level: "province", provinceId: id } : { level: "national" });
  const onDistrict = (id: string) =>
    onChange(id ? { level: "district", provinceId, districtId: id } : { level: "province", provinceId });
  const onLocality = (name: string) =>
    onChange({ level: "district", provinceId, districtId, localityName: name || undefined });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <select style={selStyle} value={provinceId} onChange={(e) => onProvince(e.target.value)}>
        <option value="">All Zambia</option>
        {geo.provinces.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <select style={{ ...selStyle, opacity: provinceId ? 1 : 0.5 }} value={districtId} disabled={!provinceId} onChange={(e) => onDistrict(e.target.value)}>
        <option value="">All districts</option>
        {districts.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>

      <select style={{ ...selStyle, opacity: districtId ? 1 : 0.5 }} value={scope.localityName ?? ""} disabled={!districtId} onChange={(e) => onLocality(e.target.value)}>
        <option value="">All areas</option>
        {localities.map((l) => (
          <option key={l.id} value={l.name}>{l.name}</option>
        ))}
      </select>

      <div style={{ width: 1, height: 20, background: "var(--ln-line-2)" }} />

      {PRESETS.map((p) => {
        const active =
          (p.provinceId && scope.level === "province" && scope.provinceId === p.provinceId) ||
          (!p.provinceId && scope.level === "national");
        return (
          <button
            key={p.label}
            className={`ln-btn ${active ? "is-active" : ""}`}
            onClick={() => onProvince(p.provinceId ?? "")}
            style={{ fontSize: 11.5, padding: "5px 9px" }}
          >
            {p.label}
          </button>
        );
      })}

      {scope.level !== "national" && (
        <button className="ln-btn" onClick={() => onChange({ level: "national" })} style={{ fontSize: 11.5, padding: "5px 9px" }}>
          ↺ Reset
        </button>
      )}
    </div>
  );
}
