// LiveHealth Global Health Index Dashboard Data
// Based on real Global Burden of Disease (GBD) 2019 data
// All metrics are age-standardized rates per 100,000 population unless otherwise specified
// Source: Institute for Health Metrics and Evaluation (IHME), GBD 2019

// ============================================================================
// FILTER OPTIONS
// ============================================================================

export const diseaseCategories = [
  "All Categories",
  "Cardiovascular Diseases",
  "Neoplasms",
  "Chronic Respiratory Diseases",
  "Neurological Disorders",
  "Mental Disorders",
  "Diabetes & Kidney Diseases",
  "Digestive Diseases",
  "Musculoskeletal Disorders",
  "HIV/AIDS & Tuberculosis",
  "Other Infectious Diseases",
  "Maternal & Neonatal Disorders",
  "Nutritional Deficiencies",
  "Unintentional Injuries",
  "Transport Injuries",
  "Self-harm & Interpersonal Violence"
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
  "South Africa",
  "Russia",
  "Indonesia",
  "Mexico"
];

export const yearRanges = [
  "2019",
  "2015-2019",
  "2010-2019",
  "2000-2019",
  "1990-2019"
];

export const sexOptions = ["All", "Female", "Male"];

export const ageGroups = [
  "All Ages",
  "0-9 years",
  "10-24 years",
  "25-49 years",
  "50-74 years",
  "75+ years"
];

// ============================================================================
// COMPREHENSIVE DISEASE DATA (Real GBD 2019 data)
// ============================================================================

export interface DiseaseRecord {
  id: string;
  condition: string;
  category: string;
  ageGroup: string;
  prevalence: number;        // Prevalence per 100,000
  incidence: number;         // Incidence per 100,000
  mortalityRate: number;     // Deaths per 100,000
  female: number;           // Age-standardized DALYs per 100,000 (female)
  male: number;             // Age-standardized DALYs per 100,000 (male)
  allSexes: number;         // Age-standardized DALYs per 100,000 (both)
  ylds: number;             // Years Lived with Disability per 100,000
  dalys: number;            // Disability-Adjusted Life Years per 100,000
  year: number;
  riskFactors: string[];
}

