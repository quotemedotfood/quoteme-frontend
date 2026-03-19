import { useEffect, useRef, useState, useCallback } from 'react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export interface ParsedAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  formatted: string;
}

let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (!GOOGLE_MAPS_API_KEY) return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'));

  return new Promise((resolve, reject) => {
    if (scriptLoading) {
      loadCallbacks.push(resolve);
      return;
    }
    scriptLoading = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      resolve();
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
    };
    script.onerror = () => {
      scriptLoading = false;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });
}

function parsePlace(place: google.maps.places.PlaceResult): ParsedAddress {
  const components = place.address_components || [];
  const get = (type: string, short = false) => {
    const c = components.find(c => c.types.includes(type));
    return c ? (short ? c.short_name : c.long_name) : '';
  };

  const streetNumber = get('street_number');
  const route = get('route');
  const addressLine1 = streetNumber ? `${streetNumber} ${route}` : route;
  const subpremise = get('subpremise');

  return {
    addressLine1,
    addressLine2: subpremise ? `#${subpremise}` : '',
    city: get('locality') || get('sublocality_level_1') || get('administrative_area_level_3'),
    state: get('administrative_area_level_1', true),
    zip: get('postal_code'),
    formatted: place.formatted_address || addressLine1,
  };
}

interface UseGooglePlacesOptions {
  types?: string[];
}

export function useGooglePlaces(
  inputRef: React.RefObject<HTMLInputElement | null>,
  onSelect: (address: ParsedAddress) => void,
  options?: UseGooglePlacesOptions,
) {
  const [ready, setReady] = useState(scriptLoaded);
  const [error, setError] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key not configured');
      return;
    }
    loadGoogleMapsScript()
      .then(() => setReady(true))
      .catch((e) => setError(e.message));
  }, []);

  const typesKey = options?.types?.join(',') || 'address';

  useEffect(() => {
    if (!ready || !inputRef.current) return;

    // Clean up previous autocomplete if the input element changed
    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: options?.types || ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.address_components) {
        onSelectRef.current(parsePlace(place));
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
      autocompleteRef.current = null;
    };
  }, [ready, inputRef, typesKey]);

  return { ready: ready && !!GOOGLE_MAPS_API_KEY, error };
}
