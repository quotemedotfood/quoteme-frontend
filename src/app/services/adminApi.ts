const API_BASE_URL = 'https://web-production-9f6e9.up.railway.app';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

function getAuthToken(): string | null {
  return localStorage.getItem('quoteme_token');
}

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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `Request failed (${response.status})` };
    }

    if (response.status === 204) return { data: undefined as T };

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// ============= TYPES =============

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  distributor_name: string | null;
  claimed_distributor_id: string | null;
  flagged_for_review: boolean;
  flag_reason: string | null;
  last_login_at: string | null;
  created_at: string;
  rep_profile: {
    id: string;
    distributor_id: string | null;
    phone: string | null;
    territory: string | null;
    is_active: boolean;
  } | null;
}

export interface AdminStats {
  pending_quotes: number;
  flagged_users: number;
  new_signups_week: number;
  unassociated_reps: number;
}

export interface AdminDistributor {
  id: string;
  name: string;
  email_domain: string | null;
  region: string | null;
  status: string;
  logo_url: string | null;
  created_at: string;
  rep_count: number;
  product_count: number;
  admin_user_id: string | null;
  admin_user_name: string | null;
}

export interface AdminDistributorDetail extends AdminDistributor {
  order_days: string | null;
  minimum_order_cents: number;
  reps: Array<{
    id: string;
    user_id: string;
    name: string;
    email: string;
    phone: string | null;
    territory: string | null;
    is_active: boolean;
  }>;
  catalog: {
    id: string;
    product_count: number;
    uploaded_at: string;
  } | null;
  restaurants: Array<{
    id: string;
    name: string;
    city: string | null;
    state: string | null;
  }>;
}

export interface AdminRestaurant {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  status: string;
  contact_count: number;
  restaurant_group: { id: string; name: string } | null;
  created_at: string;
  admin_user_id: string | null;
  admin_user_name: string | null;
}

export interface ConferenceLead {
  id: string;
  conference_name: string | null;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_title: string | null;
  lead_type: string;
  voice_note_transcript: string | null;
  notes: string | null;
  status: string;
  converted_to_type: string | null;
  converted_to_id: string | null;
  booth_photo_url: string | null;
  card_photo_url: string | null;
  email_sent_at: string | null;
  email_sent_by_user_id: string | null;
  email_send_count: number;
  created_at: string;
  captured_by: { id: string; name: string } | null;
}

