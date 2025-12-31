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

