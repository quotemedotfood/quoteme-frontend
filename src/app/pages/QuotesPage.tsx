import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, Eye, Download, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal, RefreshCw, Loader2, Trash2, Pencil } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { SwipeableCard } from '../components/SwipeableCard';
import { BottomSheet } from '../components/BottomSheet';
import { MobilePullToRefresh } from '../components/MobilePullToRefresh';
import { SwipeHint } from '../components/SwipeHint';
import { getQuotes, requoteQuote, downloadQuotePdf, deleteQuote, type QuoteListItem, type GetQuotesParams } from '../services/api';

export function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [requotingId, setRequotingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: GetQuotesParams = {};
    if (statusFilter) params.status = statusFilter;
    if (startDate) params.date_from = startDate;
    if (endDate) params.date_to = endDate;

    const response = await getQuotes(params);
    if (response.error) {
      setError(response.error);
      setQuotes([]);
    } else if (response.data) {
      setQuotes(response.data);
    }
    setLoading(false);
  }, [statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 ml-1 inline" />;
  };

  const handleRefresh = useCallback(async () => {
    await fetchQuotes();
  }, [fetchQuotes]);

  const handleRequote = async (quoteId: string) => {
    setRequotingId(quoteId);
    const response = await requoteQuote(quoteId);
    setRequotingId(null);
    if (response.error) {
      setError(`Requote failed: ${response.error}`);
      return;
    }
    if (response.data) {
      navigate('/map-ingredients', { state: { quoteId: response.data.id, isOpenQuote: false } });
    }
  };

  const handleDownloadPdf = async (quoteId: string) => {
    const result = await downloadQuotePdf(quoteId);
    if (result.error) {
      setError(`Download failed: ${result.error}`);
      return;
    }
    if (result.blob) {
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quote-${quoteId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleViewQuote = (quoteId: string) => {
    window.open(`/export-finalize?quoteId=${quoteId}`, '_blank');
  };

  const handleEditQuote = (quoteId: string) => {
    navigate('/quote-builder', { state: { quoteId, isOpenQuote: false } });
  };

  const handleDeleteQuote = async (quoteId: string) => {
    const response = await deleteQuote(quoteId);
    if (response.error) {
      setError(`Delete failed: ${response.error}`);
    } else {
      setQuotes(prev => prev.filter(q => q.id !== quoteId));
    }
    setConfirmDeleteId(null);
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-green-100 text-green-800',
      accepted: 'bg-[#A5CFDD]/20 text-[#2A5F6F]',
      declined: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Client-side search filtering
  const filteredQuotes = quotes.filter((quote) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (quote.restaurant || '').toLowerCase().includes(q) ||
      (quote.working_label || '').toLowerCase().includes(q) ||
      quote.status.toLowerCase().includes(q) ||
      quote.id.toLowerCase().includes(q)
    );
  });

  // Sort quotes
  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    if (!sortColumn) return 0;

    let aVal: any;
    let bVal: any;

    switch (sortColumn) {
      case 'restaurant':
        aVal = (a.restaurant || '').toLowerCase();
        bVal = (b.restaurant || '').toLowerCase();
        break;
      case 'status':
        aVal = a.status.toLowerCase();
        bVal = b.status.toLowerCase();
        break;
      case 'total_cents':
        aVal = a.total_cents;
        bVal = b.total_cents;
        break;
      case 'line_count':
        aVal = a.line_count;
        bVal = b.line_count;
        break;
      case 'created_at':
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
        break;
      default:
        return 0;
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    if (sortDirection === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });

  return (
    <div className="p-4 md:p-8 bg-[#FFF9F3] min-h-screen pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Sticky Header - Mobile */}
        <div className="md:hidden sticky top-0 z-10 bg-[#FFF9F3] -mx-4 px-4 pt-4 pb-3 mb-4 border-b border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-xl text-[#4F4F4F]">Quotes</h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setFilterSheetOpen(true)}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white h-9 px-3"
                onClick={() => navigate('/start-new-quote')}
              >
                + New
              </Button>
            </div>
          </div>
          {/* Mobile Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search quotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-300 h-10"
            />
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl mb-1 text-[#4F4F4F]">Quote History</h1>
            <p className="text-[#4F4F4F] text-sm">
              View and manage all historical quotes
            </p>
          </div>
          <Button
            onClick={() => navigate('/start-new-quote')}
            className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
          >
            + New Quote
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#F2993D] animate-spin mb-3" />
            <p className="text-sm text-gray-500">Loading quotes...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchQuotes}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && quotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-500 mb-4">No quotes yet. Create your first quote to get started.</p>
            <Button
              className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
              onClick={() => navigate('/start-new-quote')}
            >
              + New Quote
            </Button>
          </div>
        )}

        {/* No search results */}
        {!loading && !error && quotes.length > 0 && sortedQuotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-500">No quotes match your search.</p>
          </div>
        )}

        {/* Mobile Pull-to-Refresh Card List */}
        {!loading && !error && sortedQuotes.length > 0 && (
          <MobilePullToRefresh onRefresh={handleRefresh}>
            <div className="space-y-3">
              {sortedQuotes.map((quote) => (
                <SwipeableCard
                  key={quote.id}
                  onEdit={() => handleEditQuote(quote.id)}
                  onDelete={() => setConfirmDeleteId(quote.id)}
                  className="rounded-lg border border-gray-200 shadow-sm p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-sm font-medium text-[#2A2A2A]">
                        {quote.restaurant || quote.working_label || 'Untitled Quote'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {quote.line_count} item{quote.line_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {getStatusBadge(quote.status)}
                  </div>

                  <div className="flex justify-between items-end mt-3">
                    <div className="text-sm">
                      <p className="text-gray-500 text-xs mb-0.5">Date</p>
                      <p className="text-[#2A2A2A]">{formatDate(quote.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-xs mb-0.5">Total</p>
                      <p className="text-[#2A2A2A] font-medium">
                        {formatCurrency(quote.total_cents)}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-50">
                    <button
                      className="flex items-center gap-1.5 text-xs font-medium text-[#7FAEC2] hover:text-[#6A9AB0] transition-colors"
                      onClick={() => handleEditQuote(quote.id)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Quote
                    </button>
                    <div className="flex gap-3">
                      <button
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#F2993D] transition-colors"
                        onClick={() => handleViewQuote(quote.id)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                      <button
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#F2993D] transition-colors"
                        onClick={() => handleDownloadPdf(quote.id)}
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </button>
                      <button
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#F2993D] transition-colors disabled:opacity-50"
                        onClick={() => handleRequote(quote.id)}
                        disabled={requotingId === quote.id}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${requotingId === quote.id ? 'animate-spin' : ''}`} />
                        Requote
                      </button>
                    </div>
                  </div>
                </SwipeableCard>
              ))}
            </div>
          </MobilePullToRefresh>
        )}

        {/* Desktop Main Content Card */}
        {!loading && !error && sortedQuotes.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 hidden md:block">
            {/* Search and Filters */}
            <div className="p-6 border-b border-gray-200">
              <div className="mb-4">
                <h3 className="text-sm text-[#4F4F4F] mb-3">Search Quotes</h3>
                <div className="relative max-w-xl">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by restaurant, label, or status..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
              </div>

              {/* Filters */}
              <div>
                <h3 className="text-sm text-[#4F4F4F] mb-3">Filters</h3>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
                    <Input
                      type="date"
                      placeholder="Start date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white w-full sm:w-40"
                    />
                    <span className="text-sm text-[#4F4F4F]">to</span>
                    <Input
                      type="date"
                      placeholder="End date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white w-full sm:w-40"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm w-full sm:w-36"
                  >
                    <option value="">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b-2 border-gray-300 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs text-[#4F4F4F] cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('restaurant')}>
                      Restaurant {getSortIcon('restaurant')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-[#4F4F4F] font-semibold">
                      Label
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-[#4F4F4F] cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('status')}>
                      Status {getSortIcon('status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-[#4F4F4F] cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('created_at')}>
                      Date {getSortIcon('created_at')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-[#4F4F4F] cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('line_count')}>
                      Items {getSortIcon('line_count')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-[#4F4F4F] cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('total_cents')}>
                      Total {getSortIcon('total_cents')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-[#4F4F4F] font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedQuotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleViewQuote(quote.id)}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm text-[#2A2A2A]">
                          {quote.restaurant || 'No restaurant'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                        {quote.working_label || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(quote.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#2A2A2A]">
                        {formatDate(quote.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#2A2A2A]">
                        {quote.line_count}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#2A2A2A]">
                        {formatCurrency(quote.total_cents)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                            onClick={() => handleEditQuote(quote.id)}
                          >
                            <Pencil className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="View"
                            onClick={() => handleViewQuote(quote.id)}
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Download PDF"
                            onClick={() => handleDownloadPdf(quote.id)}
                          >
                            <Download className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                            title="Requote"
                            onClick={() => handleRequote(quote.id)}
                            disabled={requotingId === quote.id}
                          >
                            <RefreshCw className={`w-4 h-4 text-gray-600 ${requotingId === quote.id ? 'animate-spin' : ''}`} />
                          </button>
                          {quote.status === 'draft' && (
                            <button
                              className="p-1 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                              onClick={() => setConfirmDeleteId(quote.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 flex justify-between items-center border-t border-gray-200">
              <p className="text-sm text-[#4F4F4F]">
                Showing {sortedQuotes.length} of {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Filter/Sort Bottom Sheet */}
      <BottomSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        title="Sort & Filter"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-[#4F4F4F] mb-3">Sort By</h3>
            <div className="space-y-2">
              <Button
                variant={sortColumn === 'created_at' ? 'default' : 'outline'}
                className={`w-full justify-start ${sortColumn === 'created_at' ? 'bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white' : ''}`}
                onClick={() => {
                  handleSort('created_at');
                }}
              >
                Date {sortColumn === 'created_at' && (sortDirection === 'asc' ? '(oldest first)' : '(newest first)')}
              </Button>
              <Button
                variant={sortColumn === 'total_cents' ? 'default' : 'outline'}
                className={`w-full justify-start ${sortColumn === 'total_cents' ? 'bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white' : ''}`}
                onClick={() => {
                  handleSort('total_cents');
                }}
              >
                Total {sortColumn === 'total_cents' && (sortDirection === 'asc' ? '(low to high)' : '(high to low)')}
              </Button>
              <Button
                variant={sortColumn === 'restaurant' ? 'default' : 'outline'}
                className={`w-full justify-start ${sortColumn === 'restaurant' ? 'bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white' : ''}`}
                onClick={() => {
                  handleSort('restaurant');
                }}
              >
                Restaurant {sortColumn === 'restaurant' && (sortDirection === 'asc' ? '(A-Z)' : '(Z-A)')}
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-[#4F4F4F] mb-3">Status</h3>
            <div className="space-y-2">
              {['', 'draft', 'sent', 'accepted', 'declined'].map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  className={`w-full justify-start ${statusFilter === s ? 'bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white' : ''}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-[#4F4F4F] mb-3">Date Range</h3>
            <div className="space-y-2">
              <Input
                type="date"
                placeholder="From"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white"
              />
              <Input
                type="date"
                placeholder="To"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          <Button
            className="w-full bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
            onClick={() => setFilterSheetOpen(false)}
          >
            Apply
          </Button>
        </div>
      </BottomSheet>

      {/* Swipe Hint for Mobile Users */}
      <SwipeHint />

      {/* Delete Confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-medium text-[#2A2A2A] mb-2">Delete Quote?</h3>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone. The quote and all its line items will be permanently deleted.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={() => handleDeleteQuote(confirmDeleteId)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
