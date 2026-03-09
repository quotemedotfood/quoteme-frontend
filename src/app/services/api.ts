// Railway API Service
const API_BASE_URL = 'https://web-production-9f6e9.up.railway.app';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  token?: string;
}

// Auth Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  distributor: {
    id: string;
    name: string;
  };
}

export interface SignUpData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// Guest Types
export interface GuestSession {
  token: string;
  expires_at?: string;
  quote_count?: number;
  quotes_remaining?: number;
}

export interface GuestQuote {
  raw_text: string;
  name: string;
}

export interface GuestConvertData {
  guest_token: string;
  user: SignUpData;
}

// Menu create response
export interface MenuCreateResponse {
  menu_id: string;
  quote_id: string;
  restaurant: string;
  component_count: number;
  components_aligned: number;
  status: string;
}

// Guest quote create response
export interface GuestQuoteCreateResponse {
  menu_id: string;
  quote_id: string;
  component_count: number;
  components_aligned: number;
  quote_count: number;
  quotes_remaining: number;
}

// Full quote response (show)
export interface QuoteContact {
  id: string;
  first_name: string;
  last_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
}

export interface QuoteResponse {
  id: string;
  status: string;
  working_label: string;
  restaurant: string;
  rep: string;
  rep_reviewed: boolean;
  sent_at: string | null;
  pdf_url: string | null;
  total_cents: number;
  total: string;
  created_at: string;
  contacts?: QuoteContact[];
  lines: QuoteLineResponse[];
}

export interface QuoteLineResponse {
  id: string;
  position: number;
  category: string;
  quantity: number;
  unit_price_cents: number | null;
  unit_price: string | null;
  alignment_selected: number;
  chef_note: string | null;
  component: {
    id: string;
    name: string;
    source_dish: string;
  } | null;
  product: {
    id: string;
    item_number: string;
    brand: string;
    product: string;
    pack_size: string;
    category: string;
  };
  alignment_candidates?: AlignmentCandidateResponse[];
}

export interface AlignmentCandidateResponse {
  id: string;
  position: number;
  tier: string;
  score: number | null;
  product: {
    id: string;
    item_number: string;
    brand: string;
    product: string;
    pack_size: string;
    category: string;
  };
}

// Quote create response (authenticated)
export interface QuoteCreateResponse {
  id: string;
  status: string;
  working_label: string;
  line_count: number;
}

// Menu status response
export interface MenuStatusResponse {
  menu_id: string;
  status: string;
  quote_id: string | null;
  updated_at: string;
}

// Helper to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem('quoteme_token');
}

// Helper to get guest token
function getGuestToken(): string | null {
  return localStorage.getItem('quoteme_guest_token');
}

// Helper to make authenticated requests
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Extract JWT token from response header if present
    const authHeader = response.headers.get('Authorization');
    let jwtToken: string | undefined;
    if (authHeader) {
      jwtToken = authHeader.replace('Bearer ', '');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.error || errorData.message || `HTTP ${response.status}`,
        data: undefined,
      };
    }

    const data = await response.json();
    return { data, token: jwtToken };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
      data: undefined,
    };
  }
}

// Helper to make guest requests
async function fetchWithGuest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const guestToken = getGuestToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (guestToken) {
    headers['X-Guest-Token'] = guestToken;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.error || errorData.message || `HTTP ${response.status}`,
        data: undefined,
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
      data: undefined,
    };
  }
}

// ============= AUTH ENDPOINTS =============

export async function signIn(credentials: LoginData): Promise<ApiResponse<{ message?: string; user?: any }>> {
  return fetchWithAuth('/users/sign_in', {
    method: 'POST',
    body: JSON.stringify({ user: credentials }),
  });
}

export async function signUp(data: SignUpData): Promise<ApiResponse<{ message: string; user: any }>> {
  return fetchWithAuth('/users', {
    method: 'POST',
    body: JSON.stringify({ user: { ...data, role: 'rep' } }),
  });
}

export async function getCurrentUser(): Promise<ApiResponse<User>> {
  return fetchWithAuth('/api/v1/me');
}

// ============= GUEST ENDPOINTS =============

export async function createGuestSession(): Promise<ApiResponse<GuestSession>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/guest/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.error || errorData.message || `HTTP ${response.status}`,
        data: undefined,
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
      data: undefined,
    };
  }
}

export async function getGuestSession(token: string): Promise<ApiResponse<GuestSession>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/guest/sessions/${token}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.error || errorData.message || `HTTP ${response.status}`,
        data: undefined,
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
      data: undefined,
    };
  }
}

export async function createGuestQuote(quoteData: GuestQuote): Promise<ApiResponse<GuestQuoteCreateResponse>> {
  return fetchWithGuest('/api/v1/guest/quotes', {
    method: 'POST',
    body: JSON.stringify({ ...quoteData, distributor_id: '88c1038d-6b3b-4cc0-ba35-32c32f435f91' }),
  });
}

export async function getGuestQuote(id: string): Promise<ApiResponse<QuoteResponse>> {
  return fetchWithGuest(`/api/v1/guest/quotes/${id}`);
}