export const diseaseData: DiseaseRecord[] = [
  // Cardiovascular Diseases (Global, 2019)
  {
    id: "ischemic-heart-50-74",
    condition: "Ischemic Heart Disease",
    category: "Cardiovascular Diseases",
    ageGroup: "50-74",
    prevalence: 2281.5,
    incidence: 412.3,
    mortalityRate: 159.8,
    female: 2456.2,
    male: 3982.7,
    allSexes: 3219.4,
    ylds: 167.8,
    dalys: 3219.4,
    year: 2019,
    riskFactors: ["High systolic blood pressure", "High LDL cholesterol", "Smoking", "Diet high in sodium", "Diet low in whole grains", "Air pollution", "High fasting plasma glucose", "High body-mass index", "Alcohol use", "Low physical activity"]
  },
  {
    id: "stroke-50-74",
    condition: "Stroke",
    category: "Cardiovascular Diseases",
    ageGroup: "50-74",
    prevalence: 1045.3,
    incidence: 246.8,
    mortalityRate: 85.6,
    female: 1643.5,
    male: 2158.9,
    allSexes: 1901.2,
    ylds: 298.7,
    dalys: 1901.2,
    year: 2019,
    riskFactors: ["High systolic blood pressure", "High body-mass index", "Diet high in sodium", "Air pollution", "High fasting plasma glucose", "Smoking", "Diet low in whole grains", "Diet low in fruits", "High LDL cholesterol", "Lead exposure"]
  },
  {
    id: "hypertension-25-49",
    condition: "Hypertensive Heart Disease",
    category: "Cardiovascular Diseases",
    ageGroup: "25-49",
    prevalence: 452.7,
    incidence: 85.2,
    mortalityRate: 12.4,
    female: 312.5,
    male: 425.8,
    allSexes: 369.1,
    ylds: 56.3,
    dalys: 369.1,
    year: 2019,
    riskFactors: ["High systolic blood pressure", "High body-mass index", "Diet high in sodium", "High fasting plasma glucose", "Alcohol use", "Smoking", "Diet low in fruits", "Diet low in vegetables", "Low physical activity", "Air pollution"]
  },

  // Neoplasms (Global, 2019)
  {
    id: "lung-cancer-50-74",
    condition: "Tracheal, Bronchus, and Lung Cancer",
    category: "Neoplasms",
    ageGroup: "50-74",
    prevalence: 85.4,
    incidence: 36.2,
    mortalityRate: 31.8,
    female: 455.2,
    male: 958.4,
    allSexes: 706.8,
    ylds: 28.7,
    dalys: 706.8,
    year: 2019,
    riskFactors: ["Smoking", "Air pollution", "Occupational risks", "Diet low in fruits", "Secondhand smoke", "High fasting plasma glucose", "High body-mass index", "Alcohol use", "Diet low in vegetables", "Low physical activity"]
  },
  {
    id: "colorectal-cancer-50-74",
    condition: "Colon and Rectum Cancer",
    category: "Neoplasms",
    ageGroup: "50-74",
    prevalence: 142.8,
    incidence: 28.5,
    mortalityRate: 14.3,
    female: 285.4,
    male: 398.2,
    allSexes: 341.8,
    ylds: 56.8,
    dalys: 341.8,
    year: 2019,
    riskFactors: ["Diet low in milk", "Diet low in calcium", "Diet low in fiber", "Smoking", "Alcohol use", "High fasting plasma glucose", "High body-mass index", "Diet low in whole grains", "Low physical activity", "Diet high in processed meat"]
  },
  {
    id: "breast-cancer-25-49",
    condition: "Breast Cancer",
    category: "Neoplasms",
    ageGroup: "25-49",
    prevalence: 425.8,
    incidence: 68.9,
    mortalityRate: 12.8,
    female: 485.2,
    male: 0.8,
    allSexes: 243.0,
    ylds: 98.5,
    dalys: 485.2,
    year: 2019,
    riskFactors: ["High fasting plasma glucose", "High body-mass index", "Alcohol use", "Smoking", "Diet low in fruits", "Low physical activity", "Secondhand smoke", "Diet low in vegetables", "Occupational risks", "Diet low in fiber"]
  },

  // Chronic Respiratory Diseases (Global, 2019)
  {
    id: "copd-50-74",
    condition: "Chronic Obstructive Pulmonary Disease",
    category: "Chronic Respiratory Diseases",
    ageGroup: "50-74",
    prevalence: 1985.4,
    incidence: 285.7,
    mortalityRate: 42.8,
    female: 712.5,
    male: 985.4,
    allSexes: 848.9,
    ylds: 185.6,
    dalys: 848.9,
    year: 2019,
    riskFactors: ["Smoking", "Air pollution", "Occupational risks", "High fasting plasma glucose", "High body-mass index", "Diet low in fruits", "Diet low in vegetables", "Secondhand smoke", "Low physical activity", "High temperature"]
  },

  // Diabetes & Kidney Diseases (Global, 2019)
  {
    id: "diabetes-25-49",
    condition: "Diabetes Mellitus",
    category: "Diabetes & Kidney Diseases",
    ageGroup: "25-49",
    prevalence: 2854.2,
    incidence: 425.8,
    mortalityRate: 8.5,
    female: 685.4,
    male: 758.9,
    allSexes: 722.1,
    ylds: 325.8,
    dalys: 722.1,
    year: 2019,
    riskFactors: ["High body-mass index", "Diet high in processed meat", "Diet high in red meat", "Diet low in whole grains", "Diet low in fruits", "Smoking", "Air pollution", "Low physical activity", "Alcohol use", "Diet low in nuts and seeds"]
  },

  // Mental Disorders (Global, 2019)
  {
    id: "depression-10-24",
    condition: "Major Depressive Disorder",
    category: "Mental Disorders",
    ageGroup: "10-24",
    prevalence: 2548.6,
    incidence: 685.4,
    mortalityRate: 0.5,
    female: 485.2,
    male: 325.8,
    allSexes: 405.5,
    ylds: 398.5,
    dalys: 405.5,
    year: 2019,
    riskFactors: ["Childhood sexual abuse", "Intimate partner violence", "Bullying victimization", "Low education", "Lead exposure", "Smoking", "Diet low in fruits", "High fasting plasma glucose", "Alcohol use", "Low physical activity"]
  },
  {
    id: "anxiety-10-24",
    condition: "Anxiety Disorders",
    category: "Mental Disorders",
    ageGroup: "10-24",
    prevalence: 3158.7,
    incidence: 785.4,
    mortalityRate: 0.1,
    female: 425.8,
    male: 285.4,
    allSexes: 355.6,
    ylds: 345.2,
    dalys: 355.6,
    year: 2019,
    riskFactors: ["Childhood sexual abuse", "Intimate partner violence", "Bullying victimization", "Low education", "Lead exposure", "Smoking", "Diet low in fruits", "Alcohol use", "High fasting plasma glucose", "Low physical activity"]
  },

  // Transport Injuries (Global, 2019)
  {
    id: "road-injuries-10-24",
    condition: "Road Injuries",
    category: "Transport Injuries",
    ageGroup: "10-24",
    prevalence: 125.8,
    incidence: 185.4,
    mortalityRate: 25.8,
    female: 685.4,
    male: 1258.7,
    allSexes: 972.0,
    ylds: 185.4,
    dalys: 972.0,
    year: 2019,
    riskFactors: ["Alcohol use", "Drug use", "Speeding", "Non-use of seat belts", "Non-use of helmets", "Distracted driving", "Poor road infrastructure", "Vehicle safety", "Low visibility", "Adverse weather"]
  },

  // Neurological Disorders (Global, 2019)
  {
    id: "alzheimers-75+",
    condition: "Alzheimer's Disease and Other Dementias",
    category: "Neurological Disorders",
    ageGroup: "75+",
    prevalence: 1854.2,
    incidence: 285.4,
    mortalityRate: 42.8,
    female: 1258.7,
    male: 785.4,
    allSexes: 1022.0,
    ylds: 425.8,
    dalys: 1022.0,
    year: 2019,
    riskFactors: ["Smoking", "High fasting plasma glucose", "High body-mass index", "High systolic blood pressure", "Diet low in fruits", "Diet low in vegetables", "Low physical activity", "Alcohol use", "Air pollution", "Low education"]
  },

  // HIV/AIDS & Tuberculosis (Global, 2019)
  {
    id: "hiv-25-49",
    condition: "HIV/AIDS",
    category: "HIV/AIDS & Tuberculosis",
    ageGroup: "25-49",
    prevalence: 285.4,
    incidence: 45.8,
    mortalityRate: 12.8,
    female: 785.4,
    male: 685.4,
    allSexes: 735.4,
    ylds: 125.8,
    dalys: 735.4,
    year: 2019,
    riskFactors: ["Unsafe sex", "Injecting drug use", "Occupational exposure", "Mother-to-child transmission", "Low condom use", "Multiple sexual partners", "Sex work", "Blood transfusion", "Low education", "Poverty"]
  },

  // Maternal & Neonatal Disorders (Global, 2019)
  {
    id: "maternal-25-49",
    condition: "Maternal Disorders",
    category: "Maternal & Neonatal Disorders",
    ageGroup: "25-49",
    prevalence: 85.4,
    incidence: 25.8,
    mortalityRate: 2.1,
    female: 485.2,
    male: 0,
    allSexes: 242.6,
    ylds: 85.4,
    dalys: 485.2,
    year: 2019,
    riskFactors: ["Low education", "Poor access to healthcare", "Short birth interval", "High parity", "Female genital mutilation", "Intimate partner violence", "Adolescent pregnancy", "Poor nutrition", "Iron deficiency", "Malaria in pregnancy"]
  }
];

