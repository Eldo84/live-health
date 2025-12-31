import { useState } from 'react';
import { Search, ArrowUpDown, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CountryData } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface DataTableProps {
  data: CountryData[];
  title: string;
}

type SortKey = keyof CountryData;
type SortDirection = 'asc' | 'desc';

export const DataTable = ({ data, title }: DataTableProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('prevalence');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const filteredData = data.filter((item) =>
    item.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return sortDirection === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const SortableHeader = ({ children, sortKey: key, className }: { children: React.ReactNode; sortKey: SortKey; className?: string }) => (
    <TableHead
      className={cn("cursor-pointer hover:bg-secondary/50 transition-colors", className)}
      onClick={() => handleSort(key)}
    >
      <div className="flex items-center gap-0.5 sm:gap-1">
        {children}
        <ArrowUpDown className={cn(
          'h-2.5 w-2.5 sm:h-3 sm:w-3 transition-colors',
          sortKey === key ? 'text-primary' : 'text-muted-foreground/50'
        )} />
      </div>
    </TableHead>
  );

  const getMortalityColor = (rate: number) => {
    if (rate < 2) return 'text-success';
    if (rate < 4) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="glass rounded-lg p-3 sm:p-4 animate-slide-up" style={{ animationDelay: '500ms' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium">{title}</h3>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 h-3 sm:h-3.5 w-3 sm:w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 sm:pl-8 h-7 sm:h-8 w-full sm:w-[160px] bg-secondary/50 border-border/50 text-[10px] sm:text-xs"
            />
          </div>
          <Button variant="outline" size="sm" className="h-7 sm:h-8 gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-2 sm:px-3">
            <Download className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border/50 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/30">
              <SortableHeader sortKey="country">Country</SortableHeader>
              <SortableHeader sortKey="region" className="hidden sm:table-cell">Region</SortableHeader>
              <SortableHeader sortKey="prevalence">Prev.</SortableHeader>
              <SortableHeader sortKey="incidence" className="hidden md:table-cell">Inc.</SortableHeader>
              <SortableHeader sortKey="mortality">Mort %</SortableHeader>
              <SortableHeader sortKey="dalys">DALYs</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => (
              <TableRow key={row.countryCode} className="hover:bg-secondary/20">
                <TableCell className="font-medium text-[10px] sm:text-sm py-2 sm:py-3">{row.country}</TableCell>
                <TableCell className="text-muted-foreground text-[10px] sm:text-sm hidden sm:table-cell">{row.region}</TableCell>
                <TableCell className="font-mono text-[10px] sm:text-sm">{row.prevalence.toLocaleString()}</TableCell>
                <TableCell className="font-mono text-[10px] sm:text-sm hidden md:table-cell">{row.incidence.toLocaleString()}</TableCell>
                <TableCell className={cn('font-mono text-[10px] sm:text-sm', getMortalityColor(row.mortality))}>
                  {row.mortality}%
                </TableCell>
                <TableCell className="font-mono text-[10px] sm:text-sm">{row.dalys.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted-foreground">
        <span>Showing {sortedData.length} of {data.length}</span>
        <span>Year: 2023</span>
      </div>
    </div>
  );
};
