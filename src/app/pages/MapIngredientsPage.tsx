import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, ChevronRight, ChevronDown, Plus, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { MapComponentDrawer } from '../components/MapComponentDrawer';

// Sample dishes with components
const sampleDishes = [
  {
    id: '1',
    name: 'Orecchiette with Broccoli Rabe',
    components: [
      'Orecchiette pasta',
      'Broccoli rabe',
      'Garlic',
      'Calabrian chili',
      'Parmigiano-Reggiano',
      'Olive oil',
    ],
  },
  {
    id: '2',
    name: 'Margherita Pizza',
    components: [
      'Pizza dough',
      'San Marzano tomatoes',
      'Fresh mozzarella',
      'Fresh basil',
      'Extra virgin olive oil',
      'Salt',
    ],
  },
];

// Ingredient to suggested product match (first suggestion from bot)
const ingredientMatches: Record<string, { product: string; sku: string; pack: string }> = {
  'Orecchiette pasta': { product: 'De Cecco Orecchiette Pasta', sku: 'DC-1234', pack: '12/1 lb' },
  'Broccoli rabe': { product: 'Fresh Broccoli Rabe', sku: 'VEG-5678', pack: '12 bunches' },
  'Garlic': { product: 'Fresh Garlic Cloves', sku: 'VEG-9012', pack: '30 lb case' },
  'Calabrian chili': { product: 'Tutto Calabria Hot Chili Pepper Spread', sku: 'TC-3456', pack: '6/10.5 oz' },
  'Parmigiano-Reggiano': { product: 'Parmigiano-Reggiano DOP 24mo', sku: 'CHZ-7890', pack: '1/20 lb wheel' },
  'Olive oil': { product: 'Extra Virgin Olive Oil', sku: 'OIL-2345', pack: '6/1 L' },
  'Pizza dough': { product: 'Fresh Pizza Dough Balls', sku: 'DGH-6789', pack: '50/8 oz' },
  'San Marzano tomatoes': { product: 'Cento San Marzano Tomatoes', sku: 'CAN-0123', pack: '6/#10 can' },
  'Fresh mozzarella': { product: 'BelGioioso Fresh Mozzarella', sku: 'CHZ-4567', pack: '6/8 oz' },
  'Fresh basil': { product: 'Fresh Basil Bunch', sku: 'HRB-8901', pack: '12 bunches' },
  'Extra virgin olive oil': { product: 'Colavita Extra Virgin Olive Oil', sku: 'OIL-2346', pack: '12/750 ml' },
  'Salt': { product: 'Kosher Salt', sku: 'SLT-5432', pack: '12/3 lb' },
};

// Sample categories for product organization
const sampleCategories = [
  {
    id: 'pasta',
    name: 'Pasta & Dough',
    mappedItems: 2,
    totalItems: 2,
    ingredients: ['Orecchiette pasta', 'Pizza dough'],
  },
  {
    id: 'vegetables',
    name: 'Vegetables & Herbs',
    mappedItems: 1,
    totalItems: 2,
    ingredients: ['Broccoli rabe', 'Fresh basil'],
  },
  {
    id: 'condiments',
    name: 'Condiments & Spices',
    mappedItems: 0,
    totalItems: 2,
    ingredients: ['Calabrian chili', 'Salt'],
  },
  {
    id: 'cheese',
    name: 'Cheese',
    mappedItems: 0,
    totalItems: 2,
    ingredients: ['Parmigiano-Reggiano', 'Fresh mozzarella'],
  },
  {
    id: 'oil',
    name: 'Oil & Vinegar',
    mappedItems: 0,
    totalItems: 2,
    ingredients: ['Olive oil', 'Extra virgin olive oil'],
  },
  {
    id: 'canned',
    name: 'Canned Goods',
    mappedItems: 0,
    totalItems: 2,
    ingredients: ['San Marzano tomatoes', 'Garlic'],
  },
];

