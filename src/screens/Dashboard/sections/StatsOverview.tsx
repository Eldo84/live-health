import React from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Loader2 } from "lucide-react";
import { useDashboardStats } from "../../../lib/useDashboardStats";
import { useLanguage } from "../../../contexts/LanguageContext";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: React.ReactNode;
  iconBg: string;
  loading?: boolean;
}

const StatCard = ({ title, value, change, trend, icon, iconBg, loading }: StatCardProps) => {
  const { t } = useLanguage();
  return (
  <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors h-full" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
    <CardContent className="p-4 lg:p-5 xl:p-6" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <div className="flex items-center justify-between gap-2" style={{ width: '100%', overflow: 'hidden' }}>
        <div className="flex-1" style={{ minWidth: 0, overflow: 'hidden' }}>
          <p className="[font-family:'Roboto',Helvetica] font-medium text-[#ebebeb99] text-sm mb-1 truncate">
            {title}
          </p>
          {loading ? (
            <div className="flex items-center gap-2 mb-2 h-[40px]">
              <Loader2 className="w-6 h-6 text-[#66dbe1] animate-spin flex-shrink-0" />
              <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm">{t("common.loading")}</span>
            </div>
          ) : (
            <>
              <p className="[font-family:'Roboto',Helvetica] font-bold text-[#ffffff] text-xl lg:text-2xl xl:text-3xl mb-2 truncate" title={value}>
                {value}
              </p>
              <div className="flex items-center gap-1 flex-wrap overflow-hidden">
                <div className="flex items-center gap-1 flex-shrink-0">
                  {trend === "up" ? (
                    <TrendingUp className="w-4 h-4 text-[#f87171] flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-[#4ade80] flex-shrink-0" />
                  )}
                  <span className={`[font-family:'Roboto',Helvetica] font-medium text-sm ${trend === "up" ? "text-[#f87171]" : "text-[#4ade80]"}`}>
                    {change}
                  </span>
                </div>
                <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs lg:text-sm truncate">
                  {t("dashboard.vsLastPeriod")}
                </span>
              </div>
            </>
          )}
        </div>
        <div className={`w-10 h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
  );
};

interface StatsOverviewProps {
  timeRange: string;
  searchQuery?: string;
  countryId?: string | null;
}

export const StatsOverview = ({ timeRange, searchQuery = "", countryId }: StatsOverviewProps): JSX.Element => {
  const { stats, loading, error } = useDashboardStats(timeRange, countryId);
  const { t } = useLanguage();

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="col-span-4">
          <Card className="bg-[#ffffff14] border-[#eaebf024]">
            <CardContent className="p-6">
              <p className="[font-family:'Roboto',Helvetica] font-medium text-[#f87171] text-sm">
                {t("dashboard.errorLoadingStatistics", { error })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: t("dashboard.activeOutbreaks"),
      value: stats?.activeOutbreaks.toLocaleString() || "0",
      change: stats?.activeOutbreaksChange || "0%",
      trend: (stats?.activeOutbreaksChange?.startsWith("+") || parseFloat(stats?.activeOutbreaksChange?.replace("%", "") || "0") > 0) ? "up" as const : "down" as const,
      icon: <Activity className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-[#f87171]" />,
      iconBg: "bg-[#f8717133]",
    },
    {
      title: t("dashboard.totalCases"),
      value: stats?.totalCases.toLocaleString() || "0",
      change: stats?.totalCasesChange || "0%",
      trend: (stats?.totalCasesChange?.startsWith("+") || parseFloat(stats?.totalCasesChange?.replace("%", "") || "0") > 0) ? "up" as const : "down" as const,
      icon: <AlertTriangle className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-[#fbbf24]" />,
      iconBg: "bg-[#fbbf2433]",
    },
    {
      title: t("dashboard.countriesAffected"),
      value: stats?.countriesAffected.toLocaleString() || "0",
      change: stats?.countriesAffectedChange || "0",
      trend: (stats?.countriesAffectedChange?.startsWith("+") || parseFloat(stats?.countriesAffectedChange || "0") > 0) ? "up" as const : "down" as const,
      icon: <svg className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-[#66dbe1]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      iconBg: "bg-[#66dbe133]",
    },
    {
      title: t("dashboard.recoveryRate"),
      value: `${stats?.recoveryRate.toFixed(1) || "0"}%`,
      change: stats?.recoveryRateChange || "0%",
      trend: (stats?.recoveryRateChange?.startsWith("+") || parseFloat(stats?.recoveryRateChange?.replace("%", "") || "0") > 0) ? "down" as const : "up" as const,
      icon: <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-[#4ade80]" />,
      iconBg: "bg-[#4ade8033]",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 xl:gap-6" style={{ width: '100%', maxWidth: '100%' }}>
      {statCards.map((stat, index) => (
        <div key={index} style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
          <StatCard {...stat} loading={loading} />
        </div>
      ))}
    </div>
  );
};