export interface AdminBrand {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

// ============= ADMIN STATS =============

export async function getAdminStats(): Promise<ApiResponse<AdminStats>> {
  return fetchWithAuth('/api/v1/admin/users/stats');
}

// ============= ADMIN USERS =============

export async function getAdminUsers(params?: {
  role?: string;
  flagged?: boolean;
  status?: string;
  since?: string;
  include_archived?: boolean;
}): Promise<ApiResponse<AdminUser[]>> {
  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.set('role', params.role);
  if (params?.flagged) searchParams.set('flagged', 'true');
  if (params?.status) searchParams.set('status', params.status);
  if (params?.since) searchParams.set('since', params.since);
  if (params?.include_archived) searchParams.set('include_archived', 'true');
  const qs = searchParams.toString();
  return fetchWithAuth(`/api/v1/admin/users${qs ? `?${qs}` : ''}`);
}

export async function updateAdminUser(
  id: string,
  data: Partial<Pick<AdminUser, 'status' | 'role'>>
): Promise<ApiResponse<AdminUser>> {
  return fetchWithAuth(`/api/v1/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function inviteAdminUser(data: {
  email: string;
  role: string;
}): Promise<ApiResponse<AdminUser>> {
  return fetchWithAuth('/api/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function assignDistributor(
  userId: string,
  distributorId: string
): Promise<ApiResponse<AdminUser>> {
  return fetchWithAuth(`/api/v1/admin/users/${userId}/assign_distributor`, {
    method: 'PATCH',
    body: JSON.stringify({ distributor_id: distributorId }),
  });
}

// ============= ADMIN DISTRIBUTORS =============

export async function getAdminDistributors(): Promise<ApiResponse<AdminDistributor[]>> {
  return fetchWithAuth('/api/v1/admin/distributors');
}

export async function getAdminDistributor(id: string): Promise<ApiResponse<AdminDistributorDetail>> {
  return fetchWithAuth(`/api/v1/admin/distributors/${id}`);
}

export async function createDistributor(data: {
  name: string;
  email_domain?: string;
  region?: string;
}): Promise<ApiResponse<AdminDistributorDetail>> {
  return fetchWithAuth('/api/v1/admin/distributors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface AdminRestaurantDetail {
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
  restaurant_group: { id: string; name: string } | null;
  contacts: Array<{
    id: string;
    first_name: string;
    last_name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    is_primary: boolean;
  }>;
  recent_quotes: Array<{
    id: string;
    status: string;
    working_label: string | null;
    created_at: string;
  }>;
}

// ============= ADMIN RESTAURANTS =============

export async function getAdminRestaurants(): Promise<ApiResponse<AdminRestaurant[]>> {
  return fetchWithAuth('/api/v1/admin/restaurants');
}

export async function getAdminRestaurant(id: string): Promise<ApiResponse<AdminRestaurantDetail>> {
  return fetchWithAuth(`/api/v1/admin/restaurants/${id}`);
}

// ============= IMPERSONATE =============

export async function impersonateUser(userId: string): Promise<ApiResponse<{ token: string; user: { id: string; email: string; first_name: string; last_name: string; role: string } }>> {
  return fetchWithAuth(`/api/v1/admin/users/${userId}/impersonate`, { method: 'POST' });
}

// ============= CONFERENCE LEADS =============

export async function getConferenceLeads(): Promise<ApiResponse<ConferenceLead[]>> {
  return fetchWithAuth('/api/v1/admin/conference-leads');
}

export async function createConferenceLead(data: FormData): Promise<ApiResponse<ConferenceLead>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/conference-leads`, {
      method: 'POST',
      headers,
      body: data,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `Request failed (${response.status})` };
    }

    const result = await response.json();
    return { data: result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export async function updateConferenceLead(
  id: string,
  data: Partial<ConferenceLead>
): Promise<ApiResponse<ConferenceLead>> {
  return fetchWithAuth(`/api/v1/admin/conference-leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function convertConferenceLead(
  id: string,
  convertTo: string
): Promise<ApiResponse<ConferenceLead>> {
  return fetchWithAuth(`/api/v1/admin/conference-leads/${id}/convert`, {
    method: 'POST',
    body: JSON.stringify({ convert_to: convertTo }),
  });
}

export async function ocrConferenceCard(
  file: File
): Promise<ApiResponse<{ company_name: string; contact_name: string; contact_email: string; contact_phone: string; contact_title: string }>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const formData = new FormData();
  formData.append('card_photo', file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/conference-leads/ocr`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `Request failed (${response.status})` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export async function deleteConferenceLead(id: string): Promise<ApiResponse<void>> {
  return fetchWithAuth(`/api/v1/admin/conference-leads/${id}`, {
    method: 'DELETE',
  });
}

// ============= CONFERENCE EMAIL =============

export interface ConferenceEmailTemplate {
  id?: string;
  conference_name: string;
  subject_line: string;
  greeting: string;
  body_text: string;
  sign_off: string;
}

export async function getConferenceEmailTemplate(conferenceName: string): Promise<ApiResponse<ConferenceEmailTemplate>> {
  return fetchWithAuth(`/api/v1/admin/conference-leads/email_template?conference_name=${encodeURIComponent(conferenceName)}`);
}

export async function saveConferenceEmailTemplate(template: ConferenceEmailTemplate): Promise<ApiResponse<ConferenceEmailTemplate>> {
  return fetchWithAuth('/api/v1/admin/conference-leads/save_email_template', {
    method: 'POST',
    body: JSON.stringify({ template }),
  });
}

export async function sendConferenceLeadEmail(
  leadId: string,
  email: { to: string; subject_line: string; greeting: string; body_text: string; sign_off: string }
): Promise<ApiResponse<ConferenceLead>> {
  return fetchWithAuth(`/api/v1/admin/conference-leads/${leadId}/send_email`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// ============= ADMIN BRANDS =============

export async function getAdminBrands(): Promise<ApiResponse<AdminBrand[]>> {
  return fetchWithAuth('/api/v1/admin/brands');
}

export async function createAdminBrand(data: {
  name: string;
}): Promise<ApiResponse<AdminBrand>> {
  return fetchWithAuth('/api/v1/admin/brands', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============= DISTRIBUTOR SEARCH (public) =============

export async function searchDistributors(query: string): Promise<ApiResponse<Array<{ id: string; name: string; logo_url?: string }>>> {
  return fetchWithAuth(`/api/v1/distributors/search?q=${encodeURIComponent(query)}`);
}

// ============= MATCHING ENGINE =============

export interface MatchingEngineRules {
  sauce_expansions: Array<{
    id: string;
    sauce_name: string;
    components: string[];
    default_behavior: string;
    prepared_sku_blocked: boolean;
    created_at: string;
    updated_at: string;
  }>;
  protein_families: Array<{
    family: string;
    terms: string[];
    locked_species: string[];
  }>;
  cocktail_locks: Array<{
    term: string;
    canonical: string;
    thesaurus_id: string | null;
  }>;
  wine_protected: {
    class_a: Array<{ term: string; notes: string | null; rule_id: string | null }>;
    class_b: Array<{ term: string }>;
    class_c: Array<{ term: string }>;
  };
  chef_beverage: Array<{
    term: string;
    blocked: string[];
    notes: string | null;
    rule_id: string | null;
  }>;
  format_gates: Array<{
    id: string;
    ingredient_pattern: string;
    format_tag: string;
    blocked_in_roles: string[];
    prep_compatibility: string[];
    created_at: string;
    updated_at: string;
  }>;
  synonym_families: Array<{
    id: string;
    canonical_name: string;
    category: string;
    synonyms: string[];
    created_at: string;
    updated_at: string;
  }>;
  identity_locks: Array<{
    id: string;
    ingredient_pattern: string;
    dish_name: string;
    sensitivity: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
  }>;
  match_corrections: Array<{
    id: string;
    ingredient_name: string;
    correction_type: string;
    original_product: { id: string; name: string; brand: string } | null;
    corrected_product: { id: string; name: string; brand: string } | null;
    quote_id: string;
    user: { id: string; name: string } | null;
    promoted: boolean;
    created_at: string;
  }>;
}

export interface MatchingEngineLog {
  id: string;
  user: { id: string; name: string } | null;
  message: string;
  response: string;
  rules_applied: string[];
  source: string;
  created_at: string;
}

export interface ChatResponse {
  confirmation: string;
  rules_applied: string[];
  timestamp: string;
}

export async function getMatchingEngineRules(): Promise<ApiResponse<MatchingEngineRules>> {
  return fetchWithAuth('/api/v1/admin/matching-engine/rules');
}

export async function updateMatchingEngineRule(
  type: string,
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<{ status: string }>> {
  return fetchWithAuth(`/api/v1/admin/matching-engine/rules/${type}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteMatchingEngineRule(
  type: string,
  id: string
): Promise<ApiResponse<{ status: string }>> {
  return fetchWithAuth(`/api/v1/admin/matching-engine/rules/${type}/${id}`, {
    method: 'DELETE',
  });
}

export async function promoteCorrection(
  id: string
): Promise<ApiResponse<{ status: string; rule_id: string }>> {
  return fetchWithAuth(`/api/v1/admin/matching-engine/promote/${id}`, {
    method: 'POST',
  });
}

export async function sendMatchingEngineChat(
  message: string
): Promise<ApiResponse<ChatResponse>> {
  return fetchWithAuth('/api/v1/admin/matching-engine/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function getMatchingEngineLogs(params?: {
  source?: string;
  limit?: number;
}): Promise<ApiResponse<MatchingEngineLog[]>> {
  const searchParams = new URLSearchParams();
  if (params?.source) searchParams.set('source', params.source);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return fetchWithAuth(`/api/v1/admin/matching-engine/logs${qs ? `?${qs}` : ''}`);
}

export function getMatchingEngineExportUrl(): string {
  return `${API_BASE_URL}/api/v1/admin/matching-engine/export`;
}

// ============= ADMIN STOCK QUOTES =============

export interface AdminStockQuote {
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

export async function getAdminStockQuotes(): Promise<ApiResponse<AdminStockQuote[]>> {
  return fetchWithAuth('/api/v1/admin/stock-quotes');
}

export async function createAdminStockQuote(data: {
  name: string;
  restaurant_type: string;
  quote_data?: Record<string, unknown>;
}): Promise<ApiResponse<AdminStockQuote>> {
  return fetchWithAuth('/api/v1/admin/stock-quotes', {
    method: 'POST',
    body: JSON.stringify({ stock_quote: data }),
  });
}

export async function updateAdminStockQuote(
  id: string,
  data: Partial<{ name: string; restaurant_type: string; status: string; quote_data: Record<string, unknown> }>
): Promise<ApiResponse<AdminStockQuote>> {
  return fetchWithAuth(`/api/v1/admin/stock-quotes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ stock_quote: data }),
  });
}

export async function deleteAdminStockQuote(id: string): Promise<ApiResponse<void>> {
  return fetchWithAuth(`/api/v1/admin/stock-quotes/${id}`, {
    method: 'DELETE',
  });
}