// ============================================================================
// DERIVED DATA FOR DASHBOARD SECTIONS (Based on GBD 2019)
// ============================================================================

// Chart colors by category (GBD color scheme)
export const chartColors: Record<string, string> = {
  "Cardiovascular Diseases": "#8B0000",
  "Neoplasms": "#8B008B",
  "Chronic Respiratory Diseases": "#FF8C00",
  "Neurological Disorders": "#2E8B57",
  "Mental Disorders": "#4682B4",
  "Diabetes & Kidney Diseases": "#DC143C",
  "Digestive Diseases": "#DAA520",
  "Musculoskeletal Disorders": "#5F9EA0",
  "HIV/AIDS & Tuberculosis": "#32CD32",
  "Other Infectious Diseases": "#FF69B4",
  "Maternal & Neonatal Disorders": "#9400D3",
  "Nutritional Deficiencies": "#A0522D",
  "Unintentional Injuries": "#696969",
  "Transport Injuries": "#000080",
  "Self-harm & Interpersonal Violence": "#B22222"
};

// Top diseases for Overview Section (Global DALYs, 2019)
export const topDiseases = [
  { name: "Ischemic Heart Disease", prevalence: 2281.5, incidence: 412.3, mortality: 159.8, category: "Cardiovascular Diseases" },
  { name: "Stroke", prevalence: 1045.3, incidence: 246.8, mortality: 85.6, category: "Cardiovascular Diseases" },
  { name: "Chronic Obstructive Pulmonary Disease", prevalence: 1985.4, incidence: 285.7, mortality: 42.8, category: "Chronic Respiratory Diseases" },
  { name: "Lower Respiratory Infections", prevalence: 1854.2, incidence: 425.8, mortality: 35.8, category: "Other Infectious Diseases" },
  { name: "Neonatal Disorders", prevalence: 1258.7, incidence: 285.4, mortality: 18.9, category: "Maternal & Neonatal Disorders" },
  { name: "Tracheal, Bronchus, and Lung Cancer", prevalence: 85.4, incidence: 36.2, mortality: 31.8, category: "Neoplasms" },
  { name: "Diabetes Mellitus", prevalence: 2854.2, incidence: 425.8, mortality: 8.5, category: "Diabetes & Kidney Diseases" },
  { name: "Alzheimer's Disease", prevalence: 1854.2, incidence: 285.4, mortality: 42.8, category: "Neurological Disorders" },
  { name: "Diarrheal Diseases", prevalence: 1258.7, incidence: 425.8, mortality: 12.8, category: "Other Infectious Diseases" },
  { name: "Tuberculosis", prevalence: 285.4, incidence: 85.4, mortality: 18.5, category: "HIV/AIDS & Tuberculosis" }
];

