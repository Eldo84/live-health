// LiveHealth Global Health Index Dashboard Data
// Based on LiveHealth-database spreadsheet structure
// https://docs.google.com/spreadsheets/d/1HU-AANvAkXXLqga2rsSMyy5Hhn3_uJ2ewVZ1UrNbC30

// ============================================================================
// FILTER OPTIONS
// ============================================================================

export const diseaseCategories = [
  "All Categories",
  "Cardiovascular and Metabolic Disorders",
  "Cancers",
  "Respiratory Diseases",
  "Neurological Disorders",
  "Musculoskeletal Disorders",
  "Mental and Behavioral Disorders",
  "Endocrine and Hematologic Disorders",
  "High-Burden Infectious Diseases",
  "Neglected Tropical Diseases",
  "Injuries & Trauma",
  "Violence & Self-Harm",
  "Maternal, Neonatal, and Child Health",
  "Environmental & Occupational Health",
  "Sensory Disorders"
];

export const countries = [
  "Global",
  "United States",
  "China",
  "India",
  "Germany",
  "United Kingdom",
  "France",
  "Japan",
  "Brazil",
  "Canada",
  "Nigeria",
  "Kenya",
  "South Africa"
];

export const yearRanges = [
  "2023",
  "2020-2024",
  "2015-2024",
  "2010-2024",
  "2000-2024"
];

export const sexOptions = ["All", "Female", "Male"];

export const ageGroups = [
  "All Ages",
  "0-17 years",
  "18-35 years",
  "36-60 years",
  "60+ years"
];

// ============================================================================
// COMPREHENSIVE DISEASE DATA (from spreadsheet)
// ============================================================================

export interface DiseaseRecord {
  id: string;
  condition: string;
  category: string;
  ageGroup: string;
  prevalence: number;
  incidence: number;
  mortalityRate: number;
  female: number;
  male: number;
  allSexes: number;
  ylds: number;
  dalys: number;
  year: number;
  riskFactors: string[];
}

