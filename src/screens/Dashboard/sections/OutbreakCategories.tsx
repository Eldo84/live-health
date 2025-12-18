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

export const OutbreakCategories = (): JSX.Element => {
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

        // Fetch disease counts for each category
        // Query disease_categories table to count diseases per category
        const queryResponse = await fetch(
          `${supabaseUrl}/rest/v1/disease_categories?select=category_id,disease_id`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );

        let diseaseCounts: Record<string, number> = {};

        if (queryResponse.ok) {
          const diseaseCategoryData: any[] = await queryResponse.json();
          
          // Count unique diseases per category
          const categoryDiseaseMap = new Map<string, Set<string>>();
          
          diseaseCategoryData.forEach((dc: any) => {
            if (dc.category_id && dc.disease_id) {
              if (!categoryDiseaseMap.has(dc.category_id)) {
                categoryDiseaseMap.set(dc.category_id, new Set());
              }
              categoryDiseaseMap.get(dc.category_id)!.add(dc.disease_id);
            }
          });

          // Convert to counts
          categoryDiseaseMap.forEach((diseaseSet, categoryId) => {
            diseaseCounts[categoryId] = diseaseSet.size;
          });
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
  }, [dbCategories, categoriesLoading]);

  // Transform categories data for pie chart (only show categories with diseases)
  const pieChartData = categories
    .filter(category => category.diseaseCount > 0)
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
            {t("dashboard.detailedInformationAboutEachCategory", { count: categories.length })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
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
        </CardContent>
      </Card>
    </div>
  );
};
