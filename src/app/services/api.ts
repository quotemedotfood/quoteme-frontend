// Railway API Service
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://web-production-9f6e9.up.railway.app';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  error_code?: string;
  // Full structured error payload from BE (e.g. multi_restaurant_confirm_required
  // returns existing_restaurants[] + typed_name + hint). Callers that need
  // structured BE errors (modal display) read this. String-only callers
  // continue to use `error`.
  error_data?: Record<string, unknown>;
  status?: number;
  token?: string;
}

// V2 multi-restaurant guard rail — 409 payload when an authenticated chef
// has 2+ existing restaurant_contacts and typed a new name. See BE
// guest_quotes_controller.rb #multi_restaurant_guard.
export interface MultiRestaurantConfirmError {
  error: 'multi_restaurant_confirm_required';
  message: string;
  typed_name: string;
  existing_restaurants: Array<{ id: string; name: string }>;
  hint: string;
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
  unlimited_drafts?: boolean;
  quotes_used?: number;
  quotes_limit?: number;
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
  role?: string;
  restaurant_name?: string;
  city?: string;
  state?: string;
  location_id?: string;
}

export interface LoginData {
  email: string;
  password: string;
  guest_token?: string;
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
  // Optional restaurant name. When omitted, BE falls back to the chef's
  // existing RestaurantContact (authenticated chef) or the demo
  // distributor's restaurant (guest). Sending a literal placeholder
  // string here (e.g. "My Restaurant") creates a Restaurant with that
  // literal name and surfaces as the OG header — see P0-11.
  name?: string;
  // V2 W4 increment 2 — bypass the multi-restaurant guard rail. Set true
  // only after the chef explicitly confirms via MultiRestaurantConfirmModal
  // that they want to create a new restaurant despite having 2+ existing
  // contacts. BE: app/controllers/api/v1/guest_quotes_controller.rb
  // #multi_restaurant_guard.
  confirm_new_restaurant?: boolean;
}

export interface GuestConvertData {
  guest_token: string;
  user: SignUpData;
}

// ─── Chef magic-link consume ────────────────────────────────────────────────
// V2 W4: response shape the consume endpoint returns when a chef arrives via
// rep email. The `quote` envelope payload is everything ChefWelcomePage
// needs to render the TO/FROM/QUOTE blocks on first paint — no second
// roundtrip required.

export interface ChefMagicLinkConsumeResponse {
  jwt: string;
  user: {
    id: string;
    email: string;
    role: string;
    first_name: string | null;
    last_name: string | null;
  };
  quote: {
    id: string;
    label: string;
    created_at: string;
    sent_at: string | null;
    status: string;
    item_count: number;
    category_count: number;
    total_cents: number;
    rep: {
      name: string;
      first_name: string | null;
      email: string;
      phone: string | null;
    } | null;
    distributor: {
      name: string;
      short_name: string;
    } | null;
    restaurant: {
      name: string;
      city: string | null;
      state: string | null;
    } | null;
  };
  redirect: string;
}

export interface ChefMagicLinkConsumeError {
  error: "invalid_token" | "expired" | "role_conflict" | string;
  message?: string;
  existing_role?: string;
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
  preview?: boolean;
  contacts?: QuoteContact[];
  lines: QuoteLineResponse[];
  input_mode?: string | null;
  detected_concept?: string | null;
  concept_review_required?: boolean | null;
}

