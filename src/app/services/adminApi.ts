const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://web-production-9f6e9.up.railway.app';

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
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  distributor_id?: string;
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
  admin_email?: string;
  admin_first_name?: string;
  admin_last_name?: string;
}): Promise<ApiResponse<AdminDistributorDetail>> {
  return fetchWithAuth('/api/v1/admin/distributors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getAdminDistributorExportUrl(distributorId: string, type: 'catalog' | 'quotes' | 'reps'): string {
  return `${API_BASE_URL}/api/v1/admin/distributors/${distributorId}/export?type=${type}`;
}

export async function downloadDistributorExport(distributorId: string, type: 'catalog' | 'quotes' | 'reps'): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(getAdminDistributorExportUrl(distributorId, type), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Download failed' }));
    throw new Error(err.error || 'Download failed');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition');
  const filename = disposition?.match(/filename="?(.+?)"?$/)?.[1] || `export-${type}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

export interface RuleValidation {
  status: 'pass' | 'warn' | 'reject';
  rules: Record<string, unknown>[];
  warnings: string[];
  rejections: string[];
}

export interface ChatResponse {
  confirmation: string;
  rules_applied: string[];
  validation?: RuleValidation;
  timestamp: string;
}

export interface SaveRulesResponse {
  status: string;
  rules_applied: string[];
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
  message: string,
  file?: File
): Promise<ApiResponse<ChatResponse>> {
  if (file) {
    // Use FormData for file uploads — must NOT set Content-Type header
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('message', message);
    formData.append('file', file);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/matching-engine/chat`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return { data: null, error: errBody.error || `HTTP ${response.status}` };
    }
    const data = await response.json();
    return { data, error: null };
  }
  return fetchWithAuth('/api/v1/admin/matching-engine/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function saveMatchingEngineRules(
  rules: Record<string, unknown>[]
): Promise<ApiResponse<SaveRulesResponse>> {
  return fetchWithAuth('/api/v1/admin/matching-engine/save-rules', {
    method: 'POST',
    body: JSON.stringify({ rules }),
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

export interface ConceptLabel {
  label: string;
  concept: string;
  cuisine: string | null;
  format: string;
  has_profile: boolean;
  strong_fit_count: number;
  likely_fit_count: number;
  manual_count: number;
}

export interface ConceptsResponse {
  labels: ConceptLabel[];
  profile_concepts: string[];
  total_labels: number;
  total_profiles: number;
}

export interface ConceptTestResult {
  input: string;
  is_concept: boolean;
  profile: { concept: string; cuisine: string | null; format: string } | null;
  profile_data?: {
    strong_fit: string[];
    likely_fit: string[];
    manual: Array<{ name: string; reason: string; status: string }>;
  };
}

export async function getMatchingEngineConcepts(): Promise<ApiResponse<ConceptsResponse>> {
  return fetchWithAuth('/api/v1/admin/matching-engine/concepts');
}

export async function testMatchingEngineConcept(
  input: string
): Promise<ApiResponse<ConceptTestResult>> {
  return fetchWithAuth('/api/v1/admin/matching-engine/test-concept', {
    method: 'POST',
    body: JSON.stringify({ input }),
  });
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

// ═══════════════════════════════════════════════════════════════════════
// Matching Diagnostics (Fix 119)
// ═══════════════════════════════════════════════════════════════════════

export interface DiagnosticResult {
  input: {
    component_name: string;
    normalized_name: string;
    inferred_category: string;
    adjacency_allowed?: string[];
    absurd_blocked?: string[];
    synonyms_expanded: string[];
    synonym_family: string | null;
    detected_format: string | null;
    identity_locked: boolean;
    identity_semi_locked: boolean;
  };
  retrieval_guard: {
    synonym_text_matches: { count: number; token_fallback_used?: boolean; token_fallback_tokens?: string[]; top_10: ProductBrief[] };
    // Fix 125: absurd_category_block replaces category_gating
    absurd_category_block?: {
      component_category: string;
      absurd_pairs: string[];
      adjacent_categories: string[];
      survived: number;
      removed: Array<{ product: ProductBrief; reason: string }>;
      note: string;
    };
    // Legacy field for backward compat
    category_gating?: {
      component_category: string;
      allowed_categories: string[];
      survived: number;
      removed: Array<{ product: ProductBrief; reason: string }>;
    };
    format_blocking: {
      detected_format: string | null;
      blocked_patterns: string[];
      survived: number;
      removed: Array<{ product: ProductBrief; reason: string }>;
    };
    name_format_blocking: {
      survived: number;
      removed: Array<{ product: ProductBrief; reason: string }>;
    };
    prep_state_gate?: {
      is_raw_component: boolean;
      survived: number;
      removed: Array<{ product: ProductBrief; reason: string }>;
    };
    final_candidates: ProductBrief[];
  };
  fallback_path: {
    triggered: boolean;
    reason?: string;
    guard_fallback_fired?: boolean;
    guard_fallback_count?: number;
    absurd_blocked_fallback?: boolean;
    absurd_pairs_excluded?: string[];
    category_constrained_fallback?: boolean;
    searched_categories?: string[];
    pool_size?: number;
    candidates_found?: ProductBrief[];
    clean_miss?: boolean;
    note?: string;
  };
  scoring: {
    sensitivity: string;
    role: string;
    identity_family: string | null;
    locked: boolean;
    floor: number;
    candidates: ScoredCandidate[];
    note?: string;
  };
  final_result: {
    match: {
      product_name: string;
      brand: string;
      category: string;
      score: number;
      quality: string;
    } | null;
    reason?: string;
    alternates_count?: number;
    total_scored?: number;
    total_above_floor?: number;
    best_score?: number;
  };
  active_rule_count?: number;
  active_rules?: TeachExistingRule[];
}

// ═══════════════════════════════════════════════════════════════════════
// Fix 127: Teach mode types
// ═══════════════════════════════════════════════════════════════════════

export interface TeachUserPick {
  position: number;
  product_id: string;
}

export interface TeachGap {
  position: number;
  already_correct: boolean;
  user_pick: { product_id: string; product_name: string; brand: string; engine_rank: number | null; engine_score: number };
  engine_pick: { product_id: string; product_name: string; brand: string; engine_rank: number; engine_score: number } | null;
  score_delta: number;
  factor_deltas: Record<string, number>;
}

export interface TeachProposedRule {
  rule_type: string;
  target_name: string;
  replacement_name: string | null;
  reason: string;
  affects_positions: number[];
}

export interface TeachPreviewCandidate {
  product_id: string;
  product_name: string;
  brand: string;
  category?: string;
  normalized_category?: string;
  original_score: number;
  adjusted_score: number;
  original_rank: number;
  new_rank: number;
  rules_applied: string[];
}

export interface TeachConflict {
  type: 'contradiction' | 'stacking' | 'identity_lock_override';
  new_rule: TeachProposedRule;
  existing_rule?: TeachExistingRule;
  existing_count?: number;
  existing_rules?: TeachExistingRule[];
  message: string;
  warning?: boolean;
}

export interface TeachExistingRule {
  id: string;
  rule_type: string;
  target_name: string;
  replacement_name?: string | null;
  reason?: string;
  source?: string;
  active?: boolean;
  created_at?: string;
}

export interface TeachResult {
  gaps: { gaps: TeachGap[]; agreement_count: number; total_positions: number };
  proposed_rules: TeachProposedRule[];
  explanation: string;
  preview: { candidates: TeachPreviewCandidate[] };
  conflicts: TeachConflict[];
}

export interface TeachApplyResult {
  saved_rule_ids: string[];
  confirmed_result: DiagnosticResult;
}

export async function runTeachAnalysis(
  component: string,
  catalogId: string,
  userRanking: TeachUserPick[],
  engineCandidates: ScoredCandidate[],
  category?: string
): Promise<ApiResponse<TeachResult>> {
  return fetchWithAuth('/api/v1/admin/matching-engine/teach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      component,
      catalog_id: catalogId,
      category,
      user_ranking: userRanking,
      engine_candidates: engineCandidates
    })
  });
}

export async function runTeachPreview(
  component: string,
  catalogId: string,
  rules: TeachProposedRule[],
  engineCandidates: ScoredCandidate[]
): Promise<ApiResponse<{ preview: { candidates: TeachPreviewCandidate[] }; conflicts: TeachConflict[] }>> {
  return fetchWithAuth('/api/v1/admin/matching-engine/teach-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      component,
      catalog_id: catalogId,
      rules,
      engine_candidates: engineCandidates
    })
  });
}

