import { DiseaseData } from '@/data/mockData';

/**
 * Filters disease data by category using partial matching
 * This handles cases where filter value "Cardiovascular" should match
 * "Cardiovascular and Metabolic Disorders"
 */
export const filterByCategory = (
  data: DiseaseData[],
  selectedCategory?: string
): DiseaseData[] => {
  if (!selectedCategory || selectedCategory === 'all') {
    return data;
  }
  
  const categoryLower = selectedCategory.toLowerCase();
  return data.filter(d => 
    d.category.toLowerCase().includes(categoryLower)
  );
};

/**
 * Deduplicates disease data by baseId, location, and year
 * This ensures each condition appears only once per country per year
 * CRITICAL: Must include location to prevent collapsing across countries
 */
export const deduplicateAndAggregate = (
  data: DiseaseData[]
): DiseaseData[] => {
  const grouped = new Map<string, DiseaseData[]>();
  
  // Group by baseId + location + year to preserve country dimension
  data.forEach(d => {
    const key = `${d.baseId}-${d.location.toUpperCase()}-${d.year}`;
    const existing = grouped.get(key) || [];
    existing.push(d);
    grouped.set(key, existing);
  });
  
  // Aggregate values for each group (only true duplicates: same disease, country, year)
  return Array.from(grouped.values()).map(group => {
    if (group.length === 1) {
      return group[0];
    }
    
    // Sum most metrics, average mortality rate
    const first = group[0];
    const aggregated = group.slice(1).reduce((acc, curr) => {
      return {
        ...acc,
        prevalence: acc.prevalence + curr.prevalence,
        incidence: acc.incidence + curr.incidence,
        dalys: acc.dalys + curr.dalys,
        ylds: acc.ylds + curr.ylds,
        female: acc.female + curr.female,
        male: acc.male + curr.male,
        allSexes: acc.allSexes + curr.allSexes,
        mortalityRate: acc.mortalityRate + curr.mortalityRate,
        count: acc.count + 1,
      };
    }, {
      ...first,
      count: 1,
    } as DiseaseData & { count: number });
    
    // Average mortality rate
    aggregated.mortalityRate = aggregated.mortalityRate / aggregated.count;
    const { count, ...result } = aggregated;
    return result;
  });
};

/**
 * Filters disease data by year
 */
export const filterByYear = (
  data: DiseaseData[],
  selectedYear?: number
): DiseaseData[] => {
  if (!selectedYear) {
    return data;
  }
  
  return data.filter(d => d.year === selectedYear);
};

/**
 * Filters disease data by both category and year
 */
export const filterDiseaseData = (
  data: DiseaseData[],
  selectedCategory?: string,
  selectedYear?: number
): DiseaseData[] => {
  let filtered = filterByCategory(data, selectedCategory);
  filtered = filterByYear(filtered, selectedYear);
  return filtered;
};