export interface QuoteLineResponse {
  id: string;
  position: number;
  category: string;
  quantity: number;
  unit_price_cents: number | null;
  unit_price: string | null;
  alignment_selected: number;
  availability_status: 'available' | 'not_in_catalog';
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
export function getGuestToken(): string | null {
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

// Helper to make guest requests.
// Sends X-Guest-Token when a guest token is available (preview-link flow).
// Falls back to Bearer JWT when no guest token is present but a JWT auth
// token exists (signed-in chef-user flow). Symmetric with the BE
// Chef::BaseController dual-auth strategy (Path B, A2.1).
async function fetchWithGuest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const guestToken = getGuestToken();
  const authToken = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  // Send BOTH when both are present so a signed-in chef who still has a
  // leftover guest token can be recognized as a chef by BE dual-auth
  // (Chef::BaseController and GuestQuotesController#current_chef_user_from_jwt
  // both prefer chef identity when both tokens arrive). Without this, the
  // X-Guest-Token wins and the chef is invisible — quotes get linked to
  // distributor.restaurants.first and action endpoints 404.
  if (guestToken) {
    headers['X-Guest-Token'] = guestToken;
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
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
        error_code: errorData.error,
        error_data: errorData,
        status: response.status,
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

export async function signIn(credentials: LoginData): Promise<ApiResponse<{ message?: string; user?: any; error_code?: string }>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(`${API_BASE_URL}/users/sign_in`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user: { email: credentials.email, password: credentials.password },
        ...(credentials.guest_token ? { guest_token: credentials.guest_token } : {}),
      }),
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
        error_code: errorData.error_code,
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
      body: JSON.stringify({ user: { ...data, role: data.role || 'rep' } }),
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
        error_code: errorData.error_code,
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
  unlimited_drafts?: boolean;
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

export async function getDistributorById(id: string): Promise<ApiResponse<DistributorSearchResult>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/distributors/${id}`, {
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

export interface DistributorRepInfo {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Rep';
  territory: string | null;
}

export async function getDistributorReps(distributorId: string): Promise<ApiResponse<DistributorRepInfo[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/distributors/${distributorId}/reps`, {
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

// distributorId / catalogId are optional. When absent, BE resolves the
// target via ChefDistributorResolutionService for authenticated chefs, or
// the active demo distributor for guest sessions. The previous hardcoded
// Summit UUID fallback is gone (V2 W3); chefs with real distributor
// relationships will now route to their own catalog instead of the demo.
export async function createGuestQuote(
  quoteData: GuestQuote,
  distributorId?: string,
  catalogId?: string,
): Promise<ApiResponse<GuestQuoteCreateResponse>> {
  const body: Record<string, unknown> = { ...quoteData };
  if (distributorId) body.distributor_id = distributorId;
  if (catalogId) body.catalog_id = catalogId;

  return fetchWithGuest('/api/v1/guest/quotes', {
    method: 'POST',
    body: JSON.stringify(body),
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

export interface CatalogColumnInfo {
  headers: string[];
  column_mapping: Record<string, string>;
  mapped_fields: string[];
  missing_required: string[];
  sample_row?: { raw: string[]; parsed: Record<string, string> };
}

export interface CatalogUploadResponse {
  id: string;
  item_count: number;
  message: string;
  classification_status?: string;
  classification_total?: number;
  column_info?: CatalogColumnInfo;
}

export interface ClassificationStatusResponse {
  catalog_id: string;
  status: string; // "pending" | "classifying" | "complete"
  progress: number;
  total: number;
  flagged_count: number;
}

export async function getClassificationStatus(catalogId: string): Promise<ApiResponse<ClassificationStatusResponse>> {
  return fetchWithAuth(`/api/v1/catalogs/${catalogId}/classification_status`);
}

export interface FlaggedProduct {
  id: string;
  product_name: string;
  brand: string;
  pack_size: string;
  category: string;
  ai_confidence: string;
  category_source: string;
}

export interface FlaggedProductsResponse {
  catalog_id: string;
  flagged_count: number;
  products: FlaggedProduct[];
}

export async function getFlaggedProducts(catalogId: string): Promise<ApiResponse<FlaggedProductsResponse>> {
  return fetchWithAuth(`/api/v1/catalogs/${catalogId}/flagged_products`);
}

export async function reviewCategories(catalogId: string, updates: { id: string; category: string }[]): Promise<ApiResponse<{ updated: number; remaining_flagged: number }>> {
  return fetchWithAuth(`/api/v1/catalogs/${catalogId}/review_categories`, {
    method: 'PATCH',
    body: JSON.stringify({ updates }),
  });
}

export async function approveAllCategories(catalogId: string): Promise<ApiResponse<{ approved: number }>> {
  return fetchWithAuth(`/api/v1/catalogs/${catalogId}/approve_categories`, {
    method: 'POST',
  });
}

export async function bulkUpdateCategory(catalogId: string, productIds: string[], category: string): Promise<ApiResponse<{ updated: number; category: string }>> {
  return fetchWithAuth(`/api/v1/catalogs/${catalogId}/bulk_update_category`, {
    method: 'PATCH',
    body: JSON.stringify({ product_ids: productIds, category }),
  });
}

export async function reclassifyOthers(catalogId: string): Promise<ApiResponse<{ message: string; other_count: number; classification_status: string }>> {
  return fetchWithAuth(`/api/v1/catalogs/${catalogId}/reclassify_others`, {
    method: 'POST',
  });
}

export interface CatalogProductsResponse {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  brands: string[];
  products: Array<{
    id: string;
    item_number: string;
    brand: string;
    product_name: string;
    canonical_product: string | null;
    pack_size: string;
    price_cents: number;
    category: string;
    subcategory: string | null;
    status: string;
  }>;
}

export async function getCatalogProducts(catalogId: string, page = 1, perPage = 50, opts?: { category?: string; search?: string; brand?: string }): Promise<ApiResponse<CatalogProductsResponse>> {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (opts?.category) params.set('category', opts.category);
  if (opts?.search) params.set('search', opts.search);
  if (opts?.brand) params.set('brand', opts.brand);
  return fetchWithAuth(`/api/v1/catalogs/${catalogId}/products?${params}`);
}

export interface CatalogStatsResponse {
  id: string;
  total_products: number;
  by_category: Record<string, number>;
  average_price_cents: number;
  last_uploaded_at: string;
}

export async function getCatalogStats(catalogId: string): Promise<ApiResponse<CatalogStatsResponse>> {
  return fetchWithAuth(`/api/v1/catalogs/${catalogId}/stats`);
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
      return { error: errorData.error || `HTTP ${response.status}`, data: errorData } as any;
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

// Public quote preview types and fetch (no auth required)
export interface QuotePreviewLine {
  id: string;
  product: string;
  brand: string;
  pack_size: string;
  quantity: number;
  unit_price_cents: number;
  unit_price: string;
  line_total_cents: number;
  line_total: string;
}

export interface QuotePreviewResponse {
  id: string;
  restaurant: string | null;
  rep: string | null;
  distributor: string | null;
  date: string | null;
  total_cents: number;
  total: string;
  note: string | null;
  lines: QuotePreviewLine[];
}

export async function getQuotePreview(id: string): Promise<ApiResponse<QuotePreviewResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/quotes/${id}/preview`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `HTTP ${response.status}` };
    }
    const data = await response.json();
    return { data };
  } catch (err: any) {
    return { error: err.message || 'Network error' };
  }
}

export async function updateQuote(id: string, updates: any): Promise<ApiResponse<QuoteResponse>> {
  return fetchWithAuth(`/api/v1/quotes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function sendQuote(id: string, recipientEmail?: string, note?: string): Promise<ApiResponse<any>> {
  const options: RequestInit = { method: 'POST' };
  const body: Record<string, string> = {};
  if (recipientEmail) body.recipient_email = recipientEmail;
  if (note) body.note = note;
  if (Object.keys(body).length > 0) {
    options.body = JSON.stringify(body);
  }
  return fetchWithAuth(`/api/v1/quotes/${id}/send_quote`, options);
}

export async function sendQuoteSms(id: string, recipientPhone?: string): Promise<ApiResponse<any>> {
  const options: RequestInit = { method: 'POST' };
  if (recipientPhone) {
    options.body = JSON.stringify({ recipient_phone: recipientPhone });
  }
  return fetchWithAuth(`/api/v1/quotes/${id}/send_sms`, options);
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
    const response = await fetch(endpoint, { headers, cache: 'no-store' });
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

export async function downloadQuoteCsv(id: string): Promise<{ blob?: Blob; error?: string }> {
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
      ? `${API_BASE_URL}/api/v1/quotes/${id}/csv`
      : `${API_BASE_URL}/api/v1/guest/quotes/${id}/csv`;
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

export async function downloadOrderGuide(id: string): Promise<{ blob?: Blob; error?: string }> {
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
      ? `${API_BASE_URL}/api/v1/quotes/${id}/order_guide`
      : `${API_BASE_URL}/api/v1/guest/quotes/${id}/order_guide`;
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

export async function downloadChefOrderGuidePdf(orderGuideId: string): Promise<{ blob?: Blob; error?: string }> {
  const token = getAuthToken();
  const guestToken = getGuestToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (guestToken) {
    headers['X-Guest-Token'] = guestToken;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/chef/order_guides/${orderGuideId}/pdf`,
      { headers, cache: 'no-store' }
    );
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

export async function downloadChefOrderGuideExcel(orderGuideId: string): Promise<{ blob?: Blob; error?: string }> {
  const token = getAuthToken();
  const guestToken = getGuestToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (guestToken) {
    headers['X-Guest-Token'] = guestToken;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/chef/order_guides/${orderGuideId}/excel`,
      { headers, cache: 'no-store' }
    );
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

export async function deleteQuote(quoteId: string): Promise<ApiResponse<{ status: string }>> {
  return fetchWithAuth(`/api/v1/quotes/${quoteId}`, { method: 'DELETE' });
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

export async function reviewQuote(
  quoteId: string,
  rating: 'positive' | 'negative',
  comment?: string
): Promise<ApiResponse<{ quote: QuoteResponse; rules_created: number; rules_summary: string[] }>> {
  return fetchWithAuth(`/api/v1/quotes/${quoteId}/review`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
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

// ============= LOCATION ENDPOINTS =============

export interface LocationItem {
  id: string;
  name: string;
  concept_type: string | null;
  city: string;
  state: string;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  location_group: { id: string; name: string } | null;
  membership_role: string;
  created_at: string;
}

export interface LocationDistributorRelationship {
  id: string;
  status: string;
  distributor_name_text: string;
  distributor: { id: string; name: string; logo_url?: string } | null;
  rep: { id: string; name: string; email: string } | null;
  rep_name_text: string | null;
  rep_email_text: string | null;
  rep_phone_text: string | null;
  created_at: string;
}

export async function getLocations(): Promise<ApiResponse<LocationItem[]>> {
  return fetchWithAuth('/api/v1/locations');
}

export async function getLocationDistributors(locationId: string): Promise<ApiResponse<LocationDistributorRelationship[]>> {
  return fetchWithAuth(`/api/v1/locations/${locationId}/distributors`);
}

export async function addLocationToGroup(groupId: string, data: {
  name: string;
  city?: string;
  state?: string;
  concept_type?: string;
}): Promise<ApiResponse<{ id: string; name: string; city: string; state: string; concept_type: string | null; location_group_id: string }>> {
  return fetchWithAuth(`/api/v1/location_groups/${groupId}/add_location`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getLocationGroupBilling(groupId: string): Promise<ApiResponse<any>> {
  return fetchWithAuth(`/api/v1/location_groups/${groupId}/billing`);
}

export async function createLocationGroupPortalSession(groupId: string): Promise<ApiResponse<{ portal_url: string }>> {
  return fetchWithAuth(`/api/v1/location_groups/${groupId}/portal`, {
    method: 'POST',
  });
}

export async function createLocationVendor(locationId: string, data: {
  distributor_name_text: string;
  distributor_id?: string;
  rep_id?: string;
  rep_name_text?: string;
  rep_email_text?: string;
}): Promise<ApiResponse<LocationDistributorRelationship>> {
  return fetchWithAuth(`/api/v1/locations/${locationId}/vendors`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============= LOCATION QUOTES =============

export interface LocationQuote {
  id: string;
  status: string;
  working_label: string | null;
  quote_type: string | null;
  distributor: { id: string; name: string } | null;
  total_cents: number | null;
  created_at: string;
  sent_at: string | null;
}

export async function getLocationQuotes(locationId: string): Promise<ApiResponse<LocationQuote[]>> {
  return fetchWithAuth(`/api/v1/locations/${locationId}/quotes`);
}

// ============= LOCATION MEMBERS =============

export async function getLocationMembers(locationId: string): Promise<any[]> {
  const res = await fetchWithAuth(`/api/v1/locations/${locationId}/members`);
  return res.data as any[];
}

export async function inviteLocationMember(locationId: string, data: {
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  title?: string;
  location_ids?: string[];
}): Promise<any> {
  const res = await fetchWithAuth(`/api/v1/locations/${locationId}/members/invite`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
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
  return fetchWithAuth('/api/v1/distributor_admin/home');
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

// Rep management
export interface DistributorRep {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  territory: string | null;
  is_active: boolean;
  status: 'active' | 'deactivated' | 'invited';
  created_at: string;
}

export async function getDistributorAdminReps(): Promise<ApiResponse<DistributorRep[]>> {
  return fetchWithAuth('/api/v1/distributor_admin/reps');
}

export async function inviteRep(data: { name: string; email: string; territory?: string }): Promise<ApiResponse<{ message: string }>> {
  return fetchWithAuth('/api/v1/distributor_admin/reps/invite', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============= ONBOARDING DOCS =============

export interface OnboardingDoc {
  id: string;
  title: string;
  doc_type: 'pdf' | 'link';
  url: string | null;
  is_active: boolean;
  position: number;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
}

export async function getOnboardingDocs(): Promise<ApiResponse<OnboardingDoc[]>> {
  return fetchWithAuth('/api/v1/distributor_admin/onboarding_docs');
}

export async function createOnboardingDoc(data: FormData): Promise<ApiResponse<OnboardingDoc>> {
  const authToken = getAuthToken();
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/distributor_admin/onboarding_docs`, {
      method: 'POST',
      headers,
      body: data,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `HTTP ${response.status}` };
    }
    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export async function updateOnboardingDoc(id: string, data: FormData): Promise<ApiResponse<OnboardingDoc>> {
  const authToken = getAuthToken();
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/distributor_admin/onboarding_docs/${id}`, {
      method: 'PATCH',
      headers,
      body: data,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `HTTP ${response.status}` };
    }
    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export async function deleteOnboardingDoc(id: string): Promise<ApiResponse<{ status: string }>> {
  return fetchWithAuth(`/api/v1/distributor_admin/onboarding_docs/${id}`, { method: 'DELETE' });
}

// ============= CATEGORY EXCLUSIONS =============

export interface CategoryEntry {
  key: string;
  label: string;
  product_count: number;
}

export interface CategoryExclusionsResponse {
  excluded_categories: string[];
  available_categories: CategoryEntry[];
}

// Distributor admin category exclusions
export async function getDistributorCategoryExclusions(): Promise<ApiResponse<CategoryExclusionsResponse>> {
  return fetchWithAuth('/api/v1/distributor_admin/category_exclusions');
}

export async function updateDistributorCategoryExclusions(
  excludedCategories: string[]
): Promise<ApiResponse<CategoryExclusionsResponse>> {
  return fetchWithAuth('/api/v1/distributor_admin/category_exclusions', {
    method: 'PATCH',
    body: JSON.stringify({ excluded_categories: excludedCategories }),
  });
}

// QM admin category exclusions (per distributor)
export async function getAdminCategoryExclusions(
  distributorId: string
): Promise<ApiResponse<CategoryExclusionsResponse>> {
  return fetchWithAuth(`/api/v1/admin/distributors/${distributorId}/category_exclusions`);
}

export async function updateAdminCategoryExclusions(
  distributorId: string,
  excludedCategories: string[]
): Promise<ApiResponse<CategoryExclusionsResponse>> {
  return fetchWithAuth(`/api/v1/admin/distributors/${distributorId}/category_exclusions`, {
    method: 'PATCH',
    body: JSON.stringify({ excluded_categories: excludedCategories }),
  });
}

// ============= SUBCATEGORY EXCLUSIONS =============

export interface SubcategoryEntry {
  id: string;
  key: string;
  label: string;
  product_count: number;
  status: 'included' | 'suggested' | 'excluded';
  suggested_at: string | null;
}

export interface SubcategoryCategoryGroup {
  key: string;
  label: string;
  total_product_count: number;
  subcategories: SubcategoryEntry[];
}

export interface SubcategoryExclusionsResponse {
  categories: SubcategoryCategoryGroup[];
}

export async function getDistributorSubcategoryExclusions(): Promise<ApiResponse<SubcategoryExclusionsResponse>> {
  return fetchWithAuth('/api/v1/distributor_admin/subcategory_exclusions');
}

export async function updateDistributorSubcategoryExclusions(
  actions: { confirm?: string[]; exclude?: string[]; include?: string[]; confirm_all?: boolean }
): Promise<ApiResponse<SubcategoryExclusionsResponse>> {
  return fetchWithAuth('/api/v1/distributor_admin/subcategory_exclusions', {
    method: 'PATCH',
    body: JSON.stringify(actions),
  });
}

export async function getAdminSubcategoryExclusions(distributorId: string): Promise<ApiResponse<SubcategoryExclusionsResponse>> {
  return fetchWithAuth(`/api/v1/admin/distributors/${distributorId}/subcategory_exclusions`);
}

export async function updateAdminSubcategoryExclusions(
  distributorId: string,
  actions: { confirm?: string[]; exclude?: string[]; include?: string[]; confirm_all?: boolean }
): Promise<ApiResponse<SubcategoryExclusionsResponse>> {
  return fetchWithAuth(`/api/v1/admin/distributors/${distributorId}/subcategory_exclusions`, {
    method: 'PATCH',
    body: JSON.stringify(actions),
  });
}

// ── Notifications ──

export async function getNotifications(): Promise<ApiResponse<{ notifications: any[]; unread_count: number }>> {
  return fetchWithAuth('/api/v1/notifications');
}

export async function markNotificationRead(id: string): Promise<ApiResponse<any>> {
  return fetchWithAuth(`/api/v1/notifications/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export async function markAllNotificationsRead(): Promise<ApiResponse<any>> {
  return fetchWithAuth('/api/v1/notifications/mark_all_read', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// ═══════════════════════════════════════════════════
// Chef Flow API
// ═══════════════════════════════════════════════════

export async function acceptChefQuote(quoteId: string): Promise<ApiResponse<{ order_guide_id: string }>> {
  return fetchWithGuest(`/api/v1/chef/quotes/${quoteId}/accept`, { method: 'POST' });
}

// V2 W4 — magic-link consume. Unauthenticated by design; the token IS the
// credential. Returns a JWT + the full quote envelope payload that
// ChefWelcomePage uses to paint the TO/FROM/QUOTE blocks on first arrival.
//
// Uses a plain fetch (not fetchWithGuest / fetchWithAuth) because:
//   1. The chef has no JWT yet — this call IS what issues it.
//   2. A leftover guest token from a prior session must NOT bleed into the
//      magic-link consume request; the token in the URL is authoritative.
export async function consumeChefMagicLink(
  token: string,
): Promise<ApiResponse<ChefMagicLinkConsumeResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/chef/magic_links/consume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const errorBody: ChefMagicLinkConsumeError = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      return {
        error: errorBody.error || `HTTP ${response.status}`,
        error_code: errorBody.error,
        data: undefined,
      };
    }

    const data: ChefMagicLinkConsumeResponse = await response.json();
    return { data, token: data.jwt };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Network error',
      data: undefined,
    };
  }
}

// V2 W2 — chef-facing distributor list. Returns all distributors the
// authenticated chef can see (via their RestaurantContacts → Restaurants
// → DistributorRestaurantRelationships), plus the primary distributor id
// when one is resolved.
export interface ChefDistributorSummary {
  id: string;
  name: string;
  status: string;
}

export interface ChefDistributorsResponse {
  primary_distributor_id: string | null;
  distributors: ChefDistributorSummary[];
}

export async function getChefDistributors(): Promise<ApiResponse<ChefDistributorsResponse>> {
  return fetchWithGuest(`/api/v1/chef/distributors`);
}

// V2 W4 inc 4 — chef-scoped reverse-chron quote list. Per-row carries the
// dashboard's display fields + latest_question for the "previous questions"
// strip, in one round-trip.
export interface ChefQuoteRow {
  id: string;
  quote_number: string;
  label: string;
  status: string;
  preview: boolean;
  created_at: string;
  sent_at: string | null;
  item_count: number;
  total_cents: number;
  distributor: { id: string; name: string } | null;
  restaurant: { id: string; name: string } | null;
  rep: { name: string; first_name: string | null } | null;
  has_order_guide: boolean;
  order_guide_id: string | null;
  latest_question: string | null;
  preview?: boolean;
}

export interface ChefQuotesIndexResponse {
  quotes: ChefQuoteRow[];
  count: number;
  free_tier_limit: number;
}

export async function getChefQuotes(): Promise<ApiResponse<ChefQuotesIndexResponse>> {
  return fetchWithGuest(`/api/v1/chef/quotes`);
}

export async function sendChefQuestion(quoteId: string, message: string): Promise<ApiResponse<{ success: boolean }>> {
  return fetchWithGuest(`/api/v1/chef/quotes/${quoteId}/question`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export interface OrderGuideResponse {
  id: string;
  status: string;
  effective_date: string | null;
  order_days: string | null;
  minimum_order_cents: number | null;
  distributor: { name: string; phone: string | null; email: string | null } | null;
  restaurant: { name: string; address: string | null } | null;
  rep: { name: string; email: string | null; phone: string | null } | null;
  items: OrderGuideItemResponse[];
  quote_id: string;
}

export interface OrderGuideItemResponse {
  id: string;
  category: string;
  position: number;
  item_number: string | null;
  brand: string | null;
  product_description: string;
  pack_size: string | null;
  quantity: number;
  par: number;
  notes: string | null;
}

export async function getChefOrderGuide(orderGuideId: string): Promise<ApiResponse<OrderGuideResponse>> {
  return fetchWithGuest(`/api/v1/chef/order_guides/${orderGuideId}`);
}

export async function updateOrderGuideItem(
  orderGuideId: string,
  itemId: string,
  updates: { quantity?: number; par?: number; notes?: string }
): Promise<ApiResponse<OrderGuideItemResponse>> {
  return fetchWithGuest(`/api/v1/chef/order_guides/${orderGuideId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// ============================================================
// Chef Impersonation (QM Admin only)
// ============================================================

export interface ChefImpersonationResponse {
  token: string;
  event_id: string;
  chef: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

export interface ExitImpersonationResponse {
  message: string;
  event_id: string;
  ended_at: string;
}

/**
 * Step into a chef account for debugging.
 * Returns a 1-hour JWT for the chef account plus the audit event_id.
 * Session TTL: 1 hour (judgment call, flagged for retro).
 */
export async function impersonateChef(
  chefId: string,
  reasonText?: string
): Promise<ApiResponse<ChefImpersonationResponse>> {
  return fetchWithAuth<ChefImpersonationResponse>(`/api/v1/admin/impersonate_chef/${chefId}`, {
    method: 'POST',
    body: JSON.stringify({ reason_text: reasonText }),
  });
}

/**
 * Close the active impersonation session.
 * The admin's original token must be restored client-side from localStorage.
 */
export async function exitImpersonation(): Promise<ApiResponse<ExitImpersonationResponse>> {
  return fetchWithAuth<ExitImpersonationResponse>('/api/v1/admin/exit_impersonation', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
