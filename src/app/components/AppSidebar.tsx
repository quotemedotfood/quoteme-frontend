import { Link, useLocation } from 'react-router';
import { LayoutDashboard, Users, FileText, Plus, Settings, UserPlus, ClipboardList, Store, ChevronDown, MapPin, Building2, Package } from 'lucide-react';
import logoSquare from '/src/assets/e549e7d27b183e98e791f43494c715b8cc6ce7e9.png';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation2 } from '../contexts/LocationContext';
import { isBuyerRole } from '../utils/roles';
import { useState, useRef, useEffect } from 'react';
import { NotificationBell } from './NotificationBell';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  isActive: boolean;
  highlight?: boolean;
}

function NavItem({ icon, label, path, isActive, highlight }: NavItemProps) {
  return (
    <Link
      to={path}
      className={`flex flex-col items-center gap-1 px-4 py-3 transition-colors ${
        highlight
          ? 'text-white bg-[#F2993D] hover:bg-[#E08A2E] mx-2 rounded-lg'
          : isActive
          ? 'text-[#F2993D] bg-[#FFF9F3] border-l-4 border-[#F2993D]'
          : 'text-[#4F4F4F] hover:bg-gray-50'
      }`}
    >
      <div className="w-5 h-5">{icon}</div>
      <span className="text-xs text-center">{label}</span>
    </Link>
  );
}

function MobileNavItem({ icon, label, path, isActive, highlight }: NavItemProps) {
    return (
    <Link
      to={path}
      className={`flex flex-col items-center justify-center p-2 flex-1 transition-colors ${
        isActive ? 'text-[#F2993D]' : 'text-[#4F4F4F]'
      }`}
    >
      <div className={`flex items-center justify-center w-8 h-8 ${highlight ? 'bg-[#F2993D] text-white rounded-full shadow-md' : ''}`}>
        {highlight ? <Plus size={20} /> : icon}
      </div>
      <span className="text-[10px] text-center mt-1 leading-none">{label}</span>
    </Link>
  );
}

