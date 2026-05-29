interface LineSeries {
  id: string;
  label?: string;
  color: string;
  data: number[];
}

interface LineChartProps {
  series: LineSeries[];
  labels?: string[];
  width?: number;
  height?: number;
  padding?: { l: number; r: number; t: number; b: number };
}

export function LineChart({
  series,
  labels,
  width = 600,
  height = 220,
  padding = { l: 36, r: 12, t: 12, b: 26 },
}: LineChartProps) {
  const W = width - padding.l - padding.r;
  const H = height - padding.t - padding.b;
  const N = series[0]?.data.length ?? 0;
  if (!N) return null;
  // Sanitize: replace null/undefined/NaN in incoming data with 0 so path coords
  // never become NaN (which makes the entire <path> drop silently in browsers).
  const cleanSeries = series.map((s) => ({
    ...s,
    data: s.data.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : 0)),
  }));
  const allValues = cleanSeries.flatMap((s) => s.data);
  const recentSlice = (s: number[]) => s.slice(Math.max(0, s.length - Math.ceil(s.length * 0.3)));
  const recentPeak = Math.max(0, ...cleanSeries.flatMap((s) => recentSlice(s.data)));
  const rawMax = Math.max(...allValues, 0);
  // Floor of 5 so we don't end up dividing by ~0 when everything is quiet.
  const max = Math.max(5, Math.ceil(recentPeak * 1.4));
  const cappedAtPercentile = rawMax > max * 1.5;
  const xAt = (i: number) => padding.l + (N <= 1 ? W / 2 : (i / (N - 1)) * W);
  const yAt = (v: number) => padding.t + H - (Math.min(v, max) / max) * H;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <line
            x1={padding.l}
            y1={padding.t + H * (1 - p)}
            x2={padding.l + W}
            y2={padding.t + H * (1 - p)}
            stroke="var(--ln-line)"
          />
          <text
            x={padding.l - 6}
            y={padding.t + H * (1 - p) + 3}
            fontSize="10"
            textAnchor="end"
            fill="var(--ln-ink-4)"
            fontFamily="var(--ln-font-mono)"
          >
            {Math.round(max * p).toLocaleString()}
          </text>
        </g>
      ))}
      {labels &&
        labels.map((lab, i) =>
          i % 4 === 0 ? (
            <text
              key={i}
              x={xAt(i)}
              y={padding.t + H + 16}
              fontSize="10"
              textAnchor="middle"
              fill="var(--ln-ink-4)"
              fontFamily="var(--ln-font-mono)"
            >
              {lab}
            </text>
          ) : null
        )}
      {cleanSeries.map((s) => {
        const color = s.color || "var(--ln-brand)";
        const path = s.data
          .map((v, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`)
          .join(" ");
        return (
          <g key={s.id}>
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* A small dot at every data point — guarantees the series is visible
                even when the line is degenerate (single point, all-zero data). */}
            {s.data.map((v, i) => (
              <circle key={i} cx={xAt(i)} cy={yAt(v)} r={i === N - 1 ? 3.5 : 1.6} fill={color} />
            ))}
          </g>
        );
      })}
      {cappedAtPercentile && (
        <text
          x={padding.l + W - 4}
          y={padding.t + 10}
          fontSize="9"
          textAnchor="end"
          fill="var(--ln-ink-4)"
          fontFamily="var(--ln-font-mono)"
          letterSpacing="0.08em"
        >
          y-axis capped · peak {rawMax.toLocaleString()}
        </text>
      )}
    </svg>
  );
}
