import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { useExportData, ExportDataRow } from "../../../lib/useExportData";
import { 
  Download, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  AlertCircle,
  Database,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  FileSpreadsheet,
  Filter
} from "lucide-react";

interface DataExportTableProps {
  timeRange: string;
  countryId?: string | null;
}

type SortField = keyof ExportDataRow;
type SortDirection = 'asc' | 'desc';

export const DataExportTable: React.FC<DataExportTableProps> = ({ timeRange, countryId }) => {
  const { data, loading, error } = useExportData(timeRange, countryId);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const itemsPerPage = 15;

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    
    const query = searchQuery.toLowerCase().trim();
    return data.filter(row => 
      row.disease.toLowerCase().includes(query) ||
      row.pathogen.toLowerCase().includes(query) ||
      row.location.toLowerCase().includes(query) ||
      row.severity.toLowerCase().includes(query) ||
      row.pathogenType.toLowerCase().includes(query) ||
      row.primarySpecies.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      // Handle numeric fields
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle string/date fields
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [filteredData, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage]);

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, timeRange, countryId]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-2.5 h-2.5 ml-0.5 opacity-50 flex-shrink-0" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-2.5 h-2.5 ml-0.5 text-[#66dbe1] flex-shrink-0" />
      : <ArrowDown className="w-2.5 h-2.5 ml-0.5 text-[#66dbe1] flex-shrink-0" />;
  };

  // Severity badge - compact dot style
  const getSeverityDot = (severity: string) => {
    const colors: Record<string, string> = {
      'Critical': 'bg-red-500',
      'High': 'bg-orange-500',
      'Medium': 'bg-yellow-500',
      'Low': 'bg-green-500',
    };
    return colors[severity] || 'bg-gray-500';
  };

  // Short severity label
  const getShortSeverity = (severity: string) => {
    const short: Record<string, string> = {
      'Critical': 'Crit',
      'High': 'High',
      'Medium': 'Med',
      'Low': 'Low',
    };
    return short[severity] || severity;
  };

  // Short species label
  const getShortSpecies = (species: string) => {
    const short: Record<string, string> = {
      'Human': 'Human',
      'Animal': 'Animal',
      'Zoonotic (Human & Animal)': 'Zoonotic',
      'Unknown': '—',
    };
    return short[species] || species;
  };

  // Export function that handles all data, filtered data, or current page
  const handleExport = (exportType: 'all' | 'filtered' | 'page') => {
    let dataToExport: ExportDataRow[];
    let suffix: string;
    
    switch (exportType) {
      case 'all':
        dataToExport = data;
        suffix = 'all';
        break;
      case 'filtered':
        dataToExport = sortedData;
        suffix = 'filtered';
        break;
      case 'page':
        dataToExport = paginatedData;
        suffix = `page${currentPage}`;
        break;
    }
    
    if (dataToExport.length === 0) return;

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
      ...dataToExport.map(row => [
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
    link.setAttribute('download', `outbreak_data_${suffix}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
  };

  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-[#66dbe1]" />
              Outbreak Data Export
            </h3>
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
              View and export all outbreak data as CSV
            </p>
          </div>
          
          <Button
            onClick={() => setShowExportDialog(true)}
            disabled={loading || data.length === 0}
            className="bg-[#4eb7bd] hover:bg-[#3da5ab] text-white flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Search and Stats Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ebebeb99]" />
            <Input
              type="text"
              placeholder="Search diseases, locations, pathogens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#ffffff14] border-[#dae0e633] text-[#ebebeb] pl-10 placeholder:text-[#ebebeb66]"
            />
          </div>
          
          <div className="text-sm text-[#ebebeb99]">
            {loading ? (
              <span>Loading...</span>
            ) : (
              <span>
                Showing {paginatedData.length} of {filteredData.length} records
                {searchQuery && ` (filtered from ${data.length})`}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#66dbe1] animate-spin" />
            <span className="ml-3 text-[#ebebeb] text-sm">Loading outbreak data...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-400">
            <AlertCircle className="w-6 h-6 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#ebebeb99]">
            <Database className="w-12 h-12 mb-3 opacity-50" />
            <span className="text-sm">No outbreak data found for the selected time range</span>
          </div>
        ) : (
          <>
            {/* Summary Stats Cards - At Top */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-[#ffffff0a] rounded-lg p-3 border border-[#dae0e620]">
                <p className="text-[10px] text-[#ebebeb99] uppercase tracking-wide mb-1">Total Records</p>
                <p className="text-2xl font-bold text-[#66dbe1]">{data.length.toLocaleString()}</p>
              </div>
              <div className="bg-[#ffffff0a] rounded-lg p-3 border border-[#dae0e620]">
                <p className="text-[10px] text-[#ebebeb99] uppercase tracking-wide mb-1">Total Alerts</p>
                <p className="text-2xl font-bold text-[#ffffff]">
                  {data.reduce((sum, r) => sum + r.alertCount, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-[#ffffff0a] rounded-lg p-3 border border-[#dae0e620]">
                <p className="text-[10px] text-[#ebebeb99] uppercase tracking-wide mb-1">Total Cases</p>
                <p className="text-2xl font-bold text-[#fbbf24]">
                  {data.reduce((sum, r) => sum + r.confirmedCases, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-[#ffffff0a] rounded-lg p-3 border border-[#dae0e620]">
                <p className="text-[10px] text-[#ebebeb99] uppercase tracking-wide mb-1">Total Mortality</p>
                <p className="text-2xl font-bold text-[#f87171]">
                  {data.reduce((sum, r) => sum + r.mortality, 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Compact Table - No Horizontal Scroll */}
            <div className="rounded-lg border border-[#dae0e633] overflow-hidden">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="bg-[#ffffff0a] border-b border-[#dae0e633]">
                    <th 
                      className="w-[8%] px-2 py-2 text-left text-[10px] font-semibold text-[#ebebeb] uppercase cursor-pointer hover:bg-[#ffffff14]"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center">Date{renderSortIcon('date')}</div>
                    </th>
                    <th 
                      className="w-[14%] px-2 py-2 text-left text-[10px] font-semibold text-[#ebebeb] uppercase cursor-pointer hover:bg-[#ffffff14]"
                      onClick={() => handleSort('disease')}
                    >
                      <div className="flex items-center">Disease{renderSortIcon('disease')}</div>
                    </th>
                    <th 
                      className="w-[12%] px-2 py-2 text-left text-[10px] font-semibold text-[#ebebeb] uppercase cursor-pointer hover:bg-[#ffffff14]"
                      onClick={() => handleSort('pathogen')}
                    >
                      <div className="flex items-center">Pathogen{renderSortIcon('pathogen')}</div>
                    </th>
                    <th 
                      className="w-[8%] px-2 py-2 text-left text-[10px] font-semibold text-[#ebebeb] uppercase cursor-pointer hover:bg-[#ffffff14]"
                      onClick={() => handleSort('pathogenType')}
                    >
                      <div className="flex items-center">Type{renderSortIcon('pathogenType')}</div>
                    </th>
                    <th 
                      className="w-[9%] px-2 py-2 text-left text-[10px] font-semibold text-[#ebebeb] uppercase cursor-pointer hover:bg-[#ffffff14]"
                      onClick={() => handleSort('primarySpecies')}
                    >
                      <div className="flex items-center">Species{renderSortIcon('primarySpecies')}</div>
                    </th>
                    <th 
                      className="w-[15%] px-2 py-2 text-left text-[10px] font-semibold text-[#ebebeb] uppercase cursor-pointer hover:bg-[#ffffff14]"
                      onClick={() => handleSort('location')}
                    >
                      <div className="flex items-center">Location{renderSortIcon('location')}</div>
                    </th>
                    <th 
                      className="w-[7%] px-2 py-2 text-left text-[10px] font-semibold text-[#ebebeb] uppercase cursor-pointer hover:bg-[#ffffff14]"
                      onClick={() => handleSort('severity')}
                    >
                      <div className="flex items-center">Sev{renderSortIcon('severity')}</div>
                    </th>
                    <th 
                      className="w-[7%] px-2 py-2 text-center text-[10px] font-semibold text-[#ebebeb] uppercase cursor-pointer hover:bg-[#ffffff14]"
                      onClick={() => handleSort('alertCount')}
                    >
                      <div className="flex items-center justify-center">Alerts{renderSortIcon('alertCount')}</div>
                    </th>
                    <th 
                      className="w-[10%] px-2 py-2 text-center text-[10px] font-semibold text-[#ebebeb] uppercase cursor-pointer hover:bg-[#ffffff14]"
                      onClick={() => handleSort('confirmedCases')}
                    >
                      <div className="flex items-center justify-center">Cases{renderSortIcon('confirmedCases')}</div>
                    </th>
                    <th 
                      className="w-[10%] px-2 py-2 text-center text-[10px] font-semibold text-[#ebebeb] uppercase cursor-pointer hover:bg-[#ffffff14]"
                      onClick={() => handleSort('mortality')}
                    >
                      <div className="flex items-center justify-center">Deaths{renderSortIcon('mortality')}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dae0e620]">
                  {paginatedData.map((row, idx) => (
                    <tr 
                      key={row.id} 
                      className={`${idx % 2 === 0 ? 'bg-transparent' : 'bg-[#ffffff05]'} hover:bg-[#ffffff10] transition-colors`}
                    >
                      <td className="px-2 py-2 text-[11px] text-[#ebebeb99] truncate" title={row.date}>
                        {row.date.slice(5)} {/* Show MM-DD */}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-[#66dbe1] font-medium truncate" title={row.disease}>
                        {row.disease}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-[#ebebeb] truncate" title={row.pathogen}>
                        {row.pathogen === 'Not specified' ? '—' : row.pathogen}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-[#ebebeb99] truncate" title={row.pathogenType}>
                        {row.pathogenType === 'Unknown' ? '—' : row.pathogenType}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-[#ebebeb99] truncate" title={row.primarySpecies}>
                        {getShortSpecies(row.primarySpecies)}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-[#ebebeb] truncate" title={row.location}>
                        {row.location}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1" title={row.severity}>
                          <span className={`w-2 h-2 rounded-full ${getSeverityDot(row.severity)}`}></span>
                          <span className="text-[10px] text-[#ebebeb99]">{getShortSeverity(row.severity)}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-[11px] text-[#ebebeb] text-center">
                        {row.alertCount}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-[#fbbf24] text-center font-medium">
                        {row.confirmedCases > 0 ? row.confirmedCases.toLocaleString() : '—'}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-[#f87171] text-center font-medium">
                        {row.mortality > 0 ? row.mortality.toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <div className="text-sm text-[#ebebeb99]">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="bg-[#ffffff14] border-[#dae0e633] text-[#ebebeb] hover:bg-[#ffffff24] disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </Button>
                  
                  {/* Page numbers */}
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 text-sm rounded transition-colors ${
                            currentPage === pageNum
                              ? 'bg-[#4eb7bd] text-white'
                              : 'text-[#ebebeb] hover:bg-[#ffffff14]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="bg-[#ffffff14] border-[#dae0e633] text-[#ebebeb] hover:bg-[#ffffff24] disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

          </>
        )}

        {/* Export Dialog */}
        {showExportDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#2a4149] border border-[#dae0e633] rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
              {/* Dialog Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#dae0e633]">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#66dbe1]" />
                  Export Data
                </h3>
                <button
                  onClick={() => setShowExportDialog(false)}
                  className="text-[#ebebeb99] hover:text-white transition-colors p-1 rounded hover:bg-[#ffffff14]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Dialog Content */}
              <div className="p-5 space-y-3">
                <p className="text-sm text-[#ebebeb99]">
                  Choose which data you want to export as CSV:
                </p>
                
                {/* Export Current Page Option - Most relevant */}
                <button
                  onClick={() => handleExport('page')}
                  className="w-full p-4 rounded-lg border-2 border-[#66dbe1]/50 bg-[#66dbe1]/10 hover:bg-[#66dbe1]/20 hover:border-[#66dbe1] transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#66dbe1]/30 flex items-center justify-center flex-shrink-0 group-hover:bg-[#66dbe1]/40 transition-colors">
                      <FileSpreadsheet className="w-5 h-5 text-[#66dbe1]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-white">Export Current Page</h4>
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#66dbe1]/30 text-[#66dbe1] rounded">Recommended</span>
                      </div>
                      <p className="text-xs text-[#ebebeb99] mt-1">
                        Download {paginatedData.length} records shown on page {currentPage} of {totalPages}
                      </p>
                    </div>
                  </div>
                </button>
                
                {/* Export Filtered Option */}
                <button
                  onClick={() => handleExport('filtered')}
                  disabled={sortedData.length === data.length && !searchQuery}
                  className="w-full p-3 rounded-lg border border-[#dae0e633] bg-[#ffffff0a] hover:bg-[#ffffff14] hover:border-[#fbbf24]/50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#ffffff0a] disabled:hover:border-[#dae0e633]"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#fbbf24]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#fbbf24]/30 transition-colors">
                      <Filter className="w-4 h-4 text-[#fbbf24]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white text-sm">Export Filtered Data</h4>
                      <p className="text-xs text-[#ebebeb99]">
                        {sortedData.length === data.length && !searchQuery ? (
                          "No filters applied - same as all data"
                        ) : (
                          <>All {sortedData.length.toLocaleString()} filtered records{searchQuery && ` (search: "${searchQuery}")`}</>
                        )}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Export All Option */}
                <button
                  onClick={() => handleExport('all')}
                  className="w-full p-3 rounded-lg border border-[#dae0e633] bg-[#ffffff0a] hover:bg-[#ffffff14] hover:border-[#4eb7bd]/50 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#4eb7bd]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#4eb7bd]/30 transition-colors">
                      <Database className="w-4 h-4 text-[#4eb7bd]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white text-sm">Export All Data</h4>
                      <p className="text-xs text-[#ebebeb99]">
                        All {data.length.toLocaleString()} records from selected time range
                      </p>
                    </div>
                  </div>
                </button>
              </div>
              
              {/* Dialog Footer */}
              <div className="px-5 py-4 border-t border-[#dae0e633] bg-[#ffffff05]">
                <Button
                  variant="outline"
                  onClick={() => setShowExportDialog(false)}
                  className="w-full bg-transparent border-[#dae0e633] text-[#ebebeb] hover:bg-[#ffffff14] hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