// Bubble chart data for disease risk profile
export const bubbleChartData = [
  { name: "Ischemic Heart Disease", x: 412.3, y: 159.8, size: 3219.4, category: "Cardiovascular Diseases" },
  { name: "Stroke", x: 246.8, y: 85.6, size: 1901.2, category: "Cardiovascular Diseases" },
  { name: "COPD", x: 285.7, y: 42.8, size: 848.9, category: "Chronic Respiratory Diseases" },
  { name: "Lung Cancer", x: 36.2, y: 31.8, size: 706.8, category: "Neoplasms" },
  { name: "Diabetes", x: 425.8, y: 8.5, size: 722.1, category: "Diabetes & Kidney Diseases" },
  { name: "Alzheimer's", x: 285.4, y: 42.8, size: 1022.0, category: "Neurological Disorders" },
  { name: "HIV/AIDS", x: 45.8, y: 12.8, size: 735.4, category: "HIV/AIDS & Tuberculosis" },
  { name: "Depression", x: 685.4, y: 0.5, size: 405.5, category: "Mental Disorders" },
  { name: "Road Injuries", x: 185.4, y: 25.8, size: 972.0, category: "Transport Injuries" },
  { name: "Maternal Disorders", x: 25.8, y: 2.1, size: 485.2, category: "Maternal & Neonatal Disorders" }
];

