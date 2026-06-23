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
  // Brand users: the brand block from GET /api/v1/me
  brand?: {
    id: string;
    name: string;
    category?: string;
  } | null;
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
  brand_name?: string;
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
// Track 22: async response — POST returns immediately with quote_id + "processing" status.
// Pipeline runs in GuestMenuProcessingJob; ChefStatusPage polls processing_stage.
export interface GuestQuoteCreateResponse {
  quote_id: string;
  status: 'processing';
}

/** Legacy sync response shape — kept for reference; no longer returned by the guest path */
export interface GuestQuoteCreateResponseLegacy {
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
  /** Track 22: real pipeline stage written by GuestMenuProcessingJob. Values:
   * extracting_dishes | aligning_products | building_quote | complete | failed | null */
  processing_stage?: string | null;
  /** J1 document-state machine: preview | distributor_quote | confirmed | accepted | declined | expired. Drives D6 QuoteStateDocument chrome. */
  state?: string | null;
  /** rep-flow quote type: standard | preview | confirmed | guest_quote | buyer_quote. 'confirmed' locks chef actions. */
  quote_type?: string | null;
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
  distributor?: { id: string; name: string } | null;
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
        error_code: errorData.error,
        error_data: errorData,
        status: response.status,
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


// ── Rep Profile ──────────────────────────────────────────────────────────────

export interface RepProfileData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string | null;
  is_active: boolean | null;
  distributor: { id: string; name: string } | null;
}

export interface UpdateRepProfilePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export async function getRepProfile(): Promise<ApiResponse<RepProfileData>> {
  return fetchWithAuth('/api/v1/rep/profile');
}

