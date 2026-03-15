// Railway API Service
const API_BASE_URL = 'https://web-production-9f6e9.up.railway.app';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  token?: string;
}

// Auth Types
export interface RepSettings {
  company_email?: string;
  company_phone?: string;
  website_url?: string;
  delivery_days?: string;
  minimum_order?: string;
  payment_terms?: string;
  company_logo_url?: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  phone?: string;
  avatar_url?: string;
  distributor_name?: string;
  distributor: {
    id: string;
    name: string;
    logo_url?: string;
  } | null;
  rep_settings?: RepSettings;
}

export interface SignUpData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  distributor_name?: string;
  claimed_distributor_id?: string;
  company_name?: string;
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

  // Debug: log what we're sending for auth-critical endpoints
  if (endpoint.includes('/me') || endpoint.includes('sign_in')) {
    console.log(`[fetchWithAuth] ${options.method || 'GET'} ${endpoint}`, {
      hasToken: !!token,
      tokenPrefix: token?.substring(0, 20),
      authHeader: headers['Authorization']?.substring(0, 30),
    });
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (endpoint.includes('/me')) {
      console.log(`[fetchWithAuth] /me response status: ${response.status}`);
    }

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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(`${API_BASE_URL}/users/sign_in`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user: credentials }),
    });

    // Devise-JWT puts the token in the Authorization header
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

    // Fallback: check body for token if header was missing
    if (!jwtToken && data.token) {
      jwtToken = data.token;
    }

    console.log('[signIn] Authorization header:', authHeader ? 'present' : 'missing');
    console.log('[signIn] JWT token extracted:', jwtToken ? 'yes' : 'no');

    return { data, token: jwtToken };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
      data: undefined,
    };
  }
}

export async function signUp(data: SignUpData): Promise<ApiResponse<{ message: string; user: any; distributor_matches?: Array<{ id: string; name: string }> }>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user: { ...data, role: 'rep' } }),
    });

    const authHeader = response.headers.get('Authorization');
    let jwtToken: string | undefined;
    if (authHeader) {
      jwtToken = authHeader.replace('Bearer ', '');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.error || errorData.errors?.full_messages?.join(', ') || errorData.message || `HTTP ${response.status}`,
        data: undefined,
      };
    }

    const body = await response.json();
    if (!jwtToken && body.token) {
      jwtToken = body.token;
    }

    console.log('[signUp] Authorization header:', authHeader ? 'present' : 'missing');
    console.log('[signUp] JWT token extracted:', jwtToken ? 'yes' : 'no');

    return { data: body, token: jwtToken };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
      data: undefined,
    };
  }
}

export async function getCurrentUser(): Promise<ApiResponse<User>> {
  return fetchWithAuth('/api/v1/me');
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  rep_settings?: RepSettings;
}

export async function updateCurrentUser(data: UpdateUserData): Promise<ApiResponse<User>> {
  return fetchWithAuth('/api/v1/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============= DISTRIBUTOR SEARCH (PUBLIC) =============

export interface DistributorSearchResult {
  id: string;
  name: string;
  logo_url: string | null;
}

export async function searchDistributors(query: string): Promise<ApiResponse<DistributorSearchResult[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/distributors/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/json' },
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

// ============= PASSWORD RESET =============

export async function sendPasswordReset(email: string): Promise<ApiResponse<{ message: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { email } }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { error: data.error || data.errors?.[0] || 'Failed to send reset email' };
    }
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export async function resetPassword(params: {
  reset_password_token: string;
  password: string;
  password_confirmation: string;
}): Promise<ApiResponse<{ message: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: params }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { error: data.error || data.errors?.[0] || 'Failed to reset password' };
    }
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
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

export async function getDemoDistributor(type: 'food' | 'liquor' = 'food'): Promise<ApiResponse<{ distributor_id: string; distributor_name: string; has_catalog: boolean; product_count: number }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/guest/sessions/demo-distributor?type=${type}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `HTTP ${response.status}`, data: undefined };
    }
    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error', data: undefined };
  }
}

export async function createGuestQuote(quoteData: GuestQuote, distributorId?: string): Promise<ApiResponse<GuestQuoteCreateResponse>> {
  return fetchWithGuest('/api/v1/guest/quotes', {
    method: 'POST',
    body: JSON.stringify({ ...quoteData, distributor_id: distributorId || '88c1038d-6b3b-4cc0-ba35-32c32f435f91' }),
  });
}

export async function getGuestQuote(id: string): Promise<ApiResponse<QuoteResponse>> {
  return fetchWithGuest(`/api/v1/guest/quotes/${id}`);
}