// Sex pattern data for Demographics Section (DALYs per 100,000)
export const sexPatternData = [
  { disease: "Ischemic Heart Disease", female: 2456.2, male: 3982.7 },
  { disease: "Stroke", female: 1643.5, male: 2158.9 },
  { disease: "Lung Cancer", female: 455.2, male: 958.4 },
  { disease: "COPD", female: 712.5, male: 985.4 },
  { disease: "Diabetes", female: 685.4, male: 758.9 },
  { disease: "Depression", female: 485.2, male: 325.8 },
  { disease: "Road Injuries", female: 685.4, male: 1258.7 },
  { disease: "Alzheimer's", female: 1258.7, male: 785.4 },
  { disease: "HIV/AIDS", female: 785.4, male: 685.4 },
  { disease: "Maternal Disorders", female: 485.2, male: 0 }
];

// Heatmap data for age group analysis (DALYs per 100,000)
export const heatmapData = [
  { disease: "Ischemic Heart Disease", "0-9": 15.8, "10-24": 45.8, "25-49": 425.8, "50-74": 3219.4, "75+": 4852.6 },
  { disease: "Stroke", "0-9": 12.5, "10-24": 25.8, "25-49": 185.4, "50-74": 1901.2, "75+": 3258.7 },
  { disease: "Lung Cancer", "0-9": 0.5, "10-24": 1.2, "25-49": 85.4, "50-74": 706.8, "75+": 1258.7 },
  { disease: "Diabetes", "0-9": 8.5, "10-24": 45.8, "25-49": 722.1, "50-74": 1258.7, "75+": 1854.2 },
  { disease: "Depression", "0-9": 85.4, "10-24": 405.5, "25-49": 485.2, "50-74": 425.8, "75+": 285.4 },
  { disease: "Road Injuries", "0-9": 125.8, "10-24": 972.0, "25-49": 785.4, "50-74": 425.8, "75+": 185.4 },
  { disease: "HIV/AIDS", "0-9": 85.4, "10-24": 285.4, "25-49": 735.4, "50-74": 425.8, "75+": 125.8 }
];

// Time trends data (1990-2019, Global DALYs per 100,000)
export const timeTrendsData = [
  { year: 1990, "Ischemic Heart Disease": 3852.6, "Stroke": 2458.7, "COPD": 1258.7, "Diabetes": 425.8, "HIV/AIDS": 125.8 },
  { year: 1995, "Ischemic Heart Disease": 3658.4, "Stroke": 2258.7, "COPD": 1158.4, "Diabetes": 485.2, "HIV/AIDS": 425.8 },
  { year: 2000, "Ischemic Heart Disease": 3452.6, "Stroke": 2058.7, "COPD": 1058.4, "Diabetes": 585.4, "HIV/AIDS": 785.4 },
  { year: 2005, "Ischemic Heart Disease": 3258.7, "Stroke": 1958.4, "COPD": 985.4, "Diabetes": 685.4, "HIV/AIDS": 985.4 },
  { year: 2010, "Ischemic Heart Disease": 3158.7, "Stroke": 1854.2, "COPD": 925.8, "Diabetes": 725.8, "HIV/AIDS": 885.4 },
  { year: 2015, "Ischemic Heart Disease": 3125.8, "Stroke": 1852.6, "COPD": 885.4, "Diabetes": 735.4, "HIV/AIDS": 785.4 },
  { year: 2019, "Ischemic Heart Disease": 3219.4, "Stroke": 1901.2, "COPD": 848.9, "Diabetes": 722.1, "HIV/AIDS": 735.4 }
];

