import usaFile from './usa.json';
import chinaFileRaw from './china.json';

export interface Disease {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  pathogen?: string;
  keywords: string[];
}

export interface DiseaseData {
  id: string;
  condition: string;
  category: string;
  prevalence: number;
  incidence: number;
  mortalityRate: number;
  female: number;
  male: number;
  allSexes: number;
  ylds: number;
  dalys: number;
  year: number;
  location: string;
  dataSource: string;
  riskFactors: string[];
  baseId: string;
}

export interface CountryData {
  country: string;
  countryCode: string;
  region: string;
  prevalence: number;
  incidence: number;
  mortality: number;
  dalys: number;
  year: number;
}

export interface TimeSeriesData {
  year: number;
  prevalence: number;
  incidence: number;
  mortality: number;
  dalys: number;
}

export interface RiskFactor {
  name: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CategorySummary {
  category: string;
  totalPrevalence: number;
  totalDalys: number;
  conditionCount: number;
  avgMortality: number;
}

type RawRecord = {
  condition: string;
  category?: string;
  prevalence?: number | string;
  incidence?: number | string;
  mortalityRate?: number | string;
  mortality_rate?: number | string; // snake_case variant
  female?: number | string;
  male?: number | string;
  allSexes?: number | string;
  all_sexes?: number | string; // snake_case variant
  ylds?: number | string;
  dalys?: number | string;
  year?: number | string;
  location?: string;
  dataSource?: string;
  data_source?: string; // snake_case variant
  riskFactors?: string | string[];
  risk_factors?: string | string[]; // snake_case variant
  equity?: string;
  interventions?: string;
};

type CountryFile = {
  country: string;
  year?: number;
  metadata?: Record<string, unknown>;
  records: RawRecord[];
};

// Transform China data from array format to CountryFile format
const transformChinaData = (): CountryFile => {
  // china.json is an array of records, need to wrap it
  const chinaRecords = Array.isArray(chinaFileRaw) ? chinaFileRaw : [];
  
  // Transform snake_case to camelCase and normalize structure
  const transformedRecords: RawRecord[] = chinaRecords.map((record: any) => ({
    condition: record.condition || '',
    category: record.category || '',
    prevalence: record.prevalence,
    incidence: record.incidence,
    mortalityRate: record.mortality_rate || record.mortalityRate,
    female: record.female,
    male: record.male,
    allSexes: record.all_sexes || record.allSexes,
    ylds: record.ylds,
    dalys: record.dalys,
    year: record.year,
    location: record.location || 'China',
    dataSource: record.data_source || record.dataSource,
    riskFactors: record.risk_factors || record.riskFactors,
    equity: record.equity,
    interventions: record.interventions,
  }));
  
  return {
    country: 'CHN',
    records: transformedRecords,
    metadata: {
      source: 'china.json',
      transformed: true,
    },
  };
};

const rawCountryFiles: CountryFile[] = [
  usaFile as CountryFile,
  transformChinaData(),
];

const slugifyCondition = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Normalize country codes (US -> USA, etc.)
export const normalizeCountryCode = (code: string): string => {
  const upper = code.toUpperCase().trim();
  const countryMap: Record<string, string> = {
    'US': 'USA',
    'UNITED STATES': 'USA',
    'UNITED STATES OF AMERICA': 'USA',
    'U.S.': 'USA',
    'U.S.A.': 'USA',
    'CN': 'CHN',  // ISO 3166-1 alpha-2 code
    'CHINA': 'CHN',
    'PRC': 'CHN',
    'PEOPLE\'S REPUBLIC OF CHINA': 'CHN',
  };
  return countryMap[upper] || upper;
};

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  // Remove commas and tildes (~) and other non-numeric prefixes
  const cleaned = value.replace(/[~,]/g, '').trim();
  // Extract all numbers (including decimals and negatives)
  const matches = cleaned.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return 0;
  const nums = matches.map(Number).filter(n => Number.isFinite(n));
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];
  // If multiple numbers (like "2-3"), return average
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Number(avg.toFixed(2));
};