function LocationSwitcher() {
  const { locations, selectedLocation, setSelectedLocationId, isMultiLocation } = useLocation2();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!selectedLocation) return null;

  if (!isMultiLocation) {
    return (
      <div className="mx-2 mt-3 mb-1 px-2">
        <div className="flex items-center gap-1.5 text-center">
          <MapPin size={12} className="text-[#7FAEC2] flex-shrink-0" />
          <span className="text-[10px] text-[#4F4F4F] leading-tight truncate">{selectedLocation.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative mx-2 mt-3 mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <MapPin size={12} className="text-[#7FAEC2] flex-shrink-0" />
        <span className="text-[10px] text-[#4F4F4F] truncate flex-1 text-left">{selectedLocation.name}</span>
        <ChevronDown size={10} className="text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => { setSelectedLocationId(loc.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[10px] hover:bg-gray-50 flex items-center gap-1.5 ${
                loc.id === selectedLocation.id ? 'text-[#F2993D] font-medium' : 'text-[#4F4F4F]'
              }`}
            >
              <MapPin size={10} className={loc.id === selectedLocation.id ? 'text-[#F2993D]' : 'text-gray-400'} />
              <span className="truncate">{loc.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const { quotesRemaining, profile } = useUser();
  const { user } = useAuth();
  const isDistributorAdmin = user?.role === 'distributor_admin';
  const isBuyer = isBuyerRole(user?.role);

  const { isMultiLocation } = useLocation2();

  const navItems = isDistributorAdmin
    ? [
        { icon: <Plus size={20} />, label: "New Quote", path: "/start-new-quote", highlight: true },
        { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/distributor-admin" },
        { icon: <Package size={20} />, label: "Catalog", path: "/distributor-admin/catalog" },
        { icon: <FileText size={20} />, label: "Quotes", path: "/quotes" },
        { icon: <Users size={20} />, label: "Customers", path: "/customers" },
        { icon: <UserPlus size={20} />, label: "Reps", path: "/distributor-admin/reps" },
        { icon: <ClipboardList size={20} />, label: "Onboarding", path: "/distributor-admin/onboarding-docs" },
      ]
    : isBuyer
    ? [
        { icon: <Plus size={20} />, label: "New Quote", path: "/", highlight: true },
        { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/dashboard" },
        { icon: <Store size={20} />, label: "Vendors", path: "/vendors" },
        { icon: <FileText size={20} />, label: "Quotes", path: "/quotes" },
        { icon: <Building2 size={20} />, label: isMultiLocation ? "Locations" : "Location", path: "/locations" },
      ]
    : [
        { icon: <Plus size={20} />, label: "New Quote", path: "/", highlight: true },
        { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/dashboard" },
        { icon: <Users size={20} />, label: "Customers", path: "/customers" },
        { icon: <FileText size={20} />, label: "Quotes", path: "/quotes" },
      ];

  return (
    <>
    {/* Desktop Sidebar */}
    <div className="hidden md:flex w-20 bg-white border-r border-gray-200 flex-col h-screen">
      {/* Logo */}
      <div className="p-4 flex items-center justify-center border-b border-gray-200">
        <img 
          src={logoSquare} 
          alt="QuoteME" 
          className="w-12 h-12 object-contain"
        />
      </div>

      {/* Location Switcher — buyer only */}
      {isBuyer && <LocationSwitcher />}

      {/* Trial Badge - Only show for non-paid users */}
      {!profile.hasPaidSubscription && (
        <div className="mx-2 mt-4 mb-2">
          <div className="bg-[#FFF9F3] border border-[#F2993D] rounded-lg p-2">
            <div className="text-center">
              <div className="text-xl font-bold text-[#F2993D]">{quotesRemaining}</div>
              <div className="text-[9px] text-[#4F4F4F] leading-tight">Free Quotes Left</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 pt-4">
        {navItems.map(item => (
            <NavItem
                key={item.path}
                {...item}
                isActive={pathname === item.path}
            />
        ))}
      </nav>

      {/* Notifications & Settings */}
      <div className="p-4 border-t border-gray-200 flex flex-col items-center gap-3">
        <NotificationBell />
        <Link to="/settings">
          <Settings
            size={20}
            className={`mx-auto ${pathname.includes('/settings') ? 'text-[#F2993D]' : 'text-[#4F4F4F] hover:text-[#F2993D]'} transition-colors cursor-pointer`}
          />
        </Link>
      </div>
    </div>

    {/* Mobile Bottom Nav */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-transparent pointer-events-none">
       <div className="flex items-end h-full w-full pointer-events-auto filter drop-shadow-[0_-1px_0_rgba(0,0,0,0.05)]">
          {/* Left Side */}
          <div className="flex-1 h-full bg-white border-t border-gray-200 flex justify-around items-center pb-safe">
             <MobileNavItem 
               {...navItems.find(i => i.label === 'Dashboard')!} 
               isActive={pathname === '/quoteme'} 
             />
             <MobileNavItem
               {...(navItems.find(i => i.label === 'Vendors') || navItems.find(i => i.label === 'Customers'))!}
               isActive={pathname === '/vendors' || pathname === '/customers'}
             />
          </div>

          {/* Center Cutout */}
          <div className="relative w-[80px] h-full flex justify-center bg-transparent">
              <svg width="80" height="64" viewBox="0 0 80 64" className="absolute top-0 left-0 w-full h-full">
                  <path d="M0 0 C20 0 20 0 20 0 Q40 40 60 0 C60 0 60 0 80 0 V64 H0 Z" fill="white" />
                  <path d="M0 0 C20 0 20 0 20 0 Q40 40 60 0 C60 0 60 0 80 0" fill="none" stroke="#E5E7EB" strokeWidth="1" />
              </svg>
              <div className="absolute -top-6 flex flex-col items-center gap-1 transform transition-transform hover:scale-105 active:scale-95">
                 <Link 
                   to="/start-new-quote"
                   className="flex items-center justify-center w-14 h-14 rounded-full bg-[#F2993D] text-white shadow-lg border-4 border-[#FFF9F3]"
                 >
                   <Plus size={28} />
                 </Link>
                 <span className="text-[10px] text-[#4F4F4F] font-medium whitespace-nowrap">Start Quote</span>
              </div>
          </div>

          {/* Right Side */}
          <div className="flex-1 h-full bg-white border-t border-gray-200 flex justify-around items-center pb-safe">
             <MobileNavItem 
               {...navItems.find(i => i.label === 'Quotes')!} 
               isActive={pathname === '/quotes'} 
             />
             <MobileNavItem 
               icon={<Settings size={20} />}
               label="Settings"
               path="/settings"
               isActive={pathname.includes('/settings')} 
             />
          </div>
       </div>
    </div>
    </>
  );
}