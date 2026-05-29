import { useMemo } from "react";
import { useSponsoredContent, type SponsoredContent } from "../../lib/useSponsoredContent";
import type { Ad } from "../components/AdCard";

const PLAN_ACCENTS: Record<string, string> = {
  enterprise: "#b07cff", // violet — premium
  professional: "#6ab7ff", // info — featured
  basic: "#4ee0c4", // brand — standard
};

const PLAN_TAGS: Record<string, string> = {
  enterprise: "PROMOTED · PREMIUM",
  professional: "PROMOTED · FEATURED",
  basic: "PROMOTED · STANDARD",
};

// Glyph is a 4-12 char monospace stamp. We derive one from the title so the
// glyph fallback still looks deliberate when no image is set.
function glyphFromTitle(title: string): string {
  const cleaned = title
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/);
  if (cleaned.length === 0) return "AD";
  if (cleaned.length === 1) return cleaned[0].slice(0, 10).toUpperCase();
  return cleaned
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// Hostname of the click target → use as "sponsor" attribution when none is
// stored (the DB doesn't currently keep a separate sponsor field).
function sponsorFromUrl(url: string | null | undefined, title: string): string {
  if (!url) return "OutbreakNow Partner";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return title.length > 30 ? title.slice(0, 27) + "…" : title;
  }
}

// Map a `sponsored_content` row to the design's Ad shape so the existing
// AdCard component renders without changes.
export function mapSponsoredToAd(row: SponsoredContent): Ad & {
  imageUrl?: string;
  isVideo?: boolean;
} {
  const accent = PLAN_ACCENTS[row.plan_type] || "#4ee0c4";
  const tag = PLAN_TAGS[row.plan_type] || "PROMOTED";
  const sponsor = sponsorFromUrl(row.click_url, row.title);
  const isVideo = !!row.image_url && /\.(mp4|webm|mov)$/i.test(row.image_url);
  return {
    id: row.id,
    tag,
    sponsor,
    title: row.title,
    body: row.description || "",
    cta: row.click_url ? "Learn more" : "Visit partner",
    accent,
    glyph: glyphFromTitle(row.title),
    url: row.click_url || undefined,
    imageUrl: row.image_url || undefined,
    isVideo,
  };
}

export interface LiveAd extends Ad {
  imageUrl?: string;
  isVideo?: boolean;
  trackView?: (id: string) => void;
  trackClick?: (id: string) => void;
}

interface UseLiveSponsoredOptions {
  /** Which display location the campaign opted into. */
  location?: "map" | "homepage" | "newsletter";
  /** Cap returned ads after sort. */
  limit?: number;
  /** Disable to skip the fetch entirely. */
  enabled?: boolean;
}

export function useLiveSponsored(options: UseLiveSponsoredOptions = {}): {
  ads: LiveAd[];
  loading: boolean;
  error: Error | null;
  trackView: (id: string) => void;
  trackClick: (id: string) => void;
} {
  const { location = "map", limit, enabled = true } = options;
  const { data, isLoading, error, trackView, trackClick } = useSponsoredContent({
    location,
    limit,
    enabled,
  });

  const ads = useMemo<LiveAd[]>(() => {
    return data
      .filter((row) => row.is_active !== false)
      .map((row) => {
        const ad = mapSponsoredToAd(row);
        return { ...ad, trackView, trackClick };
      });
  }, [data, trackView, trackClick]);

  return { ads, loading: isLoading, error, trackView, trackClick };
}
