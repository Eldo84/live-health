import { useState } from 'react';
import { Search, ChevronRight, AlertTriangle, Shield, Lightbulb } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Disease, riskFactors, interventions } from '@/data/mockData';

interface DiseaseSidebarProps {
  diseases: Disease[];
  selectedDisease: Disease | null;
  onSelectDisease: (disease: Disease) => void;
  selectedCategory: string;
  isMobile?: boolean;
}

export const DiseaseSidebar = ({
  diseases,
  selectedDisease,
  onSelectDisease,
  selectedCategory,
  isMobile = false,
}: DiseaseSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDiseases = diseases.filter((disease) => {
    const matchesSearch = disease.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      disease.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || disease.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedDiseases = filteredDiseases.reduce((acc, disease) => {
    if (!acc[disease.category]) {
      acc[disease.category] = [];
    }
    acc[disease.category].push(disease);
    return acc;
  }, {} as Record<string, Disease[]>);

  const getRiskFactorsForDisease = (diseaseId: string) => {
    return riskFactors[diseaseId] || riskFactors.default;
  };

  const getInterventionsForDisease = (diseaseId: string) => {
    return interventions[diseaseId] || interventions.default;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <aside className={cn(
      "flex-shrink-0 flex flex-col h-full",
      isMobile 
        ? "w-full bg-background" 
        : "w-72 xl:w-80 glass border-r border-border/50"
    )}>
      {/* Search */}
      <div className="p-3 sm:p-4 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground" />
          <Input
            placeholder="Search diseases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 sm:pl-9 bg-secondary/50 border-border/50 text-sm h-9"
          />
        </div>
      </div>

      {/* Disease List */}
      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {Object.entries(groupedDiseases).map(([category, categoryDiseases]) => (
            <div key={category} className="space-y-1.5 sm:space-y-2">
              <h3 className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
                {category}
              </h3>
              <div className="space-y-0.5 sm:space-y-1">
                {categoryDiseases.map((disease) => (
                  <button
                    key={disease.id}
                    onClick={() => onSelectDisease(disease)}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm transition-all duration-200',
                      'hover:bg-secondary/80 active:scale-[0.98]',
                      selectedDisease?.id === disease.id
                        ? 'bg-primary/10 text-primary border-l-2 border-primary'
                        : 'text-foreground/80'
                    )}
                  >
                    <span className="truncate text-left">{disease.name}</span>
                    <ChevronRight className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Disease Details Panel */}
      {selectedDisease && (
        <div className="border-t border-border/50 p-3 sm:p-4 space-y-3 sm:space-y-4 bg-card/50 max-h-[40vh] overflow-y-auto">
          <div>
            <h3 className="font-semibold text-xs sm:text-sm">{selectedDisease.name}</h3>
            <div className="flex flex-wrap gap-1 mt-1.5 sm:mt-2">
              {selectedDisease.keywords.slice(0, 4).map((keyword) => (
                <Badge key={keyword} variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
                  {keyword}
                </Badge>
              ))}
            </div>
            {selectedDisease.pathogen && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
                <span className="font-medium">Pathogen:</span> {selectedDisease.pathogen}
              </p>
            )}
          </div>

          {/* Risk Factors */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium text-muted-foreground">
              <AlertTriangle className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
              Risk Factors
            </div>
            <ul className="space-y-0.5 sm:space-y-1">
              {getRiskFactorsForDisease(selectedDisease.id).slice(0, 4).map((factor) => (
                <li key={factor.name} className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                  <span className={cn('w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full flex-shrink-0', {
                    'bg-destructive': factor.impact === 'high',
                    'bg-warning': factor.impact === 'medium',
                    'bg-success': factor.impact === 'low',
                  })} />
                  <span className="truncate">{factor.name}</span>
                  <span className={cn('ml-auto text-[9px] sm:text-[10px] uppercase flex-shrink-0', getImpactColor(factor.impact))}>
                    {factor.impact}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interventions */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium text-muted-foreground">
              <Shield className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
              Interventions
            </div>
            <ul className="space-y-0.5 sm:space-y-1">
              {getInterventionsForDisease(selectedDisease.id).slice(0, 3).map((intervention) => (
                <li key={intervention} className="flex items-start gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-foreground/80">
                  <Lightbulb className="h-2.5 sm:h-3 w-2.5 sm:w-3 mt-0.5 text-primary flex-shrink-0" />
                  <span className="line-clamp-2">{intervention}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </aside>
  );
};
