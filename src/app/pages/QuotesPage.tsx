import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, Eye, Download, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { SwipeableCard } from '../components/SwipeableCard';
import { BottomSheet } from '../components/BottomSheet';
import { MobilePullToRefresh } from '../components/MobilePullToRefresh';
import { SwipeHint } from '../components/SwipeHint';

interface Quote {
  id: number;
  restaurantName: string;
  quoteNumber: string;
  date: string;
  amount: number;
}

const mockQuotes: Quote[] = [
  {
    id: 1,
    restaurantName: 'Bella Vista Restaurant',
    quoteNumber: 'Q-1627',
    date: 'Jan 14, 2024',
    amount: 3468.76,
  },
  {
    id: 2,
    restaurantName: 'The Italian Kitchen',
    quoteNumber: 'Q-1626',
    date: 'Jan 11, 2024',
    amount: 2189.5,
  },
  {
    id: 3,
    restaurantName: 'Osteria del Mare',
    quoteNumber: 'Q-1625',
    date: 'Jan 9, 2024',
    amount: 4872.25,
  },
  {
    id: 4,
    restaurantName: 'Golden Harvest',
    quoteNumber: 'Q-1624',
    date: 'Jan 7, 2024',
    amount: 6274.8,
  },
  {
    id: 5,
    restaurantName: 'Harbor House Seafood',
    quoteNumber: 'Q-1623',
    date: 'Jan 5, 2024',
    amount: 8881.4,
  },
  {
    id: 6,
    restaurantName: 'The Red Door Bistro',
    quoteNumber: 'Q-1622',
    date: 'Jan 3, 2024',
    amount: 1597.9,
  },
  {
    id: 7,
    restaurantName: 'Lakeside Grill & Bar',
    quoteNumber: 'Q-1621',
    date: 'Jan 1, 2024',
    amount: 3982.15,
  },
];

export function QuotesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

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

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Refreshed quote data');
  }, []);

  const filteredQuotes = mockQuotes.filter((quote) => {
    const matchesSearch =
      quote.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Sort quotes
  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal = a[sortColumn as keyof typeof a];
    let bVal = b[sortColumn as keyof typeof b];
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    
    if (sortDirection === 'asc') {
      return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
    } else {
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
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
                className="bg-[#F2993D] hover:bg-[#E08A2E] text-white h-9 px-3"
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
            <h1 className="text-2xl mb-1 text-[#4F4F4F]">Quotes Directory</h1>
            <p className="text-[#4F4F4F] text-sm">
              View and manage all historical quotes
            </p>
          </div>
          <Button 
            onClick={() => navigate('/start-new-quote')}
            className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
          >
            + New Quote
          </Button>
        </div>

        {/* Mobile Pull-to-Refresh Card List */}
        <MobilePullToRefresh onRefresh={handleRefresh}>
          <div className="space-y-3">
            {sortedQuotes.map((quote) => (
              <SwipeableCard
                key={quote.id}
                onEdit={() => console.log('Edit quote', quote.id)}
                className="rounded-lg border border-gray-200 shadow-sm p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-[#2A2A2A]">{quote.restaurantName}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{quote.quoteNumber}</p>
                  </div>
                </div>

                <div className="flex justify-between items-end mt-3">
                  <div className="text-sm">
                    <p className="text-gray-500 text-xs mb-0.5">Date</p>
                    <p className="text-[#2A2A2A]">{quote.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs mb-0.5">Amount</p>
                    <p className="text-[#2A2A2A] font-medium">
                      ${quote.amount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-50">
                   <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#F2993D] transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                      View
                   </button>
                   <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#F2993D] transition-colors">
                      <Download className="w-3.5 h-3.5" />
                      Download
                   </button>
                </div>
              </SwipeableCard>
            ))}
          </div>
        </MobilePullToRefresh>

        {/* Desktop Main Content Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 hidden md:block">
          {/* Search and Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="mb-4">
              <h3 className="text-sm text-[#4F4F4F] mb-3">Search Quotes</h3>
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Search by quote number, customer name, date, chef contact, or item on quote</p>
            </div>

            {/* Filters */}
            <div>
              <h3 className="text-sm text-[#4F4F4F] mb-3">Filters</h3>
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
                  <Input
                    type="text"
                    placeholder="Start date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white w-full sm:w-40"
                  />
                  <span className="text-sm text-[#4F4F4F]">to</span>
                  <Input
                    type="text"
                    placeholder="End date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white w-full sm:w-40"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 border-b-2 border-gray-300 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs text-[#4F4F4F] cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('restaurantName')}>
                    Customer Name {getSortIcon('restaurantName')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs text-[#4F4F4F] cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('quoteNumber')}>
                    Quote Number {getSortIcon('quoteNumber')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs text-[#4F4F4F] cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('date')}>
                    Date {getSortIcon('date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs text-[#4F4F4F] cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('amount')}>
                    Amount {getSortIcon('amount')}
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
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#2A2A2A]">
                        {quote.restaurantName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#2A2A2A]">
                      {quote.quoteNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#2A2A2A]">
                      {quote.date}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#2A2A2A]">
                      ${quote.amount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                          <Download className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 flex justify-between items-center border-t border-gray-200">
            <p className="text-sm text-[#4F4F4F]">
              Showing {filteredQuotes.length} of 47 quotes
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </div>
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
                variant={sortColumn === 'date' ? 'default' : 'outline'}
                className={`w-full justify-start ${sortColumn === 'date' ? 'bg-[#F2993D] hover:bg-[#E08A2E] text-white' : ''}`}
                onClick={() => {
                  handleSort('date');
                }}
              >
                Date {sortColumn === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortColumn === 'amount' ? 'default' : 'outline'}
                className={`w-full justify-start ${sortColumn === 'amount' ? 'bg-[#F2993D] hover:bg-[#E08A2E] text-white' : ''}`}
                onClick={() => {
                  handleSort('amount');
                }}
              >
                Amount {sortColumn === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortColumn === 'restaurantName' ? 'default' : 'outline'}
                className={`w-full justify-start ${sortColumn === 'restaurantName' ? 'bg-[#F2993D] hover:bg-[#E08A2E] text-white' : ''}`}
                onClick={() => {
                  handleSort('restaurantName');
                }}
              >
                Customer Name {sortColumn === 'restaurantName' && (sortDirection === 'asc' ? '↑' : '↓')}
              </Button>
            </div>
          </div>

          <Button
            className="w-full bg-[#F2993D] hover:bg-[#E08A2E] text-white"
            onClick={() => setFilterSheetOpen(false)}
          >
            Apply
          </Button>
        </div>
      </BottomSheet>
      
      {/* Swipe Hint for Mobile Users */}
      <SwipeHint />
    </div>
  );
}