export async function applyTeachRules(
  component: string,
  catalogId: string,
  rules: TeachProposedRule[],
  userRanking: TeachUserPick[],
  beforeRanking: ScoredCandidate[],
  category?: string
): Promise<ApiResponse<TeachApplyResult>> {
  return fetchWithAuth('/api/v1/admin/matching-engine/teach-apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      component,
      catalog_id: catalogId,
      category,
      rules,
      user_ranking: userRanking,
      before_ranking: beforeRanking
    })
  });
}

export async function undoTeachSession(ruleIds: string[]): Promise<ApiResponse<{ success: boolean; undone_count: number }>> {
  return fetchWithAuth('/api/v1/admin/matching-engine/teach-undo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rule_ids: ruleIds })
  });
}

export interface ProductBrief {
  product_id: string;
  item_number: string;
  brand: string;
  product_name: string;
  canonical_product: string | null;
  category: string;
  normalized_category?: string;
  pack_size: string | null;
  prep_state: string | null;
  search_text: string | null;
}

export interface ScoredCandidate {
  product_id: string;
  product_name: string;
  brand: string;
  category: string;
  normalized_category?: string;
  pack_size: string | null;
  prep_state: string | null;
  scores: {
    exact_identity: number;
    name_similarity: number;
    category_fit: number;
    role_fit: number;
    keyword_overlap: number;
    pack_plausibility: number;
    concept_fit: number;
    format_fit: number;
    name_boost: number;
    category_boost: number;
    total: number;
  };
  above_floor: boolean;
}

