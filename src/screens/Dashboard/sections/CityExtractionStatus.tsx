import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../../../components/ui/dialog";
import { ExternalLink, Loader2, Info } from "lucide-react";
import { useLanguage } from "../../../contexts/LanguageContext";

interface CityExtractionData {
  article_id: string;
  article_title: string;
  city: string | null;
  country: string | null;
  location_extracted: any;
  disease_name: string;
  published_at: string;
  detected_at: string;
  case_count: number | null;
  mortality_count: number | null;
  severity: string;
  source_name: string;
  article_url: string;
  formatted_date: string;
  location: string;
}

interface CityStats {
  total_articles: number;
  articles_with_cities: number;
  articles_without_cities: number;
  unique_cities: number;
  cities_list: Array<{ city: string; count: number }>;
}

interface DiseaseSummary {
  keyFacts: {
    cause: string;
    transmission: string;
    severity: string;
    history: string;
    treatment: string;
    vaccine: string;
  };
  symptoms: {
    early: string;
    progression: string;
    severe: string;
  };
  transmission: {
    primary: string;
    otherModes: string;
    humanToHuman: string;
    environmental: string;
  };
  diagnosisTreatment: {
    tests: string;
    treatment: string;
    advancedTherapies: string;
  };
  preventionControl: {
    prophylaxis: string;
    infectionControl: string;
    communityPractices: string;
    otherSteps: string;
  };
  globalResponse: {
    organizations: string;
    strategies: string;
    research: string;
  };
}

