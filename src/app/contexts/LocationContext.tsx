import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getLocations, type LocationItem } from '../services/api';
import { useAuth } from './AuthContext';

interface LocationContextType {
  locations: LocationItem[];
  selectedLocation: LocationItem | null;
  setSelectedLocationId: (id: string) => void;
  refreshLocations: () => Promise<void>;
  isMultiLocation: boolean;
  loading: boolean;
}

const LocationContext = createContext<LocationContextType>({
  locations: [],
  selectedLocation: null,
  setSelectedLocationId: () => {},
  refreshLocations: async () => {},
  isMultiLocation: false,
  loading: false,
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isBuyer = user?.role === 'buyer' || user?.role === 'group_admin';
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    return localStorage.getItem('quoteme_selected_location_id');
  });
  const [loading, setLoading] = useState(false);

  const refreshLocations = useCallback(async () => {
    if (!isBuyer) return;
    setLoading(true);
    const res = await getLocations();
    if (res.data) {
      setLocations(res.data);
      // If no selection or selection no longer valid, default to first
      const currentValid = res.data.some((l) => l.id === selectedId);
      if (!currentValid && res.data.length > 0) {
        setSelectedId(res.data[0].id);
        localStorage.setItem('quoteme_selected_location_id', res.data[0].id);
      }
    }
    setLoading(false);
  }, [isBuyer, selectedId]);

  useEffect(() => {
    if (isBuyer && user) {
      refreshLocations();
    }
  }, [isBuyer, user?.id]);

  const setSelectedLocationId = useCallback((id: string) => {
    setSelectedId(id);
    localStorage.setItem('quoteme_selected_location_id', id);
  }, []);

  const selectedLocation = locations.find((l) => l.id === selectedId) || locations[0] || null;
  const isMultiLocation = locations.length > 1;

  return (
    <LocationContext.Provider
      value={{
        locations,
        selectedLocation,
        setSelectedLocationId,
        refreshLocations,
        isMultiLocation,
        loading,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation2() {
  return useContext(LocationContext);
}