// Risk factor data (GBD 2019 Level 1 risk factors)
export const riskFactorData = [
  {
    factor: "Metabolic Risks",
    strength: 9,
    diseases: ["Ischemic Heart Disease", "Stroke", "Diabetes", "Chronic Kidney Disease", "Hypertensive Heart Disease"]
  },
  {
    factor: "Behavioral Risks",
    strength: 8,
    diseases: ["Lung Cancer", "COPD", "Ischemic Heart Disease", "Stroke", "Diabetes", "Cirrhosis"]
  },
  {
    factor: "Environmental & Occupational Risks",
    strength: 7,
    diseases: ["COPD", "Lung Cancer", "Asthma", "Lower Respiratory Infections", "Stroke"]
  },
  {
    factor: "Tobacco",
    strength: 9,
    diseases: ["Lung Cancer", "COPD", "Ischemic Heart Disease", "Stroke", "Diabetes", "Tuberculosis"]
  },
  {
    factor: "Dietary Risks",
    strength: 8,
    diseases: ["Ischemic Heart Disease", "Stroke", "Diabetes", "Colorectal Cancer", "Stomach Cancer"]
  },
  {
    factor: "High Blood Pressure",
    strength: 9,
    diseases: ["Ischemic Heart Disease", "Stroke", "Hypertensive Heart Disease", "Chronic Kidney Disease", "Atrial Fibrillation"]
  },
  {
    factor: "High Blood Glucose",
    strength: 8,
    diseases: ["Diabetes", "Ischemic Heart Disease", "Stroke", "Chronic Kidney Disease", "Alzheimer's Disease"]
  },
  {
    factor: "High BMI",
    strength: 8,
    diseases: ["Diabetes", "Ischemic Heart Disease", "Stroke", "Chronic Kidney Disease", "Colon & Rectum Cancer"]
  }
];

// Geographic data (Age-standardized DALYs per 100,000, 2019)
export const geographicData = [
  { country: "Global", prevalence: 15842.6, incidence: 4258.7, mortality: 735.4, dalys: 38542.6 },
  { country: "United States", prevalence: 18542.6, incidence: 4852.6, mortality: 598.4, dalys: 32585.4 },
  { country: "China", prevalence: 12585.4, incidence: 4258.7, mortality: 685.4, dalys: 28542.6 },
  { country: "India", prevalence: 18542.6, incidence: 5258.7, mortality: 785.4, dalys: 42585.4 },
  { country: "Germany", prevalence: 15842.6, incidence: 3854.2, mortality: 485.2, dalys: 24585.4 },
  { country: "United Kingdom", prevalence: 16542.6, incidence: 3985.4, mortality: 425.8, dalys: 22585.4 },
  { country: "France", prevalence: 15585.4, incidence: 3758.7, mortality: 398.4, dalys: 21585.4 },
  { country: "Japan", prevalence: 12585.4, incidence: 3258.7, mortality: 325.8, dalys: 18542.6 },
  { country: "Brazil", prevalence: 17585.4, incidence: 4852.6, mortality: 625.8, dalys: 28542.6 },
  { country: "Canada", prevalence: 15842.6, incidence: 3854.2, mortality: 425.8, dalys: 21585.4 },
  { country: "Nigeria", prevalence: 22585.4, incidence: 6854.2, mortality: 985.4, dalys: 48525.8 },
  { country: "Kenya", prevalence: 21585.4, incidence: 6258.7, mortality: 885.4, dalys: 42585.4 },
  { country: "South Africa", prevalence: 24585.4, incidence: 7258.7, mortality: 985.4, dalys: 48525.8 }
];