const splitRiskFactors = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;]+/)
      .map(v => v.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizedRecords: DiseaseData[] = rawCountryFiles.flatMap(file => {
  return (file.records || []).map((record, idx) => {
    const category = record.category?.trim() || 'Uncategorized';
    const condition = record.condition?.trim() || `condition-${idx}`;
    const baseId = slugifyCondition(condition);
    const year = parseInt(String(record.year ?? file.year ?? 0), 10) || 0;
    const countryCode = normalizeCountryCode(file.country || record.location || 'UNK');
    return {
      id: `${baseId}-${countryCode}-${year || idx}`,
      baseId,
      condition,
      category,
      prevalence: parseNumber(record.prevalence),
      incidence: parseNumber(record.incidence),
      mortalityRate: parseNumber(record.mortalityRate || record.mortality_rate),
      female: parseNumber(record.female),
      male: parseNumber(record.male),
      allSexes: parseNumber(record.allSexes || record.all_sexes),
      ylds: parseNumber(record.ylds),
      dalys: parseNumber(record.dalys),
      year,
      location: countryCode,
      dataSource: (record.dataSource || record.data_source || '').toString(),
      riskFactors: splitRiskFactors(record.riskFactors || record.risk_factors),
    };
  });
});

// Latest record per condition (baseId) for UI lists and summaries
const latestByBaseId = new Map<string, DiseaseData>();
normalizedRecords
  .filter(r => r.year > 0)
  .sort((a, b) => a.year - b.year)
  .forEach(rec => latestByBaseId.set(rec.baseId, rec));

export const diseaseData: DiseaseData[] = normalizedRecords;
export const getLatestDiseaseData = (baseId: string): DiseaseData | undefined =>
  latestByBaseId.get(baseId);

export const categories: string[] = Array.from(
  new Set(normalizedRecords.map(r => r.category)),
).sort();

export const diseases: Disease[] = Array.from(latestByBaseId.values()).map(d => ({
  id: d.baseId,
  name: d.condition,
  category: d.category,
  subCategory: d.category,
  keywords: d.riskFactors.slice(0, 3),
}));

// Debug: Log first few records to verify parsing
if (process.env.NODE_ENV === 'development' && normalizedRecords.length > 0) {
  console.log('Sample normalized record:', normalizedRecords[0]);
  console.log('Total records:', normalizedRecords.length);
  console.log('Diseases count:', diseases.length);
  console.log('Sample disease:', diseases[0]);
  const countries = Array.from(new Set(normalizedRecords.map(r => r.location)));
  console.log('Available countries in data:', countries);
  console.log('Data sources loaded:', rawCountryFiles.map(f => `${f.country} (${f.records?.length || 0} records)`));
  console.log('Country code mapping: US ->', normalizeCountryCode('US'), ', United States ->', normalizeCountryCode('United States'), ', China ->', normalizeCountryCode('China'));
}

// Time series grouped by condition
export const timeSeriesDataByCondition: Record<string, TimeSeriesData[]> = {};
normalizedRecords.forEach(rec => {
  if (!timeSeriesDataByCondition[rec.baseId]) timeSeriesDataByCondition[rec.baseId] = [];
  timeSeriesDataByCondition[rec.baseId].push({
    year: rec.year,
    prevalence: rec.prevalence,
    incidence: rec.incidence,
    mortality: rec.mortalityRate,
    dalys: rec.dalys,
  });
});
Object.values(timeSeriesDataByCondition).forEach(arr =>
  arr.sort((a, b) => a.year - b.year),
);

// Country data map for quick lookup
const countryDataByKey = new Map<string, CountryData[]>();
normalizedRecords.forEach(rec => {
  const key = `${rec.baseId}-${rec.year}`;
  const entry: CountryData = {
    country: rec.location,
    countryCode: rec.location,
    region: 'Unknown',
    prevalence: rec.prevalence,
    incidence: rec.incidence,
    mortality: rec.mortalityRate,
    dalys: rec.dalys,
    year: rec.year,
  };
  const existing = countryDataByKey.get(key) || [];
  existing.push(entry);
  countryDataByKey.set(key, existing);
});

// Risk factors map
export const riskFactors: Record<string, RiskFactor[]> = {
  default: [
    { name: 'Genetic Factors', impact: 'medium' },
    { name: 'Environmental Exposure', impact: 'medium' },
    { name: 'Lifestyle Factors', impact: 'low' },
  ],
};
normalizedRecords.forEach(rec => {
  const rfs = rec.riskFactors;
  if (!rfs.length) return;
  riskFactors[rec.baseId] = rfs.slice(0, 5).map((name, i) => ({
    name,
    impact: i < 2 ? 'high' : i < 4 ? 'medium' : 'low',
  }));
});

export const interventions: Record<string, string[]> = {
  default: [
    'Early screening programs',
    'Public health campaigns',
    'Treatment access improvement',
    'Research and development',
  ],
};

// World map data: sum of latest prevalence per country
const worldMapTotals: Record<string, number> = {};
Array.from(latestByBaseId.values()).forEach(rec => {
  const current = worldMapTotals[rec.location] || 0;
  worldMapTotals[rec.location] = current + rec.prevalence;
});
export const worldMapData = worldMapTotals;

export const getCategorySummaries = (): CategorySummary[] => {
  const sums: Record<string, CategorySummary> = {};
  Array.from(latestByBaseId.values()).forEach(d => {
    if (!sums[d.category]) {
      sums[d.category] = {
        category: d.category,
        totalPrevalence: 0,
        totalDalys: 0,
        conditionCount: 0,
        avgMortality: 0,
      };
    }
    const bucket = sums[d.category];
    bucket.totalPrevalence += d.prevalence;
    bucket.totalDalys += d.dalys;
    bucket.conditionCount += 1;
    bucket.avgMortality += d.mortalityRate;
  });
  return Object.values(sums).map(s => ({
    ...s,
    avgMortality: s.conditionCount
      ? Math.round((s.avgMortality / s.conditionCount) * 10) / 10
      : 0,
  }));
};

export const generateCountryData = (diseaseId: string, year: number, countryCode?: string): CountryData[] => {
  const key = `${diseaseId}-${year}`;
  const allData = countryDataByKey.get(key) || [];
  if (countryCode && countryCode !== 'all') {
    const normalized = normalizeCountryCode(countryCode);
    return allData.filter(d => d.countryCode.toUpperCase() === normalized.toUpperCase());
  }
  return allData;
};

export const generateTimeSeriesData = (diseaseId: string, countryCode?: string): TimeSeriesData[] => {
  const allData = timeSeriesDataByCondition[diseaseId] || [];
  if (countryCode && countryCode !== 'all') {
    // Filter normalized records by country and build time series
    const normalized = normalizeCountryCode(countryCode);
    const countryRecords = normalizedRecords.filter(
      r => r.baseId === diseaseId && r.location.toUpperCase() === normalized.toUpperCase()
    );
    return countryRecords
      .sort((a, b) => a.year - b.year)
      .map(r => ({
        year: r.year,
        prevalence: r.prevalence,
        incidence: r.incidence,
        mortality: r.mortalityRate,
        dalys: r.dalys,
      }));
  }
  return allData;
};

export const getLatestDiseaseDataByCountry = (baseId: string, countryCode?: string): DiseaseData | undefined => {
  if (countryCode && countryCode !== 'all') {
    const normalized = normalizeCountryCode(countryCode);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[getLatestDiseaseDataByCountry] baseId: ${baseId}, countryCode: ${countryCode}, normalized: ${normalized}`);
    }
    const countryRecords = normalizedRecords.filter(
      r => r.baseId === baseId && r.location.toUpperCase() === normalized.toUpperCase() && r.year > 0
    );
    if (process.env.NODE_ENV === 'development') {
      console.log(`[getLatestDiseaseDataByCountry] Found ${countryRecords.length} records for ${baseId} in ${normalized}`);
      if (countryRecords.length === 0) {
        const allForBaseId = normalizedRecords.filter(r => r.baseId === baseId);
        const locations = Array.from(new Set(allForBaseId.map(r => r.location)));
        console.log(`[getLatestDiseaseDataByCountry] Available locations for ${baseId}:`, locations);
      }
    }
    if (countryRecords.length === 0) return undefined;
    return countryRecords.sort((a, b) => b.year - a.year)[0];
  }
  return latestByBaseId.get(baseId);
};

