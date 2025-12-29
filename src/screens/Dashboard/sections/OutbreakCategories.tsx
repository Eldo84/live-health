import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useOutbreakCategories } from "../../../lib/useOutbreakCategories";
import { useLanguage } from "../../../contexts/LanguageContext";

interface CategoryData {
  id: string;
  name: string;
  description: string;
  color: string;
  diseaseCount: number;
}

interface OutbreakCategoriesProps {
  timeRange?: string;
  countryId?: string | null;
}

export const OutbreakCategories = ({ timeRange = "7d", countryId }: OutbreakCategoriesProps): JSX.Element => {
  const { t } = useLanguage();
  const { categories: dbCategories, loading: categoriesLoading } = useOutbreakCategories();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategoryData() {
      if (categoriesLoading) {
        return;
      }

      if (!dbCategories.length) {
        setCategories([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const envVars = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env ?? import.meta.env;
        const supabaseUrl = envVars?.VITE_SUPABASE_URL;
        const supabaseKey = envVars?.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Missing Supabase configuration");
        }

        // Calculate date range
        const now = new Date();
        const timeRanges: Record<string, number> = {
          "24h": 1,
          "7d": 7,
          "30d": 30,
          "1y": 365,
        };

        const range = timeRanges[timeRange] || timeRanges["7d"];
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - range);

        // Build query params for outbreak_signals
        const signalParams = new URLSearchParams();
        signalParams.set('select', 'disease_id');
        signalParams.set('detected_at', `gte.${startDate.toISOString()}`);
        
        // Add country filter if provided
        if (countryId) {
          signalParams.set('country_id', `eq.${countryId}`);
        }

        // Fetch outbreak signals with disease information
        // We need to join through disease_categories to get category_id for each disease
        // First, get all outbreak signals in the date range and country
        const signalsResponse = await fetch(
          `${supabaseUrl}/rest/v1/outbreak_signals?${signalParams.toString()}`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );

        let diseaseCounts: Record<string, number> = {};

        if (signalsResponse.ok) {
          const signals: any[] = await signalsResponse.json();
          
          // Get unique disease IDs from signals
          const diseaseIds = new Set(signals.map(s => s.disease_id).filter(Boolean));
          
          if (diseaseIds.size > 0) {
            // Fetch all disease_categories and filter client-side
            // This is more reliable than using 'in' filter with many UUIDs
            const categoryQueryParams = new URLSearchParams();
            categoryQueryParams.set('select', 'category_id,disease_id');
            
            const categoryResponse = await fetch(
              `${supabaseUrl}/rest/v1/disease_categories?${categoryQueryParams.toString()}`,
              {
                headers: {
                  apikey: supabaseKey,
                  Authorization: `Bearer ${supabaseKey}`,
                },
              }
            );

            if (categoryResponse.ok) {
              const diseaseCategoryData: any[] = await categoryResponse.json();
              
              // Create a map of disease_id to category_ids, only for diseases in our filtered signals
              const diseaseToCategories = new Map<string, Set<string>>();
              diseaseCategoryData.forEach((dc: any) => {
                if (dc.disease_id && dc.category_id && diseaseIds.has(dc.disease_id)) {
                  if (!diseaseToCategories.has(dc.disease_id)) {
                    diseaseToCategories.set(dc.disease_id, new Set());
                  }
                  diseaseToCategories.get(dc.disease_id)!.add(dc.category_id);
                }
              });

              // Count unique diseases per category based on signals
              const categoryDiseaseMap = new Map<string, Set<string>>();
              
              signals.forEach((signal: any) => {
                if (signal.disease_id && diseaseToCategories.has(signal.disease_id)) {
                  const categoryIds = diseaseToCategories.get(signal.disease_id)!;
                  categoryIds.forEach((categoryId: string) => {
                    if (!categoryDiseaseMap.has(categoryId)) {
                      categoryDiseaseMap.set(categoryId, new Set());
                    }
                    categoryDiseaseMap.get(categoryId)!.add(signal.disease_id);
                  });
                }
              });

              // Convert to counts
              categoryDiseaseMap.forEach((diseaseSet, categoryId) => {
                diseaseCounts[categoryId] = diseaseSet.size;
              });
            }
          }
        }

        // Normalize category name to consolidate duplicates and variations
        const normalizeCategoryForConsolidation = (categoryName: string): string => {
          const lower = categoryName.toLowerCase().trim();
          
          // Handle composite categories - extract the first/primary category
          if (categoryName.includes(',')) {
            const firstCategory = categoryName.split(',')[0].trim();
            return normalizeCategoryForConsolidation(firstCategory);
          }
          
          // Map variations to standard category names
          const categoryMappings: Record<string, string> = {
            "veterinary outbreak": "Veterinary Outbreaks",
            "veterinary outbreaks": "Veterinary Outbreaks",
            "sexually transmitted outbreaks": "Sexually Transmitted Infections",
            "sexually transmitted infections": "Sexually Transmitted Infections",
            "emerging & re-emerging disease outbreaks": "Emerging Infectious Diseases",
            "emerging and re-emerging disease outbreaks": "Emerging Infectious Diseases",
            "emerging infectious diseases": "Emerging Infectious Diseases",
            "emerging & re-emerging diseases": "Emerging Infectious Diseases",
          };
          
          if (categoryMappings[lower]) {
            return categoryMappings[lower];
          }
          
          // Partial matching for variations
          if (lower.includes("veterinary")) {
            return "Veterinary Outbreaks";
          }
          if (lower.includes("sexually transmitted")) {
            return "Sexually Transmitted Infections";
          }
          if (lower.includes("emerging") && (lower.includes("re-emerging") || lower.includes("reemerging"))) {
            return "Emerging Infectious Diseases";
          }
          
          // Capitalize properly for standard format
          const words = categoryName.trim().toLowerCase().split(/\s+/);
          return words.map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
        };

        // Consolidate categories - group similar ones together
        const consolidatedCategories = new Map<string, {
          id: string;
          name: string;
          description: string;
          color: string;
          diseaseCount: number;
          originalNames: string[];
        }>();

        dbCategories.forEach((cat) => {
          const normalizedName = normalizeCategoryForConsolidation(cat.name);
          
          if (consolidatedCategories.has(normalizedName)) {
            // Merge with existing category
            const existing = consolidatedCategories.get(normalizedName)!;
            existing.diseaseCount += diseaseCounts[cat.id] || 0;
            existing.originalNames.push(cat.name);
            // Use the first category's color and description if available
            if (!existing.color && cat.color) {
              existing.color = cat.color;
            }
            if (!existing.description && cat.description) {
              existing.description = cat.description;
            }
          } else {
            // Create new consolidated category
            consolidatedCategories.set(normalizedName, {
              id: cat.id, // Use first category's ID
              name: normalizedName,
              description: cat.description || `Category: ${normalizedName}`,
              color: cat.color || '',
              diseaseCount: diseaseCounts[cat.id] || 0,
              originalNames: [cat.name],
            });
          }
        });

        // Generate a unique color palette for categories
        const colorPalette = [
          '#f87171', // red
          '#66dbe1', // cyan
          '#fbbf24', // amber
          '#a78bfa', // purple
          '#fb923c', // orange
          '#ef4444', // red-500
          '#10b981', // green
          '#ec4899', // pink
          '#3b82f6', // blue
          '#f59e0b', // amber-500
          '#8b5cf6', // violet
          '#06b6d4', // cyan-500
          '#14b8a6', // teal
          '#f97316', // orange-500
          '#6366f1', // indigo
          '#22c55e', // green-500
          '#eab308', // yellow
          '#84cc16', // lime
          '#0ea5e9', // sky-500
          '#a855f7', // purple-500
        ];

        // Track used colors to avoid duplicates
        const usedColors = new Set<string>();
        
        // Helper function to get a unique color for a category
        const getUniqueColor = (categoryName: string, existingColor: string | undefined): string => {
          // If category has a valid color and it's not already used, use it
          if (existingColor && existingColor.trim() && !usedColors.has(existingColor)) {
            usedColors.add(existingColor);
            return existingColor;
          }
          
          // Generate a hash-based color from category name
          let hash = 0;
          for (let i = 0; i < categoryName.length; i++) {
            hash = ((hash << 5) - hash) + categoryName.charCodeAt(i);
            hash = hash & hash;
          }
          
          // Try to find an unused color from palette
          const startIndex = Math.abs(hash) % colorPalette.length;
          for (let i = 0; i < colorPalette.length; i++) {
            const colorIndex = (startIndex + i) % colorPalette.length;
            const color = colorPalette[colorIndex];
            if (!usedColors.has(color)) {
              usedColors.add(color);
              return color;
            }
          }
          
          // If all colors are used, generate a random color
          const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
          usedColors.add(randomColor);
          return randomColor;
        };

        // Convert consolidated categories to array and assign unique colors
        const combinedCategories: CategoryData[] = Array.from(consolidatedCategories.values())
          .map((cat) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            color: getUniqueColor(cat.name, cat.color),
            diseaseCount: cat.diseaseCount,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

        setCategories(combinedCategories);
      } catch (err: any) {
        console.error("Error fetching category disease counts:", err);
        
        // Normalize category name to consolidate duplicates and variations (same as above)
        const normalizeCategoryForConsolidation = (categoryName: string): string => {
          const lower = categoryName.toLowerCase().trim();
          if (categoryName.includes(',')) {
            const firstCategory = categoryName.split(',')[0].trim();
            return normalizeCategoryForConsolidation(firstCategory);
          }
          const categoryMappings: Record<string, string> = {
            "veterinary outbreak": "Veterinary Outbreaks",
            "veterinary outbreaks": "Veterinary Outbreaks",
            "sexually transmitted outbreaks": "Sexually Transmitted Infections",
            "sexually transmitted infections": "Sexually Transmitted Infections",
            "emerging & re-emerging disease outbreaks": "Emerging Infectious Diseases",
            "emerging and re-emerging disease outbreaks": "Emerging Infectious Diseases",
            "emerging infectious diseases": "Emerging Infectious Diseases",
            "emerging & re-emerging diseases": "Emerging Infectious Diseases",
          };
          if (categoryMappings[lower]) {
            return categoryMappings[lower];
          }
          if (lower.includes("veterinary")) {
            return "Veterinary Outbreaks";
          }
          if (lower.includes("sexually transmitted")) {
            return "Sexually Transmitted Infections";
          }
          if (lower.includes("emerging") && (lower.includes("re-emerging") || lower.includes("reemerging"))) {
            return "Emerging Infectious Diseases";
          }
          const words = categoryName.trim().toLowerCase().split(/\s+/);
          return words.map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
        };

        // Consolidate categories in fallback too
        const consolidatedCategories = new Map<string, {
          id: string;
          name: string;
          description: string;
          color: string;
          diseaseCount: number;
        }>();

        dbCategories.forEach((cat) => {
          const normalizedName = normalizeCategoryForConsolidation(cat.name);
          if (consolidatedCategories.has(normalizedName)) {
            const existing = consolidatedCategories.get(normalizedName)!;
            if (!existing.color && cat.color) {
              existing.color = cat.color;
            }
            if (!existing.description && cat.description) {
              existing.description = cat.description;
            }
          } else {
            consolidatedCategories.set(normalizedName, {
              id: cat.id,
              name: normalizedName,
              description: cat.description || `Category: ${normalizedName}`,
              color: cat.color || '',
              diseaseCount: 0,
            });
          }
        });

        // Generate a unique color palette for categories (fallback)
        const colorPalette = [
          '#f87171', '#66dbe1', '#fbbf24', '#a78bfa', '#fb923c',
          '#ef4444', '#10b981', '#ec4899', '#3b82f6', '#f59e0b',
          '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316', '#6366f1',
          '#22c55e', '#eab308', '#84cc16', '#0ea5e9', '#a855f7',
        ];
        const usedColors = new Set<string>();
        const getUniqueColor = (categoryName: string, existingColor: string | undefined): string => {
          if (existingColor && existingColor.trim() && !usedColors.has(existingColor)) {
            usedColors.add(existingColor);
            return existingColor;
          }
          let hash = 0;
          for (let i = 0; i < categoryName.length; i++) {
            hash = ((hash << 5) - hash) + categoryName.charCodeAt(i);
            hash = hash & hash;
          }
          const startIndex = Math.abs(hash) % colorPalette.length;
          for (let i = 0; i < colorPalette.length; i++) {
            const colorIndex = (startIndex + i) % colorPalette.length;
            const color = colorPalette[colorIndex];
            if (!usedColors.has(color)) {
              usedColors.add(color);
              return color;
            }
          }
          const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
          usedColors.add(randomColor);
          return randomColor;
        };
        
        // Fallback to consolidated categories without counts
        const fallbackCategories: CategoryData[] = Array.from(consolidatedCategories.values())
          .map((cat) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            color: getUniqueColor(cat.name, cat.color),
            diseaseCount: 0,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCategories(fallbackCategories);
      } finally {
        setLoading(false);
      }
    }

    fetchCategoryData();
  }, [dbCategories, categoriesLoading, timeRange, countryId]);

  // Filter categories to only show those with diseases matching the filters
  const filteredCategories = categories.filter(category => category.diseaseCount > 0);

  // Transform categories data for pie chart (only show categories with diseases)
  const pieChartData = filteredCategories
    .map(category => ({
      name: category.name,
      value: category.diseaseCount,
      color: category.color,
    }));

  if (loading || categoriesLoading) {
    return (
      <div className="space-y-6">
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardContent className="p-6">
          <div className="text-center text-[#ebebeb99]">
            {t("dashboard.loadingOutbreakCategories")}
          </div>
        </CardContent>
      </Card>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="space-y-6">
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardContent className="p-6">
          <div className="text-center text-[#ebebeb99]">
            {t("dashboard.noOutbreakCategoriesFound")}
          </div>
        </CardContent>
      </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[#ffffff14] border-[#eaebf024] shadow-lg">
        <CardHeader className="pb-6">
          <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-xl">
            {t("dashboard.outbreakCategoriesDistribution")}
          </h3>
          <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-2">
            {t("dashboard.visualBreakdownOfDiseases")}
          </p>
        </CardHeader>
        <CardContent className="pb-6">
          {pieChartData.length > 0 ? (
            <div className="w-full">
              <ResponsiveContainer width="100%" height={380}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="45%"
                    outerRadius={140}
                    innerRadius={60}
                    paddingAngle={2}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="none"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        style={{ 
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                          transition: 'opacity 0.2s',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        const categoryData = pieChartData.find(item => item.name === data.name);
                        const color = categoryData?.color || (data.payload as any)?.color || '#8884d8';
                        const percent = ((data.value as number) / pieChartData.reduce((sum, item) => sum + item.value, 0)) * 100;
                        return (
                          <div className="bg-[#1f2937] border border-[#374151] rounded-lg shadow-xl p-4 min-w-[200px]">
                            <div className="flex items-center gap-3 mb-2">
                              <div 
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <p className="text-[#ffffff] font-semibold text-sm [font-family:'Roboto',Helvetica]">
                                {data.name}
                              </p>
                            </div>
                            <div className="space-y-1 pt-2 border-t border-[#374151]">
                              <div className="flex justify-between items-center">
                                <span className="text-[#ebebeb99] text-xs [font-family:'Roboto',Helvetica]">{t("dashboard.diseases")}:</span>
                                <span className="text-[#66dbe1] font-semibold text-sm [font-family:'Roboto',Helvetica]">
                                  {data.value}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[#ebebeb99] text-xs [font-family:'Roboto',Helvetica]">{t("dashboard.percentage")}:</span>
                                <span className="text-[#66dbe1] font-semibold text-sm [font-family:'Roboto',Helvetica]">
                                  {percent.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 px-4">
                {pieChartData.map((entry, index) => (
                  <div key={`legend-${index}`} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-[#ebebeb] text-xs [font-family:'Roboto',Helvetica]">
                      {entry.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-[#ebebeb99] py-12">
              <p className="[font-family:'Roboto',Helvetica] text-sm">
                {t("dashboard.noDiseaseDataAvailableForCategories")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#ffffff14] border-[#eaebf024] shadow-lg">
        <CardHeader className="pb-6">
          <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-xl">
            {t("dashboard.categoryDetails")}
          </h3>
          <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-2">
            {t("dashboard.detailedInformationAboutEachCategory", { count: filteredCategories.length })}
          </p>
        </CardHeader>
        <CardContent>
          {filteredCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="p-5 rounded-lg border border-[#ffffff1a] bg-[#ffffff08] hover:bg-[#ffffff12] hover:border-[#ffffff24] transition-all duration-200 cursor-pointer group"
                style={{ borderLeftWidth: '4px', borderLeftColor: category.color }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm flex-1 group-hover:text-[#66dbe1] transition-colors">
                    {category.name}
                  </h4>
                  <Badge
                    className="border-0 text-xs font-semibold px-2.5 py-1"
                    style={{ 
                      backgroundColor: `${category.color}26`, 
                      color: category.color,
                      boxShadow: `0 0 8px ${category.color}33`
                    }}
                  >
                    {category.diseaseCount}
                  </Badge>
                </div>
                <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs leading-relaxed">
                  {category.description || t("dashboard.noDescriptionAvailable")}
                </p>
              </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-[#ebebeb99] py-12">
              <p className="[font-family:'Roboto',Helvetica] text-sm">
                {t("dashboard.noDataAvailable")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