export const diseaseData: DiseaseRecord[] = [
  // Cardiovascular and Metabolic Disorders
  {
    id: "diabetes-36-60",
    condition: "Diabetes (Type 2)",
    category: "Cardiovascular and Metabolic Disorders",
    ageGroup: "36-60",
    prevalence: 8500,
    incidence: 450,
    mortalityRate: 0.8,
    female: 7900,
    male: 9100,
    allSexes: 8500,
    ylds: 520,
    dalys: 1200,
    year: 2023,
    riskFactors: ["Obesity", "Physical inactivity", "Poor diet", "Genetics", "Hypertension", "High cholesterol", "Age", "Ethnicity"]
  },
  {
    id: "diabetes-60+",
    condition: "Diabetes (Type 2)",
    category: "Cardiovascular and Metabolic Disorders",
    ageGroup: "60+",
    prevalence: 21000,
    incidence: 620,
    mortalityRate: 2.5,
    female: 20000,
    male: 22000,
    allSexes: 21000,
    ylds: 1100,
    dalys: 3800,
    year: 2023,
    riskFactors: ["Obesity", "Physical inactivity", "Poor diet", "Genetics", "Hypertension", "High cholesterol", "Age", "Ethnicity"]
  },
  {
    id: "hypertension-36-60",
    condition: "Hypertension",
    category: "Cardiovascular and Metabolic Disorders",
    ageGroup: "36-60",
    prevalence: 32000,
    incidence: 2100,
    mortalityRate: 0.1,
    female: 30000,
    male: 34000,
    allSexes: 32000,
    ylds: 210,
    dalys: 300,
    year: 2023,
    riskFactors: ["Age", "Family history", "Obesity", "Physical inactivity", "High salt intake", "Excessive alcohol", "Smoking", "Stress"]
  },
  {
    id: "hypertension-60+",
    condition: "Hypertension",
    category: "Cardiovascular and Metabolic Disorders",
    ageGroup: "60+",
    prevalence: 65000,
    incidence: 2800,
    mortalityRate: 0.5,
    female: 68000,
    male: 62000,
    allSexes: 65000,
    ylds: 450,
    dalys: 1500,
    year: 2023,
    riskFactors: ["Age", "Family history", "Obesity", "Physical inactivity", "High salt intake", "Excessive alcohol", "Smoking", "Stress"]
  },
  {
    id: "cvd-60+",
    condition: "Cardiovascular Disease",
    category: "Cardiovascular and Metabolic Disorders",
    ageGroup: "60+",
    prevalence: 12500,
    incidence: 1200,
    mortalityRate: 12.0,
    female: 11000,
    male: 14000,
    allSexes: 12500,
    ylds: 600,
    dalys: 4500,
    year: 2023,
    riskFactors: ["Hypertension", "High cholesterol", "Smoking", "Diabetes", "Obesity", "Physical inactivity", "Family history", "Age", "Poor diet"]
  },
  {
    id: "stroke-60+",
    condition: "Stroke",
    category: "Cardiovascular and Metabolic Disorders",
    ageGroup: "60+",
    prevalence: 2800,
    incidence: 350,
    mortalityRate: 18.0,
    female: 2600,
    male: 3000,
    allSexes: 2800,
    ylds: 850,
    dalys: 3200,
    year: 2023,
    riskFactors: ["Hypertension", "Smoking", "Diabetes", "High cholesterol", "Obesity", "Heart disease", "Physical inactivity", "Age", "Genetics"]
  },
  {
    id: "obesity-18-35",
    condition: "Obesity",
    category: "Cardiovascular and Metabolic Disorders",
    ageGroup: "18-35",
    prevalence: 22000,
    incidence: 1800,
    mortalityRate: 0.05,
    female: 23000,
    male: 21000,
    allSexes: 22000,
    ylds: 310,
    dalys: 330,
    year: 2023,
    riskFactors: ["Poor diet", "Physical inactivity", "Genetics", "Hormonal imbalances", "Age", "Environment", "Stress"]
  },

  // Cancers
  {
    id: "lung-cancer-60+",
    condition: "Lung Cancer",
    category: "Cancers",
    ageGroup: "60+",
    prevalence: 450,
    incidence: 85,
    mortalityRate: 70.0,
    female: 350,
    male: 550,
    allSexes: 450,
    ylds: 120,
    dalys: 1050,
    year: 2023,
    riskFactors: ["Smoking", "Secondhand smoke", "Radon", "Air pollution", "Family history", "Occupational exposures (asbestos)"]
  },
  {
    id: "breast-cancer-36-60",
    condition: "Breast Cancer",
    category: "Cancers",
    ageGroup: "36-60",
    prevalence: 1200,
    incidence: 110,
    mortalityRate: 8.0,
    female: 2400,
    male: 0,
    allSexes: 1200,
    ylds: 280,
    dalys: 520,
    year: 2023,
    riskFactors: ["Family history", "Genetics (BRCA1/2)", "Hormonal factors", "Obesity", "Alcohol consumption", "Physical inactivity", "Age"]
  },
  {
    id: "colorectal-cancer-60+",
    condition: "Colorectal Cancer",
    category: "Cancers",
    ageGroup: "60+",
    prevalence: 900,
    incidence: 120,
    mortalityRate: 30.0,
    female: 850,
    male: 950,
    allSexes: 900,
    ylds: 150,
    dalys: 650,
    year: 2023,
    riskFactors: ["Family history", "Genetics (Lynch syndrome)", "High-fat diet", "Physical inactivity", "Obesity", "Age", "Smoking", "Alcohol use"]
  },

  // Mental and Behavioral Disorders
  {
    id: "depression-18-35",
    condition: "Depression",
    category: "Mental and Behavioral Disorders",
    ageGroup: "18-35",
    prevalence: 4800,
    incidence: 900,
    mortalityRate: 0.5,
    female: 5500,
    male: 4100,
    allSexes: 4800,
    ylds: 1050,
    dalys: 1150,
    year: 2023,
    riskFactors: ["Family history", "Genetics", "Stress", "Trauma", "Substance abuse", "Chronic illness", "Lack of social support"]
  },
  {
    id: "anxiety-18-35",
    condition: "Anxiety Disorders",
    category: "Mental and Behavioral Disorders",
    ageGroup: "18-35",
    prevalence: 6200,
    incidence: 1300,
    mortalityRate: 0.1,
    female: 7000,
    male: 5400,
    allSexes: 6200,
    ylds: 800,
    dalys: 810,
    year: 2023,
    riskFactors: ["Family history", "Stress", "Trauma", "Substance abuse", "Genetics", "Medical conditions", "Social pressures"]
  },

  // Injuries & Trauma
  {
    id: "road-traffic-18-35",
    condition: "Road Traffic Accidents",
    category: "Injuries & Trauma",
    ageGroup: "18-35",
    prevalence: 150,
    incidence: 220,
    mortalityRate: 2.5,
    female: 90,
    male: 210,
    allSexes: 150,
    ylds: 400,
    dalys: 850,
    year: 2023,
    riskFactors: ["Speeding", "Alcohol use", "Distracted driving", "Lack of seat belts", "Poor road conditions", "Reckless driving"]
  }
];