export async function convertGuestToUser(data: GuestConvertData): Promise<ApiResponse<{ message: string; user: any; guest_session?: { quotes_used: number } }>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/guest/convert`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    // Extract JWT token from response header if present
    const authHeader = response.headers.get('Authorization');
    let jwtToken: string | undefined;
    if (authHeader) {
      jwtToken = authHeader.replace('Bearer ', '');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.error || errorData.message || `HTTP ${response.status}`,
        data: undefined,
      };
    }

    const data = await response.json();
    return { data, token: jwtToken };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
      data: undefined,
    };
  }
}

// ============= AUTHENTICATED ENDPOINTS =============

export interface CatalogSummary {
  id: string;
  version?: number;
  status: string;
  row_count: number;
  activated_at: string | null;
  created_at: string;
}

export interface CatalogUploadResponse {
  id: string;
  item_count: number;
  message: string;
}

export async function getCatalogs(): Promise<ApiResponse<CatalogSummary[]>> {
  return fetchWithAuth('/api/v1/catalogs');
}

export async function uploadCatalog(skus: any[]): Promise<ApiResponse<any>> {
  return fetchWithAuth('/api/v1/catalogs', {
    method: 'POST',
    body: JSON.stringify({ skus }),
  });
}

export async function uploadCatalogFile(file: File): Promise<ApiResponse<CatalogUploadResponse>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/catalogs/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export async function extractMenuText(payload: { file?: File; url?: string }): Promise<ApiResponse<{ text: string }>> {
  const token = getAuthToken();
  const guestToken = getGuestToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (guestToken) {
    headers['X-Guest-Token'] = guestToken;
  }

  const formData = new FormData();
  if (payload.file) {
    formData.append('file', payload.file);
  }
  if (payload.url) {
    formData.append('url', payload.url);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/menus/extract_text`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export async function createMenu(menuData: { raw_text: string; name: string }): Promise<ApiResponse<MenuCreateResponse>> {
  return fetchWithAuth('/api/v1/menus', {
    method: 'POST',
    body: JSON.stringify(menuData),
  });
}

export async function getMenu(id: string): Promise<ApiResponse<any>> {
  return fetchWithAuth(`/api/v1/menus/${id}`);
}

export async function createQuote(menuId: string): Promise<ApiResponse<QuoteCreateResponse>> {
  return fetchWithAuth('/api/v1/quotes', {
    method: 'POST',
    body: JSON.stringify({ menu_id: menuId }),
  });
}

export async function getQuote(id: string): Promise<ApiResponse<QuoteResponse>> {
  return fetchWithAuth(`/api/v1/quotes/${id}`);
}

export async function updateQuote(id: string, updates: any): Promise<ApiResponse<QuoteResponse>> {
  return fetchWithAuth(`/api/v1/quotes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function sendQuote(id: string): Promise<ApiResponse<any>> {
  return fetchWithAuth(`/api/v1/quotes/${id}/send_quote`, {
    method: 'POST',
  });
}

export async function sendQuoteSms(id: string): Promise<ApiResponse<any>> {
  return fetchWithAuth(`/api/v1/quotes/${id}/send_sms`, {
    method: 'POST',
  });
}

export async function getMenuStatus(id: string): Promise<ApiResponse<MenuStatusResponse>> {
  return fetchWithAuth(`/api/v1/menus/${id}/status`);
}

export async function downloadQuotePdf(id: string): Promise<{ blob?: Blob; error?: string }> {
  const token = getAuthToken();
  const guestToken = getGuestToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (guestToken) {
    headers['X-Guest-Token'] = guestToken;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/quotes/${id}/pdf`, { headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `HTTP ${response.status}` };
    }
    const blob = await response.blob();
    return { blob };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Catalog product search — used for manual match selection
export interface CatalogSearchProduct {
  id: string;
  item_number: string;
  brand: string;
  product: string;
  pack_size: string;
  price_cents: number | null;
  category: string;
}

export async function searchCatalogProducts(
  query: string,
  quoteId?: string
): Promise<ApiResponse<CatalogSearchProduct[]>> {
  const isGuest = !getAuthToken();
  if (isGuest && quoteId) {
    return fetchWithGuest(`/api/v1/guest/quotes/${quoteId}/search_products?query=${encodeURIComponent(query)}`);
  }
  return fetchWithAuth(`/api/v1/products/search?query=${encodeURIComponent(query)}`);
}

export async function getMoreMatches(
  quoteId: string,
  lineId: string
): Promise<ApiResponse<{ candidates: AlignmentCandidateResponse[] }>> {
  const isGuest = !getAuthToken();
  if (isGuest) {
    return fetchWithGuest(`/api/v1/guest/quotes/${quoteId}/more_matches`, {
      method: 'POST',
      body: JSON.stringify({ line_id: lineId }),
    });
  }
  return fetchWithAuth(`/api/v1/quotes/${quoteId}/more_matches`, {
    method: 'POST',
    body: JSON.stringify({ line_id: lineId }),
  });
}

export async function submitQuoteFeedback(
  quoteId: string,
  feedback: { rating: 'thumbs_up' | 'thumbs_down'; notes?: string }
): Promise<ApiResponse<any>> {
  return fetchWithAuth(`/api/v1/quotes/${quoteId}/feedback`, {
    method: 'POST',
    body: JSON.stringify(feedback),
  });
}
