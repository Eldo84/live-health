import { useEffect, useRef, useState } from "react";
import { fetchSheetRows, SheetRow } from "./sheet";

export function useSheetData(refreshMs = 120_000) {
  const [data, setData] = useState<SheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const rows = await fetchSheetRows();
      setData(rows);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load sheet data");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    fetchData();

    const schedule = () => {
      if (!mounted) return;
      timer.current = setTimeout(async () => {
        await fetchData();
        schedule();
      }, refreshMs);
    };
    schedule();

    // Refresh on tab focus
    const listener = () => fetchData();
    window.addEventListener("focus", listener);
    return () => {
      mounted = false;
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("focus", listener);
    };
  }, [refreshMs]);

  return { data, isLoading, error };
}