export interface DiagnosticCatalog {
  id: string;
  distributor_name: string;
  product_count: number;
  is_demo: boolean;
  created_at: string;
}

export async function getDiagnosticsEnabled(): Promise<ApiResponse<{ enabled: boolean }>> {
  return fetchWithAuth('/api/v1/admin/matching-engine/diagnostics-enabled');
}

export async function getDiagnosticsCatalogs(): Promise<ApiResponse<{ catalogs: DiagnosticCatalog[] }>> {
  return fetchWithAuth('/api/v1/admin/matching-engine/diagnostics-catalogs');
}

export async function runDiagnostic(
  component: string,
  catalogId: string,
  category?: string
): Promise<ApiResponse<DiagnosticResult>> {
  const qs = new URLSearchParams({ component, catalog_id: catalogId });
  if (category) qs.set('category', category);
  return fetchWithAuth(`/api/v1/admin/matching-engine/diagnose?${qs}`);
}

// ============= ADMIN CATALOG CLASSIFICATION =============

export interface AdminCatalogStats {
  id: string;
  distributor_name: string;
  total_products: number;
  by_category: Record<string, number>;
  classification_status: string;
  classification_progress: number;
  classification_total: number;
}

export interface AdminCatalogProduct {
  id: string;
  item_number: string;
  brand: string;
  product_name: string;
  pack_size: string;
  category: string;
  subcategory: string | null;
  standard_subcategory: string | null;
  normalized_category: string | null;
  category_source: string;
  ai_confidence: string | null;
}

export interface AdminCatalogProductsResponse {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  brands: string[];
  products: AdminCatalogProduct[];
}