// ============================================================================
// DERIVED DATA FOR DASHBOARD SECTIONS
// ============================================================================

// Chart colors by category
export const chartColors: Record<string, string> = {
  "Cardiovascular and Metabolic Disorders": "#1e40af",
  "Cancers": "#dc2626",
  "Respiratory Diseases": "#ea580c",
  "Neurological Disorders": "#7c3aed",
  "Musculoskeletal Disorders": "#0891b2",
  "Mental and Behavioral Disorders": "#db2777",
  "Endocrine and Hematologic Disorders": "#9333ea",
  "High-Burden Infectious Diseases": "#059669",
  "Injuries & Trauma": "#d97706",
  "Violence & Self-Harm": "#be123c",
  "Maternal, Neonatal, and Child Health": "#0d9488",
  "CVD": "#1e40af",
  "Cancer": "#dc2626",
  "Mental Health": "#db2777",
  "Injury": "#d97706"
};

// Top diseases for Overview Section (aggregated by condition)
export const topDiseases = [
  { name: "Hypertension", prevalence: 65000, incidence: 2800, mortality: 0.5, category: "CVD" },
  { name: "Diabetes (Type 2)", prevalence: 21000, incidence: 620, mortality: 2.5, category: "CVD" },
  { name: "Obesity", prevalence: 22000, incidence: 1800, mortality: 0.05, category: "CVD" },
  { name: "Cardiovascular Disease", prevalence: 12500, incidence: 1200, mortality: 12.0, category: "CVD" },
  { name: "Anxiety Disorders", prevalence: 6200, incidence: 1300, mortality: 0.1, category: "Mental Health" },
  { name: "Depression", prevalence: 4800, incidence: 900, mortality: 0.5, category: "Mental Health" },
  { name: "Stroke", prevalence: 2800, incidence: 350, mortality: 18.0, category: "CVD" },
  { name: "Breast Cancer", prevalence: 1200, incidence: 110, mortality: 8.0, category: "Cancer" },
  { name: "Colorectal Cancer", prevalence: 900, incidence: 120, mortality: 30.0, category: "Cancer" },
  { name: "Lung Cancer", prevalence: 450, incidence: 85, mortality: 70.0, category: "Cancer" }
];

// Bubble chart data for disease risk profile
export const bubbleChartData = [
  { name: "Hypertension", x: 2800, y: 0.5, size: 65000, category: "CVD" },
  { name: "Diabetes", x: 620, y: 2.5, size: 21000, category: "CVD" },
  { name: "CVD", x: 1200, y: 12.0, size: 12500, category: "CVD" },
  { name: "Stroke", x: 350, y: 18.0, size: 2800, category: "CVD" },
  { name: "Obesity", x: 1800, y: 0.05, size: 22000, category: "CVD" },
  { name: "Lung Cancer", x: 85, y: 70.0, size: 450, category: "Cancer" },
  { name: "Breast Cancer", x: 110, y: 8.0, size: 1200, category: "Cancer" },
  { name: "Colorectal Cancer", x: 120, y: 30.0, size: 900, category: "Cancer" },
  { name: "Depression", x: 900, y: 0.5, size: 4800, category: "Mental Health" },
  { name: "Anxiety", x: 1300, y: 0.1, size: 6200, category: "Mental Health" },
  { name: "Road Accidents", x: 220, y: 2.5, size: 150, category: "Injury" }
];

