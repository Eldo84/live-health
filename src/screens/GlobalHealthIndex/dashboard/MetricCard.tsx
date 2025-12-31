import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  sparkline?: number[];
  delay?: number;
}

export const MetricCard = ({
  title,
  value,
  unit,
  trend,
  trendLabel,
  variant = 'default',
  sparkline,
  delay = 0,
}: MetricCardProps) => {
  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) return <Minus className="h-2.5 sm:h-3 w-2.5 sm:w-3" />;
    return trend > 0 ? <ArrowUp className="h-2.5 sm:h-3 w-2.5 sm:w-3" /> : <ArrowDown className="h-2.5 sm:h-3 w-2.5 sm:w-3" />;
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return 'text-muted-foreground';
    if (variant === 'danger') return trend > 0 ? 'text-destructive' : 'text-success';
    return trend > 0 ? 'text-success' : 'text-destructive';
  };

  const getAccentColor = () => {
    switch (variant) {
      case 'success': return 'bg-success';
      case 'warning': return 'bg-warning';
      case 'danger': return 'bg-destructive';
      default: return 'bg-primary';
    }
  };

  const renderSparkline = () => {
    if (!sparkline || sparkline.length === 0) return null;
    const max = Math.max(...sparkline);
    const min = Math.min(...sparkline);
    const range = max - min || 1;
    const height = 20;
    const width = 50;
    const points = sparkline.map((val, i) => {
      const x = (i / (sparkline.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-10 sm:w-[50px] h-4 sm:h-5 opacity-60" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          points={points}
          className="text-primary"
        />
      </svg>
    );
  };

  return (
    <div
      className={cn(
        'glass rounded-lg p-2.5 sm:p-3 lg:p-4 transition-all duration-300 hover:scale-[1.02] animate-slide-up',
        'border-l-2',
        getAccentColor().replace('bg-', 'border-l-')
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </p>
          <div className="flex items-baseline gap-0.5 sm:gap-1 flex-wrap">
            <span className="text-lg sm:text-xl lg:text-2xl font-semibold font-mono tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && (
              <span className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">{unit}</span>
            )}
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          {sparkline && renderSparkline()}
        </div>
      </div>
      
      {trend !== undefined && (
        <div className={cn('flex items-center gap-0.5 sm:gap-1 mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-medium', getTrendColor())}>
          {getTrendIcon()}
          <span>{Math.abs(trend)}%</span>
          {trendLabel && (
            <span className="text-muted-foreground ml-0.5 sm:ml-1 hidden sm:inline">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};
