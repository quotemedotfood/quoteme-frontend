import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, Save, Filter, Plus, Minus, Edit, ChevronUp, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useState } from 'react';

interface ProductItem {
  id: number;
  dish: string;
  component: string;
  sku: string;
  brand: string;
  product: string;
  pack: string;
  basePrice: number;
  currentPrice: number;
  percentChange: number;
}

const initialProducts: ProductItem[] = [
  {
    id: 1,
    dish: 'Orecchiette with Broccoli Rabe',
    component: 'Orecchiette pasta',
    sku: 'PST-602',
    brand: 'Rustichella',
    product: 'Artisan Orecchiette',
    pack: '12/500g bag',
    basePrice: 42.0,
    currentPrice: 42.0,
    percentChange: 0,
  },
  {
    id: 2,
    dish: 'Orecchiette with Broccoli Rabe',
    component: 'Calabrian chili',
    sku: 'PEP-201',
    brand: 'Tutto Calabria',
    product: 'Calabrian Chili Paste Hot',
    pack: '12/10 oz jar',
    basePrice: 48.6,
    currentPrice: 48.6,
    percentChange: 0,
  },
  {
    id: 3,
    dish: 'Orecchiette with Broccoli Rabe',
    component: 'Parmigiano Reggiano',
    sku: 'PRK-001',
    brand: 'BelGioioso',
    product: 'Parmigiano Reggiano 24mo Aged',
    pack: '1/10 lb wheel',
    basePrice: 88.5,
    currentPrice: 88.5,
    percentChange: 0,
  },
  {
    id: 4,
    dish: 'Orecchiette with Broccoli Rabe',
    component: 'Olive oil',
    sku: 'OIL-101',
    brand: 'Colavita',
    product: 'Extra Virgin Olive Oil',
    pack: '1/1 gal',
    basePrice: 76.75,
    currentPrice: 76.75,
    percentChange: 0,
  },
  {
    id: 5,
    dish: 'Margherita Pizza',
    component: 'San Marzano tomatoes',
    sku: 'TOM-401',
    brand: 'Cento',
    product: 'San Marzano Tomatoes Whole Peeled',
    pack: '6/#10 can',
    basePrice: 52.0,
    currentPrice: 52.0,
    percentChange: 0,
  },
  {
    id: 6,
    dish: 'Margherita Pizza',
    component: 'Fresh mozzarella',
    sku: 'MOZ-501',
    brand: 'BelGioioso',
    product: 'Fresh Mozzarella Log',
    pack: '4/3 lb log',
    basePrice: 45.0,
    currentPrice: 45.0,
    percentChange: 0,
  },
  {
    id: 7,
    dish: 'Margherita Pizza',
    component: 'Olive oil',
    sku: 'OIL-102',
    brand: 'Partanna',
    product: 'First Press EVOO',
    pack: '6/500ml bottle',
    basePrice: 62.0,
    currentPrice: 62.0,
    percentChange: 0,
  },
];

