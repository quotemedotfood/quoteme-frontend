import { useEffect, useRef, useState, useCallback } from 'react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export interface ParsedAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  formatted: string;
  placeId: string;
  lat: number | null;
  lng: number | null;
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
    // Modern async loading (loading=async + callback): without it, current
    // Chrome executes the Maps JS API synchronously on the main thread —
    // the documented "loaded directly without loading=async" warning — and
    // can stall the renderer wherever the script lands (froze /auth Sign-In
    // and the CC assign picker in real-browser walks, 2026-06-07).
    (window as any).__qmGmapsOnLoad = () => {
      scriptLoaded = true;
      scriptLoading = false;
      resolve();
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async&callback=__qmGmapsOnLoad`;
    script.async = true;
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

  const loc = place.geometry?.location;
  const lat = typeof loc?.lat === 'function' ? loc.lat() : null;
  const lng = typeof loc?.lng === 'function' ? loc.lng() : null;

  return {
    addressLine1,
    addressLine2: subpremise ? `#${subpremise}` : '',
    city: get('locality') || get('sublocality_level_1') || get('administrative_area_level_3'),
    state: get('administrative_area_level_1', true),
    zip: get('postal_code'),
    formatted: place.formatted_address || addressLine1,
    placeId: place.place_id || '',
    lat,
    lng,
  };
}

interface UseGooglePlacesOptions {
  types?: string[];
  // Component restriction country codes (ISO 3166-1 alpha-2, e.g. 'us', 'ca').
  // Defaults to ['us'] for backward-compat with existing US-only forms.
  countries?: string[];
}

export function useGooglePlaces(
  inputRef: React.RefObject<HTMLInputElement | null>,
  onSelect: (address: ParsedAddress) => void,
  options?: UseGooglePlacesOptions,
) {
  const [ready, setReady] = useState(scriptLoaded);
  const [error, setError] = useState<string | null>(null);
  const [inputElement, setInputElement] = useState<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // SCOPED LOADING: only pull the Maps script once the autocomplete input
  // actually exists in the DOM (e.g. the signup address view) — never on
  // bare page mount. Sign-In and other Places-free views load zero Maps.
  useEffect(() => {
    if (!inputElement) return;
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key not configured');
      return;
    }
    loadGoogleMapsScript()
      .then(() => setReady(true))
      .catch((e) => setError(e.message));
  }, [inputElement]);

  // Poll for the input element since refs don't trigger re-renders
  useEffect(() => {
    if (inputRef.current) {
      setInputElement(inputRef.current);
      return;
    }
    const interval = setInterval(() => {
      if (inputRef.current) {
        setInputElement(inputRef.current);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [inputRef]);

  const typesKey = options?.types?.join(',') || 'address';
  const countries = options?.countries?.length ? options.countries : ['us'];
  const countriesKey = countries.join(',');

  useEffect(() => {
    if (!ready || !inputElement) return;

    // Clean up previous autocomplete if the input element changed
    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    const autocomplete = new google.maps.places.Autocomplete(inputElement, {
      types: options?.types || ['address'],
      componentRestrictions: { country: countries },
      fields: ['address_components', 'formatted_address', 'place_id', 'geometry'],
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
  }, [ready, inputElement, typesKey, countriesKey]);

  return { ready: ready && !!GOOGLE_MAPS_API_KEY, error };
}