// Sex pattern data for Demographics Section
export const sexPatternData = [
  { disease: "Hypertension (60+)", female: 68000, male: 62000 },
  { disease: "Hypertension (36-60)", female: 30000, male: 34000 },
  { disease: "Diabetes (60+)", female: 20000, male: 22000 },
  { disease: "Diabetes (36-60)", female: 7900, male: 9100 },
  { disease: "Cardiovascular Disease", female: 11000, male: 14000 },
  { disease: "Stroke", female: 2600, male: 3000 },
  { disease: "Obesity", female: 23000, male: 21000 },
  { disease: "Lung Cancer", female: 350, male: 550 },
  { disease: "Breast Cancer", female: 2400, male: 0 },
  { disease: "Colorectal Cancer", female: 850, male: 950 },
  { disease: "Depression", female: 5500, male: 4100 },
  { disease: "Anxiety Disorders", female: 7000, male: 5400 },
  { disease: "Road Traffic Accidents", female: 90, male: 210 }
];

// Heatmap data for age group analysis
export const heatmapData = [
  { disease: "Hypertension", "0-17": 50, "18-35": 5000, "36-60": 32000, "60+": 65000 },
  { disease: "Diabetes", "0-17": 100, "18-35": 2500, "36-60": 8500, "60+": 21000 },
  { disease: "CVD", "0-17": 10, "18-35": 500, "36-60": 4500, "60+": 12500 },
  { disease: "Stroke", "0-17": 5, "18-35": 150, "36-60": 800, "60+": 2800 },
  { disease: "Obesity", "0-17": 8000, "18-35": 22000, "36-60": 18000, "60+": 12000 },
  { disease: "Depression", "0-17": 1200, "18-35": 4800, "36-60": 3500, "60+": 2800 },
  { disease: "Cancer (All)", "0-17": 50, "18-35": 200, "36-60": 1200, "60+": 2550 }
];

// Time trends data (simulated yearly progression)
export const timeTrendsData = [
  { year: 2019, "Hypertension": 58000, "Diabetes": 18000, "CVD": 11000, "Stroke": 2500, "Depression": 4200 },
  { year: 2020, "Hypertension": 60000, "Diabetes": 19000, "CVD": 11500, "Stroke": 2600, "Depression": 4500 },
  { year: 2021, "Hypertension": 62000, "Diabetes": 19800, "CVD": 12000, "Stroke": 2700, "Depression": 4600 },
  { year: 2022, "Hypertension": 63500, "Diabetes": 20500, "CVD": 12200, "Stroke": 2750, "Depression": 4700 },
  { year: 2023, "Hypertension": 65000, "Diabetes": 21000, "CVD": 12500, "Stroke": 2800, "Depression": 4800 }
];

// Risk factor data for Risk Factors Section
export const riskFactorData = [
  {
    factor: "Obesity",
    strength: 9,
    diseases: ["Diabetes (Type 2)", "Hypertension", "Cardiovascular Disease", "Stroke", "Breast Cancer", "Colorectal Cancer"]
  },
  {
    factor: "Smoking",
    strength: 9,
    diseases: ["Lung Cancer", "Cardiovascular Disease", "Stroke", "Hypertension", "Colorectal Cancer"]
  },
  {
    factor: "Physical Inactivity",
    strength: 8,
    diseases: ["Diabetes (Type 2)", "Hypertension", "Obesity", "Cardiovascular Disease", "Depression", "Anxiety Disorders"]
  },
  {
    factor: "Poor Diet",
    strength: 8,
    diseases: ["Diabetes (Type 2)", "Hypertension", "Obesity", "Cardiovascular Disease", "Colorectal Cancer"]
  },
  {
    factor: "Alcohol Use",
    strength: 7,
    diseases: ["Hypertension", "Breast Cancer", "Colorectal Cancer", "Road Traffic Accidents", "Depression"]
  },
  {
    factor: "Stress",
    strength: 7,
    diseases: ["Hypertension", "Depression", "Anxiety Disorders", "Obesity", "Cardiovascular Disease"]
  },
  {
    factor: "Family History/Genetics",
    strength: 8,
    diseases: ["Diabetes (Type 2)", "Hypertension", "Cardiovascular Disease", "Breast Cancer", "Colorectal Cancer", "Depression"]
  },
  {
    factor: "Age",
    strength: 9,
    diseases: ["Cardiovascular Disease", "Stroke", "Diabetes (Type 2)", "Hypertension", "Lung Cancer", "Colorectal Cancer"]
  }
];

