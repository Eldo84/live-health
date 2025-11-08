export interface NormalizedArticle {
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  source:
    | "CDC"
    | "WHO"
    | "Google News"
    | "BBC Health"
    | "Reuters Health"
    | "ProMED-mail";
  id?: string; // for reference only
  location?: {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
  diseases?: string[];
  detected_disease_name?: string; // Actual disease name when disease is "OTHER" (not in CSV)
  case_count_mentioned?: number;
  confidence_score?: number; // 0-1, default 0.5
}

export interface DiseaseInfo {
  diseaseName: string;
  pathogen?: string;
  category?: string;
  pathogenType?: string;
  keywords: string;
}