export async function updateRepProfile(
  payload: UpdateRepProfilePayload
): Promise<ApiResponse<RepProfileData>> {
  return fetchWithAuth('/api/v1/rep/profile', {
    method: 'PATCH',
    body: JSON.stringify({ profile: payload }),
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

// Records the chef's "email me when the quote is ready" request against the
// quote. The backend stores the address and, if the quote is already resolved,
// sends the email immediately; otherwise the processing job sends it on
// completion (race-safe, once-only). Mirrors the guest X-Guest-Token auth.
export async function notifyGuestQuoteByEmail(
  id: string,
  email: string,
): Promise<ApiResponse<{ status: string; resolved: boolean; email_sent: boolean }>> {
  return fetchWithGuest(`/api/v1/guest/quotes/${id}/notify_email`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
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

/** PATCH /api/v1/distributor_admin/settings — update distributor_admin org settings (e.g. name). */
export async function updateDistributorAdminSettings(
  params: { name?: string }
): Promise<ApiResponse<{ name?: string }>> {
  return fetchWithAuth('/api/v1/distributor_admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(params),
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
  is_admin?: boolean;
  status: 'active' | 'deactivated' | 'invited';
  created_at: string;
  last_activity_at: string | null;
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

export interface ImpersonateRepResponse {
  token: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

/** POST /api/v1/distributor_admin/reps/:id/impersonate — generate a JWT for a rep. */
export async function impersonateRep(repProfileId: string): Promise<ApiResponse<ImpersonateRepResponse>> {
  return fetchWithAuth<ImpersonateRepResponse>(`/api/v1/distributor_admin/reps/${repProfileId}/impersonate`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** DELETE /api/v1/distributor_admin/reps/invitations/:id — cancel a pending rep invite. */
export async function cancelRepInvite(inviteId: string): Promise<ApiResponse<null>> {
  return fetchWithAuth<null>(`/api/v1/distributor_admin/reps/invitations/${inviteId}`, {
    method: 'DELETE',
  });
}

/** POST /api/v1/distributor_admin/reps/invitations/:id/resend — invalidate prior token and issue a fresh invite. */
export async function resendRepInvite(inviteId: string): Promise<ApiResponse<{ invite: { id: string; email: string; name: string | null; territory: string | null; status: string; expires_at: string; created_at: string }; message: string }>> {
  return fetchWithAuth(`/api/v1/distributor_admin/reps/invitations/${inviteId}/resend`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** PATCH /api/v1/distributor_admin/reps/:id/disable — deactivate a rep (idempotent). */
export async function disableRep(repProfileId: string): Promise<ApiResponse<DistributorRep>> {
  return fetchWithAuth<DistributorRep>(`/api/v1/distributor_admin/reps/${repProfileId}/disable`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

// ============= DISTRIBUTOR ADMIN BILLING =============

export interface DistributorAdminBillingRep {
  id: string;
  name: string;
  quotes_used: number;
  quota: number;
  quota_reached: boolean;
}

export interface DistributorAdminBilling {
  seat_count: number;
  price_per_seat_dollars: number;
  monthly_total_dollars: number;
  free_quota_per_rep: number;
  bonus_free_quotes: number;
  effective_quota: number;
  reps: DistributorAdminBillingRep[];
}

export async function getDistributorAdminBilling(): Promise<ApiResponse<DistributorAdminBilling>> {
  return fetchWithAuth('/api/v1/distributor_admin/billing');
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

// ── Command Center ──

export interface RepActivityRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  quotes_created: number;
  quotes_sent: number;
  quotes_accepted: number;
  last_activity_at: string | null;
}

export async function getCommandCenterRepActivity(): Promise<ApiResponse<RepActivityRow[]>> {
  return fetchWithAuth('/api/v1/distributor_admin/command_center/rep_activity');
}

// ── Command Center: Quotes ledger (B2-CC) ──

export type CCQuoteStatus = 'accepted' | 'pending' | 'sent' | 'unassigned';

export interface CCRepSummary {
  id: string;
  name: string;
  initials: string;
}

export interface CCQuoteRow {
  id: string;
  rep: CCRepSummary | null;
  restaurant: string;
  city: string;
  status: CCQuoteStatus;
  sent: string;        // display string, e.g. "May 30"
  items: number;
  total: number | null; // null when unassigned/unpriced
  requote: number;      // times re-quoted; 0 = never
  wait: number;         // days chef sitting on it
}

export interface CCQuoteFilters {
  repId?: string;
  status?: CCQuoteStatus | 'all';
  range?: 'week' | 'month';
}

export async function getCommandCenterQuotes(
  filters: CCQuoteFilters = {}
): Promise<ApiResponse<CCQuoteRow[]>> {
  const params = new URLSearchParams();
  if (filters.repId && filters.repId !== 'all') params.set('rep_id', filters.repId);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.range) params.set('range', filters.range);
  const qs = params.toString();
  return fetchWithAuth(
    `/api/v1/distributor_admin/command_center/quotes${qs ? `?${qs}` : ''}`
  );
}

// ── Command Center: Single quote detail (B2-CC) ──

export interface CCLineItem {
  id: string;
  name: string;
  pack: string;
  note?: string;
  qty: number;
  unit: number; // unit price
}

export interface CCLineGroup {
  cat: string;
  items: CCLineItem[];
}

export interface CCRequoteEvent {
  event: 'sent' | 'requoted' | 'accepted' | 'pending';
  label: string;
  date?: string;
}

export interface CCQuoteDetail {
  id: string;
  rep: CCRepSummary | null;
  restaurant: string;
  city: string;
  status: CCQuoteStatus;
  sent: string;
  items: number;
  total: number | null;
  requote: number;
  wait: number;
  requote_trail: CCRequoteEvent[];
  line_groups: CCLineGroup[];
}

export async function getCommandCenterQuote(
  quoteId: string
): Promise<ApiResponse<CCQuoteDetail>> {
  return fetchWithAuth(
    `/api/v1/distributor_admin/command_center/quotes/${encodeURIComponent(quoteId)}`
  );
}

// ── Command Center — Assignment Center (Section 4) ──────────────────────────

export interface CCUnassignedRep {
  id: string;
  name: string;
  initials: string;
  /** Count of currently open quotes — used for load-balancing display only, never ranking. */
  open: number;
  /** Human-readable "when last quote was sent", e.g. "May 28" or "3 days ago". */
  last: string;
}

export interface CCUnassignedItem {
  /** 'quote' rows are assigned via PATCH /quotes/:id/assign.
   *  'relationship' rows are assigned via PATCH /restaurants/:id/assign_rep.
   *  For 'relationship' rows, `id` is the restaurant id.
   */
  kind: 'quote' | 'relationship';
  /** For 'quote': quote identifier e.g. "Q-1234". For 'relationship': restaurant id. */
  id: string;
  restaurant: string;
  city: string;
  /** Present when kind='quote': formatted quote label, e.g. "Q-1034". */
  q_label?: string;
  /** Present when kind='quote': item count. */
  items?: number;
  /** Present when kind='relationship': human-readable age string, e.g. "came in 4 days ago". */
  age?: string;
}

export interface CCUnassignedResponse {
  items: CCUnassignedItem[];
  reps: CCUnassignedRep[];
}

/** GET /api/v1/distributor_admin/command_center/unassigned
 *  Returns unassigned items (quotes + ownerless inbound) and rep roster sorted by open load ascending.
 */
export async function getCommandCenterUnassigned(): Promise<ApiResponse<CCUnassignedResponse>> {
  return fetchWithAuth('/api/v1/distributor_admin/command_center/unassigned');
}

/** PATCH /api/v1/distributor_admin/quotes/:id/assign
 *  Assigns (or unassigns when repId is null) a quote to a rep.
 *  Used for CCUnassignedItem rows where kind='quote'.
 */
export async function assignQuote(
  quoteId: string,
  repId: string | null
): Promise<ApiResponse<{ ok: boolean }>> {
  return fetchWithAuth(`/api/v1/distributor_admin/quotes/${encodeURIComponent(quoteId)}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ rep_id: repId }),
  });
}

/** PATCH /api/v1/distributor_admin/restaurants/:id/assign_rep
 *  Assigns (or unassigns when repId is null) a restaurant relationship to a rep.
 *  Used for CCUnassignedItem rows where kind='relationship' (id is the restaurant id).
 */
export async function assignRestaurantRep(
  restaurantId: string,
  repId: string | null
): Promise<ApiResponse<{ ok: boolean }>> {
  return fetchWithAuth(
    `/api/v1/distributor_admin/restaurants/${encodeURIComponent(restaurantId)}/assign_rep`,
    {
      method: 'PATCH',
      body: JSON.stringify({ rep_id: repId }),
    }
  );
}

// ── Command Center: Global Search (B2-CC Sec6) ──────────────────────────────
// GET /api/v1/distributor_admin/command_center/search?q=<term>
// Three result groups: restaurants, reps, quotes. No inside_sales group.

export interface CCSearchRestaurant {
  id: string;
  name: string;
  quote_count: number;
  owner_name: string | null;
  first_quote_id: string | null;
}

export interface CCSearchRep {
  id: string;
  name: string;
  initials: string;
  open: number;
  last: string;
}

export interface CCSearchQuote {
  id: string;
  restaurant: string;
  q_label: string;
  rep_name: string | null;
  sent: string;
  items: number;
  status: CCQuoteStatus;
}

export interface CCSearchResults {
  restaurants: CCSearchRestaurant[];
  reps: CCSearchRep[];
  quotes: CCSearchQuote[];
}

export async function getCommandCenterSearch(
  q: string
): Promise<ApiResponse<CCSearchResults>> {
  return fetchWithAuth(
    `/api/v1/distributor_admin/command_center/search?q=${encodeURIComponent(q)}`
  );
}

// ── Command Center: Inbound Routing (B2-Surface1) ────────────────────────────
// Unified feed of inbound opportunities + quotes awaiting rep assignment/action.
// Admin view: GET /api/v1/distributor_admin/command_center/inbound
// Each row may be kind='opportunity' (inbound_opportunity) or kind='quote'.

/** Unified inbound row returned by GET /api/v1/distributor_admin/command_center/inbound */
export interface InboundRow {
  kind: 'opportunity' | 'quote';
  id: string;
  /** Internal source code, e.g. 'website', 'referral', 'manual', 'chef_request'. */
  source: string | null;
  /** Human-readable source label, e.g. "Website", "Chef request". */
  source_label: string | null;
  /** Payload type, e.g. 'menu_upload', 'quote_request'. */
  payload_type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  restaurant_name: string | null;
  status: string | null;
  /** Rep currently assigned to this row, if any. */
  assigned_rep: { id: string; name: string } | null;
  /** How many calendar days since this row was created. */
  age_days: number;
  /** ISO 8601 timestamp when this row was received. Preferred over age_days for date display. */
  received_at?: string | null;
  /** The downstream artifact this row is associated with (quote, opportunity, etc.). */
  artifact: { type: string; id: string; name: string | null } | null;
}

/** GET /api/v1/distributor_admin/command_center/inbound
 *  Returns the unified inbound feed (opportunities + quotes) for the distributor.
 *  Pass an optional `status` string to filter by status.
 */
export async function getCommandCenterInbound(
  status?: string
): Promise<ApiResponse<InboundRow[]>> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return fetchWithAuth(`/api/v1/distributor_admin/command_center/inbound${qs}`);
}

/** POST /api/v1/distributor_admin/inbound_opportunities/:id/assign
 *  Assigns an inbound_opportunity row to a rep by user_id.
 *  Returns the updated InboundRow on success.
 *  Returns 409 with { error } when the opportunity is already owned by a different rep —
 *  the error message is surfaced in ApiResponse.error so callers can display the guard inline.
 */
export async function assignInboundOpportunity(
  opportunityId: string,
  repId: string
): Promise<ApiResponse<InboundRow>> {
  return fetchWithAuth(
    `/api/v1/distributor_admin/inbound_opportunities/${encodeURIComponent(opportunityId)}/assign`,
    {
      method: 'POST',
      body: JSON.stringify({ rep_id: repId }),
    }
  );
}

/** Returns the authenticated PDF URL for a quote (opens in new tab).
 *  The caller is responsible for opening it: window.open(quotePdfUrl(id), '_blank').
 */
export function quotePdfUrl(id: string): string {
  return `${API_BASE_URL}/api/v1/quotes/${id}/pdf`;
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

// GET /api/v1/chef/quotes/:id — chef-authed show endpoint.
// Replaces getGuestQuote on ChefQuoteReceiptPage when a Bearer token is
// present (authenticated chef session). Uses fetchWithGuest so both the
// Authorization Bearer AND any residual X-Guest-Token are forwarded;
// the BE Chef::BaseController prefers chef identity when both arrive.
export async function getChefQuote(id: string): Promise<ApiResponse<QuoteResponse>> {
  return fetchWithGuest(`/api/v1/chef/quotes/${id}`);
}

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
//
// SU-FE-1 (Wave 3): extended with catalog-state fields for the request-catalog
// callout. The BE serialize_distributor method needs to be updated to include
// these fields; until then they will be undefined/null and the callout will
// not render (graceful degradation).
//   catalog_state: 'no_catalog' | 'provisional' | 'needs_confirmation' | 'verified' | ...
//   drop_status:   'requested' | 'uploading' | 'loading' | 'live' | null
//   rep_first:     rep first name for callout copy (e.g. "Marcus")
//   catalog_held_from: human-readable date string (e.g. "Feb 3, 2026") or null
export interface ChefDistributorSummary {
  id: string;
  name: string;
  status: string;
  /** SU-FE-1: catalog state key. Drives request-catalog callout visibility. */
  catalog_state?: string | null;
  /** SU-FE-1: active drop-zone status (null if no ask has been made). */
  drop_status?: string | null;
  /** SU-FE-1: rep first name for callout copy interpolation. */
  rep_first?: string | null;
  /** SU-FE-1: human-readable date of the catalog we currently hold (e.g. "Feb 3, 2026"). */
  catalog_held_from?: string | null;
}

export interface ChefDistributorsResponse {
  primary_distributor_id: string | null;
  distributors: ChefDistributorSummary[];
  /** USPS state code of the chef's restaurant; null if not set. */
  chef_state: string | null;
  /** True when the returned distributor list has been filtered to those serving chef_state. */
  geo_filtered: boolean;
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
  /** J1 document-state machine: preview | distributor_quote | confirmed | accepted | declined | expired */
  state: string | null;
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

// ─── Chef Order Guides index ──────────────────────────────────────────────────
// GET /api/v1/chef/order_guides — dedicated index endpoint (OG PR-C BE).
// Returns a flat list of the chef's order guides scoped by their restaurant
// contacts, one row per order guide. Replaces the client-side filter that
// previously synthesised this list from the quotes payload.

export interface ChefOrderGuideRow {
  id: string;
  quote_id: string;
  distributor_id: string | null;
  distributor_name: string | null;
  status: string;
  created_at: string;
  items_count: number;
}

export async function getChefOrderGuides(): Promise<ApiResponse<ChefOrderGuideRow[]>> {
  return fetchWithGuest('/api/v1/chef/order_guides');
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

// ============================================================
// Chef Menus Library  (Track C — BE not yet live)
// Endpoints: GET /api/v1/chef/menus
//            GET /api/v1/chef/menus/:id
//            PATCH /api/v1/chef/menus/:id  (rename)
//            DELETE /api/v1/chef/menus/:id
// ============================================================

/** One row in the menus index. Canonical shape — Pull-quote flow consumes this too. */
export interface ChefMenuRow {
  id: string;
  name: string;
  item_count: number;
  /** ISO datetime of the most recent quote derived from this menu. Null for draft menus. */
  last_quoted_at: string | null;
  quote_count: number;
  created_at: string;
  updated_at: string;
  /** How this menu entered the system. BE returns since Track C source-type migration. */
  source_type?: string | null;
  /** Structural category (e.g. "dinner", "prix_fixe"). Optional. */
  menu_type?: string | null;
  /** Original URL if scraped or imported from a public source. */
  source_url?: string | null;
  /** Role of the user who uploaded/created this menu (e.g. "chef", "rep"). */
  uploaded_by_role?: string | null;
}

export interface ChefMenusIndexResponse {
  menus: ChefMenuRow[];
  count: number;
}

/** Distributor entry in the menu detail history block. */
export interface ChefMenuDistributorHistory {
  distributor_id: string;
  distributor_name: string;
  /** ISO datetime of the most recent quote for this distributor. */
  last_quoted_at: string;
  /** Total quoted value across all quotes for this distributor (cents). */
  total_cents: number;
  quote_count: number;
}

/** Full menu document response. */
export interface ChefMenuDetail {
  id: string;
  name: string;
  item_count: number;
  last_quoted_at: string | null;
  quote_count: number;
  created_at: string;
  updated_at: string;
  /** The raw menu items / components stored on this saved menu. */
  items: ChefMenuItemDetail[];
  /** Distributor history — the moat surface. */
  distributor_history: ChefMenuDistributorHistory[];
}

export interface ChefMenuItemDetail {
  id: string;
  name: string;
  category: string | null;
  source_dish: string | null;
}

// ============================================================
// Pull-Quote flow (chef pulls a quote against a chosen distributor)
// ============================================================

// Distributor context returned on pull-quote responses.
export interface PullQuoteDistributor {
  id: string;
  name: string;
  /** True when the chef has a DistributorRestaurantRelationship with an active rep */
  affiliated: boolean;
  catalog_item_count?: number | null;
  catalog_refreshed_at?: string | null;
  rep?: {
    name: string;
    first_name?: string | null;
    email: string;
  } | null;
}

// Pull-quote create request
export interface PullQuoteCreateRequest {
  /** Either menu_id (saved menu) or raw_text (paste) must be present */
  menu_id?: string;
  raw_text?: string;
  distributor_id: string;
  restaurant_name?: string;
  /** c151-E: rep capture for chef-initiated pull quotes. Required at the form
   * level; routed through ChefQuoteNotificationService (C4c) and
   * ChefRepAutoCreateService (C4d), dedup keyed on rep_email. */
  rep_name?: string;
  rep_email?: string;
}

// Pull-quote create response
// BE (Api::V1::Chef::PullQuotesController#create) returns { quote_id, status, ... }
export interface PullQuoteCreateResponse {
  quote_id: string;
  status: string;
}

// Pull-quote status/show response
export interface PullQuoteResponse {
  id: string;
  status: string;
  /** J1 document-state machine — drives D6 QuoteStateDocument chrome. */
  state?: string | null;
  created_at: string;
  distributor: PullQuoteDistributor;
  restaurant?: string | null;
  lines?: QuoteLineResponse[];
  item_count?: number;
  total_cents?: number;
  total?: string;
  share_url?: string | null;
}

export async function getChefMenus(): Promise<ApiResponse<ChefMenusIndexResponse>> {
  return fetchWithGuest('/api/v1/chef/menus');
}

export async function getChefMenu(menuId: string): Promise<ApiResponse<ChefMenuDetail>> {
  return fetchWithGuest(`/api/v1/chef/menus/${menuId}`);
}

export async function renameChefMenu(
  menuId: string,
  name: string
): Promise<ApiResponse<ChefMenuRow>> {
  return fetchWithGuest(`/api/v1/chef/menus/${menuId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function deleteChefMenu(menuId: string): Promise<ApiResponse<{ success: boolean }>> {
  return fetchWithGuest(`/api/v1/chef/menus/${menuId}`, {
    method: 'DELETE',
  });
}

export async function createPullQuote(
  data: PullQuoteCreateRequest,
): Promise<ApiResponse<PullQuoteCreateResponse>> {
  return fetchWithGuest('/api/v1/chef/pull_quotes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPullQuote(id: string): Promise<ApiResponse<PullQuoteResponse>> {
  return fetchWithGuest(`/api/v1/chef/pull_quotes/${id}`);
}

// ─── Chef distributor entry ────────────────────────────────────────────────

export interface ChefDistributorRepContact {
  existing_rep_id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface ChefDistributorCreateRequest {
  mode: 'pick' | 'upload' | 'request';
  distributor_id?: string;
  distributor_company_name?: string;
  rep_name?: string;
  rep_contact?: ChefDistributorRepContact;
  request_message?: string;
}

export interface ChefDistributorCreateResponse {
  distributor_id: string;
  catalog_id?: string;
  redirect_to: string;
  request_sent_to?: string;
}

/**
 * POST /api/v1/chef/distributors
 * mode "pick" / "request" → JSON body
 * mode "upload" → multipart FormData (catalog_file + JSON fields)
 */
export async function createChefDistributor(
  data: ChefDistributorCreateRequest,
  catalogFile?: File,
): Promise<ApiResponse<ChefDistributorCreateResponse>> {
  const authToken = getAuthToken();
  const guestToken = getGuestToken();
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  } else if (guestToken) {
    headers['X-Guest-Token'] = guestToken;
  }

  if (catalogFile) {
    // multipart upload
    const form = new FormData();
    form.append('mode', data.mode);
    if (data.distributor_company_name) {
      form.append('distributor_company_name', data.distributor_company_name);
    }
    if (data.rep_contact) {
      form.append('rep_contact', JSON.stringify(data.rep_contact));
    }
    form.append('catalog_file', catalogFile);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/chef/distributors`, {
        method: 'POST',
        headers,
        body: form,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.error || `HTTP ${response.status}`, status: response.status };
      }
      const responseData = await response.json();
      return { data: responseData };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  // JSON body for pick / request
  headers['Content-Type'] = 'application/json';
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/chef/distributors`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `HTTP ${response.status}`, status: response.status };
    }
    const responseData = await response.json();
    return { data: responseData };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rep API — magic-link + quote endpoints (feat/rep-suite-fe).
// ─────────────────────────────────────────────────────────────────────────────

// Shape of a quote row in the rep triage queue.
export interface RepIncomingQuote {
  id: string;
  label: string;
  state: string;
  /** 'ready' | 'review' | 'coverage' */
  match_state: 'ready' | 'review' | 'coverage';
  missing_count?: number;
  chef_first: string;
  chef_last: string;
  restaurant: string;
  city?: string | null;
  item_count: number;
  waiting_hours?: number;
  sent_at?: string | null;
  priced_count?: number;
  total_count?: number;
  confirmed?: boolean;
  confirmed_at?: string | null;
  /** When non-null, no lines exist yet — this is Request mode. */
  chef_request_message?: string | null;
}

// Consume response for a rep magic-link.
export interface RepMagicLinkConsumeResponse {
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
    item_count: number;
    match_state: 'ready' | 'review' | 'coverage';
    missing_count?: number;
    restaurant: string;
    city?: string | null;
    chef_first: string;
    chef_last: string;
    sent_at?: string | null;
    waiting_hours?: number;
  };
  distributor_name: string;
  /** Absolute path to redirect to after JWT is stored, e.g. "/rep/quotes/{id}" */
  redirect_to: string;
}

// Rep pricing line input.
export interface RepPricingLine {
  id: string;
  unit_price_cents: number;
}

/**
 * consumeRepMagicLink — POST /api/v1/rep/magic_links/consume
 *
 * Unauthenticated by design (same pattern as consumeChefMagicLink). The token
 * from the URL IS the credential. Returns a JWT + envelope payload.
 */
export async function consumeRepMagicLink(
  token: string,
): Promise<ApiResponse<RepMagicLinkConsumeResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/rep/magic_links/consume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      return {
        error: errorBody.error || `HTTP ${response.status}`,
        error_code: errorBody.error,
        data: undefined,
      };
    }
    const data: RepMagicLinkConsumeResponse = await response.json();
    return { data, token: data.jwt };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error', data: undefined };
  }
}

/**
 * getRepIncomingQuotes — GET /api/v1/rep/quotes (Bearer auth)
 *
 * Returns all quotes in the rep's triage queue ordered by urgency.
 */
export async function getRepIncomingQuotes(): Promise<ApiResponse<RepIncomingQuote[]>> {
  return fetchWithAuth<RepIncomingQuote[]>('/api/v1/rep/quotes');
}

/**
 * getRepInbound — GET /api/v1/rep/inbound (Bearer auth)
 *
 * Rep-scoped inbound slice: opportunities assigned to this rep + their own
 * cold_landing/outbound quotes. Unified InboundRow shape (kind discriminator).
 */
export async function getRepInbound(): Promise<ApiResponse<InboundRow[]>> {
  return fetchWithAuth<InboundRow[]>('/api/v1/rep/inbound');
}

/**
 * getRepQuote — GET /api/v1/rep/quotes/:id (Bearer auth)
 *
 * Returns the full quote document for the rep to review/price.
 */
export async function getRepQuote(id: string): Promise<ApiResponse<QuoteResponse>> {
  return fetchWithAuth<QuoteResponse>(`/api/v1/rep/quotes/${id}`);
}

/**
 * repPriceQuote — POST /api/v1/rep/quotes/:id/pricing (Bearer auth)
 *
 * Submits rep prices for one or more lines. Optionally removes lines by id.
 * Returns the updated quote.
 */
export async function repPriceQuote(
  id: string,
  lines: RepPricingLine[],
  removeLineIds: string[] = [],
): Promise<ApiResponse<QuoteResponse>> {
  return fetchWithAuth<QuoteResponse>(`/api/v1/rep/quotes/${id}/pricing`, {
    method: 'POST',
    body: JSON.stringify({ lines, remove_line_ids: removeLineIds }),
  });
}

/**
 * repConfirmQuote — POST /api/v1/rep/quotes/:id/confirm (Bearer auth)
 *
 * Marks the quote as confirmed and emails the chef a copy.
 * Returns the updated quote.
 */
export async function repConfirmQuote(id: string): Promise<ApiResponse<QuoteResponse>> {
  return fetchWithAuth<QuoteResponse>(`/api/v1/rep/quotes/${id}/confirm`, {
    method: 'POST',
  });
}

// ─── Rep customers ────────────────────────────────────────────────────────────

/**
 * RepCustomer — one restaurant in the rep's customer list.
 *
 * TODO (BE): wire to GET /api/v1/rep/customers once the endpoint is built.
 * The BE controller does not exist yet; this type and function are stubs
 * that will be activated when the endpoint lands.
 */
export interface RepCustomer {
  id: string;
  name: string;
  city?: string;
  state?: string;
  /** ISO datetime of most recent confirmed quote */
  last_quote_at?: string | null;
  /** Total number of quotes sent to this restaurant */
  quote_count?: number;
}

/**
 * getRepCustomers — GET /api/v1/rep/customers (Bearer auth)
 *
 * TODO (BE): endpoint not yet implemented. Returns 404 until the BE lands.
 * Card 11 renders empty state when this call fails or returns [].
 */
export async function getRepCustomers(): Promise<ApiResponse<RepCustomer[]>> {
  return fetchWithAuth<RepCustomer[]>('/api/v1/rep/customers');
}

// ─── B3b: Chef Distributor Detail ────────────────────────────────────────────
// GET /api/v1/chef/distributors/:id
// Returns distributor detail + rep (single) + catalogs + recent_quote.
// Composed from Chef::DistributorsController#show.

export interface ChefDistributorDetailRep {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface ChefDistributorDetailCatalog {
  id: string;
  distributor_id: string;
  status: string;
  is_demo: boolean;
  sku_count: number;
  catalog_state?: string | null;
  created_at: string;
}

export interface ChefDistributorDetailRecentQuote {
  id: string;
  status: string;
  created_at: string;
}

export interface ChefDistributorDetail {
  id: string;
  name: string;
  status: string;
  rep: ChefDistributorDetailRep | null;
  catalogs: ChefDistributorDetailCatalog[];
  recent_quote: ChefDistributorDetailRecentQuote | null;
}

export async function getChefDistributorDetail(id: string): Promise<ApiResponse<ChefDistributorDetail>> {
  return fetchWithGuest(`/api/v1/chef/distributors/${id}`);
}

// POST /api/v1/chef/catalog_upload_links (BE-3 Sacred Orange CTA)
// Chef requests a catalog upload link for the given distributor.
// The backend resolves the primary rep and notifies them via email.
// Returns { token, url, expires_at }.

export interface CatalogUploadLinkResponse {
  token: string;
  url: string;
  expires_at: string;
}

export async function requestCatalogUploadLink(distributorId: string): Promise<ApiResponse<CatalogUploadLinkResponse>> {
  return fetchWithGuest(`/api/v1/chef/catalog_upload_links`, {
    method: 'POST',
    body: JSON.stringify({ distributor_id: distributorId }),
  });
}

// ─── Chef Restaurant settings (Q-Settings-1 + Q-Settings-5) ──────────────────
// GET  /api/v1/chef/restaurant       → show  (BE PR #69, merged)
// PATCH /api/v1/chef/restaurant      → update (BE PR #69, merged)
//
// Context-selector: ?restaurant_id=<uuid> on both endpoints.
// Multi-restaurant chef with no context → 422 { error: "select a restaurant..." }
// Restaurant not in chef scope → 404 { error: "No restaurant found..." }

export interface ChefRestaurant {
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
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChefRestaurantShape {
  restaurant: ChefRestaurant | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  };
}

/** GET /api/v1/chef/restaurant — returns the chef's current restaurant + user. */
export async function getChefRestaurant(restaurantId?: string): Promise<ApiResponse<ChefRestaurantShape>> {
  const query = restaurantId ? `?restaurant_id=${restaurantId}` : '';
  return fetchWithGuest<ChefRestaurantShape>(`/api/v1/chef/restaurant${query}`);
}

/** PATCH /api/v1/chef/restaurant — update editable restaurant fields. */
export async function updateChefRestaurant(
  payload: Partial<Pick<ChefRestaurant, 'name' | 'address_line_1' | 'address_line_2' | 'city' | 'state' | 'zip' | 'phone' | 'website'>>,
  restaurantId?: string
): Promise<ApiResponse<ChefRestaurantShape>> {
  const query = restaurantId ? `?restaurant_id=${restaurantId}` : '';
  return fetchWithGuest<ChefRestaurantShape>(`/api/v1/chef/restaurant${query}`, {
    method: 'PATCH',
    body: JSON.stringify({ restaurant: payload }),
  });
}

// ─── Chef Restaurant Logo (Gap 2) ─────────────────────────────────────────────
// POST   /api/v1/chef/restaurant/logo  → multipart logo field; returns updated restaurant
// DELETE /api/v1/chef/restaurant/logo  → purges; returns updated restaurant
//
// Both accept ?restaurant_id= context selector (Q-Settings-1 pattern).
// Accepted types: image/jpeg, image/png, image/webp — max 5 MB.
// On invalid type/size → 422 with errors[].
// Multipart: cannot use fetchWithGuest (hardcodes Content-Type: application/json).
// Mirrors uploadCatalogFile pattern — manual fetch with Bearer + X-Guest-Token headers.

/** POST /api/v1/chef/restaurant/logo — attaches a logo image. */
export async function uploadChefRestaurantLogo(
  file: File,
  restaurantId?: string
): Promise<ApiResponse<ChefRestaurant>> {
  const authToken = getAuthToken();
  const guestToken = getGuestToken();
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (guestToken) headers['X-Guest-Token'] = guestToken;

  const query = restaurantId ? `?restaurant_id=${restaurantId}` : '';
  const formData = new FormData();
  formData.append('logo', file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/chef/restaurant/logo${query}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: (errorData.errors && errorData.errors[0]) || errorData.error || `HTTP ${response.status}`,
        error_data: errorData,
        status: response.status,
      };
    }
    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

/** DELETE /api/v1/chef/restaurant/logo — removes the attached logo. No-op (200) when no logo. */
export async function deleteChefRestaurantLogo(
  restaurantId?: string
): Promise<ApiResponse<ChefRestaurant>> {
  const authToken = getAuthToken();
  const guestToken = getGuestToken();
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (guestToken) headers['X-Guest-Token'] = guestToken;

  const query = restaurantId ? `?restaurant_id=${restaurantId}` : '';

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/chef/restaurant/logo${query}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.error || `HTTP ${response.status}`,
        error_data: errorData,
        status: response.status,
      };
    }
    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// ─── Chef Team Members (Gap 3, BE PR #73 merged) ──────────────────────────────
// GET    /api/v1/chef/team_members?restaurant_id=<uuid>  → list, ordered is_primary DESC, created_at ASC
// POST   /api/v1/chef/team_members                       → create; body { team_member: { first_name, last_name, email, phone, role } }
// DELETE /api/v1/chef/team_members/:id                  → remove; 422 if self-removal
//
// Q-Settings-1 context-selector: ?restaurant_id=<uuid> on GET.
// Multi-restaurant chef with no context → 422 { error: "..." }. Matches W2-1 pattern.
// Serializer: { id, first_name, last_name, name (computed), email, phone, role, is_primary, user_id }
//
// D-3 Desi Lock: STOP AT THE FORM. No invite-send / magic-link flow (V2, Q-Settings-3).

export interface ChefTeamMember {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
  user_id: string | null;
}

/** GET /api/v1/chef/team_members — list team members for the current restaurant context. */
export async function getChefTeamMembers(restaurantId?: string): Promise<ApiResponse<ChefTeamMember[]>> {
  const query = restaurantId ? `?restaurant_id=${restaurantId}` : '';
  return fetchWithGuest<ChefTeamMember[]>(`/api/v1/chef/team_members${query}`);
}

/** POST /api/v1/chef/team_members — add a team member. */
export async function createChefTeamMember(
  payload: Partial<ChefTeamMember>,
  restaurantId?: string
): Promise<ApiResponse<ChefTeamMember>> {
  const query = restaurantId ? `?restaurant_id=${restaurantId}` : '';
  return fetchWithGuest<ChefTeamMember>(`/api/v1/chef/team_members${query}`, {
    method: 'POST',
    body: JSON.stringify({ team_member: payload }),
  });
}

/** DELETE /api/v1/chef/team_members/:id — remove a team member. 422 if self-removal. */
export async function deleteChefTeamMember(
  id: string,
  restaurantId?: string
): Promise<ApiResponse<void>> {
  const query = restaurantId ? `?restaurant_id=${restaurantId}` : '';
  return fetchWithGuest<void>(`/api/v1/chef/team_members/${id}${query}`, {
    method: 'DELETE',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Rep Invite Consume — public / unauthenticated (LAUNCH-B1 FE-1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shape of a successful consume response from POST /api/v1/rep_invitations/:token/consume.
 *
 * 201 Created — new user was created and linked.
 * 200 OK      — existing rep user re-linked to the distributor.
 *
 * Error codes (non-2xx):
 *   not_found        — token does not exist (404)
 *   expired          — invite past expires_at (410)
 *   consumed         — invite already stamped consumed_at (410)
 *   password_required — new-user path, no password in body (422)
 *   role_conflict    — email belongs to a non-rep account (422)
 *   record_invalid   — ActiveRecord::RecordInvalid on save (422)
 */
export interface RepInviteConsumeResponse {
  jwt: string;
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    status: string;
    distributor: {
      id: string;
      name: string;
    } | null;
  };
  /** Absolute path returned by the BE; typically "/rep/welcome". */
  redirect_to: string;
}

/**
 * consumeRepInvitation — POST /api/v1/rep_invitations/:token/consume
 *
 * Unauthenticated by design — the token in the URL IS the credential.
 * Password is required when the email has no existing account yet; for
 * existing rep users being re-linked, the BE accepts a consume without
 * a password (but the FE always collects one for safety).
 */
// ─── Chef Stack API ───────────────────────────────────────────────────────────
// BE: GET /api/v1/chef/stack  (Chef::StacksController#show)
// Returns the chef's Stack with pinned distributors.
// A per-menu product compare-spread endpoint does not exist yet (STACK-FE-1
// uses demo data per Desi's canonical .jsx); this type covers the stack roster
// so the compare-spread page can fetch distributor names when it ships.

export interface ChefStackPin {
  id: string;
  distributor_id: string;
  distributor_name: string;
  chef_label: string | null;
  pinned_at: string;
  position: number | null;
}

export interface ChefStackResponse {
  id: string;
  name: string;
  status: string;
  location_id: string;
  pins: ChefStackPin[];
}

export async function getChefStack(): Promise<ApiResponse<ChefStackResponse>> {
  return fetchWithAuth('/api/v1/chef/stack');
}

export async function createChefStack(): Promise<ApiResponse<ChefStackResponse>> {
  return fetchWithAuth('/api/v1/chef/stack', { method: 'POST' });
}

export async function addChefStackPin(
  distributorId: string,
  chefLabel?: string,
): Promise<ApiResponse<ChefStackPin>> {
  return fetchWithAuth('/api/v1/chef/stack/pins', {
    method: 'POST',
    body: JSON.stringify({ distributor_id: distributorId, chef_label: chefLabel }),
  });
}

export async function removeChefStackPin(pinId: string): Promise<ApiResponse<void>> {
  return fetchWithAuth(`/api/v1/chef/stack/pins/${pinId}`, { method: 'DELETE' });
}

// ─── Catalog upload link (BE-4 · public, token-is-the-credential) ─────────────
// GET  /api/v1/catalog_upload_links/:token/verify
// POST /api/v1/catalog_upload_links/:token/upload
// Neither call carries an auth header — the token in the path IS the credential.

export interface CatalogUploadLinkVerifyResponse {
  distributor_name: string;
  rep_name: string;
  expires_at: string;
}

export interface CatalogUploadLinkUploadResponse {
  status: 'delivered';
  distributor_name: string;
  rep_name: string;
}

/**
 * verifyCatalogUploadLink — GET /api/v1/catalog_upload_links/:token/verify
 *
 * Unauthenticated. Returns parsed body on 200; surfaces status + error string
 * so the caller can branch on 404 (not_found) vs 410 (expired / consumed).
 */
export async function verifyCatalogUploadLink(
  token: string,
): Promise<{ data?: CatalogUploadLinkVerifyResponse; status: number; error?: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/catalog_upload_links/${encodeURIComponent(token)}/verify`,
    );
    const status = response.status;
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: `HTTP ${status}` }));
      return { status, error: errorBody.error || `HTTP ${status}` };
    }
    const data: CatalogUploadLinkVerifyResponse = await response.json();
    return { data, status };
  } catch (err) {
    return { status: 0, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/**
 * uploadCatalogViaLink — POST /api/v1/catalog_upload_links/:token/upload
 *
 * Unauthenticated. Sends multipart/form-data with the file under field key
 * `file` (NOT `catalog_file`). Surfaces status + body so the caller can
 * branch on 200, 410, 422, or 500.
 *
 * Named `uploadCatalogViaLink` (not `uploadCatalogFile`) to distinguish from
 * the authenticated `uploadCatalogFile` (line ~945) which targets the rep's
 * own catalog management endpoint.
 */
export async function uploadCatalogViaLink(
  token: string,
  file: File,
): Promise<{ data?: CatalogUploadLinkUploadResponse; status: number; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${API_BASE_URL}/api/v1/catalog_upload_links/${encodeURIComponent(token)}/upload`,
      { method: 'POST', body: formData },
    );
    const status = response.status;
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: `HTTP ${status}` }));
      return { status, error: errorBody.error || `HTTP ${status}` };
    }
    const data: CatalogUploadLinkUploadResponse = await response.json();
    return { data, status };
  } catch (err) {
    return { status: 0, error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ─── Rep invitation ───────────────────────────────────────────────────────────

export async function consumeRepInvitation(
  token: string,
  password: string,
): Promise<ApiResponse<RepInviteConsumeResponse>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/rep_invitations/${encodeURIComponent(token)}/consume`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      },
    );
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      return {
        error: errorBody.message || errorBody.detail || errorBody.error || `HTTP ${response.status}`,
        error_code: errorBody.error,
        data: undefined,
      };
    }
    const data: RepInviteConsumeResponse = await response.json();
    return { data, token: data.jwt };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error', data: undefined };
  }
}

// ═══════════════════════════════════════════════════
// Brand API
// All endpoints under /api/v1/brand/* — Bearer JWT, role: "brand" only.
// ═══════════════════════════════════════════════════

// ── Brand Catalog ──────────────────────────────────────────────────────────

export interface BrandSampleProduct {
  id: string;
  item_number?: string | null;
  brand?: string | null;
  product: string;
  pack_size?: string | null;
  category?: string | null;
}

export interface BrandCatalogResponse {
  catalog: null | {
    id: string;
    status: string;
    catalog_state: string;
    row_count: number;
    item_count: number;
    sample_products: BrandSampleProduct[];
    brand: { id: string; name: string };
  };
}

export async function getBrandCatalog(): Promise<ApiResponse<BrandCatalogResponse>> {
  return fetchWithAuth('/api/v1/brand/catalog');
}

export async function uploadBrandCatalog(file: File): Promise<ApiResponse<{
  id: string;
  item_count: number;
  data_source: string;
  status: string;
}>> {
  const authToken = getAuthToken();
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/brand/catalogs`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { error: err.error || `HTTP ${response.status}` };
    }
    return { data: await response.json() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ── Brand Matches ──────────────────────────────────────────────────────────

export interface BrandMatchProduct {
  product_id: string;
  product_name: string;
  brand: string | null;
  pack_size: string | null;
  item_number: string | null;
}

export interface BrandMatchComponent {
  dish_component_id: string;
  name: string;
  dish_name: string;
  matches: BrandMatchProduct[];
}

export interface BrandMatchesResponse {
  components: BrandMatchComponent[];
  matched_count: number;
  total_count: number;
}

export async function getBrandMatches(menuId: string): Promise<ApiResponse<BrandMatchesResponse>> {
  return fetchWithAuth('/api/v1/brand/matches', {
    method: 'POST',
    body: JSON.stringify({ menu_id: menuId }),
  });
}

// ── Brand Packages ─────────────────────────────────────────────────────────

export interface BrandPackageSummary {
  id: string;
  title: string;
  status: 'draft' | 'sent' | 'converted' | 'dismissed';
  items_count: number;
  target_distributor: { id: string; name: string } | null;
  sent_at: string | null;
  converted_quote_id: string | null;
  created_at: string;
}

export interface BrandPackageItem {
  id: string;
  product_id: string;
  product_name: string;
  dish_component_id: string | null;
  note: string | null;
}

export interface BrandPackageDetail extends BrandPackageSummary {
  notes: string | null;
  items: BrandPackageItem[];
}

export async function getBrandPackages(): Promise<ApiResponse<BrandPackageSummary[]>> {
  return fetchWithAuth('/api/v1/brand/packages');
}

export async function getBrandPackage(id: string): Promise<ApiResponse<BrandPackageDetail>> {
  return fetchWithAuth(`/api/v1/brand/packages/${id}`);
}

export async function createBrandPackage(data: {
  title: string;
  notes?: string;
  restaurant_id?: string;
  menu_id?: string;
  items: Array<{ product_id: string; dish_component_id?: string; note?: string }>;
}): Promise<ApiResponse<BrandPackageSummary>> {
  return fetchWithAuth('/api/v1/brand/packages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sendBrandPackage(
  packageId: string,
  distributorId: string,
): Promise<ApiResponse<BrandPackageSummary>> {
  return fetchWithAuth(`/api/v1/brand/packages/${packageId}/send`, {
    method: 'POST',
    body: JSON.stringify({ distributor_id: distributorId }),
  });
}

// ── Brand Distributors ─────────────────────────────────────────────────────

export interface BrandDistributorRelationship {
  id: string;
  status: string;
  initiated_by: string;
  distributor: {
    id: string;
    name: string;
    display_name?: string | null;
    headquarters_city?: string | null;
  };
  created_at: string;
}

export interface BrandDistributorDirectory {
  id: string;
  name: string;
  headquarters_city?: string | null;
}

export interface BrandDistributorsResponse {
  relationships: BrandDistributorRelationship[];
  directory: BrandDistributorDirectory[];
}

export async function getBrandDistributors(): Promise<ApiResponse<BrandDistributorsResponse>> {
  return fetchWithAuth('/api/v1/brand/distributors');
}

export async function addBrandDistributor(distributorId: string): Promise<ApiResponse<BrandDistributorRelationship>> {
  return fetchWithAuth('/api/v1/brand/distributors', {
    method: 'POST',
    body: JSON.stringify({ distributor_id: distributorId }),
  });
}

// ── Brand Secured Upload Links (F3 brand-mint) ─────────────────────────────

export interface BrandSecuredUploadLink {
  id: string;
  token: string;
  url: string;
  expires_at: string;
  consumed_at: string | null;
  status: 'pending' | 'consumed' | 'expired';
  distributor: { id: string; name: string };
}

export async function getBrandSecuredUploadLinks(): Promise<ApiResponse<BrandSecuredUploadLink[]>> {
  return fetchWithAuth('/api/v1/brand/secured_upload_links');
}

export async function createBrandSecuredUploadLink(data: {
  distributor_id?: string;
  distributor_name?: string;
}): Promise<ApiResponse<{
  token: string;
  url: string;
  expires_at: string;
  distributor: { id: string; name: string };
}>> {
  return fetchWithAuth('/api/v1/brand/secured_upload_links', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
