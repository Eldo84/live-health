import { useState, useEffect, useMemo } from "react";

export interface ExportDataRow {
  id: string;
  date: string;
  disease: string;
  pathogen: string;
  pathogenType: string;
  primarySpecies: string;
  location: string;
  severity: string;
  alertCount: number;
  confirmedCases: number;
  mortality: number;
}

interface DiseasePathogens {
  disease_id: string;
  pathogen_id: string;
  is_primary: boolean;
  pathogens: {
    name: string;
    type: string;
  };
}

export function useExportData(timeRange: string = "30d", countryId?: string | null) {
  const [data, setData] = useState<ExportDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchExportData() {
      try {
        setLoading(true);
        setError(null);
        
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
        const days = timeRanges[timeRange] || 30;
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        // Fetch disease-pathogen relationships
        const pathogenParams = new URLSearchParams();
        pathogenParams.set('select', 'disease_id,pathogen_id,is_primary,pathogens!pathogen_id(name,type)');
        pathogenParams.set('is_primary', 'eq.true');
        
        const pathogenUrl = `${supabaseUrl}/rest/v1/disease_pathogens?${pathogenParams.toString()}`;
        const pathogenResponse = await fetch(pathogenUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!pathogenResponse.ok) {
          throw new Error(`Failed to fetch pathogens: ${pathogenResponse.statusText}`);
        }

        const diseasePathogens: DiseasePathogens[] = await pathogenResponse.json();
        
        // Create pathogen lookup map
        const pathogenMap = new Map<string, { name: string; type: string }>();
        diseasePathogens.forEach(dp => {
          if (dp.pathogens) {
            pathogenMap.set(dp.disease_id, dp.pathogens);
          }
        });

        // Fetch outbreak signals with related data
        const params = new URLSearchParams();
        params.set('select', 'id,detected_at,severity_assessment,case_count_mentioned,mortality_count_mentioned,city,detected_disease_name,diseases!disease_id(id,name,disease_type),countries!country_id(name)');
        params.set('detected_at', `gte.${startDate.toISOString()}`);
        params.set('order', 'detected_at.desc');
        
        if (countryId) {
          params.set('country_id', `eq.${countryId}`);
        }
        
        const url = `${supabaseUrl}/rest/v1/outbreak_signals?${params.toString()}`;
        const response = await fetch(url, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const signals: any[] = await response.json();

        if (!active) return;

        // Aggregate data by disease + location + date
        const aggregatedMap = new Map<string, {
          date: string;
          diseaseId: string;
          diseaseName: string;
          diseaseType: string;
          countryName: string;
          city: string;
          severity: string;
          alertCount: number;
          totalCases: number;
          totalMortality: number;
        }>();

        signals.forEach((signal: any) => {
          const disease = Array.isArray(signal.diseases) ? signal.diseases[0] : signal.diseases;
          const country = Array.isArray(signal.countries) ? signal.countries[0] : signal.countries;
          
          const diseaseName = disease?.name || signal.detected_disease_name || 'Unknown';
          const diseaseId = disease?.id || 'unknown';
          const diseaseType = disease?.disease_type || 'unknown';
          const countryName = country?.name || 'Unknown';
          const city = signal.city || '';
          const detectedAt = new Date(signal.detected_at);
          const dateKey = detectedAt.toISOString().split('T')[0]; // YYYY-MM-DD
          
          // Create a unique key for aggregation
          const key = `${dateKey}-${diseaseName}-${countryName}`;
          
          const existing = aggregatedMap.get(key);
          if (existing) {
            existing.alertCount += 1;
            existing.totalCases += signal.case_count_mentioned || 0;
            existing.totalMortality += signal.mortality_count_mentioned || 0;
            // Keep the highest severity
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            if ((severityOrder[signal.severity_assessment as keyof typeof severityOrder] || 0) > 
                (severityOrder[existing.severity as keyof typeof severityOrder] || 0)) {
              existing.severity = signal.severity_assessment;
            }
          } else {
            aggregatedMap.set(key, {
              date: dateKey,
              diseaseId,
              diseaseName,
              diseaseType,
              countryName,
              city,
              severity: signal.severity_assessment || 'low',
              alertCount: 1,
              totalCases: signal.case_count_mentioned || 0,
              totalMortality: signal.mortality_count_mentioned || 0,
            });
          }
        });

        // Convert to export format
        const exportData: ExportDataRow[] = Array.from(aggregatedMap.values()).map((item, idx) => {
          const pathogenInfo = pathogenMap.get(item.diseaseId);
          
          // Map disease type to species
          const speciesMap: Record<string, string> = {
            human: 'Human',
            veterinary: 'Animal',
            zoonotic: 'Zoonotic (Human & Animal)',
            unknown: 'Unknown',
          };
          
          return {
            id: `${item.date}-${item.diseaseName}-${idx}`,
            date: item.date,
            disease: item.diseaseName,
            pathogen: pathogenInfo?.name || 'Not specified',
            pathogenType: pathogenInfo?.type || 'Unknown',
            primarySpecies: speciesMap[item.diseaseType] || 'Unknown',
            location: item.city ? `${item.city}, ${item.countryName}` : item.countryName,
            severity: item.severity.charAt(0).toUpperCase() + item.severity.slice(1),
            alertCount: item.alertCount,
            confirmedCases: item.totalCases,
            mortality: item.totalMortality,
          };
        });

        // Sort by date descending
        exportData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setData(exportData);
      } catch (err: any) {
        if (active) {
          console.error('Export data fetch error:', err);
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchExportData();

    return () => {
      active = false;
    };
  }, [timeRange, countryId]);

  // Export to CSV function
  const exportToCSV = useMemo(() => {
    return () => {
      if (data.length === 0) return;

      const headers = [
        'Date',
        'Disease',
        'Pathogen',
        'Pathogen Type',
        'Primary Species',
        'Location',
        'Severity',
        'No of Alerts',
        'Confirmed Cases',
        'Mortality'
      ];

      const csvRows = [
        headers.join(','),
        ...data.map(row => [
          row.date,
          `"${row.disease.replace(/"/g, '""')}"`,
          `"${row.pathogen.replace(/"/g, '""')}"`,
          `"${row.pathogenType.replace(/"/g, '""')}"`,
          `"${row.primarySpecies.replace(/"/g, '""')}"`,
          `"${row.location.replace(/"/g, '""')}"`,
          row.severity,
          row.alertCount,
          row.confirmedCases,
          row.mortality
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `outbreak_data_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };
  }, [data]);

  return { data, loading, error, exportToCSV };
}