export async function updateGuestQuote(id: string, updates: any): Promise<ApiResponse<any>> {
  return fetchWithGuest(`/api/v1/guest/quotes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function addGuestQuoteLine(quoteId: string, productId: string): Promise<ApiResponse<any>> {
  return fetchWithGuest(`/api/v1/guest/quotes/${quoteId}/add_line`, {
    method: 'POST',
    body: JSON.stringify({ product_id: productId }),
  });
}

export async function removeGuestQuoteLine(quoteId: string, lineId: string): Promise<ApiResponse<any>> {
  return fetchWithGuest(`/api/v1/guest/quotes/${quoteId}/lines/${lineId}`, {
    method: 'DELETE',
  });
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
  const authToken = getAuthToken();
  const guestToken = getGuestToken();
  const headers: Record<string, string> = {};

  // Determine endpoint based on auth status
  const isGuest = !authToken;
  let endpoint: string;

  if (isGuest) {
    endpoint = `${API_BASE_URL}/api/v1/guest/quotes/upload_catalog`;
    if (guestToken) {
      headers['X-Guest-Token'] = guestToken;
    }
  } else {
    endpoint = `${API_BASE_URL}/api/v1/catalogs/upload`;
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(endpoint, {
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

export async function getGuestMenu(quoteId: string): Promise<ApiResponse<any>> {
  return fetchWithGuest(`/api/v1/guest/quotes/${quoteId}/menu`);
}

// Dish Component CRUD (for Component Correction screen)
export async function updateDishComponent(
  menuId: string,
  dishId: string,
  componentId: string,
  data: { name?: string; passes_to_alignment?: boolean }
): Promise<ApiResponse<any>> {
  return fetchWithAuth(`/api/v1/menus/${menuId}/dishes/${dishId}/components/${componentId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteDishComponent(
  menuId: string,
  dishId: string,
  componentId: string
): Promise<ApiResponse<any>> {
  return fetchWithAuth(`/api/v1/menus/${menuId}/dishes/${dishId}/components/${componentId}`, {
    method: 'DELETE',
  });
}

export async function createDishComponent(
  menuId: string,
  dishId: string,
  data: { name: string; category?: string }
): Promise<ApiResponse<any>> {
  return fetchWithAuth(`/api/v1/menus/${menuId}/dishes/${dishId}/components`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
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
    const endpoint = token
      ? `${API_BASE_URL}/api/v1/quotes/${id}/pdf`
      : `${API_BASE_URL}/api/v1/guest/quotes/${id}/pdf`;
    const response = await fetch(endpoint, { headers });
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

// Quote list item (from index endpoint)
export interface QuoteListItem {
  id: string;
  status: string;
  working_label: string;
  restaurant: string | null;
  total_cents: number;
  line_count: number;
  rep_reviewed: boolean;
  created_at: string;
  sent_at: string | null;
}

export interface GetQuotesParams {
  status?: string;
  restaurant_id?: string;
  date_from?: string;
  date_to?: string;
}

export async function getQuotes(params?: GetQuotesParams): Promise<ApiResponse<QuoteListItem[]>> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.restaurant_id) searchParams.set('restaurant_id', params.restaurant_id);
  if (params?.date_from) searchParams.set('date_from', params.date_from);
  if (params?.date_to) searchParams.set('date_to', params.date_to);
  const qs = searchParams.toString();
  return fetchWithAuth(`/api/v1/quotes${qs ? `?${qs}` : ''}`);
}

export interface RequoteResponse {
  id: string;
  original_quote_id: string;
  status: string;
  working_label: string;
  line_count: number;
  matches_changed: number;
  matches_same: number;
}

export async function requoteQuote(id: string): Promise<ApiResponse<RequoteResponse>> {
  return fetchWithAuth(`/api/v1/quotes/${id}/requote`, {
    method: 'POST',
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

// ============= RESTAURANT ENDPOINTS =============

export interface RestaurantContact {
  id: string;
  restaurant_id?: string;
  first_name: string;
  last_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
}

export interface RestaurantGroup {
  id: string;
  name: string;
}

export interface RestaurantIndexItem {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  primary_rep: string | null;
  contact_count: number;
  status: string;
  restaurant_group: RestaurantGroup | null;
}

// Alias for backward compatibility
export type RestaurantSummary = RestaurantIndexItem;

export interface RestaurantDetail {
  id: string;
  name: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
  status: string;
  created_at: string;
  restaurant_group: RestaurantGroup | null;
  relationship: {
    id: string;
    primary_rep: string | null;
    status: string;
  } | null;
  contacts: RestaurantContact[];
  recent_quotes: {
    id: string;
    status: string;
    working_label: string;
    created_at: string;
    sent_at: string | null;
  }[];
}

export async function getRestaurants(params?: { restaurant_group_id?: string }): Promise<ApiResponse<RestaurantIndexItem[]>> {
  const queryParts: string[] = [];
  if (params?.restaurant_group_id) {
    queryParts.push(`restaurant_group_id=${encodeURIComponent(params.restaurant_group_id)}`);
  }
  const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return fetchWithAuth(`/api/v1/restaurants${query}`);
}

export async function getRestaurant(id: string): Promise<ApiResponse<RestaurantDetail>> {
  return fetchWithAuth(`/api/v1/restaurants/${id}`);
}

export interface CreateRestaurantData {
  name: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  restaurant_group_id?: string;
}

export async function createRestaurant(data: CreateRestaurantData): Promise<ApiResponse<RestaurantDetail>> {
  return fetchWithAuth('/api/v1/restaurants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRestaurant(id: string, data: Partial<CreateRestaurantData>): Promise<ApiResponse<RestaurantDetail>> {
  return fetchWithAuth(`/api/v1/restaurants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============= RESTAURANT CONTACT ENDPOINTS =============

export interface CreateContactData {
  first_name: string;
  last_name: string;
  role?: string;
  email?: string;
  phone?: string;
  is_primary?: boolean;
}

export async function createContact(restaurantId: string, data: CreateContactData): Promise<ApiResponse<RestaurantContact>> {
  return fetchWithAuth(`/api/v1/restaurants/${restaurantId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateContact(restaurantId: string, contactId: string, data: Partial<CreateContactData>): Promise<ApiResponse<RestaurantContact>> {
  return fetchWithAuth(`/api/v1/restaurants/${restaurantId}/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteContact(restaurantId: string, contactId: string): Promise<ApiResponse<{ message: string }>> {
  return fetchWithAuth(`/api/v1/restaurants/${restaurantId}/contacts/${contactId}`, {
    method: 'DELETE',
  });
}

// ============= BILLING ENDPOINTS =============

export async function getBilling(): Promise<ApiResponse<any>> {
  return fetchWithAuth('/api/v1/billing');
}

export async function createCheckoutSession(plan?: string): Promise<ApiResponse<{ checkout_url: string }>> {
  return fetchWithAuth('/api/v1/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan: plan || 'solo_rep' }),
  });
}

export async function createPortalSession(): Promise<ApiResponse<{ portal_url: string }>> {
  return fetchWithAuth('/api/v1/billing/portal', {
    method: 'POST',
  });
}

// ============= STOCK QUOTES =============

export interface StockQuoteResponse {
  id: string;
  name: string;
  restaurant_type: string | null;
  is_system: boolean;
  status: string;
  quote_data: Record<string, unknown> | null;
  dish_count: number;
  component_count: number;
  created_by: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
}

export async function getStockQuotes(): Promise<ApiResponse<StockQuoteResponse[]>> {
  return fetchWithAuth('/api/v1/stock-quotes');
}

export async function createStockQuote(data: {
  name: string;
  restaurant_type: string;
  quote_data?: Record<string, unknown>;
}): Promise<ApiResponse<StockQuoteResponse>> {
  return fetchWithAuth('/api/v1/stock-quotes', {
    method: 'POST',
    body: JSON.stringify({ stock_quote: data }),
  });
}

export async function generateFromStockQuote(id: string): Promise<ApiResponse<{ menu_id: string; stock_quote_id: string }>> {
  return fetchWithAuth(`/api/v1/stock-quotes/${id}/generate`, {
    method: 'POST',
  });
}

// ============= DISTRIBUTOR ONBOARDING =============

export async function confirmDistributor(): Promise<ApiResponse<{ confirmed: boolean }>> {
  return fetchWithAuth('/api/v1/distributor/confirm', { method: 'POST' });
}

export async function updateDistributorName(name: string): Promise<ApiResponse<{ name: string }>> {
  return fetchWithAuth('/api/v1/distributor/update_name', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export interface DistributorHomeData {
  distributor_name: string;
  has_catalog: boolean;
  catalog_product_count: number;
  rep_count: number;
  quote_count: number;
}

export async function getDistributorHome(): Promise<ApiResponse<DistributorHomeData>> {
  return fetchWithAuth('/api/v1/distributor/home');
}

// Catalog confirmation
export interface CatalogConfirmation {
  total_processed: number;
  excluded_count: number;
  excluded_reasons: string[];
  net_usable: number;
  category_breakdown: Record<string, number>;
}

export async function getCatalogConfirmation(catalogId: string): Promise<ApiResponse<CatalogConfirmation>> {
  return fetchWithAuth(`/api/v1/catalogs/${catalogId}/confirmation`);
}

export async function flagCatalogCategory(catalogId: string, message: string): Promise<ApiResponse<{ success: boolean }>> {
  return fetchWithAuth(`/api/v1/catalogs/${catalogId}/flag_category`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

// Rep invite
export async function inviteRep(data: { name: string; email: string; territory?: string }): Promise<ApiResponse<{ message: string }>> {
  return fetchWithAuth('/api/v1/distributor_admin/reps/invite', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