export function QuoteBuilderPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProductItem[]>(initialProducts);
  const [bulkAdjustment, setBulkAdjustment] = useState('0');
  const [selectedItem, setSelectedItem] = useState<ProductItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
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

  // Sort items
  const sortedItems = [...items].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal = a[sortColumn as keyof typeof a];
    let bVal = b[sortColumn as keyof typeof b];
    
    // Handle numeric sorting
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    // Handle string sorting
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    
    if (sortDirection === 'asc') {
      return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
    } else {
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
    }
  });

  const applyBulkAdjustment = () => {
    const adjustment = parseFloat(bulkAdjustment) || 0;
    setItems(
      items.map((item) => {
        const newPrice = item.basePrice * (1 + adjustment / 100);
        return {
          ...item,
          currentPrice: newPrice,
          percentChange: adjustment,
        };
      })
    );
  };

  const adjustPrice = (id: number, change: number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const newPrice = Math.max(0, item.currentPrice + change);
          const percentChange = ((newPrice - item.basePrice) / item.basePrice) * 100;
          return {
            ...item,
            currentPrice: newPrice,
            percentChange: percentChange,
          };
        }
        return item;
      })
    );
  };

  const adjustPercentage = (id: number, change: number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const newPercentChange = item.percentChange + change;
          const newPrice = item.basePrice * (1 + newPercentChange / 100);
          return {
            ...item,
            currentPrice: Math.max(0, newPrice),
            percentChange: newPercentChange,
          };
        }
        return item;
      })
    );
  };

  return (
    <div className="p-4 md:p-8 bg-[#FFF9F3] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/map-ingredients')}
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl text-[#4F4F4F]">Quote Builder</h1>
              <p className="text-sm text-gray-500">Step 3 of 4 - Total Components: 7</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-gray-300 text-[#2A2A2A]">
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              onClick={() => navigate('/export-finalize')}
              className="bg-[#A5CFDD] hover:bg-[#8db9c9] text-[#2A2A2A]"
            >
              Finish quote
            </Button>
          </div>
        </div>

        {/* Pricing Controls */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-lg text-[#2A2A2A] mb-1">Pricing Controls</h2>
          <p className="text-gray-500 text-sm mb-6">
            Adjust pricing for all items or edit individual prices
          </p>

          <div className="flex items-center justify-center gap-4">
            <label className="text-sm text-[#2A2A2A] font-medium">% Adjustment</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const current = parseFloat(bulkAdjustment) || 0;
                  setBulkAdjustment(String(current - 1));
                }}
                className="text-[#2A2A2A] hover:text-[#4F4F4F] p-1"
              >
                <Minus className="w-4 h-4" />
              </button>
              <Input
                type="number"
                value={bulkAdjustment}
                onChange={(e) => setBulkAdjustment(e.target.value)}
                className="w-32 h-9 text-center border-gray-300 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="0"
              />
              <button
                onClick={() => {
                  const current = parseFloat(bulkAdjustment) || 0;
                  setBulkAdjustment(String(current + 1));
                }}
                className="text-[#2A2A2A] hover:text-[#4F4F4F] p-1"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <span className="text-sm text-gray-500">%</span>
            <Button 
              onClick={applyBulkAdjustment}
              className="bg-[#F2993D] hover:bg-[#e88929] text-white px-6"
            >
              Apply
            </Button>
          </div>
        </div>

        {/* Products Table/Cards */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-[#2A2A2A]">
                <option>All Categories</option>
                <option>Pasta & Dough</option>
                <option>Vegetables & Herbs</option>
                <option>Condiments</option>
                <option>Cheese</option>
                <option>Oil & Vinegar</option>
                <option>Canned Goods</option>
              </select>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 md:flex-none text-[#2A2A2A] border-gray-300"
                onClick={() => setEditMode(!editMode)}
              >
                <Edit className="w-4 h-4 mr-1" />
                {editMode ? 'Save' : 'Edit price'}
              </Button>
              <Button variant="outline" size="sm" className="flex-1 md:flex-none text-[#2A2A2A] border-gray-300">
                <Plus className="w-4 h-4 mr-1" />
                Add Product
              </Button>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            {sortedItems.map((item) => (
              <div 
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`p-4 border-b border-gray-200 last:border-b-0 cursor-pointer transition-colors ${
                  selectedItem?.id === item.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-[#2A2A2A]">{item.dish}</h3>
                    <p className="text-sm text-gray-500">{item.component}</p>
                  </div>
                  <div className="text-right">
                    {editMode ? (
                      <div className="flex flex-col items-end gap-2">
                         <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustPrice(item.id, -1);
                              }}
                              className="text-gray-400 hover:text-gray-600 p-1"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.currentPrice}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                  setItems((prevItems) => 
                                    prevItems.map((i) => {
                                      if (i.id === item.id) {
                                        const newPrice = Math.max(0, val);
                                        const percentChange = ((newPrice - i.basePrice) / i.basePrice) * 100;
                                        return {
                                          ...i,
                                          currentPrice: newPrice,
                                          percentChange
                                        };
                                      }
                                      return i;
                                    })
                                  );
                                }
                              }}
                              className="w-20 text-center border border-gray-300 rounded px-1 py-1 text-sm text-[#2A2A2A] focus:outline-none focus:border-blue-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustPrice(item.id, 1);
                              }}
                              className="text-gray-400 hover:text-gray-600 p-1"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                         </div>
                         <div className="flex items-center gap-1">
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 adjustPercentage(item.id, 1);
                               }}
                               className="text-gray-400 hover:text-gray-600"
                             >
                               <ChevronUp className="w-3 h-3" />
                             </button>
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 adjustPercentage(item.id, -1);
                               }}
                               className="text-gray-400 hover:text-gray-600"
                             >
                               <ChevronDown className="w-3 h-3" />
                             </button>
                            <span className={`text-xs ${
                              item.percentChange > 0 ? 'text-green-600' : 
                              item.percentChange < 0 ? 'text-red-600' : 
                              'text-gray-500'
                            }`}>
                              {item.percentChange > 0 ? '+' : ''}{item.percentChange.toFixed(1)}%
                            </span>
                         </div>
                      </div>
                    ) : (
                      <span className="font-medium text-[#2A2A2A]">${item.currentPrice.toFixed(2)}</span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mt-2">
                   <div><span className="text-gray-400">SKU:</span> {item.sku}</div>
                   <div><span className="text-gray-400">Brand:</span> {item.brand}</div>
                   <div><span className="text-gray-400">Pack:</span> {item.pack}</div>
                   <div><span className="text-gray-400">Product:</span> {item.product}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('dish')}>
                    Dish {getSortIcon('dish')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('component')}>
                    Ingredient {getSortIcon('component')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('sku')}>
                    Item # {getSortIcon('sku')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('brand')}>
                    Brand {getSortIcon('brand')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('product')}>
                    Product {getSortIcon('product')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('pack')}>
                    Pack {getSortIcon('pack')}
                  </th>
                  {editMode && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('percentChange')}>
                      % Change {getSortIcon('percentChange')}
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('currentPrice')}>
                    Price {getSortIcon('currentPrice')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedItem?.id === item.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-[#2A2A2A]">{item.dish}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.component}</td>
                    <td className="px-4 py-3 text-sm text-[#2A2A2A]">{item.sku}</td>
                    <td className="px-4 py-3 text-sm text-[#2A2A2A]">{item.brand}</td>
                    <td className="px-4 py-3 text-sm text-[#2A2A2A]">{item.product}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.pack}</td>
                    {editMode && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="flex flex-col">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustPercentage(item.id, 1);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustPercentage(item.id, -1);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                          <span className={`text-sm ml-1 ${
                            item.percentChange > 0 ? 'text-green-600' : 
                            item.percentChange < 0 ? 'text-red-600' : 
                            'text-gray-500'
                          }`}>
                            {item.percentChange > 0 ? '+' : ''}{item.percentChange.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-[#2A2A2A] text-right">
                      {editMode ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              adjustPrice(item.id, -1);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.currentPrice}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                setItems((prevItems) => 
                                  prevItems.map((i) => {
                                    if (i.id === item.id) {
                                      const newPrice = Math.max(0, val);
                                      const percentChange = ((newPrice - i.basePrice) / i.basePrice) * 100;
                                      return {
                                        ...i,
                                        currentPrice: newPrice,
                                        percentChange
                                      };
                                    }
                                    return i;
                                  })
                                );
                              }
                            }}
                            className="w-20 text-center border border-gray-300 rounded px-1 py-1 text-sm text-[#2A2A2A] focus:outline-none focus:border-blue-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              adjustPrice(item.id, 1);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        `$${item.currentPrice.toFixed(2)}`
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


      </div>
    </div>
  );
}