export async function getAdminCatalogStats(catalogId: string): Promise<ApiResponse<AdminCatalogStats>> {
  return fetchWithAuth(`/api/v1/admin/matching-engine/catalog-stats?catalog_id=${catalogId}`);
}

export async function getAdminCatalogProducts(
  catalogId: string, page = 1, perPage = 50, opts?: { category?: string; search?: string; brand?: string }
): Promise<ApiResponse<AdminCatalogProductsResponse>> {
  const params = new URLSearchParams({ catalog_id: catalogId, page: String(page), per_page: String(perPage) });
  if (opts?.category) params.set('category', opts.category);
  if (opts?.search) params.set('search', opts.search);
  if (opts?.brand) params.set('brand', opts.brand);
  return fetchWithAuth(`/api/v1/admin/matching-engine/catalog-products?${params}`);
}

export async function adminReclassifyOthers(catalogId: string): Promise<ApiResponse<{ message: string; other_count: number }>> {
  return fetchWithAuth('/api/v1/admin/matching-engine/catalog-reclassify', {
    method: 'POST',
    body: JSON.stringify({ catalog_id: catalogId }),
  });
}

export async function adminBulkUpdateCategory(catalogId: string, productIds: string[], category: string): Promise<ApiResponse<{ updated: number; category: string }>> {
  return fetchWithAuth('/api/v1/admin/matching-engine/catalog-bulk-update', {
    method: 'PATCH',
    body: JSON.stringify({ catalog_id: catalogId, product_ids: productIds, category }),
  });
}

// ============= BRAND RULES =============

export interface BrandRule {
  id: string;
  brand_name: string;
  rule_type: 'lock' | 'bias' | 'none';
  category: string;
  is_active: boolean;
  notes: string | null;
  product_count: number;
  category_distribution: Record<string, number>;
  last_audited_at: string | null;
  created_at: string;
}

export interface BrandAuditResult {
  total_brands: number;
  locks: number;
  biases: number;
  brands: Array<{
    brand: string;
    product_count: number;
    categories: string[];
    suggested_type: string;
    suggested_category: string;
    existing_rule: BrandRule | null;
  }>;
}

export async function getAdminBrandRules(params?: { rule_type?: string; q?: string }): Promise<ApiResponse<BrandRule[]>> {
  const query = new URLSearchParams();
  if (params?.rule_type) query.set('rule_type', params.rule_type);
  if (params?.q) query.set('q', params.q);
  const qs = query.toString();
  return fetchWithAuth(`/api/v1/admin/brand-rules${qs ? '?' + qs : ''}`);
}

export async function createAdminBrandRule(data: { brand_name: string; rule_type: string; category: string; notes?: string }): Promise<ApiResponse<BrandRule>> {
  return fetchWithAuth('/api/v1/admin/brand-rules', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdminBrandRule(id: string, data: Partial<BrandRule>): Promise<ApiResponse<BrandRule>> {
  return fetchWithAuth(`/api/v1/admin/brand-rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteAdminBrandRule(id: string): Promise<ApiResponse<{ id: string; deleted: boolean }>> {
  return fetchWithAuth(`/api/v1/admin/brand-rules/${id}`, { method: 'DELETE' });
}

export async function auditBrandRules(distributorId?: string): Promise<ApiResponse<BrandAuditResult>> {
  const body = distributorId ? JSON.stringify({ distributor_id: distributorId }) : '{}';
  return fetchWithAuth('/api/v1/admin/brand-rules/audit', { method: 'POST', body });
}

export async function seedBrandRules(): Promise<ApiResponse<{ seeded: number; total: number }>> {
  return fetchWithAuth('/api/v1/admin/brand-rules/seed', { method: 'POST' });
}

// ============= ADMIN HEALTH =============

export interface HealthCheck {
  overall: 'healthy' | 'degraded';
  timestamp: string;
  services: Record<string, {
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
  }>;
}

export async function getAdminHealth(): Promise<ApiResponse<HealthCheck>> {
  return fetchWithAuth('/api/v1/admin/health');
}