export function MapIngredientsPage() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<'dishes' | 'categories'>('dishes');
  const [dishes, setDishes] = useState(sampleDishes);
  const [selectedDish, setSelectedDish] = useState(sampleDishes[0]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [mapDrawerOpen, setMapDrawerOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState('');
  const [mappedComponents, setMappedComponents] = useState<Record<string, string[]>>({});
  
  // New Dish Drawer State
  const [isAddDishDrawerOpen, setIsAddDishDrawerOpen] = useState(false);
  const [isDishListDrawerOpen, setIsDishListDrawerOpen] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishComponents, setNewDishComponents] = useState('');
  
  // Rating Drawer State
  const [isFeedbackDrawerOpen, setIsFeedbackDrawerOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [thumbsUpActive, setThumbsUpActive] = useState(false);

  const handleAlignWithCatalog = () => {
    if (!newDishComponents) return;

    // Parse components
    const components = newDishComponents
      .split('\n')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    // Create new dish
    const newDish = {
      id: `dish-${Date.now()}`,
      name: newDishName || `New Dish (${components.length} components)`,
      components: components
    };

    // Update dishes list
    setDishes([...dishes, newDish]);
    setSelectedDish(newDish);
    
    // Close drawer and reset form
    setIsAddDishDrawerOpen(false);
    setIsDishListDrawerOpen(false); // Also close list drawer if open
    setNewDishName('');
    setNewDishComponents('');
  };

  const handleMapComponent = (componentName: string) => {
    setSelectedComponent(componentName);
    setMapDrawerOpen(true);
  };

  const handleApplyMapping = (componentName: string, skuIds: string[]) => {
    if (skuIds.length > 0) {
      setMappedComponents({ ...mappedComponents, [componentName]: skuIds });
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(expandedCategories.filter((id) => id !== categoryId));
    } else {
      setExpandedCategories([...expandedCategories, categoryId]);
    }
  };

  const handleThumbsUp = () => {
    setThumbsUpActive(!thumbsUpActive);
    console.log('User rated quote positively');
    // Could send feedback to API here
  };

  const handleThumbsDown = () => {
    setIsFeedbackDrawerOpen(true);
  };

  const handleSubmitFeedback = () => {
    console.log('Submitting feedback:', feedbackText);
    // Send feedback to API
    setIsFeedbackDrawerOpen(false);
    setFeedbackText('');
  };

  const handleRetryQuote = () => {
    console.log('Retrying quote with feedback:', feedbackText);
    // Send feedback and trigger retry logic
    setIsFeedbackDrawerOpen(false);
    setFeedbackText('');
    // Could navigate back or refresh the matches
  };

  return (
    <div className="flex h-screen bg-[#FFF9F3]">
      {/* Left Sidebar - Dish List */}
      <div className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">DISHES</h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          {dishes.map((dish) => (
            <button
              key={dish.id}
              onClick={() => setSelectedDish(dish)}
              className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedDish.id === dish.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={true}
                  readOnly
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#2A2A2A]">{dish.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{dish.components.length} ingredients</p>
                </div>
              </div>
            </button>
          ))}
          <div className="p-4">
            <Button
              onClick={() => setIsAddDishDrawerOpen(true)}
              className="w-full h-auto py-3 bg-[#F2993D] hover:bg-[#E08935] text-white whitespace-normal text-center"
            >
              <Plus className="w-4 h-4 mr-2 shrink-0" />
              Manually Add A Dish or Ingredient
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate('/start-new-quote')}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl text-[#4F4F4F]">Match Ingredients</h1>
                <p className="text-sm text-gray-500">Select product matches for each ingredient</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/quote-builder')}
              className="bg-[#F2993D] hover:bg-[#e88929] text-white"
            >
              Adjust pricing
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 md:p-6">
            {/* Mobile Dish Selector */}
            <div className="md:hidden mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
               <label className="text-sm font-medium text-gray-500 mb-2 block">Current Dish</label>
               <button 
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-[#2A2A2A]"
                onClick={() => setIsDishListDrawerOpen(true)}
               >
                 <span className="truncate font-medium">{selectedDish.name}</span>
                 <div className="flex items-center gap-2 text-gray-500">
                    <span className="text-xs">({selectedDish.components.length})</span>
                    <ChevronDown className="w-4 h-4" />
                 </div>
               </button>
            </div>

            {/* Main Content Card with Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setSelectedTab('dishes')}
                  className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                    selectedTab === 'dishes'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dishes
                </button>
                <button
                  onClick={() => setSelectedTab('categories')}
                  className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                    selectedTab === 'categories'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Categories
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {selectedTab === 'dishes' ? (
                  /* Dish Content */
                  <div>
                    <h2 className="text-lg font-medium text-[#4F4F4F] mb-2">
                      {selectedDish.name}
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Select a match for each ingredient from your distributor's catalog
                    </p>

                    {/* Ingredients List */}
                    <div className="space-y-3">
                      {selectedDish.components.map((component, index) => {
                        const isMapped = mappedComponents[component] && mappedComponents[component].length > 0;
                        const firstAlignment = ingredientMatches[component];
                        return (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-b-0"
                        >
                          {/* Left: Ingredient Name */}
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-sm text-[#2A2A2A]">{component}</span>
                          </div>
                          
                          {/* Middle: Suggested Match */}
                          <div className="flex-1 text-center">
                            {firstAlignment && (
                              <div className="text-xs text-gray-500">
                                <div className="font-medium">{firstAlignment.product}</div>
                                <div className="text-gray-400">{firstAlignment.sku} • {firstAlignment.pack}</div>
                              </div>
                            )}
                          </div>
                          
                          {/* Right: Add Match Button */}
                          <div className="flex-shrink-0">
                            <Button
                              size="sm"
                              className="bg-[#A5CFDD] hover:bg-[#8db9c9] text-[#2A2A2A] text-xs px-3 py-1"
                              onClick={() => handleMapComponent(component)}
                            >
                              Add Match
                            </Button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Category Content */
                  <div>
                    <h2 className="text-lg font-medium text-[#4F4F4F] mb-2">
                      Match by Category
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Ingredients organized by product category
                    </p>

                    {/* Categories List */}
                    <div className="space-y-2">
                      {sampleCategories.map((category) => {
                        const isExpanded = expandedCategories.includes(category.id);
                        return (
                          <div
                            key={category.id}
                            className="border border-gray-200 rounded-lg overflow-hidden"
                          >
                            {/* Category Header */}
                            <button
                              onClick={() => toggleCategory(category.id)}
                              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </div>
                                <span className="text-sm font-medium text-[#2A2A2A]">
                                  {category.name} ({category.mappedItems}/{category.totalItems})
                                </span>
                              </div>
                              <ChevronDown
                                className={`w-5 h-5 text-gray-400 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>

                            {/* Expanded Ingredients */}
                            {isExpanded && (
                              <div className="border-t border-gray-200 bg-gray-50">
                                {category.ingredients.map((ingredient, index) => {
                                  const isMapped = mappedComponents[ingredient] && mappedComponents[ingredient].length > 0;
                                  const firstAlignment = ingredientMatches[ingredient];
                                  return (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 last:border-b-0"
                                  >
                                    {/* Left: Ingredient Name */}
                                    <div className="flex items-center gap-3 pl-8 flex-1">
                                      <span className="text-sm text-[#2A2A2A]">{ingredient}</span>
                                    </div>
                                    
                                    {/* Middle: Suggested Match */}
                                    <div className="flex-1 text-center">
                                      {firstAlignment && (
                                        <div className="text-xs text-gray-500">
                                          <div className="font-medium">{firstAlignment.product}</div>
                                          <div className="text-gray-400">{firstAlignment.sku} • {firstAlignment.pack}</div>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Right: Add Match Button */}
                                    <div className="flex-shrink-0">
                                      <Button
                                        size="sm"
                                        className="bg-[#A5CFDD] hover:bg-[#8db9c9] text-[#2A2A2A] text-xs px-3 py-1"
                                        onClick={() => handleMapComponent(ingredient)}
                                      >
                                        Add Match
                                      </Button>
                                    </div>
                                  </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rate This Quote Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#2A2A2A]">Rate this quote</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleThumbsUp}
                    className={`p-2 rounded-lg hover:bg-[#A5CFDD]/20 transition-colors border border-gray-200 ${thumbsUpActive ? 'bg-[#A5CFDD]' : ''}`}
                  >
                    <ThumbsUp className={`w-5 h-5 ${thumbsUpActive ? 'text-[#F2993D]' : 'text-[#4F4F4F]'}`} />
                  </button>
                  <button
                    onClick={handleThumbsDown}
                    className="p-2 rounded-lg hover:bg-[#F2993D]/20 transition-colors border border-gray-200"
                  >
                    <ThumbsDown className="w-5 h-5 text-[#4F4F4F]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Match Ingredient Drawer */}
      <MapComponentDrawer
        open={mapDrawerOpen}
        onOpenChange={setMapDrawerOpen}
        componentName={selectedComponent}
        onApplyMapping={handleApplyMapping}
      />

      {/* Mobile Dish List Drawer */}
      {isDishListDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/20" 
            onClick={() => setIsDishListDrawerOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="relative w-full max-w-xs bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#2A2A2A]">Select Dish</h2>
              <button 
                onClick={() => setIsDishListDrawerOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {dishes.map((dish) => (
                <button
                  key={dish.id}
                  onClick={() => {
                    setSelectedDish(dish);
                    setIsDishListDrawerOpen(false);
                  }}
                  className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedDish.id === dish.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      defaultChecked
                      readOnly
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#2A2A2A]">{dish.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{dish.components.length} ingredients</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <Button
                onClick={() => setIsAddDishDrawerOpen(true)}
                className="w-full h-auto py-3 bg-[#F2993D] hover:bg-[#E08935] text-white whitespace-normal text-center"
              >
                <Plus className="w-4 h-4 mr-2 shrink-0" />
                Manually Add A Dish or Ingredient
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Dish Drawer */}
      {isAddDishDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/20" 
            onClick={() => setIsAddDishDrawerOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="relative w-full max-w-md bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#2A2A2A]">Manually Add Dish</h2>
              <button 
                onClick={() => setIsAddDishDrawerOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="dish-name">Dish Name (Optional)</Label>
                <Input
                  id="dish-name"
                  placeholder="e.g. Spaghetti Carbonara"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dish-components">List Ingredients</Label>
                <p className="text-xs text-gray-500">Enter each ingredient on a new line.</p>
                <Textarea
                  id="dish-components"
                  placeholder="Spaghetti&#10;Pancetta&#10;Eggs&#10;Parmesan cheese&#10;Black pepper"
                  className="min-h-[200px]"
                  value={newDishComponents}
                  onChange={(e) => setNewDishComponents(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <Button 
                onClick={handleAlignWithCatalog}
                className="w-full bg-[#F2993D] hover:bg-[#E08935] text-white"
                disabled={!newDishComponents.trim()}
              >
                Match With Catalog
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Drawer */}
      {isFeedbackDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/20" 
            onClick={() => setIsFeedbackDrawerOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="relative w-full max-w-md bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#2A2A2A]">Provide Feedback</h2>
              <button 
                onClick={() => setIsFeedbackDrawerOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="feedback-text">Feedback</Label>
                <Textarea
                  id="feedback-text"
                  placeholder="Please provide any feedback or suggestions for improvement."
                  className="min-h-[200px]"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
              <Button 
                onClick={handleSubmitFeedback}
                className="w-full bg-[#A5CFDD] hover:bg-[#8db9c9] text-[#2A2A2A]"
                disabled={!feedbackText.trim()}
              >
                Submit
              </Button>
              <Button 
                onClick={handleRetryQuote}
                className="w-full bg-[#F2993D] hover:bg-[#E08935] text-white"
                disabled={!feedbackText.trim()}
              >
                Retry Quote
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}