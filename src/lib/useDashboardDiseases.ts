import { useEffect, useState } from "react";

export interface DiseaseStats {
  name: string;
  cases: number; // Actually report count, kept as "cases" for backward compatibility
  reports: number; // Number of outbreak signals/reports
  growth: string;
  severity: "critical" | "high" | "medium" | "low";
  color: string;
}

export function useDashboardDiseases(timeRange: string, countryId?: string | null) {
  const [diseases, setDiseases] = useState<DiseaseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchDiseases() {
      try {
        setLoading(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

        const days = timeRanges[timeRange] || 7;
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - days);
        const previousEndDate = new Date(startDate);

        // Fetch current period signals grouped by disease
        const currentParams = new URLSearchParams();
        currentParams.set('select', 'disease_id,case_count_mentioned,detected_disease_name,diseases!disease_id(name,severity_level,color_code)');
        currentParams.set('detected_at', `gte.${startDate.toISOString()}`);
        
        // Add country filter if provided
        if (countryId) {
          currentParams.set('country_id', `eq.${countryId}`);
        }
        
        const currentUrl = `${supabaseUrl}/rest/v1/outbreak_signals?${currentParams.toString()}`;
        const currentResponse = await fetch(currentUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!currentResponse.ok) {
          throw new Error(`Failed to fetch diseases: ${currentResponse.statusText}`);
        }

        const currentData: any[] = await currentResponse.json();

        // Fetch previous period for comparison (fetch wider range and filter client-side)
        const previousParams = new URLSearchParams();
        previousParams.set('select', 'disease_id,case_count_mentioned,detected_at,detected_disease_name,diseases!disease_id(name)');
        previousParams.set('detected_at', `gte.${previousStartDate.toISOString()}`);
        
        // Add country filter if provided
        if (countryId) {
          previousParams.set('country_id', `eq.${countryId}`);
        }
        
        const previousUrl = `${supabaseUrl}/rest/v1/outbreak_signals?${previousParams.toString()}`;
        const previousResponse = await fetch(previousUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        const previousDataRaw: any[] = previousResponse.ok ? await previousResponse.json() : [];
        // Filter to previous period only
        const previousData = previousDataRaw.filter((s: any) => {
          const detectedAt = new Date(s.detected_at);
          return detectedAt >= previousStartDate && detectedAt < previousEndDate;
        });

        // Group by disease and calculate stats
        // Count REPORTS (number of outbreak signals) not case_count_mentioned (unreliable)
        // case_count_mentioned often contains misleading numbers from headlines
        // (e.g., "500,000 chickens culled" would show as 500,000 "cases")
        const diseaseMap = new Map<string, { currentReports: number; previousReports: number; disease: any; detectedDiseaseName?: string }>();

        currentData.forEach((signal: any) => {
          const disease = Array.isArray(signal.diseases) ? signal.diseases[0] : signal.diseases;
          if (!disease || !signal.disease_id || !disease.name) return;
          
          // For "OTHER" diseases, use detected_disease_name as the key to separate different diseases
          // This prevents all unknown diseases from being lumped together
          const isOther = disease.name.toUpperCase() === "OTHER";
          const groupKey = isOther && signal.detected_disease_name 
            ? `OTHER:${signal.detected_disease_name}` 
            : signal.disease_id;
          
          if (!diseaseMap.has(groupKey)) {
            diseaseMap.set(groupKey, {
              currentReports: 0,
              previousReports: 0,
              disease: disease,
              detectedDiseaseName: isOther ? signal.detected_disease_name : undefined,
            });
          }
          
          const entry = diseaseMap.get(groupKey)!;
          entry.currentReports += 1; // Count reports, not case numbers
        });

        previousData.forEach((signal: any) => {
          const disease = Array.isArray(signal.diseases) ? signal.diseases[0] : signal.diseases;
          if (!disease) return;
          
          // Use same grouping logic for previous period
          const isOther = disease?.name?.toUpperCase() === "OTHER";
          const groupKey = isOther && signal.detected_disease_name 
            ? `OTHER:${signal.detected_disease_name}` 
            : signal.disease_id;
          
          if (!diseaseMap.has(groupKey)) return;
          
          const entry = diseaseMap.get(groupKey)!;
          entry.previousReports += 1; // Count reports, not case numbers
        });

        // Diseases to exclude from outbreak tracking (non-infectious or not suitable for outbreak monitoring)
        const excludedDiseases = new Set([
          // Cancers - not outbreaks
          "Cervical cancer",
          "Cervical intraepithelial neoplasia (CIN)",
          "Lung Cancer",
          "Prostate cancer",
          "Leukemia",
          "Burkitt lymphoma",
          "Nasopharyngeal carcinoma",
          // Non-diseases
          "Warts", // Infectious but not typically tracked as outbreak disease
          "Animal reproduction",
          "Reproduction",
          "Breeding",
          "Livestock vaccination",
          "Vaccination",
          // Chronic conditions - not outbreaks
          "Alzheimer's Disease",
          "Parkinson's disease", 
          "Huntington's Disease",
          "Behcet's Disease",
          "Sickle Cell Disease",
          "Chronic Diseases",
          "Chronic Wasting Disease", // Actually is a disease but duplicated
          "Autoimmune Diseases",
          "Inflammatory Bowel Disease",
          "Inflammatory Muscle Disease",
          "Fatty Liver Disease",
          "Heart Valve Disease",
          "Chronic Obstructive Pulmonary Disease",
          // Generic terms
          "Disease Outbreak",
          "Disease trends",
          "Various Diseases",
          "Rare Disease",
          "Rare disease",
          "Rare diseases",
          "Rare-disease",
          "Hereditary Intractable and Rare Diseases",
          "Rare Respiratory Disease",
          "Fungal Diseases",
          "Bloodstream infections",
          "Respiratory viruses",
          "Infectious-Disease",
          // Non-diseases from headlines
          "Fire",
          "Money laundering",
          "Logistics meeting",
          "Ophthalmology clinics",
          "PathGen",
          "Vaccination Alert",
          "Opioid Epidemic",
          "Opioid epidemic",
          "Driving charge epidemic",
          "Refugee Health",
          "Pupil Sickness",
          "Horror disease",
          "Suicide Disease",
          // Vague animal disease terms
          "Equine Disease",
          "Equine Virus",
          "Equine Herpes",
          "Horse Herpes",
          "Horse virus",
          "horse virus",
          "Deer Disease",
          "deer disease",
          "Deadly horse disease",
          "severe dog disease",
          "equine disease",
          "Intestinal virus",
          "Anti-bacterial Viruses",
          // Plant/crop diseases
          "Black-Gram Plant Leaf Disease",
          "Greening Disease",
          "corn disease",
          "soil disease",
          "sick palm trees",
          "disease buildup (crops)",
          // Generic infectious disease terms
          "communicable diseases",
          "infectious disease",
          "animal and avian diseases",
          "vet medicine disease",
          "illness",
          "serious illness",
          "Serious Illness from Infant Formula",
        ]);
        
        // Also exclude detected disease names that are clearly not diseases
        // These are AI misclassifications of non-health events
        const excludedDetectedNames = new Set([
          // Non-diseases - procedures
          "animal reproduction",
          "reproduction",
          "breeding",
          "livestock vaccination",
          "vaccination",
          "vaccine",
          "immunization",
          "immunisation",
          "doses",
          "vaccination alert",
          // Weather/disasters - not diseases
          "typhoon",
          "hurricane",
          "flood",
          "floods",
          "flood disaster",
          "drought",
          "tropical cyclone",
          "cyclone",
          "earthquake",
          "tornado",
          "storm",
          "tsunami",
          "landslide",
          "wildfire",
          "fire",
          // Violence/war/crime - not diseases
          "violence against women",
          "war-related impacts",
          "war",
          "conflict",
          "conflict-related violence",
          "violence-related deaths",
          "landmine injuries",
          "landmine",
          "terrorism",
          "money laundering",
          "driving charge epidemic",
          "suicide disease",
          // Humanitarian - not diseases
          "displacement",
          "refugee",
          "refugee health",
          "migration",
          "humanitarian crisis",
          "humanitarian",
          "food insecurity",
          "malnutrition",
          "hunger",
          "famine",
          "starvation",
          "poverty",
          // Chronic/degenerative conditions - not outbreak diseases
          "cerebrovascular disease",
          "diabetes",
          "cancer",
          "heart disease",
          "heart valve disease",
          "alzheimer's disease",
          "alzheimer",
          "parkinson's disease",
          "huntington's disease",
          "stroke",
          "hypertension",
          "obesity",
          "chronic disease",
          "chronic diseases",
          "chronic obstructive pulmonary disease",
          "chronic obstructive pulmonary disease | chronic heart failure",
          "fatty liver disease",
          "inflammatory bowel disease",
          "inflammatory muscle disease",
          "autoimmune diseases",
          "autoimmune disease",
          "behcet's disease",
          "sickle cell disease",
          "motor neurone disease",
          "degenerative disease",
          "rett disease",
          "lymphoproliferative disease",
          "diabetes | heart disease",
          "diabetes | kidney disease",
          // Cancer - not outbreaks
          "lung cancer",
          "prostate cancer",
          "leukemia",
          "nasopharyngeal carcinoma",
          "burkitt lymphoma",
          // Plant/crop diseases - not human/animal outbreaks
          "corn disease",
          "soil disease",
          "greening disease",
          "disease buildup (crops)",
          "sick palm trees",
          "black-gram plant leaf disease",
          // Generic/meta terms - not specific diseases
          "ai tool for disease surveillance",
          "ai tool for disease outbreaks",
          "disease outbreaks",
          "disease outbreak",
          "disease surveillance",
          "disease trends",
          "disease threats",
          "health emergency",
          "public health",
          "disease",
          "diseases",
          "environmental disease",
          "fire outbreak",
          "acute respiratory infections",
          "epidemic",
          "outbreak",
          "arctic outbreak",
          "bacterial outbreak",
          "virus",
          "various diseases",
          "rare disease",
          "rare diseases",
          "rare-disease",
          "hereditary intractable and rare diseases",
          "communicable diseases",
          "infectious disease",
          "infectious-disease",
          "fungal diseases",
          "respiratory viruses",
          "bloodstream infections",
          "animal and avian diseases",
          "vet medicine disease",
          "illness",
          "serious illness",
          "serious illness from infant formula",
          "pupil sickness",
          "horror disease",
          "deadly horse disease",
          "severe dog disease",
          "opioid epidemic",
          // Non-disease meeting/event names
          "logistics meeting",
          "ophthalmology clinics",
          "pathgen",
          "infection situation in okayama prefecture",
          // Vague animal disease terms
          "equine disease",
          "equine virus",
          "equine herpes",
          "horse herpes",
          "horse virus",
          "deer disease",
          "intestinal virus",
          "anti-bacterial viruses",
          // AI extraction errors - phrases from headlines
          "virus affecting",
          "people infected",
          "cases reported",
          "deaths reported",
          "people affected",
        ]);
        
        // Function to check if detected name looks like a headline fragment or invalid disease name
        const isInvalidDiseaseName = (name: string): boolean => {
          if (!name) return false;
          const lower = name.toLowerCase().trim();
          
          // Check for non-Latin characters (likely foreign language extraction errors)
          // Allow basic Latin, spaces, hyphens, parentheses, commas, slashes
          const hasNonLatin = /[^\x00-\x7F]/.test(name);
          if (hasNonLatin) return true;
          
          // Check for patterns that indicate this is a headline fragment or invalid
          const invalidPatterns = [
            /virus affecting \d+/i,          // "Virus affecting 4000 people"
            /\d+ (people|cases|deaths)/i,    // Numbers followed by people/cases/deaths
            /affecting \d+/i,                 // "affecting X"
            /infecting \d+/i,                 // "infecting X"
            /killing \d+/i,                   // "killing X"
            /\d+ infected/i,                  // "X infected"
            /outbreak (in|at|of)/i,           // "outbreak in/at/of"
            /^(new|recent|latest) /i,         // Starting with "new/recent/latest"
            /situation in/i,                  // "situation in X"
            /\| /,                             // Pipe separator (combined terms)
            /meeting$/i,                      // Ends with "meeting"
            /alert$/i,                        // Ends with "alert"
            /trends$/i,                       // Ends with "trends"
            /threats$/i,                      // Ends with "threats"
            /buildup/i,                       // Contains "buildup"
            /clinics?$/i,                     // Ends with "clinic(s)"
          ];
          
          return invalidPatterns.some(pattern => pattern.test(lower));
        };

        // Convert to array and calculate growth based on report count
        const diseaseStats: DiseaseStats[] = Array.from(diseaseMap.entries())
          .map(([diseaseId, data]) => {
            const diseaseName = data.disease.name || "Unknown";
            
            // Skip excluded diseases (case-insensitive check)
            if (excludedDiseases.has(diseaseName) || 
                Array.from(excludedDiseases).some(excluded => 
                  excluded.toLowerCase() === diseaseName.toLowerCase()
                )) {
              return null;
            }

            // For "OTHER" diseases, use detected_disease_name if available
            let displayName = diseaseName;
            if (diseaseName.toUpperCase() === "OTHER" && data.detectedDiseaseName) {
              displayName = data.detectedDiseaseName;
            }

            // Skip if detected disease name is in exclusion list or invalid
            if (diseaseName.toUpperCase() === "OTHER" && data.detectedDiseaseName) {
              const lowerDetected = data.detectedDiseaseName.toLowerCase().trim();
              if (excludedDetectedNames.has(lowerDetected)) {
                return null;
              }
              // Skip invalid disease names (headline fragments, foreign text, etc.)
              if (isInvalidDiseaseName(data.detectedDiseaseName)) {
                return null;
              }
            }

            const severityMap: Record<string, "critical" | "high" | "medium" | "low"> = {
              critical: "critical",
              high: "high",
              medium: "medium",
              low: "low",
            };

            // Calculate growth based on REPORT COUNT, not case numbers
            let growthDisplay = "0%";
            if (data.previousReports === 0 && data.currentReports > 0) {
              growthDisplay = "New";  // Show "New" instead of +100% for new diseases
            } else if (data.previousReports > 0) {
              const growthValue = ((data.currentReports - data.previousReports) / data.previousReports * 100);
              // Cap extreme growth values at 999%
              if (growthValue > 999) {
                growthDisplay = "+999%";
              } else if (growthValue < -99) {
                growthDisplay = "-99%";
              } else {
                growthDisplay = growthValue >= 0 ? `+${growthValue.toFixed(0)}%` : `${growthValue.toFixed(0)}%`;
              }
            }

            return {
              name: displayName,
              cases: data.currentReports, // Using report count as "cases" for backward compatibility
              reports: data.currentReports,
              growth: growthDisplay,
              severity: severityMap[data.disease.severity_level] || "medium",
              color: data.disease.color_code || "#66dbe1",
            };
          })
          .filter((d): d is DiseaseStats => d !== null) // Remove null entries
          .sort((a, b) => b.reports - a.reports); // Sort by report count
          // Note: No slice limit - return all diseases for selection panel
          // The display components will limit as needed

        if (!active) return;

        setDiseases(diseaseStats);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        console.error("Error fetching diseases:", err);
        setError(err.message || "Failed to load diseases");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchDiseases();

    return () => {
      active = false;
    };
  }, [timeRange, countryId]);

  return { diseases, loading, error };
}