export const CityExtractionStatus: React.FC = () => {
  const { t } = useLanguage();
  const [cityData, setCityData] = useState<CityExtractionData[]>([]);
  const [stats, setStats] = useState<CityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDisease, setSelectedDisease] = useState<string | null>(null);
  const [diseaseSummary, setDiseaseSummary] = useState<DiseaseSummary | null>(null);
  const [summaryCache, setSummaryCache] = useState<Record<string, DiseaseSummary>>({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchCityData() {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Missing Supabase configuration");
        }

        // Fetch articles with city information from outbreak_signals
        const queryParams = new URLSearchParams();
        queryParams.set(
          'select',
          '*,case_count_mentioned,mortality_count_mentioned,severity_assessment,detected_at,city,detected_disease_name,countries!country_id(name),news_articles!article_id(title,location_extracted,published_at,url,news_sources!source_id(name)),diseases!disease_id(name)'
        );
        queryParams.set('city', 'not.is.null');
        queryParams.set('order', 'detected_at.desc');
        queryParams.set('limit', '50');

        const query = `${supabaseUrl}/rest/v1/outbreak_signals?${queryParams.toString()}`;

        const response = await fetch(query, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data: any[] = await response.json();

        // Transform the data
        const transformed: CityExtractionData[] = data.map((item: any) => {
          const article = Array.isArray(item.news_articles) 
            ? item.news_articles[0] 
            : item.news_articles;
          const disease = Array.isArray(item.diseases) 
            ? item.diseases[0] 
            : item.diseases;
          const country = Array.isArray(item.countries) 
            ? item.countries[0] 
            : item.countries;
          const source = article?.news_sources 
            ? (Array.isArray(article.news_sources) ? article.news_sources[0] : article.news_sources)
            : null;

          // Format date as "DD MMM YYYY" (e.g., "09 Nov 2025")
          const date = new Date(item.detected_at || article?.published_at);
          const day = String(date.getDate()).padStart(2, '0');
          const month = date.toLocaleDateString('en-US', { month: 'short' });
          const year = date.getFullYear();
          const formattedDate = `${day} ${month} ${year}`;

          // Build location string (city, country)
          let location = item.city || '';
          if (country?.name) {
            location = location ? `${location}, ${country.name}` : country.name;
          }

          // Map severity to uppercase
          const severity = item.severity_assessment 
            ? item.severity_assessment.toUpperCase() 
            : 'UNKNOWN';

          // Use detected_disease_name if disease is "OTHER", otherwise use disease name
          const diseaseName = disease?.name || 'Unknown';
          const displayDiseaseName = (diseaseName.toUpperCase() === 'OTHER' && item.detected_disease_name) 
            ? item.detected_disease_name 
            : diseaseName;

          return {
            article_id: item.article_id,
            article_title: article?.title || 'Unknown',
            city: item.city,
            country: country?.name || null,
            location_extracted: article?.location_extracted || null,
            disease_name: displayDiseaseName,
            published_at: article?.published_at || item.detected_at,
            detected_at: item.detected_at,
            case_count: item.case_count_mentioned ?? null,
            mortality_count: item.mortality_count_mentioned ?? null,
            severity: severity,
            source_name: source?.name?.trim() || 'Unknown Source',
            article_url: article?.url || '',
            formatted_date: formattedDate,
            location: location,
          };
        });

        // Calculate statistics
        const cityCounts: Record<string, number> = {};
        transformed.forEach((item) => {
          if (item.city) {
            cityCounts[item.city] = (cityCounts[item.city] || 0) + 1;
          }
        });

        const citiesList = Object.entries(cityCounts)
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count);

        // Also fetch articles that might have cities in location_extracted but not in signals
        const articlesQueryParams = new URLSearchParams();
        articlesQueryParams.set('select', 'id,title,location_extracted,published_at');
        articlesQueryParams.set('location_extracted->city', 'not.is.null');
        articlesQueryParams.set('order', 'published_at.desc');
        articlesQueryParams.set('limit', '100');

        const articlesQuery = `${supabaseUrl}/rest/v1/news_articles?${articlesQueryParams.toString()}`;
        const articlesResponse = await fetch(articlesQuery, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        let articlesWithCity = 0;
        if (articlesResponse.ok) {
          const articlesData: any[] = await articlesResponse.json();
          articlesWithCity = articlesData.length;
        }

        // Get total articles count
        const totalQuery = `${supabaseUrl}/rest/v1/news_articles?select=id&limit=1`;
        const totalResponse = await fetch(totalQuery, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Prefer': 'count=exact',
          },
        });

        let totalArticles = 0;
        if (totalResponse.ok) {
          const contentRange = totalResponse.headers.get('content-range');
          if (contentRange) {
            const match = contentRange.match(/\/(\d+)/);
            if (match) {
              totalArticles = parseInt(match[1], 10);
            }
          }
        }

        setStats({
          total_articles: totalArticles,
          articles_with_cities: articlesWithCity,
          articles_without_cities: totalArticles - articlesWithCity,
          unique_cities: citiesList.length,
          cities_list: citiesList,
        });

        setCityData(transformed);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load city data');
        console.error('Error fetching city data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCityData();
  }, []);

  const fetchDiseaseSummary = async (diseaseName: string) => {
    setSummaryLoading(true);
    setSummaryError(null);
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-disease-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ diseaseName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch summary: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Cache the summary in state for this session
      if (data.summary) {
        setSummaryCache(prev => ({
          ...prev,
          [diseaseName]: data.summary
        }));
        setDiseaseSummary(data.summary);
      }
    } catch (err: any) {
      console.error("Error fetching disease summary:", err);
      setSummaryError(err.message || "Failed to load disease summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleLearnMoreClick = (diseaseName: string, articleUrl: string) => {
    if (articleUrl) {
      // Open article in new tab
      window.open(articleUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSummaryClick = (diseaseName: string) => {
    setSelectedDisease(diseaseName);
    setDialogOpen(true);
    
    // Check if we already have this summary cached in state
    if (summaryCache[diseaseName]) {
      setDiseaseSummary(summaryCache[diseaseName]);
      setSummaryError(null);
      return;
    }
    
    // If not cached, fetch it (edge function will check database cache)
    fetchDiseaseSummary(diseaseName);
  };

  if (loading) {
    return (
      <Card className="bg-[#23313c] border-[#EAEBF024]" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
        <CardHeader>
          <CardTitle className="text-white">{t("dashboard.cityExtractionStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-white/70">{t("dashboard.loadingCityData")}</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-[#23313c] border-[#EAEBF024]" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
        <CardHeader>
          <CardTitle className="text-white">{t("dashboard.cityExtractionStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-400">{t("common.error")}: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#23313c] border-[#EAEBF024]" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <CardHeader>
        <CardTitle className="text-white text-lg">{t("dashboard.cityExtractionStatus")}</CardTitle>
        <p className="text-sm text-white/70 mt-1">
          {t("dashboard.cityExtractionDescription")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2a4149] p-3 rounded">
              <div className="text-xs text-white/70">{t("dashboard.totalArticles")}</div>
              <div className="text-2xl font-bold text-[#67DBE2]">{stats.total_articles}</div>
            </div>
            <div className="bg-[#2a4149] p-3 rounded">
              <div className="text-xs text-white/70">{t("dashboard.articlesWithCities")}</div>
              <div className="text-2xl font-bold text-[#67DBE2]">{stats.articles_with_cities}</div>
            </div>
            <div className="bg-[#2a4149] p-3 rounded">
              <div className="text-xs text-white/70">{t("dashboard.uniqueCities")}</div>
              <div className="text-2xl font-bold text-[#67DBE2]">{stats.unique_cities}</div>
            </div>
            <div className="bg-[#2a4149] p-3 rounded">
              <div className="text-xs text-white/70">{t("dashboard.extractionRate")}</div>
              <div className="text-2xl font-bold text-[#67DBE2]">
                {stats.total_articles > 0
                  ? `${Math.round((stats.articles_with_cities / stats.total_articles) * 100)}%`
                  : '0%'}
              </div>
            </div>
          </div>
        )}

        {stats && stats.cities_list.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">{t("dashboard.citiesFound")} ({stats.cities_list.length})</h3>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {stats.cities_list.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-[#67DBE2]/20 text-[#67DBE2] rounded text-xs border border-[#67DBE2]/30"
                >
                  {item.city} ({item.count})
                </span>
              ))}
            </div>
          </div>
        )}

        {cityData.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">
              {t("dashboard.recentArticlesWithCities")} ({cityData.length})
            </h3>
            <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar" style={{ width: '100%' }}>
                <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
                  <thead className="sticky top-0 z-10 bg-[#2a4149]">
                    <tr className="border-b border-[#EAEBF024] bg-[#2a4149]">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-white" style={{ width: '8%' }}>{t("dashboard.date")}</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-white" style={{ width: '10%' }}>{t("dashboard.disease")}</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-white" style={{ width: '25%' }}>{t("dashboard.summary")}</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-white" style={{ width: '10%' }}>{t("dashboard.location")}</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-white" style={{ width: '7%' }}>{t("dashboard.cases")}</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-white" style={{ width: '7%' }}>{t("dashboard.alert")}</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-white" style={{ width: '8%' }}>{t("dashboard.mortality")}</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-white" style={{ width: '8%' }}>{t("dashboard.severity")}</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-white" style={{ width: '10%' }}>{t("dashboard.source")}</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-white" style={{ width: '7%' }}>{t("dashboard.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cityData.map((item, idx) => {
                    const severityColor = 
                      item.severity === 'CRITICAL' ? 'bg-[#f87171]' :
                      item.severity === 'HIGH' ? 'bg-[#fb923c]' :
                      item.severity === 'MEDIUM' ? 'bg-[#fbbf24]' :
                      'bg-[#4ade80]';
                    
                    return (
                      <tr 
                        key={idx} 
                        className="border-b border-[#EAEBF024]/30 hover:bg-[#2a4149]/70 transition-colors"
                      >
                        <td className="py-2 px-2 text-xs text-white font-medium truncate">
                          {item.formatted_date}
                        </td>
                        <td className="py-2 px-2 text-xs text-white font-medium truncate">
                          {item.disease_name}
                        </td>
                        <td className="py-2 px-2 text-xs text-white">
                          <div className="line-clamp-2 leading-tight" title={item.article_title}>
                            {item.article_title}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-xs text-white font-medium truncate">
                          {item.location || item.city || '-'}
                        </td>
                        <td className="py-2 px-2 text-xs text-white font-medium text-center">
                          {item.case_count !== null && item.case_count > 0 ? item.case_count : '-'}
                        </td>
                        <td className="py-2 px-2 text-xs text-white font-medium text-center">
                          {item.severity === 'CRITICAL' || item.severity === 'HIGH' ? (
                            <span className="text-[#f87171] font-semibold">HIGH</span>
                          ) : item.severity === 'MEDIUM' ? (
                            <span className="text-[#fbbf24] font-semibold">MEDIUM</span>
                          ) : (
                            <span className="text-[#4ade80]">LOW</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-xs text-white font-medium text-center">
                          {item.mortality_count !== null && item.mortality_count > 0 ? item.mortality_count : '-'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge className={`${severityColor} text-white border-0 text-[10px] font-semibold px-2 py-0.5`}>
                            {item.severity}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-xs text-white/90 font-medium truncate">
                          {item.source_name && item.source_name.trim() && item.source_name !== 'Unknown Source' 
                            ? item.source_name 
                            : '-'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {item.article_url && (
                              <button
                                onClick={() => handleLearnMoreClick(item.disease_name, item.article_url)}
                                className="inline-flex items-center gap-1 text-[#66dbe1] hover:text-[#66dbe1]/80 text-xs font-semibold transition-colors"
                                title={t("dashboard.viewArticle")}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleSummaryClick(item.disease_name)}
                              className="inline-flex items-center gap-1 text-[#66dbe1] hover:text-[#66dbe1]/80 text-xs font-semibold transition-colors"
                              title={t("dashboard.viewSummary")}
                            >
                              <Info className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {cityData.length === 0 && (
          <div className="text-center py-8 text-white/70">
            <p>{t("dashboard.noCitiesFound")}</p>
            <p className="text-xs mt-2">
              {t("dashboard.citiesWillAppear")}
            </p>
          </div>
        )}
      </CardContent>

      {/* Disease Summary Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogClose />
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedDisease} - {t("dashboard.summary")}
            </DialogTitle>
          </DialogHeader>
          
          {summaryLoading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <Loader2 className="w-6 h-6 text-[#66dbe1] animate-spin mr-2" />
              <span className="text-white">{t("dashboard.generatingSummary")}</span>
            </div>
          ) : summaryError ? (
            <div className="text-center py-12 px-6 text-red-400">
              <p>{t("common.error")}: {summaryError}</p>
              <p className="text-sm text-white/70 mt-2">
                {t("dashboard.deepseekApiKeyError")}
              </p>
            </div>
          ) : diseaseSummary ? (
            <div className="space-y-6 text-white px-6 pb-6">
              {/* Key Facts */}
              <section>
                <h3 className="text-lg font-semibold text-[#66dbe1] mb-3">{t("dashboard.keyFacts")}</h3>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p><strong>{t("dashboard.cause")}:</strong> {diseaseSummary.keyFacts.cause}</p>
                  <p><strong>{t("dashboard.transmissionLabel")}:</strong> {diseaseSummary.keyFacts.transmission}</p>
                  <p><strong>{t("dashboard.severityLabel")}:</strong> {diseaseSummary.keyFacts.severity}</p>
                  <p><strong>{t("dashboard.history")}:</strong> {diseaseSummary.keyFacts.history}</p>
                  <p><strong>{t("dashboard.treatment")}:</strong> {diseaseSummary.keyFacts.treatment}</p>
                  <p><strong>{t("dashboard.vaccine")}:</strong> {diseaseSummary.keyFacts.vaccine}</p>
                </div>
              </section>

              {/* Symptoms */}
              <section>
                <h3 className="text-lg font-semibold text-[#66dbe1] mb-3">{t("dashboard.symptoms")}</h3>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p><strong>{t("dashboard.early")}:</strong> {diseaseSummary.symptoms.early}</p>
                  <p><strong>{t("dashboard.progression")}:</strong> {diseaseSummary.symptoms.progression}</p>
                  <p><strong>{t("dashboard.severeCases")}:</strong> {diseaseSummary.symptoms.severe}</p>
                </div>
              </section>

              {/* Transmission */}
              <section>
                <h3 className="text-lg font-semibold text-[#66dbe1] mb-3">{t("dashboard.transmission")}</h3>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p><strong>{t("dashboard.foodbornePrimary")}:</strong> {diseaseSummary.transmission.primary}</p>
                  <p><strong>{t("dashboard.otherTransmissionModes")}:</strong> {diseaseSummary.transmission.otherModes}</p>
                  <p><strong>{t("dashboard.humanToHumanSpread")}:</strong> {diseaseSummary.transmission.humanToHuman}</p>
                  <p><strong>{t("dashboard.environmentalSources")}:</strong> {diseaseSummary.transmission.environmental}</p>
                </div>
              </section>

              {/* Diagnosis & Treatment */}
              <section>
                <h3 className="text-lg font-semibold text-[#66dbe1] mb-3">{t("dashboard.diagnosisTreatment")}</h3>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p><strong>{t("dashboard.tests")}:</strong> {diseaseSummary.diagnosisTreatment.tests}</p>
                  <p><strong>{t("dashboard.treatment")}:</strong> {diseaseSummary.diagnosisTreatment.treatment}</p>
                  <p><strong>{t("dashboard.advancedTherapies")}:</strong> {diseaseSummary.diagnosisTreatment.advancedTherapies}</p>
                </div>
              </section>

              {/* Prevention & Control */}
              <section>
                <h3 className="text-lg font-semibold text-[#66dbe1] mb-3">{t("dashboard.preventionControl")}</h3>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p><strong>{t("dashboard.prophylaxis")}:</strong> {diseaseSummary.preventionControl.prophylaxis}</p>
                  <p><strong>{t("dashboard.infectionControlMeasures")}:</strong> {diseaseSummary.preventionControl.infectionControl}</p>
                  <p><strong>{t("dashboard.communityPublicHealthPractices")}:</strong> {diseaseSummary.preventionControl.communityPractices}</p>
                  <p><strong>{t("dashboard.otherPreventiveSteps")}:</strong> {diseaseSummary.preventionControl.otherSteps}</p>
                </div>
              </section>

              {/* Global Response */}
              <section>
                <h3 className="text-lg font-semibold text-[#66dbe1] mb-3">{t("dashboard.globalResponse")}</h3>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p><strong>{t("dashboard.majorOrganizationsInvolved")}:</strong> {diseaseSummary.globalResponse.organizations}</p>
                  <p><strong>{t("dashboard.strategiesUsedInOutbreakControl")}:</strong> {diseaseSummary.globalResponse.strategies}</p>
                  <p><strong>{t("dashboard.researchEfforts")}:</strong> {diseaseSummary.globalResponse.research}</p>
                </div>
              </section>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