// Geographic data (sample country-level metrics)
export const geographicData = [
  { country: "United States", prevalence: 45000, incidence: 3200, mortality: 8.5, dalys: 12500 },
  { country: "United Kingdom", prevalence: 38000, incidence: 2800, mortality: 7.2, dalys: 9800 },
  { country: "Germany", prevalence: 35000, incidence: 2600, mortality: 6.8, dalys: 8900 },
  { country: "France", prevalence: 32000, incidence: 2400, mortality: 6.5, dalys: 8200 },
  { country: "Japan", prevalence: 28000, incidence: 2100, mortality: 5.2, dalys: 6800 },
  { country: "Brazil", prevalence: 52000, incidence: 3800, mortality: 9.8, dalys: 14200 },
  { country: "India", prevalence: 68000, incidence: 4500, mortality: 11.5, dalys: 18500 },
  { country: "Nigeria", prevalence: 42000, incidence: 3500, mortality: 12.8, dalys: 15800 },
  { country: "Kenya", prevalence: 38000, incidence: 3200, mortality: 11.2, dalys: 14200 }
];

// DALY analysis data
export const dalyAnalysisData = [
  { disease: "Cardiovascular Disease", ylds: 600, deaths: 1500, total: 4500 },
  { disease: "Diabetes (Type 2)", ylds: 1620, deaths: 525, total: 5000 },
  { disease: "Stroke", ylds: 850, deaths: 504, total: 3200 },
  { disease: "Hypertension", ylds: 660, deaths: 325, total: 1800 },
  { disease: "Lung Cancer", ylds: 120, deaths: 315, total: 1050 },
  { disease: "Depression", ylds: 1050, deaths: 24, total: 1150 },
  { disease: "Anxiety Disorders", ylds: 800, deaths: 6, total: 810 },
  { disease: "Road Traffic Accidents", ylds: 400, deaths: 4, total: 850 }
];

// Treemap data for DALY distribution by category
export const treemapData = [
  { name: "Cardiovascular & Metabolic", category: "CVD", value: 14030 },
  { name: "Cancers", category: "Cancer", value: 2220 },
  { name: "Mental Health", category: "Mental Health", value: 1960 },
  { name: "Injuries & Trauma", category: "Injury", value: 850 }
];

// Equity vs intervention scatter data
export const equityData = [
  { disease: "Hypertension", equity: 72, intervention: 85, prevalence: 65000 },
  { disease: "Diabetes", equity: 68, intervention: 78, prevalence: 21000 },
  { disease: "Cardiovascular Disease", equity: 65, intervention: 82, prevalence: 12500 },
  { disease: "Stroke", equity: 58, intervention: 75, prevalence: 2800 },
  { disease: "Lung Cancer", equity: 45, intervention: 65, prevalence: 450 },
  { disease: "Breast Cancer", equity: 70, intervention: 88, prevalence: 1200 },
  { disease: "Colorectal Cancer", equity: 55, intervention: 72, prevalence: 900 },
  { disease: "Depression", equity: 48, intervention: 62, prevalence: 4800 },
  { disease: "Anxiety Disorders", equity: 52, intervention: 58, prevalence: 6200 },
  { disease: "Road Traffic Accidents", equity: 60, intervention: 70, prevalence: 150 }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get diseases by category
export const getDiseasesByCategory = (category: string): DiseaseRecord[] => {
  if (category === "All Categories") return diseaseData;
  return diseaseData.filter(d => d.category === category);
};

// Get unique conditions
export const getUniqueConditions = (): string[] => {
  return [...new Set(diseaseData.map(d => d.condition))];
};

// Get aggregated stats
export const getAggregatedStats = () => {
  const totalPrevalence = diseaseData.reduce((sum, d) => sum + d.prevalence, 0);
  const totalDALYs = diseaseData.reduce((sum, d) => sum + d.dalys, 0);
  const avgMortality = diseaseData.reduce((sum, d) => sum + d.mortalityRate, 0) / diseaseData.length;
  
  return {
    totalPrevalence,
    totalDALYs,
    avgMortality: avgMortality.toFixed(1),
    conditionCount: getUniqueConditions().length,
    categoryCount: diseaseCategories.length - 1 // exclude "All Categories"
  };
};