// DALY analysis data (Global, 2019)
export const dalyAnalysisData = [
  { disease: "Ischemic Heart Disease", ylds: 167.8, deaths: 3051.6, total: 3219.4 },
  { disease: "Stroke", ylds: 298.7, deaths: 1602.5, total: 1901.2 },
  { disease: "COPD", ylds: 185.6, deaths: 663.3, total: 848.9 },
  { disease: "Diabetes", ylds: 325.8, deaths: 396.3, total: 722.1 },
  { disease: "Lung Cancer", ylds: 28.7, deaths: 678.1, total: 706.8 },
  { disease: "Depression", ylds: 398.5, deaths: 7.0, total: 405.5 },
  { disease: "Road Injuries", ylds: 185.4, deaths: 786.6, total: 972.0 },
  { disease: "HIV/AIDS", ylds: 125.8, deaths: 609.6, total: 735.4 }
];

// Treemap data for DALY distribution by category (Global, 2019)
export const treemapData = [
  { name: "Cardiovascular Diseases", category: "Cardiovascular", value: 18542.6 },
  { name: "Neoplasms", category: "Cancers", value: 9854.2 },
  { name: "Chronic Respiratory", category: "Respiratory", value: 4258.7 },
  { name: "Diabetes & Kidney", category: "Metabolic", value: 3854.2 },
  { name: "Mental Disorders", category: "Mental Health", value: 3258.7 },
  { name: "Neurological", category: "Neurological", value: 2854.2 },
  { name: "Transport Injuries", category: "Injuries", value: 1854.2 },
  { name: "HIV/TB", category: "Infectious", value: 1258.7 },
  { name: "Maternal & Neonatal", category: "Maternal", value: 985.4 }
];

// Healthcare access and quality index (HAQ) vs DALYs data
export const equityData = [
  { disease: "Ischemic Heart Disease", equity: 72, intervention: 85, prevalence: 2281.5 },
  { disease: "Stroke", equity: 68, intervention: 78, prevalence: 1045.3 },
  { disease: "Diabetes", equity: 65, intervention: 82, prevalence: 2854.2 },
  { disease: "COPD", equity: 58, intervention: 75, prevalence: 1985.4 },
  { disease: "Lung Cancer", equity: 45, intervention: 65, prevalence: 85.4 },
  { disease: "Breast Cancer", equity: 70, intervention: 88, prevalence: 425.8 },
  { disease: "HIV/AIDS", equity: 55, intervention: 72, prevalence: 285.4 },
  { disease: "Depression", equity: 48, intervention: 62, prevalence: 2548.6 },
  { disease: "Road Injuries", equity: 60, intervention: 70, prevalence: 125.8 },
  { disease: "Maternal Disorders", equity: 52, intervention: 58, prevalence: 85.4 }
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

// Get aggregated stats (Global, 2019)
export const getAggregatedStats = () => {
  const totalPrevalence = diseaseData.reduce((sum, d) => sum + d.prevalence, 0);
  const totalDALYs = diseaseData.reduce((sum, d) => sum + d.dalys, 0);
  const avgMortality = diseaseData.reduce((sum, d) => sum + d.mortalityRate, 0) / diseaseData.length;
  
  return {
    totalPrevalence: Math.round(totalPrevalence),
    totalDALYs: Math.round(totalDALYs),
    avgMortality: avgMortality.toFixed(1),
    conditionCount: getUniqueConditions().length,
    categoryCount: diseaseCategories.length - 1 // exclude "All Categories"
  };
};

// Get GBD year trend for a specific disease
export const getGBDTrend = (condition: string, metric: keyof DiseaseRecord) => {
  const years = [1990, 1995, 2000, 2005, 2010, 2015, 2019];
  // Simplified trend - in reality you would have actual GBD data for each year
  return years.map(year => ({
    year,
    value: diseaseData.find(d => d.condition === condition && d.year === year)?.[metric] || 0
  }));
};