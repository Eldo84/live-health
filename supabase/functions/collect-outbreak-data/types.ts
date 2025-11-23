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
  disease_type?: "human" | "veterinary" | "zoonotic"; // AI-detected disease type (optional)
  case_count_mentioned?: number;
  mortality_count_mentioned?: number; // Number of deaths/mortalities mentioned in the article
  confidence_score?: number; // 0-1, default 0.5
  originalText?: string; // multilingual/original article text
  translatedText?: string; // English translation
  language?: string; // detected language code (e.g., "en", "fr", "es")
}

export interface DiseaseInfo {
  diseaseName: string;
  pathogen?: string;
  category?: string;
  pathogenType?: string;
  keywords: string;
  diseaseType?: "human" | "veterinary" | "zoonotic";
}
