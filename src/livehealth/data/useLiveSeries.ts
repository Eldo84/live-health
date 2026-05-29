import { useMemo } from "react";
import { useDashboardChart } from "../../lib/useDashboardChart";
import { colorForDisease } from "./diseaseColors";

export interface LiveSeries {
  id: string;
  label: string;
  color: string;
  data: number[];
}

// Convert useDashboardChart's row-per-bucket shape into per-disease line series
// matching what LineChart and the dashboard expect.
export function useLiveSeries(timeRange: string = "30d") {
  const { chartData, loading, error } = useDashboardChart(timeRange);

  const { series, labels } = useMemo(() => {
    if (!chartData.length) return { series: [] as LiveSeries[], labels: [] as string[] };
    const labels = chartData.map((p) => p.date as string);
    const diseaseKeys = Object.keys(chartData[0]).filter((k) => k !== "date");
    const series: LiveSeries[] = diseaseKeys
      .map((name, idx) => ({
        id: name,
        label: name,
        color: colorForDisease(name, idx),
        data: chartData.map((p) => Number(p[name] || 0)),
      }))
      // Drop series that are entirely zero — they clutter without signal.
      .filter((s) => s.data.some((v) => v > 0))
      .sort((a, b) => {
        const totalA = a.data.reduce((acc, v) => acc + v, 0);
        const totalB = b.data.reduce((acc, v) => acc + v, 0);
        return totalB - totalA;
      })
      .slice(0, 6);

    return { series, labels };
  }, [chartData]);

  return { series, labels, loading, error };
}
