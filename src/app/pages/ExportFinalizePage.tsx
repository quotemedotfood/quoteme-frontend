import { Button } from '../components/ui/button';
import { ArrowLeft, FileText, Download, Mail, Check, ThumbsUp, ThumbsDown, Link as LinkIcon, Info, Edit, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '../components/ui/drawer';

// Test restaurant data (matching StartNewQuotePage)
const testRestaurants = [
  {
    id: '1',
    name: 'The Garden Bistro',
    businessName: 'Garden Bistro LLC',
    email: 'sarah@gardenbistro.com',
    contacts: [
      { id: 'c1-1', name: 'Sarah Mitchell', email: 'sarah@gardenbistro.com', phone: '(555) 123-4567', role: 'Owner' },
      { id: 'c1-2', name: 'James Chef', email: 'james@gardenbistro.com', phone: '(555) 123-4568', role: 'Head Chef' },
      { id: 'c1-3', name: 'Maria Manager', email: 'maria@gardenbistro.com', phone: '(555) 123-4569', role: 'Manager' },
    ]
  },
  {
    id: '2',
    name: 'Riverside Steakhouse',
    businessName: 'Riverside Dining Group',
    email: 'mchen@riversidesteakhouse.com',
    contacts: [
      { id: 'c2-1', name: 'Michael Chen', email: 'mchen@riversidesteakhouse.com', phone: '(555) 987-6543', role: 'General Manager' },
      { id: 'c2-2', name: 'Lisa Sous', email: 'lisa@riversidesteakhouse.com', phone: '(555) 987-6544', role: 'Sous Chef' },
    ]
  },
  {
    id: '3',
    name: 'Bella Italia',
    businessName: 'Bella Italia Restaurant Inc',
    email: 'antonio@bellaitalia.com',
    contacts: [
      { id: 'c3-1', name: 'Antonio Rossi', email: 'antonio@bellaitalia.com', phone: '(555) 456-7890', role: 'Owner' },
      { id: 'c3-2', name: 'Marco Rossi', email: 'marco@bellaitalia.com', phone: '(555) 456-7891', role: 'Head Chef' },
    ]
  },
];

// Mock data for premium onboarding features
const onboardingDocuments = [
  { id: 'doc1', name: 'New Customer Application (PDF)', type: 'document' },
  { id: 'doc2', name: 'Tax Exemption Form (PDF)', type: 'document' },
  { id: 'doc3', name: 'Terms of Service (PDF)', type: 'document' },
];

const onboardingLinks = [
  { id: 'link1', name: 'Online Credit Application', type: 'link' },
  { id: 'link2', name: 'Digital Signature Portal', type: 'link' },
];

export function ExportFinalizePage() {
  const navigate = useNavigate();
  const [isFinalized, setIsFinalized] = useState(false);
  const [showSuccessDrawer, setShowSuccessDrawer] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Premium feature state
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);

  // Customer & Contact State
  const [selectedCustomer, setSelectedCustomer] = useState(testRestaurants[0]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(['c1-1', 'c1-2']);

  // Temporary State for Edit Drawer
  const [tempCustomer, setTempCustomer] = useState(selectedCustomer);
  const [tempContactIds, setTempContactIds] = useState<string[]>(selectedContactIds);

  const handleActionClick = () => {
    setHasInteracted(true);
    setShowSuccessDrawer(true);
  };

  const handleSubmitFeedback = () => {
    setHasInteracted(true);
    setShowSuccessDrawer(false);
    // Reset form after a delay to allow animation to finish
    setTimeout(() => {
      setRating(null);
      setFeedback('');
    }, 300);
  };

  const handleDone = () => {
    if (!hasInteracted) {
      setShowSuccessDrawer(true);
    } else {
      navigate('/');
    }
  };

  const openEditDrawer = () => {
    setTempCustomer(selectedCustomer);
    setTempContactIds(selectedContactIds);
    setShowEditDrawer(true);
  };

  const handleSaveEdit = () => {
    setSelectedCustomer(tempCustomer);
    setSelectedContactIds(tempContactIds);
    setShowEditDrawer(false);
  };

  const handleTempCustomerChange = (customerId: string) => {
    const customer = testRestaurants.find(r => r.id === customerId);
    if (customer) {
      setTempCustomer(customer);
      setTempContactIds([]); // Reset contacts when customer changes
    }
  };

  const handleTempContactToggle = (contactId: string) => {
    setTempContactIds(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const currentContacts = selectedCustomer.contacts.filter(c => selectedContactIds.includes(c.id));

  return (
    <div className="p-4 md:p-8 bg-[#FFF9F3] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/quote-builder')}
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl text-[#4F4F4F]">Export & Finalize</h1>
              <p className="text-sm text-gray-500">Step 4 of 4</p>
            </div>
          </div>
          <Button 
            className="bg-[#F2993D] hover:bg-[#e88929] text-white"
            onClick={handleDone}
          >
            <Check className="w-4 h-4 mr-2" />
            Done
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Quote Summary */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg text-[#2A2A2A] mb-1">Quote Summary</h2>
                  <p className="text-gray-500 text-sm">Review before finalizing</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={openEditDrawer}
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#2A2A2A] font-medium block mb-2">
                    Customer Name
                  </label>
                  <div className="bg-gray-50 rounded-md px-4 py-2.5 text-sm text-gray-500">
                    {selectedCustomer.name}
                  </div>
                </div>

                {/* Contacts Section */}
                <div>
                  <label className="text-sm text-[#2A2A2A] font-medium block mb-2">
                    Contacts
                  </label>
                  {currentContacts.length > 0 ? (
                    <div className="space-y-2">
                      {currentContacts.map((contact) => (
                        <div key={contact.id} className="bg-gray-50 rounded-md px-4 py-3 border border-gray-100">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                              <p className="text-xs text-gray-500">{contact.role}</p>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-500 grid grid-cols-1 sm:grid-cols-2 gap-1">
                            <span className="flex items-center gap-1">
                              {contact.email}
                            </span>
                            <span className="flex items-center gap-1">
                              {contact.phone}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 italic bg-gray-50 px-4 py-3 rounded-md border border-dashed border-gray-200">
                      No contacts selected
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Products:</span>
                    <span className="text-sm text-[#2A2A2A] font-medium">7</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Dishes:</span>
                    <span className="text-sm text-[#2A2A2A] font-medium">2</span>
                  </div>
                  
                </div>
              </div>
            </div>

            {/* Premium: Append Onboarding Documents and Links */}
            <div className="bg-blue-50 rounded-lg p-6 shadow-sm border border-blue-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#F2993D] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                PREMIUM
              </div>
              
              <h2 className="text-lg text-[#2A2A2A] mb-1 font-medium">Add Onboarding Documents & Links</h2>
              <p className="text-gray-500 text-sm mb-4">
                Automatically include onboarding materials with your quote.
              </p>

              <div className="bg-orange-50 border border-orange-100 rounded-md p-4 mb-6">
                <div className="flex gap-2">
                  <div className="text-orange-600 shrink-0 mt-0.5">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="text-sm text-gray-700 space-y-2">
                    <p>
                      Select the documents or links you'd like to include. Documents will be appended to the PDF, and links will be listed at the bottom under <strong>"Click Here To Start Your Account Setup"</strong>.
                    </p>
                    <p className="text-xs text-gray-500 italic">
                      Note: These additions will not populate inside of a CSV export.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Documents */}
                <div>
                  <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Onboarding Documents
                  </h3>
                  <div className="space-y-3 pl-1">
                    {onboardingDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center space-x-3">
                        <Checkbox 
                          id={doc.id} 
                          checked={selectedDocs.includes(doc.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDocs([...selectedDocs, doc.id]);
                            } else {
                              setSelectedDocs(selectedDocs.filter(id => id !== doc.id));
                            }
                          }}
                          className="border-gray-300 data-[state=checked]:bg-[#F2993D] data-[state=checked]:border-[#F2993D]"
                        />
                        <label
                          htmlFor={doc.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 cursor-pointer"
                        >
                          {doc.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Links */}
                <div>
                  <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-gray-500" />
                    Onboarding Links
                  </h3>
                  <div className="space-y-3 pl-1">
                    {onboardingLinks.map((link) => (
                      <div key={link.id} className="flex items-center space-x-3">
                        <Checkbox 
                          id={link.id}
                          checked={selectedLinks.includes(link.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedLinks([...selectedLinks, link.id]);
                            } else {
                              setSelectedLinks(selectedLinks.filter(id => id !== link.id));
                            }
                          }}
                          className="border-gray-300 data-[state=checked]:bg-[#F2993D] data-[state=checked]:border-[#F2993D]"
                        />
                        <label
                          htmlFor={link.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 cursor-pointer"
                        >
                          {link.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quote Preview */}
            <div className={`bg-white rounded-lg p-6 shadow-sm transition-opacity ${!isFinalized ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg text-[#2A2A2A]">Quote Preview</h2>
                {!isFinalized && <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">Sign Up to Unlock</div>}
              </div>
              <p className="text-gray-500 text-sm mb-6">PDF snapshot</p>

              <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
                <div className="bg-white rounded-lg p-6 shadow-sm max-w-md mx-auto">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-[#2A2A2A]">QUOTE</h3>
                      <p className="text-xs text-gray-500 mt-1">#CPRUSLIEVA</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#2A2A2A]">Premium Food Distributors</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 mb-6">
                    <p className="text-xs text-gray-500 mb-1">BILL TO:</p>
                    <p className="text-sm font-medium text-[#2A2A2A]">{selectedCustomer.name}</p>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-[#2A2A2A]">Total:</span>
                      <span className="text-base font-semibold text-[#2A2A2A]">$603.75</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Finalize and Sign Up */}
            <div className={`bg-white rounded-lg p-6 shadow-sm border-2 ${isFinalized ? 'border-green-500 bg-green-50' : 'border-[#A5CFDD]'}`}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg text-[#2A2A2A]">Sign up to finalize</h2>
                {isFinalized && <Check className="w-5 h-5 text-green-600" />}
              </div>
              <p className="text-gray-500 text-sm mb-6">Create your account to finalize and save this quote</p>
              
              {!isFinalized ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="signup-name" className="text-sm text-[#2A2A2A] font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      className="mt-1.5 border-gray-300"
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-email" className="text-sm text-[#2A2A2A] font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      className="mt-1.5 border-gray-300"
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-company" className="text-sm text-[#2A2A2A] font-medium">
                      Company Name
                    </Label>
                    <Input
                      id="signup-company"
                      type="text"
                      placeholder="Enter your company name"
                      className="mt-1.5 border-gray-300"
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-password" className="text-sm text-[#2A2A2A] font-medium">
                      Password
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      className="mt-1.5 border-gray-300"
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-confirm-password" className="text-sm text-[#2A2A2A] font-medium">
                      Confirm Password
                    </Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      className="mt-1.5 border-gray-300"
                    />
                  </div>

                  <Button 
                    className="w-full bg-[#F2993D] hover:bg-[#E08A2E] text-white h-12 mt-4"
                    onClick={() => setIsFinalized(true)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Finalize and Sign up
                  </Button>

                  <p className="text-xs text-gray-500 text-center mt-3">
                    By signing up, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              ) : (
                <div className="bg-green-100 text-green-800 p-4 rounded text-sm text-center">
                  <p className="font-medium mb-2">Account created and quote finalized! You can now download or send your quote.</p>
                  <p className="text-xs text-green-700 border-t border-green-200 pt-2 mt-1">
                    You have 4 more free quotes to use. To unlock unlimited quotes and premium features <a href="#" onClick={(e) => { e.preventDefault(); navigate('/settings/billing'); }} className="underline font-semibold hover:text-green-900">click here to view plan options</a>.
                  </p>
                </div>
              )}
            </div>

            {/* Download Quote */}
            <div className={`bg-white rounded-lg p-6 shadow-sm transition-opacity ${!isFinalized ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg text-[#2A2A2A]">Download Quote</h2>
                {!isFinalized && <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">Sign Up to Unlock</div>}
              </div>
              
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-gray-300 text-[#2A2A2A] h-12"
                  disabled={!isFinalized}
                  onClick={handleActionClick}
                >
                  <FileText className="w-4 h-4 mr-3" />
                  CSV Export
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-gray-300 text-[#2A2A2A] h-12"
                  disabled={!isFinalized}
                  onClick={handleActionClick}
                >
                  <FileText className="w-4 h-4 mr-3" />
                  PDF Quote
                </Button>
              </div>
            </div>

            {/* Send to Customer */}
            <div className={`bg-white rounded-lg p-6 shadow-sm transition-opacity ${!isFinalized ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg text-[#2A2A2A]">Send to Customer</h2>
                {!isFinalized && <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">Sign Up to Unlock</div>}
              </div>
              <p className="text-gray-500 text-sm mb-6">
                Emails will be sent via Quotes@Quote-me.com with your email CC'd
              </p>
              
              <Button 
                variant="outline" 
                className="w-full justify-start border-gray-300 text-[#2A2A2A] h-12"
                disabled={!isFinalized}
                onClick={handleActionClick}
              >
                <Mail className="w-4 h-4 mr-3" />
                Email to {selectedCustomer.email || 'customer@example.com'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Drawer */}
      <Drawer open={showSuccessDrawer} onOpenChange={setShowSuccessDrawer} direction="right">
        <DrawerContent>
          <div className="w-full h-full p-6 flex flex-col">
            <DrawerHeader className="px-0">
              <DrawerTitle className="text-2xl font-bold text-[#F2993D]">Success!</DrawerTitle>
              <DrawerDescription>
                Your action has been completed successfully. We'd love your feedback!
              </DrawerDescription>
            </DrawerHeader>
            
            <div className="flex-1 space-y-8 mt-6">
              {/* Question 1 */}
              <div>
                <label className="block text-base font-medium text-[#2A2A2A] mb-4">
                  How would you rate your quote building experience today?
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setRating('up')}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                      rating === 'up' 
                        ? 'border-[#F2993D] bg-orange-50 text-[#F2993D]' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <ThumbsUp className="w-10 h-10" />
                    <span className="font-medium">Great</span>
                  </button>
                  <button
                    onClick={() => setRating('down')}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                      rating === 'down' 
                        ? 'border-[#F2993D] bg-orange-50 text-[#F2993D]' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <ThumbsDown className="w-10 h-10" />
                    <span className="font-medium">Not Good</span>
                  </button>
                </div>
              </div>

              {/* Question 2 */}
              <div>
                <label className="block text-base font-medium text-[#2A2A2A] mb-4">
                  Is there anything about QuoteMe that you'd like to see us improve?
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what you think..."
                  className="min-h-[150px] text-base resize-none border-gray-300 focus:border-[#F2993D] focus:ring-[#F2993D]"
                />
              </div>
            </div>

            <div className="mt-6">
              <Button
                onClick={handleSubmitFeedback}
                className="w-full bg-[#F2993D] hover:bg-[#E08A2E] text-white h-14 text-lg font-medium"
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Edit Quote Details Drawer */}
      <Drawer open={showEditDrawer} onOpenChange={setShowEditDrawer} direction="right">
        <DrawerContent className="w-full sm:w-[500px]">
          <div className="w-full h-full flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
              <DrawerTitle className="text-xl font-bold text-[#2A2A2A]">Edit Quote Details</DrawerTitle>
              <DrawerClose className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </DrawerClose>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Customer Selection */}
                <div>
                  <Label htmlFor="edit-customer" className="text-sm font-medium text-gray-700 mb-2 block">
                    Customer
                  </Label>
                  <select
                    id="edit-customer"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-sm focus:ring-2 focus:ring-[#F2993D] focus:border-transparent outline-none transition-all"
                    value={tempCustomer.id}
                    onChange={(e) => handleTempCustomerChange(e.target.value)}
                  >
                    {testRestaurants.map(restaurant => (
                      <option key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contacts Selection */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="mb-3">
                    <Label className="text-sm font-medium text-gray-700">Select Contacts</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Choose which contacts should appear on this quote.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {tempCustomer.contacts.map((contact) => (
                      <div key={contact.id} className="flex items-start space-x-3 bg-white p-3 rounded border border-gray-100 shadow-sm">
                        <Checkbox 
                          id={`edit-${contact.id}`}
                          checked={tempContactIds.includes(contact.id)}
                          onCheckedChange={() => handleTempContactToggle(contact.id)}
                          className="mt-1 border-gray-300 data-[state=checked]:bg-[#F2993D] data-[state=checked]:border-[#F2993D]"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <label
                              htmlFor={`edit-${contact.id}`}
                              className="text-sm font-medium text-gray-900 cursor-pointer"
                            >
                              {contact.name}
                            </label>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                              {contact.role}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500 grid grid-cols-1 gap-1">
                            <span>{contact.email}</span>
                            <span>{contact.phone}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-md border border-blue-100 flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-sm text-blue-700">
                    Changing the customer or contacts will only affect this quote. Your existing catalog selections and pricing will remain saved.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-white sticky bottom-0 z-10 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowEditDrawer(false)}
                className="h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="bg-[#F2993D] hover:bg-[#E08A2E] text-white h-11 px-8"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}