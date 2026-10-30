import { fetchWithPolicy } from './requestPolicy';
import type { PairmePresentedWine } from './api';

// Every request in this file goes through fetchWithPolicy, which supplies the
// timeout this client never had (a request that never settles left a permanent
// spinner on every QM Admin page) and the retry-once-on-network-failure rule
// this client also never had. Same module as api.ts: one policy, not two.
//
// The rule to keep in mind when adding a call here: a MUTATION that times out is
// UNKNOWN, not failed. fetchWithPolicy never retries one and never tells the
// user it failed, because the server may already have acted.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://web-production-9f6e9.up.railway.app';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  // item 1c: dual-role prevention gates (assign_distributor, assign_admin)
  // return 409 { error_code: "role_conflict_requires_confirm", error: <generic
  // message> } when a confirm is required. Threaded through additively so
  // callers can branch on the machine code without parsing `error` text.
  error_code?: string;
  status?: number;
}

// C-02: admin endpoints require admin scope. While impersonating, quoteme_token is the
// impersonated (non-admin) JWT and quoteme_admin_token holds the real admin JWT (set on
// impersonate, removed on un-impersonate). Prefer the admin token so admin writes
// (e.g. "Save States" on the distributor detail) authorize instead of 403-ing.
export function selectAdminToken(adminToken: string | null, userToken: string | null): string | null {
  return adminToken || userToken;
}

function getAuthToken(): string | null {
  return selectAdminToken(
    localStorage.getItem('quoteme_admin_token'),
    localStorage.getItem('quoteme_token'),
  );
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
    const response = await fetchWithPolicy(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.error || `Request failed (${response.status})`,
        error_code: errorData.error_code,
        status: response.status,
      };
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
  phone: string | null;
  role: string;
  status: string;
  // Feature 2 Slice 1: honest, derived-from-existing-columns status. One of
  // "invite_sent" | "active" | "archived". See User#display_status (BE) and
  // userStatusPill (utils/userDisplayStatus.ts) for the full derivation.
  // Optional so older cached payloads / tests without it still typecheck.
  display_status?: string;
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
  unclaimed: boolean;
  /** Percentage of products with a non-"other" category (0–100), null if no catalog. */
  categorization_pct: number | null;
  /** USPS two-letter state codes this distributor services. */
  service_states: string[];
  /** Primary state/province code this distributor is headquartered in or primarily serves. */
  primary_state: string | null;
  /** ISO country code ("US" | "CA"); defaults to "US" server-side. */
  country?: string | null;
}

export interface AdminDistributorDetail extends AdminDistributor {
  order_days: string | null;
  minimum_order_cents: number;
  // P0-2b: qm-admin quota lever fields (serialize_detail). effective_quota is
  // the base free-quote allowance (5) plus whatever bonus_free_quotes has
  // been granted via grantFreeQuotes. See QuotaResetControl in
  // pages/admin/QMAdminDistributorDetail.tsx.
  bonus_free_quotes?: number;
  effective_quota?: number;
  branding_slug?: string | null;
  admins: Array<{
    user_id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  }>;
  reps: Array<{
    id: string;
    user_id: string;
    name: string;
    email: string;
    phone: string | null;
    territory: string | null;
    is_active: boolean;
    // Tablet sign-in status (BE RepTabletLinkStatus via Admin::DistributorsController
    // #serialize_reps). Dates only; the sign-in link itself never reaches an admin.
    // Optional so older payloads still typecheck.
    tablet_link_last_sent_at?: string | null;
    tablet_link_expires_at?: string | null;
    signed_in_until?: string | null;
  }>;
  catalog: {
    id: string;
    product_count: number;
    uploaded_at: string;
  } | null;
  catalogs?: Array<{
    id: string;
    uploaded_at: string;
    original_filename: string | null;
    uploaded_by: string | null;
    product_count: number | null;
    pct_uncategorized: number | null;
    status: string;
  }>;
  restaurants: Array<{
    id: string;
    name: string;
    city: string | null;
    state: string | null;
  }>;
}

/** The PairMe review flag (QuoteMe pairme_venues.review_state). null state =
 * a venue nobody needs to review (hand-authored). */
export interface AdminPairmeReview {
  state: 'needs_review' | 'reviewed' | null;
  authored_by: 'hand' | 'auto';
  reviewed_at: string | null;
  reviewed_by_name: string | null;
}

export type PairmeReviewFilter = 'needs_review' | 'reviewed' | 'any_pairme';

export interface AdminRestaurant {
  /** null when the restaurant has no PairMe venue. */
  pairme_review?: AdminPairmeReview | null;
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
  restaurant_admin_id: string | null;
  restaurant_admin_name: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  zip: string | null;
  website: string | null;
  google_place_id: string | null;
  // Not yet populated by the crawler; may be null.
  source_state: string | null;
  // e.g. "place_id_conflict"; may be null.
  data_flags: string | null;
  // Menu kinds present among CURRENT menu sources, e.g. ["wine","dinner"].
  menu_coverage: string[];
  /** Whole percent of the eight launch checklist steps done (0 to 100). */
  onboarding_percent?: number;
  /** True when the restaurant pays (QuoteMe Restaurant#paying?). Shows "$". */
  paying?: boolean;
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
  logo_url?: string | null;
  website?: string | null;
  created_at: string;
}

export interface AdminBrandDetail {
  id: string;
  name: string;
  status: string;
  website: string | null;
  logo_url: string | null;
  category: string | null;
  created_at: string;
  stats: {
    products: number;
    packages: number;
    distributors: number;
  };
  users: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    last_login_at: string | null;
  }>;
  catalogs: Array<{
    id: string;
    original_filename: string | null;
    row_count: number | null;
    uploaded_at: string;
  }>;
  packages: Array<{
    id: string;
    title: string;
    status: string;
    item_count: number;
    sent_at: string | null;
  }>;
  distributors: Array<{
    distributor_id: string;
    name: string;
    status: string;
    connected_since: string;
  }>;
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
  data: Partial<Pick<AdminUser, 'status' | 'role' | 'first_name' | 'last_name' | 'phone'>>
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

export async function resendInvite(userId: string): Promise<ApiResponse<{ message: string }>> {
  return fetchWithAuth(`/api/v1/admin/users/${userId}/resend_invite`, {
    method: 'POST',
  });
}

/**
 * Resend a welcome email. For a restaurant admin, restaurantId names which
 * restaurant's PairMe link and QR code to send (QuoteMe #493); without it
 * the server picks the one they run.
 */
export async function resendWelcome(userId: string, restaurantId?: string): Promise<ApiResponse<{ ok: boolean; sent_to: string }>> {
  return fetchWithAuth(`/api/v1/admin/users/${userId}/resend_welcome`, {
    method: 'POST',
    ...(restaurantId ? { body: JSON.stringify({ restaurant_id: restaurantId }) } : {}),
  });
}

// SEND PAIRME INFO (QuoteMe Pairme::InfoSend). QM admin only. The recipient
// is always explicit: one of this restaurant's contacts by id, or a typed
// name and email. Never both, never neither (the server refuses with 422).
export type SendPairmeInfoInput =
  | { restaurant_contact_id: string }
  | { recipient_name?: string; recipient_email: string };

export interface SendPairmeInfoResult {
  restaurant_id: string;
  restaurant_contact_id: string | null;
  recipient_name: string | null;
  recipient_email: string;
  pairings_link_included: boolean;
  sent_at: string;
}

export async function sendPairmeInfo(
  restaurantId: string,
  input: SendPairmeInfoInput
): Promise<ApiResponse<SendPairmeInfoResult>> {
  return fetchWithAuth(`/api/v1/admin/restaurants/${restaurantId}/send_pairme_info`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function assignDistributor(
  userId: string,
  distributorId: string,
  confirm?: boolean
): Promise<ApiResponse<AdminUser>> {
  return fetchWithAuth(`/api/v1/admin/users/${userId}/assign_distributor`, {
    method: 'PATCH',
    body: JSON.stringify({ distributor_id: distributorId, ...(confirm ? { confirm: true } : {}) }),
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

export async function updateAdminDistributor(
  id: string,
  data: {
    name?: string;
    email_domain?: string;
    region?: string;
    primary_state?: string | null;
    service_states?: string[];
    country?: string;
  }
): Promise<ApiResponse<AdminDistributorDetail>> {
  return fetchWithAuth(`/api/v1/admin/distributors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function getAdminDistributorExportUrl(distributorId: string, type: 'catalog' | 'quotes' | 'reps'): string {
  return `${API_BASE_URL}/api/v1/admin/distributors/${distributorId}/export?type=${type}`;
}

// P0-2b: grant_free_quotes stays increment-only BE-side (ruling). A negative
// amount decrements via the same +=. Callers (e.g. the "Set quota" control)
// compute the delta between a target quota and the current effective_quota
// and pass that delta as amount. Every call writes an AdminAction audit row
// BE-side.
export async function grantFreeQuotes(
  distributorId: string,
  amount: number
): Promise<ApiResponse<{ bonus_free_quotes: number }>> {
  return fetchWithAuth(`/api/v1/admin/distributors/${distributorId}/grant_free_quotes`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export async function downloadDistributorExport(distributorId: string, type: 'catalog' | 'quotes' | 'reps'): Promise<void> {
  const token = getAuthToken();
  const response = await fetchWithPolicy(getAdminDistributorExportUrl(distributorId, type), {
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

/** The PairMe diner link for a restaurant, and its QR code (PNG data URI). */
export interface PairmeFlow {
  url: string;
  qr_png: string;
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
  google_place_id: string | null;
  address_verified: boolean;
  restaurant_admin_id: string | null;
  restaurant_admin_name: string | null;
  /** True when the linked admin is the blank sign-in account, not a person. */
  restaurant_admin_placeholder?: boolean;
  restaurant_group: { id: string; name: string } | null;
  /** The diner link and its QR code; null until the pairings are made. */
  pairme_flow?: PairmeFlow | null;
  contacts: Array<{
    id: string;
    first_name: string;
    last_name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    is_primary: boolean;
    /** The account behind the contact (restaurant_contacts.user_id); null when none. */
    user?: { id: string; role: string; signed_in: boolean } | null;
  }>;
  recent_quotes: Array<{
    id: string;
    status: string;
    working_label: string | null;
    created_at: string;
  }>;
}

// ============= ADMIN USERS SINGLE =============

export async function getAdminUser(id: string): Promise<ApiResponse<AdminUser>> {
  return fetchWithAuth(`/api/v1/admin/users/${id}`);
}

export async function assignDistributorAdmin(
  distributorId: string,
  userId: string,
  confirm?: boolean
): Promise<ApiResponse<{ ok: boolean }>> {
  return fetchWithAuth(`/api/v1/admin/distributors/${distributorId}/assign_admin`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, ...(confirm ? { confirm: true } : {}) }),
  });
}

// B-188 fix: QM-admin "+ Add Rep" — creates a brand new, immediately-active
// rep tied to this distributor (mirrors assignDistributorAdmin's sibling,
// the invite-tab path in Add Admin, but always role=rep).
export interface AddRepResult {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  rep_profile: {
    id: string;
    distributor_id: string;
    phone: string | null;
    is_active: boolean;
  };
  distributor: { id: string; name: string };
}

export async function addRepToDistributor(
  distributorId: string,
  data: { first_name: string; last_name: string; email: string; phone?: string }
): Promise<ApiResponse<AddRepResult>> {
  return fetchWithAuth(`/api/v1/admin/distributors/${distributorId}/add_rep`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============= REP TABLET SIGN-IN LINK =============

export type TabletLinkVia = 'email' | 'sms';

/** POST /api/v1/rep/tablet_links 201 body. The link itself is never returned. */
export interface TabletLinkSent {
  link_id: string;
  via: TabletLinkVia;
  expires_at: string;
}

/**
 * Sends a rep their tablet sign-in link by email or text (BE
 * Rep::TabletLinksController#create). repUserId is the rep's user id.
 * Errors come back with the server's message and error_code, e.g.
 * SMS_NOT_CONFIGURED or NO_PHONE. Reader: RepTabletLinkControl.
 */
export async function sendRepTabletLink(
  repUserId: string,
  via: TabletLinkVia,
): Promise<ApiResponse<TabletLinkSent>> {
  return fetchWithAuth(`/api/v1/rep/tablet_links`, {
    method: 'POST',
    body: JSON.stringify({ rep_id: repUserId, via }),
  });
}

// ============= ADMIN RESTAURANTS =============

export interface AdminRestaurantsPage {
  restaurants: AdminRestaurant[];
  meta: { page: number; per_page: number; total_count: number; total_pages: number };
}

export interface AdminRestaurantsQuery {
  page: number;
  per_page: number;
  /** Matched server-side against name, city and restaurant group name. */
  q?: string;
  sort?: 'name' | 'city' | 'status' | 'contact_count' | 'created_at';
  dir?: 'asc' | 'desc';
  /** Server-side PairMe review filter. */
  pairme_review?: PairmeReviewFilter;
  /** Two-letter state, exact match on restaurants.state. The server ignores a value that is not a valid region. */
  state?: string;
  /** true keeps only rows the crawler load wrote (restaurants.crawl_source_state present). */
  crawled?: boolean;
}

/**
 * Paged, searched and sorted SERVER-SIDE.
 *
 * The unpaginated form of this endpoint returns every row: 5,865,033 bytes
 * across 10,333 restaurants, which timed the screen out. Passing `page` is what
 * opts into the bounded response.
 *
 * `q` and `sort` must travel with it. The page used to filter and sort the full
 * array in the browser, and leaving that in place against a paged response
 * would mean a search only ever matched rows on the current page, so a
 * restaurant on page 7 would report as not existing. Wrong beats slow.
 */
export async function getAdminRestaurants(
  query: AdminRestaurantsQuery
): Promise<ApiResponse<AdminRestaurantsPage>> {
  const params = new URLSearchParams({
    page: String(query.page),
    per_page: String(query.per_page),
  });
  if (query.q) params.set('q', query.q);
  if (query.sort) params.set('sort', query.sort);
  if (query.dir) params.set('dir', query.dir);
  if (query.pairme_review) params.set('pairme_review', query.pairme_review);
  if (query.state) params.set('state', query.state);
  if (query.crawled) params.set('crawled', 'true');

  return fetchWithAuth(`/api/v1/admin/restaurants?${params.toString()}`);
}

/** PATCH /api/v1/admin/restaurants/:id/pairme_review (QM admin only). */
export async function setAdminPairmeReview(id: string, reviewed: boolean): Promise<ApiResponse<{ pairme_review: AdminPairmeReview }>> {
  return fetchWithAuth(`/api/v1/admin/restaurants/${id}/pairme_review`, {
    method: 'PATCH',
    body: JSON.stringify({ reviewed }),
  });
}

export async function getAdminRestaurant(id: string): Promise<ApiResponse<AdminRestaurantDetail>> {
  return fetchWithAuth(`/api/v1/admin/restaurants/${id}`);
}

/**
 * The account to sign in as for a restaurant: its admin, or a blank one made
 * on the spot (QuoteMe placeholder_admin). Sends no email.
 */
export async function ensureRestaurantSignInAdmin(
  restaurantId: string,
): Promise<ApiResponse<{ restaurant_admin: { id: string; name: string; placeholder: boolean }; created: boolean }>> {
  return fetchWithAuth(`/api/v1/admin/restaurants/${restaurantId}/placeholder_admin`, { method: 'POST' });
}

/**
 * The servers' tablet for one restaurant (BE RestaurantAdminHomeController
 * #staff_tablet): its address and whether a staff PIN is set. Never the PIN.
 * null until the restaurant is paired.
 */
export interface StaffTablet {
  url: string;
  pin_set: boolean;
  pin_set_at: string | null;
}

/** The restaurant admin's home: their restaurants, each with its PairMe link. */
export interface RestaurantAdminHome {
  user: { id: string; first_name: string | null; last_name: string | null };
  restaurants: Array<{
    id: string; name: string; city: string | null; state: string | null; pairme_flow: PairmeFlow | null;
    staff_tablet?: StaffTablet | null;
  }>;
}

// THE RESTAURANT ADMIN'S OWN PAIRINGS (types only; the calls live in api.ts,
// see getRestaurantAdminHome there). Same payload the QM admin reads
// (BE Pairme::RestaurantPairings), only for a restaurant this person runs.
// pairings_updated_at: when the offer to guests last changed; null with no venue.
export interface RestaurantAdminPairme extends AdminRestaurantPairme {
  pairings_updated_at: string | null;
}


// What guests at the restaurant were shown, newest first. local_* are null
// when the restaurant's time zone is unknown.
export interface RestaurantAdminPresentation {
  id: string;
  presented_at: string;
  local_date: string | null;
  local_time: string | null;
  signed_in: boolean;
  wines: PairmePresentedWine[];
}

export interface RestaurantAdminPresentations {
  restaurant_id: string;
  time_zone: string | null;
  presentations: RestaurantAdminPresentation[];
}


// ============= ADMIN RESTAURANT CRAWL TRUTH =============
// D3 restaurant-truth screen. Field names mirror the payload contract
// (D3_restaurant_truth_payload_contract.md) EXACTLY - PR 2 (BE serializer) and
// PR 3 (this FE screen) both code to that document. Two shaping rules from
// the contract: (1) `fetched` identifies WHAT record this payload is about,
// rendered first, always - a wrong binding must be visible on the screen. (2)
// char_count / component_count / source counts are facts, never a quality
// score - the FE must not style them as health.

export interface AdminRestaurantCrawlTruthFetched {
  restaurant_id: string; // raw UUID - behind a deliberate control only
  reference: string; // human reference, e.g. "Rioja - Denver, CO" - the honesty check
  website: string | null;
  as_of: string | null; // when the server built this payload
}

export interface AdminRestaurantCrawlTruthCrawl {
  status: string | null; // already-translated sentence; raw code never shown
  confidence: number | null; // 0..100; null -> "not scored"
  is_restaurant: boolean | null; // tri-state: true/false/null are three distinct states
  source_state: string | null; // translated phrase; null -> "not recorded"
  found_at: string | null; // null -> "not recorded"
  data_flags: string[] | null; // [] or null -> no chips rendered
}

export interface AdminRestaurantCrawlTruthSupersededBy {
  reference: string;
  id: string; // raw UUID - behind a control only
}

export interface AdminRestaurantCrawlTruthSource {
  id: string; // raw UUID - behind a control only
  kind_label: string; // translated; unknown kind -> "Other menu"
  kind_raw: string; // details-control only
  is_recognized_kind: boolean;
  provenance_label: string; // "Crawler" | "Diner photo" | "Rep upload" | "Restaurant direct"
  host: string | null;
  url: string | null; // behind a control / truncated; host is the default glance
  list_date: string | null; // null -> "no date"
  fetched_at: string | null; // null -> "not fetched"
  status_sentence: string; // translated; raw code never shown
  char_count: number; // FACT - 0 is a real value, shown as 0
  truncated: boolean;
  component_count: number; // FACT - 0 when menu_id is null (truthful, not missing)
  is_extracted: boolean;
  extraction_method: string | null;
  source_state: 'active' | 'superseded';
  superseded_at: string | null;
  superseded_by: AdminRestaurantCrawlTruthSupersededBy | null;
}

export interface AdminRestaurantCrawlTruthSourceReporting {
  source_count: number;
  extracted_count: number;
  total_char_count: number;
  truncated_source_count: number;
  unknown_kind_count: number;
  coverage_note: string; // literal disclaimer - printed near the numbers
}

export interface AdminRestaurantCrawlTruth {
  fetched: AdminRestaurantCrawlTruthFetched;
  crawl: AdminRestaurantCrawlTruthCrawl;
  sources: AdminRestaurantCrawlTruthSource[];
  source_reporting: AdminRestaurantCrawlTruthSourceReporting;
}

export async function getAdminRestaurantCrawlTruth(id: string): Promise<ApiResponse<AdminRestaurantCrawlTruth>> {
  return fetchWithAuth(`/api/v1/admin/restaurants/${id}/crawl_truth`);
}

// ============= PAIRME (QM admin only) =============
// GET /api/v1/admin/restaurants/:id/pairme. Writer: the BE rake
// pairme:load_venue. Legs join to wines on wine_id, never on a label.

export interface AdminPairmeWine {
  wine_id: string;
  producer: string | null;
  wine_name: string | null;
  vintage: string | null;
  list_source: string | null;
  glass_cents: number | null;
  bottle_cents: number | null;
  say: string | null;
  say_source: 'authored' | 'drafted' | 'grape_fallback' | null;
}

export interface AdminPairmeLeg {
  wine_id: string;
  why: string;
}

export interface AdminPairmeDish {
  dish_id: string;
  name: string;
  course?: string;
  pairings: AdminPairmeLeg[];
}

export interface AdminRestaurantPairme {
  venue: { id: string; name: string } | null;
  wines?: AdminPairmeWine[];
  pairings?: AdminPairmeDish[];
}

export async function getAdminRestaurantPairme(id: string): Promise<ApiResponse<AdminRestaurantPairme>> {
  return fetchWithAuth(`/api/v1/admin/restaurants/${id}/pairme`);
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
    const response = await fetchWithPolicy(`${API_BASE_URL}/api/v1/admin/conference-leads`, {
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
    const response = await fetchWithPolicy(`${API_BASE_URL}/api/v1/admin/conference-leads/ocr`, {
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

export async function getAdminBrand(id: string): Promise<ApiResponse<AdminBrandDetail>> {
  return fetchWithAuth(`/api/v1/admin/brands/${id}`);
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
    const response = await fetchWithPolicy(`${API_BASE_URL}/api/v1/admin/matching-engine/chat`, {
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

export async function adminBulkUpdateSubcategory(catalogId: string, productIds: string[], standard_subcategory: string): Promise<ApiResponse<{ updated: number; standard_subcategory: string }>> {
  return fetchWithAuth('/api/v1/admin/matching-engine/catalog-bulk-update', {
    method: 'PATCH',
    body: JSON.stringify({ catalog_id: catalogId, product_ids: productIds, standard_subcategory }),
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
  /** Brand-rule hierarchy. All three are serialized by
   *  admin/brand_rules_controller.rb:137-139 and were simply not declared
   *  here, so QMAdminBrandRules read them through `as any` casts. They are
   *  declared now because the delete confirm has to state what deleting a
   *  parent does to the variants under it: BrandRule
   *  `has_many :child_brands, dependent: :nullify`, so those rows survive but
   *  are silently detached. */
  parent_brand_id: string | null;
  parent_brand_name: string | null;
  child_brands: Array<{ id: string; brand_name: string }>;
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
  overall: 'healthy' | 'degraded' | 'unhealthy';
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

export interface HealthHistoryEntry {
  status: 'ok' | 'warning' | 'error';
  message: string;
  checked_at: string;
}

export interface HealthServiceHistory {
  name: string;
  current_status: 'ok' | 'warning' | 'error';
  history: HealthHistoryEntry[];
  last_incident: string | null;
}

export interface HealthHistory {
  services: Record<string, HealthServiceHistory>;
}

export async function getAdminHealthHistory(): Promise<ApiResponse<HealthHistory>> {
  return fetchWithAuth('/api/v1/admin/health/history');
}

// ============= EXCLUSION RULES =============

export interface ExclusionRule {
  id: string;
  word: string;
  from_category: string;
  to_category: string;
  source: 'manual' | 'suggested' | 'approved';
  active: boolean;
  products_affected: number;
  confidence: number;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  product_name: string;
  from_category: string;
  to_category: string;
  rule_word: string;
  applied_by: string;
  created_at: string;
}

export interface ExclusionRulesResponse {
  active_rules: Record<string, ExclusionRule[]>;
  suggested_rules: ExclusionRule[];
  recent_audit_log: AuditLogEntry[];
}

export async function getExclusionRules(): Promise<ApiResponse<ExclusionRulesResponse>> {
  return fetchWithAuth('/api/v1/admin/exclusion_rules');
}

export async function createExclusionRule(data: {
  word: string;
  from_category: string;
  to_category: string;
  apply_now?: boolean;
}): Promise<ApiResponse<ExclusionRule>> {
  return fetchWithAuth('/api/v1/admin/exclusion_rules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateExclusionRule(
  id: string,
  data: { word?: string; from_category?: string; to_category?: string }
): Promise<ApiResponse<ExclusionRule>> {
  return fetchWithAuth(`/api/v1/admin/exclusion_rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteExclusionRule(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchWithAuth(`/api/v1/admin/exclusion_rules/${id}`, {
    method: 'DELETE',
  });
}

export async function approveExclusionRule(id: string): Promise<ApiResponse<ExclusionRule>> {
  return fetchWithAuth(`/api/v1/admin/exclusion_rules/${id}/approve`, {
    method: 'POST',
  });
}

export async function rejectExclusionRule(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchWithAuth(`/api/v1/admin/exclusion_rules/${id}/reject`, {
    method: 'POST',
  });
}

export async function applyAllExclusionRules(): Promise<ApiResponse<{ moved: number; log: AuditLogEntry[] }>> {
  return fetchWithAuth('/api/v1/admin/exclusion_rules/apply_all', {
    method: 'POST',
  });
}

// ============= CLUSTER LABELS =============

export interface ClusterLabel {
  id: string;
  cluster_id: string | null;
  canonical_product: string | null;
  product_family: string | null;
  category: string | null;
  form_type: string | null;
  compound_type: 'identity' | 'modified' | 'true' | null;
  identity_flags: Record<string, unknown>;
  confidence: number | null;
  status: string;
  prompt_version: string;
  model_id: string;
  created_at: string;
  updated_at: string;
}

export interface ClusterLabelUpdate {
  category?: string | null;
  form_type?: string | null;
  compound_type?: 'identity' | 'modified' | 'true' | null;
  identity_flags?: Record<string, unknown>;
}

export type ClusterLabelReasonCode =
  | 'misclassified_category'
  | 'wrong_form_type'
  | 'identity_lock_fix'
  | 'compound_type_correction'
  | 'admin_seeded_truth'
  | 'merge_consolidation'
  | 'admin_rollback'
  | 'other';

export interface ClusterLabelHighImpact {
  is_high_impact: boolean;
  member_count: number;
  product_count: number;
  is_umbrella: boolean;
  reasons: string[];
}

export interface ClusterLabelAuditLogEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  reason_code: ClusterLabelReasonCode | null;
  changed_at: string;
  changed_by_user_id: string;
  before_snapshot: Record<string, unknown>;
  after_snapshot: Record<string, unknown>;
}

export interface ClusterLabelDetail {
  cluster_label: ClusterLabel;
  high_impact: ClusterLabelHighImpact;
  recent_audit_logs: ClusterLabelAuditLogEntry[];
}

export interface ClusterLabelUpdatePayload {
  fields: ClusterLabelUpdate;
  reason_code: ClusterLabelReasonCode;
  reason?: string;
  confirm_warnings?: boolean;
}

export interface ClusterLabelWarning {
  field: string;
  message: string;
}

// v1 — kept for backward compatibility
export async function updateClusterLabel(
  id: string,
  fields: ClusterLabelUpdate,
  reason?: string
): Promise<ApiResponse<ClusterLabel>> {
  return fetchWithAuth(`/api/v1/admin/cluster_labels/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ cluster_label: fields, reason }),
  });
}

export async function getClusterLabel(id: string): Promise<ApiResponse<ClusterLabelDetail>> {
  return fetchWithAuth(`/api/v1/admin/cluster_labels/${id}`);
}

// fetchWithAuth returns { error } on non-2xx, discarding other fields like `warnings`.
// For the soft-validation path we need to retain `warnings` from the 422 body.
// This wrapper reads the raw response body and surfaces both error and warnings.
export async function updateClusterLabelV2(
  id: string,
  payload: ClusterLabelUpdatePayload
): Promise<ApiResponse<ClusterLabelDetail> & { warnings?: ClusterLabelWarning[] }> {
  const token = localStorage.getItem('quoteme_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetchWithPolicy(`${API_BASE_URL}/api/v1/admin/cluster_labels/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        cluster_label: payload.fields,
        reason_code: payload.reason_code,
        reason: payload.reason,
        confirm_warnings: payload.confirm_warnings,
      }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        error: body.error || `Request failed (${response.status})`,
        warnings: body.warnings || undefined,
      };
    }

    return { data: body as ClusterLabelDetail };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function rollbackClusterLabel(
  id: string,
  auditLogId: string,
  reason?: string
): Promise<ApiResponse<ClusterLabelDetail>> {
  return fetchWithAuth(`/api/v1/admin/cluster_labels/${id}/rollback`, {
    method: 'POST',
    body: JSON.stringify({ audit_log_id: auditLogId, reason }),
  });
}

export interface ClusterLabelListRow {
  id: string;
  canonical_product: string | null;
  category: string | null;
  form_type: string | null;
  compound_type: 'identity' | 'modified' | 'true' | null;
  confidence: number | null;
  status: string;
  created_via: string;
  identity_flags_count: number;
  last_edited: string;
  has_been_edited: boolean;
}

export interface ClusterLabelListPriorityCounts {
  recently_edited: number;
  umbrella: number;
  high_product_count: number;
  low_confidence: number;
  recently_rolled_back: number;
}

export interface ClusterLabelListResponse {
  rows: ClusterLabelListRow[];
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
  priority_counts: ClusterLabelListPriorityCounts;
}

export interface ClusterLabelListFilters {
  q?: string;
  category?: string;
  form_type?: string;
  compound_type?: 'identity' | 'modified' | 'true' | 'null';
  created_via?: string;
  has_been_edited?: boolean;
  recently_edited?: boolean;
  page?: number;
  per_page?: number;
  sort?: string; // e.g. 'canonical_product_asc', 'last_edited_desc'
}

export interface BulkUpdatePayload {
  ids: string[];
  updates: {
    category?: string | null;
    form_type?: string | null;
    compound_type?: 'identity' | 'modified' | 'true' | null;
    identity_flags?: Record<string, unknown>;
  };
  reason_code: ClusterLabelReasonCode;
  reason?: string;
  confirm_warnings?: boolean;
}

export interface BulkUpdateResult {
  updated: { id: string; fields_changed: string[] }[];
  unchanged: string[];
  failed: { id: string; error: string }[];
}

export interface BulkUpdateWarning {
  id: string;
  field: string;
  message: string;
}

export async function bulkUpdateClusterLabels(
  payload: BulkUpdatePayload
): Promise<ApiResponse<BulkUpdateResult> & { warnings?: BulkUpdateWarning[] }> {
  const token = localStorage.getItem('quoteme_token');
  const res = await fetchWithPolicy(`${API_BASE_URL}/api/v1/admin/cluster_labels/bulk_update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok) return { data: body };
  return body; // includes error + warnings if present
}

export async function listClusterLabels(
  filters: ClusterLabelListFilters = {}
): Promise<ApiResponse<ClusterLabelListResponse>> {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.form_type) params.set('form_type', filters.form_type);
  if (filters.compound_type) params.set('compound_type', filters.compound_type);
  if (filters.created_via) params.set('created_via', filters.created_via);
  if (filters.has_been_edited) params.set('has_been_edited', 'true');
  if (filters.recently_edited) params.set('recently_edited', 'true');
  if (filters.page) params.set('page', String(filters.page));
  if (filters.per_page) params.set('per_page', String(filters.per_page));
  if (filters.sort) params.set('sort', filters.sort);
  const qs = params.toString();
  return fetchWithAuth(`/api/v1/admin/cluster_labels${qs ? `?${qs}` : ''}`);
}

// ============= RESTAURANT GROUPS =============

export interface AdminRestaurantGroup {
  id: string;
  name: string;
  status: string;
  restaurant_count: number;
  created_at: string;
  /** The group's PairMe plan status (subscriptions.status); null when it has none. QM admin only. */
  billing_status?: string | null;
  /**
   * The group admin, who pays (Moose, 2026-10-20). QM admin only; null on
   * groups made before then. Writer: create and update below. The backend
   * puts them on the group's Stripe customer when the first payment link is
   * made, and refuses a link until name and email are set.
   */
  admin_name?: string | null;
  admin_email?: string | null;
  admin_phone?: string | null;
}

/** One payment for every restaurant in the group (Pairme::GroupBilling). */
export interface AdminRestaurantGroupBilling {
  /** STRIPE_PAIRME_GROUP_PRICE_ID is set on the backend. */
  configured: boolean;
  status: string | null;
  /** Active, so every restaurant in the group is covered. */
  paid: boolean;
  current_period_end: string | null;
  has_customer: boolean;
}

export interface AdminRestaurantGroupDetail extends AdminRestaurantGroup {
  billing?: AdminRestaurantGroupBilling | null;
  restaurants: Array<{
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    status: string;
  }>;
}

export async function getAdminRestaurantGroups(): Promise<ApiResponse<AdminRestaurantGroup[]>> {
  return fetchWithAuth('/api/v1/restaurant_groups');
}

export async function getAdminRestaurantGroup(id: string): Promise<ApiResponse<AdminRestaurantGroupDetail>> {
  return fetchWithAuth(`/api/v1/restaurant_groups/${id}`);
}

export async function createAdminRestaurantGroup(data: {
  name: string;
  status?: string;
  /** Required by the backend for every new group (Moose, 2026-10-20). */
  admin_name?: string;
  admin_email?: string;
  admin_phone?: string;
}): Promise<ApiResponse<AdminRestaurantGroup>> {
  // TOP-LEVEL fields: RestaurantGroupsController reads params[:name] and
  // params[:status], not a restaurant_group wrapper. Wrapped, every create
  // failed with "param is missing or the value is empty or invalid: name"
  // (Moose's walk, 2026-10-11).
  return fetchWithAuth('/api/v1/restaurant_groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminRestaurantGroup(
  id: string,
  data: { name?: string; status?: string; admin_name?: string; admin_email?: string; admin_phone?: string }
): Promise<ApiResponse<AdminRestaurantGroup>> {
  // Top-level, for the same reason as create: update reads params[:name].
  return fetchWithAuth(`/api/v1/restaurant_groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * The backend answers with the RESTAURANT it moved, not the group. Callers
 * reload the group afterwards. billing_sync says what happened to Stripe's
 * quantity for each paying group touched ("updated", "unchanged", "failed").
 */
export interface GroupMembershipChange {
  id: string;
  name: string;
  restaurant_group_id: string | null;
  billing_sync?: Record<string, string>;
  /** A joining restaurant's own plan: "cancel_at_period_end", "already" or "failed". */
  own_plans?: Record<string, string>;
}

export async function addRestaurantToGroup(
  groupId: string,
  data: { restaurant_id: string } | { name: string; city?: string; state?: string }
): Promise<ApiResponse<GroupMembershipChange>> {
  return fetchWithAuth(`/api/v1/restaurant_groups/${groupId}/add_restaurant`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** QM admin only. Takes the restaurant out of the group; its group coverage ends. */
export async function removeRestaurantFromGroup(
  groupId: string,
  restaurantId: string
): Promise<ApiResponse<GroupMembershipChange>> {
  return fetchWithAuth(`/api/v1/restaurant_groups/${groupId}/remove_restaurant`, {
    method: 'POST',
    body: JSON.stringify({ restaurant_id: restaurantId }),
  });
}

/** One Stripe price on the PairMe group product, named by its lookup_key. */
export interface GroupPaymentOffer {
  lookup_key: string;
  price_id: string;
  nickname: string | null;
  /** Integer cents per restaurant per interval. */
  unit_amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count: number;
}

/** A Stripe coupon. amount_off is integer cents. */
export interface GroupPaymentCoupon {
  id: string;
  name: string | null;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  duration: 'once' | 'repeating' | 'forever';
  duration_in_months: number | null;
}

/**
 * QM admin only. The offer menu: active Stripe prices for the allowed lookup
 * keys, the valid coupons, and how many active restaurants the group has.
 * 503 "Billing is not set up yet" when no allowed price exists in Stripe.
 */
export async function getGroupPaymentOffers(
  groupId: string
): Promise<ApiResponse<{ offers: GroupPaymentOffer[]; coupons: GroupPaymentCoupon[]; active_restaurant_count: number }>> {
  return fetchWithAuth(`/api/v1/restaurant_groups/${groupId}/payment_offers`);
}

/**
 * QM admin only. A Stripe Checkout link for one offer (lookup_key) and an
 * optional coupon, quantity = the group's active restaurants. Whoever pays
 * needs no login. 422 for an offer or coupon Stripe will not take; 409 when
 * the group is already paying.
 */
export async function createGroupPaymentLink(
  groupId: string,
  choice: { lookup_key: string; coupon?: string }
): Promise<ApiResponse<{ checkout_url: string; quantity: number; billing: AdminRestaurantGroupBilling }>> {
  return fetchWithAuth(`/api/v1/restaurant_groups/${groupId}/payment_link`, {
    method: 'POST',
    body: JSON.stringify(choice.coupon ? choice : { lookup_key: choice.lookup_key }),
  });
}

// ============= RESTAURANT CREATE =============

export interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  address_2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  distributor_id: string;
  restaurant_group_id: string | null;
  google_place_id: string | null;
  address_verified: boolean;
  test_seeded: boolean;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRestaurantInput {
  name: string;
  city: string;
  state: string;
  country?: string;
  address?: string;
  address_2?: string;
  zip?: string;
  phone?: string;
  email?: string;
  google_place_id?: string;
  restaurant_group_id?: string;
  distributor_id?: string; // only QM admin needs this
}

export interface DuplicateRestaurantError {
  error: string;
  existing_id: string;
}

export async function createRestaurant(
  input: CreateRestaurantInput
): Promise<ApiResponse<Restaurant> & { duplicateId?: string }> {
  const token = localStorage.getItem('quoteme_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetchWithPolicy(`${API_BASE_URL}/api/v1/admin/restaurants`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ restaurant: input }),
    });

    if (response.status === 409) {
      const body: DuplicateRestaurantError = await response.json().catch(() => ({ error: 'Duplicate restaurant', existing_id: '' }));
      return { error: body.error || 'Duplicate restaurant', duplicateId: body.existing_id };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `Request failed (${response.status})` };
    }

    const data: Restaurant = await response.json();
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ============= RESTAURANT ADMIN ASSIGNMENT =============

export interface AssignRestaurantAdminNewUserInput {
  email: string;
  first_name: string;
  last_name: string;
}

export interface AssignRestaurantAdminResult {
  restaurant_admin: { id: string; email: string; name: string };
  previous_admin_user_id: string | null;
}

export async function assignRestaurantAdminNewUser(
  restaurantId: string,
  user: AssignRestaurantAdminNewUserInput
): Promise<ApiResponse<AssignRestaurantAdminResult>> {
  return fetchWithAuth(`/api/v1/admin/restaurants/${restaurantId}/restaurant_admin`, {
    method: 'POST',
    body: JSON.stringify({ user }),
  });
}

export async function assignRestaurantAdminExistingUser(
  restaurantId: string,
  userId: string
): Promise<ApiResponse<AssignRestaurantAdminResult>> {
  return fetchWithAuth(`/api/v1/admin/restaurants/${restaurantId}/restaurant_admin`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

// ============= ADMIN RESTAURANT CONTACTS =============

export interface AdminRestaurantContact {
  id: string;
  restaurant_id: string;
  first_name: string;
  last_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
}

export interface CreateAdminRestaurantContactInput {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role?: string;
  is_primary?: boolean;
}

export async function createAdminRestaurantContact(
  restaurantId: string,
  data: CreateAdminRestaurantContactInput
): Promise<ApiResponse<AdminRestaurantContact>> {
  return fetchWithAuth(`/api/v1/admin/restaurants/${restaurantId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============= KNOWLEDGE GAP REVIEW QUEUE =============

export interface KnowledgeGapSubmissionSourceData {
  component_text: string;
  frequency_count: number;
  sample_quote_ids?: string[];
  first_seen?: string;
  last_seen?: string;
  suggested_canonical?: string | null;
  suggested_category?: string | null;
  suggested_form_type?: string | null;
  suggested_compound_type?: 'identity' | 'modified' | 'true' | null;
  commonly_finished_flag?: boolean | null;
  rep_notes?: string | null;
  llm_suggestion?: unknown;
  [key: string]: unknown;
}

export interface KnowledgeGapSubmission {
  id: string;
  submission_type: 'knowledge_gap';
  status: 'pending' | 'approved' | 'archived';
  source_data: KnowledgeGapSubmissionSourceData;
  submitted_by: string | null;
  submitted_at: string;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  resolved_data: Record<string, unknown> | null;
  // suspected-tail clumping v1 — non-null when SuspectedTailClumpService has grouped
  // this submission into a cluster by TF-IDF cosine similarity (threshold 0.65).
  cluster_id: string | null;
}

export type KnowledgeGapEditedData = {
  suggested_canonical?: string;
  suggested_category?: string;
  suggested_form_type?: string;
  suggested_compound_type?: 'identity' | 'modified' | 'true' | null;
};

export async function listKnowledgeGapSubmissions(
  status: 'pending' | 'approved' | 'archived' = 'pending',
  includeArchived?: boolean
): Promise<ApiResponse<KnowledgeGapSubmission[]>> {
  const params = new URLSearchParams({ status });
  if (includeArchived) params.set('include_archived', 'true');
  return fetchWithAuth(`/api/v1/admin/knowledge_gap_submissions?${params.toString()}`);
}

export async function approveKnowledgeGapSubmission(
  id: string,
  editedData?: KnowledgeGapEditedData,
  reviewNotes?: string
): Promise<ApiResponse<KnowledgeGapSubmission>> {
  return fetchWithAuth(`/api/v1/admin/knowledge_gap_submissions/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ edited_data: editedData, review_notes: reviewNotes }),
  });
}

// Renamed from rejectKnowledgeGapSubmission (v2.2 archive semantics).
// G4: this function only appears on KGF surfaces -- safe to rename.
export async function archiveKnowledgeGapSubmission(
  id: string,
  reviewNotes?: string
): Promise<ApiResponse<KnowledgeGapSubmission>> {
  return fetchWithAuth(`/api/v1/admin/knowledge_gap_submissions/${id}/archive`, {
    method: 'POST',
    body: JSON.stringify({ review_notes: reviewNotes }),
  });
}

export async function restoreKnowledgeGapSubmission(
  id: string
): Promise<ApiResponse<KnowledgeGapSubmission>> {
  return fetchWithAuth(`/api/v1/admin/knowledge_gap_submissions/${id}/restore`, {
    method: 'POST',
  });
}

// ── Knowledge Gap Filler V2 ────────────────────────────────────────────────────

export interface KnowledgeGapSubmissionV2 extends KnowledgeGapSubmission {
  // source_data shape extended with placement + parent fields
}

export interface ParentClusterLabelResult {
  id: string;
  canonical_product: string;
  category: string | null;
}

export async function approveKnowledgeGapAsTail(
  id: string,
  parentClusterLabelId: string,
  reviewNotes?: string
): Promise<ApiResponse<KnowledgeGapSubmission>> {
  return fetchWithAuth(`/api/v1/admin/knowledge_gap_submissions/${id}/approve_as_tail`, {
    method: 'POST',
    body: JSON.stringify({ parent_cluster_label_id: parentClusterLabelId, review_notes: reviewNotes }),
  });
}

export async function setKnowledgeGapPlacement(
  id: string,
  placement: 'tail_to_existing_head' | 'new_head',
  suggestedParentId?: string
): Promise<ApiResponse<KnowledgeGapSubmission>> {
  return fetchWithAuth(`/api/v1/admin/knowledge_gap_submissions/${id}/set_placement`, {
    method: 'POST',
    body: JSON.stringify({ placement, suggested_parent_id: suggestedParentId }),
  });
}

export async function searchClusterLabelParents(
  query: string,
  limit: number = 20
): Promise<ApiResponse<ParentClusterLabelResult[]>> {
  return fetchWithAuth(
    `/api/v1/admin/knowledge_gap_submissions/parent_search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
}

// ── Knowledge Gap Filler v2.1 ─────────────────────────────────────────────────

export interface BulkApproveAsTailItem {
  id: string;
  parent_cluster_label_id: string;
  review_notes?: string;
}

export interface BulkApproveAsTailResponse {
  approved: string[];
  failed: Array<{ id: string; error: string }>;
}

export async function bulkApproveAsTail(
  approvals: BulkApproveAsTailItem[]
): Promise<ApiResponse<BulkApproveAsTailResponse>> {
  return fetchWithAuth('/api/v1/admin/knowledge_gap_submissions/bulk_approve_as_tail', {
    method: 'POST',
    body: JSON.stringify({ approvals }),
  });
}

export interface BulkArchiveResponse {
  archived: string[];
  failed: Array<{ id: string; error: string }>;
}

export async function bulkArchiveKnowledgeGap(
  ids: string[],
  reviewNotes?: string
): Promise<ApiResponse<BulkArchiveResponse>> {
  return fetchWithAuth('/api/v1/admin/knowledge_gap_submissions/bulk_archive', {
    method: 'POST',
    body: JSON.stringify({ ids, review_notes: reviewNotes }),
  });
}

export interface BulkMoveToHeadResponse {
  moved: string[];
  failed: Array<{ id: string; error: string }>;
}

export async function bulkMoveToHead(
  ids: string[]
): Promise<ApiResponse<BulkMoveToHeadResponse>> {
  return fetchWithAuth('/api/v1/admin/knowledge_gap_submissions/bulk_move_to_head', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export interface KnowledgeGapHistoryRow {
  id: string;
  candidate_text: string | null;
  action: 'approved_as_tail' | 'approved_as_new_head' | 'archived';
  parent_canonical: string | null;
  parent_cluster_label_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export interface KnowledgeGapHistoryResponse {
  history: KnowledgeGapHistoryRow[];
  total_count: number;
}

export async function listKnowledgeGapHistory(
  limit: number = 25,
  offset: number = 0
): Promise<ApiResponse<KnowledgeGapHistoryResponse>> {
  return fetchWithAuth(
    `/api/v1/admin/knowledge_gap_submissions/history?limit=${limit}&offset=${offset}`
  );
}

export async function undoKnowledgeGapTail(
  submissionId: string
): Promise<ApiResponse<KnowledgeGapSubmission>> {
  return fetchWithAuth(`/api/v1/admin/knowledge_gap_submissions/${submissionId}/undo_tail`, {
    method: 'POST',
  });
}

// ── Suspected-tail clumping v1 ─────────────────────────────────────────────────

/**
 * Decision log record written after the operator bulk-acts on a cluster.
 * Mirrors the TailClusterDecision BE model (tail_cluster_decisions_controller.rb#serialize).
 * The actual approval/archive mutations happen via bulkApproveAsTail / bulkArchiveKnowledgeGap;
 * this is a separate forensic write so calibration errors don't affect UX.
 */
export interface TailClusterDecision {
  id: string;
  cluster_id: string;
  decision: 'kept' | 'split' | 'rejected';
  cluster_size: number;
  threshold_used: number;
  avg_intra_similarity: number | null;
  submission_ids: string[];
  parent_cluster_label_id: string | null;
  reviewer_user_id: string | null;
  decided_at: string | null;
  review_notes: string | null;
}

export interface RecordTailClusterDecisionParams {
  cluster_id: string;
  decision: 'kept' | 'split' | 'rejected';
  submission_ids: string[];
  threshold_used: number;
  avg_intra_similarity?: number | null;
  parent_cluster_label_id?: string | null;
  review_notes?: string | null;
}

export async function recordTailClusterDecision(
  params: RecordTailClusterDecisionParams
): Promise<ApiResponse<TailClusterDecision>> {
  return fetchWithAuth('/api/v1/admin/tail_cluster_decisions', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── QM-Admin Logo Uploads (B-181) ───────────────────────────────────────────

/** POST /api/v1/admin/brands/:id/logo — QM admin uploads logo for a brand. */
export async function uploadAdminBrandLogo(
  brandId: string,
  file: File,
): Promise<ApiResponse<{ logo_url: string }>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const formData = new FormData();
  formData.append('logo', file);

  try {
    const response = await fetchWithPolicy(`${API_BASE_URL}/api/v1/admin/brands/${brandId}/logo`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return { error: errBody.error || `HTTP ${response.status}` };
    }
    return { data: await response.json() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

/** POST /api/v1/admin/distributors/:id/logo — QM admin uploads logo for a distributor. */
export async function uploadAdminDistributorLogo(
  distributorId: string,
  file: File,
): Promise<ApiResponse<{ logo_url: string }>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const formData = new FormData();
  formData.append('logo', file);

  try {
    const response = await fetchWithPolicy(`${API_BASE_URL}/api/v1/admin/distributors/${distributorId}/logo`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return { error: errBody.error || `HTTP ${response.status}` };
    }
    return { data: await response.json() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Operational Memory Milestone 0 — Gap Filler "Needs Your Pick" (OME-M0)
// ═══════════════════════════════════════════════════════════════════════
//
// Distinct from the Knowledge Gap Filler (corpus/ontology tail-clumping tool
// above). This surfaces components the matching engine could NOT confidently
// resolve on live quotes -- deduped by (distributor_id, canonical_key) and
// frequency-ranked by the BE.
//
// READ-ONLY. There is no pick endpoint. The routes are GET
// admin/gap_filler_needs_pick and GET admin/gap_filler_needs_pick/:id/quotes,
// and this file exports only the two matching getters. The original wording
// here ("so an admin can pick the right catalog product once and have it stick
// for every future occurrence") described a capability that was never built,
// which is why the Memory Learnings panel beside it reads zero promoted
// learnings. Do not restore that sentence without the endpoint.

export interface GapFillerNeedPick {
  canonical_key: string;
  distributor_id: string;
  distributor_name: string;
  component_name: string;
  occurrence_count: number;
  miss_reasons: Record<string, number>;
  first_seen: string;
  last_seen: string;
  drill_down_token: string;
}

export interface GapFillerNeedsPickResponse {
  needs_pick: GapFillerNeedPick[];
  count: number;
}

export async function getGapFillerNeedsPick(params?: {
  distributor_id?: string;
  limit?: number;
}): Promise<ApiResponse<GapFillerNeedsPickResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.distributor_id) searchParams.set('distributor_id', params.distributor_id);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return fetchWithAuth(`/api/v1/admin/gap_filler_needs_pick${qs ? `?${qs}` : ''}`);
}

export interface GapFillerSourceQuote {
  quote_id: string;
  quote_status: string;
  restaurant_id: string;
  restaurant_name: string;
  rep_id: string;
  rep_email: string;
  miss_reason: string;
  occurred_at: string;
}

// The drill-down endpoint returns an OBJECT ({ canonical_key, distributor_id,
// quotes: [...], count }), not a bare array — the source quotes live under
// `.quotes`. (This mismatch is exactly why the row expander rendered empty:
// the caller was setting the whole object where a GapFillerSourceQuote[] was
// expected, so `.length` was undefined and neither the empty-state nor the
// table branch fired.)
export interface GapFillerDrillDownResponse {
  canonical_key: string;
  distributor_id: string;
  quotes: GapFillerSourceQuote[];
  count: number;
}

export async function getGapFillerNeedsPickQuotes(
  drillDownToken: string
): Promise<ApiResponse<GapFillerDrillDownResponse>> {
  return fetchWithAuth(`/api/v1/admin/gap_filler_needs_pick/${encodeURIComponent(drillDownToken)}/quotes`);
}

// ─── Operational Memory Epic, Lane 2: QM-admin learnings view ─────────────
//
// Read + revert view over every promoted memory row (rep tier + distributor
// "preferred" tier), full provenance. NEVER shown to distributors -- this
// lives only under the quoteme_admin-gated /api/v1/admin namespace.

export interface OperationalMemoryLearning {
  id: string;
  tier: 'rep' | 'preferred';
  /** Only meaningful for tier "preferred" -- null for rep-tier rows.
   * Ruling 2: disambiguates a distributor-tier row into a PREFERENCE
   * (presentation only) or a MANDATE (must be visible + attributable). */
  distributor_signal_type?: 'preference' | 'mandate' | null;
  /** Present only when distributor_signal_type is "mandate". */
  mandate_reason?: string | null;
  /** Present only when distributor_signal_type is "mandate" -- who set it. */
  mandate_set_by?: { id: string; name: string; email: string } | null;
  canonical_key: string;
  category: string | null;
  catalog_version: string;
  policy_version: string;
  active: boolean;
  reverted_at: string | null;
  product: { id: string; name: string; brand: string | null; item_number: string } | null;
  distributor: { id: string; name: string } | null;
  rep: { id: string; name: string; email: string } | null;
  provenance: {
    promoted_from_operational_event_id: string | null;
    promoted_from_quote_id: string | null;
    promoted_by_user_id: string | null;
    promoted_by: { id: string; name: string; email: string } | null;
    promoted_at: string | null;
    correction_type: string | null;
    quote_id: string | null;
  };
}

export interface OperationalMemoryLearningsResponse {
  learnings: OperationalMemoryLearning[];
  count: number;
}

export async function getOperationalMemoryLearnings(params?: {
  distributor_id?: string;
  rep_id?: string;
  tier?: 'rep' | 'preferred';
  include_reverted?: boolean;
  limit?: number;
}): Promise<ApiResponse<OperationalMemoryLearningsResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.distributor_id) searchParams.set('distributor_id', params.distributor_id);
  if (params?.rep_id) searchParams.set('rep_id', params.rep_id);
  if (params?.tier) searchParams.set('tier', params.tier);
  if (params?.include_reverted) searchParams.set('include_reverted', 'true');
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return fetchWithAuth(`/api/v1/admin/operational_memory_learnings${qs ? `?${qs}` : ''}`);
}

// Future-only: stops the row from surfacing on any FUTURE alignment run.
// Never touches operational_events or any already-sent/drafted quote.
export async function revertOperationalMemoryLearning(
  id: string
): Promise<ApiResponse<OperationalMemoryLearning>> {
  return fetchWithAuth(`/api/v1/admin/operational_memory_learnings/${id}/revert`, { method: 'POST' });
}

// ============= LAUNCH CHECKLIST =============
//
// Moose, 2026-10-15: "set an SOP checklist for every restaurant in the QM
// admin page ... checkboxes for each resource, that triggers the creation,
// send, cc me, and confirmation in the admin." QM admin only; the backend is
// Admin::RestaurantOnboardingController (QuoteMe), storage
// restaurants.onboarding_checklist. Reader: the Launch checklist section on
// the QM admin restaurant page (_launchChecklistSection.tsx).

export type OnboardingStepKey =
  | 'qr_inserts'
  | 'cheat_sheet'
  | 'wine_workbook'
  | 'tablet_setup'
  | 'staff_meeting'
  | 'qr_on_menus'
  | 'first_guest'
  | 'first_staff_pairing';

export type QrInsertLayout = 'vertical' | 'horizontal';

export interface OnboardingStep {
  key: OnboardingStepKey;
  position: number;
  /** One or two words (Moose, 2026-10-15: "1/2 word titles"). From the backend step list. */
  title: string;
  /** One plain line saying what done means. */
  description: string;
  /** A lucide-react icon name, e.g. "qr-code". The section maps it to a component. */
  icon: string;
  /** Steps 1 to 4: a PDF that can be downloaded and emailed. */
  document: boolean;
  done: boolean;
  done_at: string | null;
  done_by: string | null;
  note: string | null;
  sent_to: string | null;
  cc: string | null;
  layout: QrInsertLayout | null;
}

export interface OnboardingChecklist {
  percent: number;
  steps: OnboardingStep[];
  /** The documents are built from the pairings; false until they exist. */
  paired: boolean;
  /** Who Send emails. `blocked` says why it cannot, when it cannot. */
  recipient: { email: string | null; name: string | null; blocked: string | null };
}

export async function getRestaurantOnboarding(id: string): Promise<ApiResponse<OnboardingChecklist>> {
  return fetchWithAuth(`/api/v1/admin/restaurants/${id}/onboarding`);
}

export async function setRestaurantOnboardingStep(
  id: string,
  step: OnboardingStepKey,
  done: boolean,
  note?: string,
): Promise<ApiResponse<OnboardingChecklist>> {
  return fetchWithAuth(`/api/v1/admin/restaurants/${id}/onboarding/${step}`, {
    method: 'PATCH',
    body: JSON.stringify(note ? { done, note } : { done }),
  });
}

/** Emails the document to the restaurant admin, cc the signed-in QM admin, and marks it sent. */
export async function sendRestaurantOnboardingDocument(
  id: string,
  step: OnboardingStepKey,
  layout?: QrInsertLayout,
): Promise<ApiResponse<OnboardingChecklist>> {
  return fetchWithAuth(`/api/v1/admin/restaurants/${id}/onboarding/${step}/send`, {
    method: 'POST',
    body: JSON.stringify(layout ? { layout } : {}),
  });
}

/** The PDF for a document step, for the QM admin to download. Marks nothing. */
export async function downloadRestaurantOnboardingDocument(
  id: string,
  step: OnboardingStepKey,
  layout?: QrInsertLayout,
): Promise<{ blob?: Blob; filename?: string; error?: string }> {
  const token = getAuthToken();
  const qs = layout ? `?layout=${layout}` : '';
  try {
    const response = await fetchWithPolicy(
      `${API_BASE_URL}/api/v1/admin/restaurants/${id}/onboarding/${step}/document${qs}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { error: err.error || `Download failed (${response.status})` };
    }
    const disposition = response.headers.get('content-disposition');
    const filename = disposition?.match(/filename="?([^";]+)"?/)?.[1];
    return { blob: await response.blob(), filename };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// ============= RESTAURANT LOAD BATCHES =============
//
// The QM admin loads a crawler CSV export (Moose, 2026-10-24: "a page in the
// qmadmin for me to plug in a list, and have it run soup to nuts").
//
// WRITER: Api::V1::Admin::RestaurantLoadBatchesController (QuoteMe #588) and
// RestaurantLoadBatchJob. READERS: QMAdminRestaurantLoads and
// QMAdminRestaurantLoadDetail. The server is the authority on what may run:
// can_apply / can_revert and the refusal sentences come from it, and a 409
// REFUSED carries the reason in `error`.

export type RestaurantLoadBatchStatus =
  | 'uploaded'
  | 'dry_running'
  | 'dry_run_done'
  | 'dry_run_failed'
  | 'applying'
  | 'applied'
  | 'apply_failed'
  | 'reverting'
  | 'reverted'
  | 'revert_failed';

export interface RestaurantLoadUserRef {
  id: string;
  email: string;
}

export interface RestaurantLoadLedgerCounts {
  restaurants_created: number;
  restaurants_updated: number;
  menus_created: number;
  menus_updated: number;
}

export interface RestaurantLoadBatch {
  id: string;
  status: RestaurantLoadBatchStatus | string;
  filename: string | null;
  byte_size: number | null;
  file_sha256: string | null;
  dry_run_sha256: string | null;
  row_count: number | null;
  load_batch_id: string | null;
  error: string | null;
  ledger_counts: RestaurantLoadLedgerCounts | null;
  pair_after_apply: boolean;
  pair_report: Record<string, unknown> | null;
  can_apply: boolean;
  can_revert: boolean;
  requested_by: RestaurantLoadUserRef | null;
  applied_by: RestaurantLoadUserRef | null;
  reverted_by: RestaurantLoadUserRef | null;
  // Set by POST mark_interrupted. Optional: a server before that endpoint
  // does not send it.
  marked_interrupted_by?: RestaurantLoadUserRef | null;
  started_at: string | null;
  finished_at: string | null;
  apply_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RestaurantLoadBatchDetail extends RestaurantLoadBatch {
  apply_refusal: string | null;
  revert_refusal: string | null;
  // Whether POST mark_interrupted would be accepted now, and the server's
  // sentence when it would not (a job for the batch may still be running, or
  // the batch is not applying or reverting).
  can_mark_interrupted: boolean;
  mark_interrupted_refusal: string | null;
  dry_run_report: string | null;
  apply_report: string | null;
  revert_report: string | null;
}

export interface RestaurantLoadBatchList {
  restaurant_load_batches: RestaurantLoadBatch[];
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

const RESTAURANT_LOAD_BATCHES_PATH = '/api/v1/admin/restaurant_load_batches';

/**
 * POST /api/v1/admin/restaurant_load_batches, multipart `file`. 202 with the
 * stored batch; the server queues the dry run. No Content-Type header here:
 * the browser sets the multipart boundary itself. `status` is returned on
 * failure so the page can tell a 413 (request too large) from other errors.
 */
export async function uploadRestaurantLoadBatch(
  file: File,
): Promise<ApiResponse<{ restaurant_load_batch: RestaurantLoadBatch }>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetchWithPolicy(`${API_BASE_URL}${RESTAURANT_LOAD_BATCHES_PATH}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return {
        error: errBody.error || `Upload failed (${response.status})`,
        error_code: errBody.error_code,
        status: response.status,
      };
    }
    return { data: await response.json() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

/** GET /api/v1/admin/restaurant_load_batches, newest first, no reports. */
export async function getRestaurantLoadBatches(params?: {
  page?: number;
  per_page?: number;
}): Promise<ApiResponse<RestaurantLoadBatchList>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.per_page) qs.set('per_page', String(params.per_page));
  const query = qs.toString();
  return fetchWithAuth(`${RESTAURANT_LOAD_BATCHES_PATH}${query ? `?${query}` : ''}`);
}

/** GET /api/v1/admin/restaurant_load_batches/:id, with refusals and reports. */
export async function getRestaurantLoadBatch(
  id: string,
): Promise<ApiResponse<{ restaurant_load_batch: RestaurantLoadBatchDetail }>> {
  return fetchWithAuth(`${RESTAURANT_LOAD_BATCHES_PATH}/${encodeURIComponent(id)}`);
}

/**
 * POST /api/v1/admin/restaurant_load_batches/:id/apply. This writes to
 * production. pair_after_apply is sent only when the operator ticked the box;
 * an unticked box sends an empty body and the server defaults it to false.
 * A 409 REFUSED comes back as { error, error_code: 'REFUSED', status: 409 }.
 */
export async function applyRestaurantLoadBatch(
  id: string,
  options: { pairAfterApply?: boolean } = {},
): Promise<ApiResponse<{ restaurant_load_batch: RestaurantLoadBatch }>> {
  return fetchWithAuth(`${RESTAURANT_LOAD_BATCHES_PATH}/${encodeURIComponent(id)}/apply`, {
    method: 'POST',
    body: JSON.stringify(options.pairAfterApply ? { pair_after_apply: true } : {}),
  });
}

/**
 * POST /api/v1/admin/restaurant_load_batches/:id/mark_interrupted. Releases a
 * batch a killed process left applying or reverting (applying becomes
 * apply_failed, reverting becomes revert_failed). Writes nothing to
 * restaurants or menus. 409 REFUSED as above while a job for the batch may
 * still be running.
 */
export async function markRestaurantLoadBatchInterrupted(
  id: string,
): Promise<ApiResponse<{ restaurant_load_batch: RestaurantLoadBatchDetail }>> {
  return fetchWithAuth(`${RESTAURANT_LOAD_BATCHES_PATH}/${encodeURIComponent(id)}/mark_interrupted`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** POST /api/v1/admin/restaurant_load_batches/:id/revert. 409 REFUSED as above. */
export async function revertRestaurantLoadBatch(
  id: string,
): Promise<ApiResponse<{ restaurant_load_batch: RestaurantLoadBatch }>> {
  return fetchWithAuth(`${RESTAURANT_LOAD_BATCHES_PATH}/${encodeURIComponent(id)}/revert`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// ============= BEVERAGE CORPUS (QM admin only) =============
//
// Reader of QuoteMe Api::V1::Admin::BeveragesController and
// Api::V1::Admin::WineMatchSubmissionsController (QuoteMe PR #613). The server
// refuses every role but quoteme_admin. A sort here orders an admin table;
// nothing is ranked for a diner or a rep.

export const BEVERAGE_KINDS = ['wine', 'beer', 'sake', 'spirit', 'cider', 'other'] as const;
export const BEVERAGE_COLORS = ['red', 'white', 'rose', 'sparkling', 'orange', 'dessert', 'fortified'] as const;
export type BeverageKind = (typeof BEVERAGE_KINDS)[number];
export type BeverageColor = (typeof BEVERAGE_COLORS)[number];

export type AdminBeverageSort =
  | 'name'
  | 'brand'
  | 'kind'
  | 'color'
  | 'country'
  | 'region'
  | 'restaurant_count'
  | 'distributor_count'
  | 'created_at'
  | 'updated_at';

export interface AdminBeverageRow {
  id: string;
  name: string;
  brand: { id: string; name: string | null } | null;
  kind: BeverageKind | string;
  color: BeverageColor | string | null;
  style: string | null;
  grapes: string[];
  country: string | null;
  region: string | null;
  appellation: string | null;
  needs_review: boolean;
  restaurant_count: number;
  distributor_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminBeveragesPage {
  rows: AdminBeverageRow[];
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

export interface AdminBeveragesQuery {
  page: number;
  per_page: number;
  /** Matched server-side against beverage name, producer name, region and appellation. */
  q?: string;
  kind?: string;
  color?: string;
  /** One grape; the server normalizes it before matching. */
  grape?: string;
  /** Case-insensitive equality. */
  country?: string;
  /** Case-insensitive equality. */
  region?: string;
  /** The producer brand id. */
  brand_id?: string;
  /** Producer name search: partial, case-insensitive (brands.name ILIKE). */
  brand_q?: string;
  distributor_id?: string;
  restaurant_id?: string;
  min_restaurants?: number;
  max_restaurants?: number;
  needs_review?: boolean;
  sort?: AdminBeverageSort;
  dir?: 'asc' | 'desc';
}

/** GET /api/v1/admin/beverages: paged, searched, filtered and sorted server-side. */
export async function getAdminBeverages(query: AdminBeveragesQuery): Promise<ApiResponse<AdminBeveragesPage>> {
  const params = new URLSearchParams({
    page: String(query.page),
    per_page: String(query.per_page),
  });
  const text: Array<keyof AdminBeveragesQuery> = [
    'q', 'kind', 'color', 'grape', 'country', 'region', 'brand_id', 'brand_q', 'distributor_id', 'restaurant_id', 'sort', 'dir',
  ];
  for (const key of text) {
    const value = query[key];
    if (typeof value === 'string' && value.trim() !== '') params.set(key, value.trim());
  }
  if (query.min_restaurants != null) params.set('min_restaurants', String(query.min_restaurants));
  if (query.max_restaurants != null) params.set('max_restaurants', String(query.max_restaurants));
  if (query.needs_review != null) params.set('needs_review', String(query.needs_review));

  return fetchWithAuth(`/api/v1/admin/beverages?${params.toString()}`);
}

export interface AdminBeverageDetail {
  id: string;
  name: string;
  kind: string;
  color: string | null;
  style: string | null;
  grapes: string[];
  country: string | null;
  region: string | null;
  appellation: string | null;
  aliases: string[];
  identity_key: string;
  pronunciation: string | null;
  tasting_note: {
    text: string;
    source: string | null;
    author_user_id: string | null;
    written_at: string | null;
  } | null;
  details: Record<string, unknown>;
  source_refs: Array<Record<string, unknown>>;
  needs_review: boolean;
  created_via: string | null;
  created_at: string;
  updated_at: string;
  brand: {
    id: string;
    name: string;
    kind: string | null;
    country: string | null;
    region: string | null;
    source: string | null;
    source_refs: Array<Record<string, unknown>> | null;
  } | null;
}

export interface AdminBeverageRestaurant {
  restaurant_id: string | null;
  name: string | null;
  city: string | null;
  state: string | null;
  venue_id: string;
  rows: Array<{
    capture_row_id: string;
    producer: string | null;
    wine_name: string | null;
    vintage: string | null;
    list_source: string | null;
    list_section: string | null;
    glass_cents: number | null;
    bottle_cents: number | null;
  }>;
}

export interface AdminBeverageDistributor {
  distributor_id: string;
  name: string;
  products: Array<{
    product_id: string;
    item_number: string | null;
    product_name: string | null;
    unit_size: string | null;
    upc: string | null;
    status: string | null;
  }>;
}

export interface AdminBeverageShow {
  beverage: AdminBeverageDetail;
  restaurants: AdminBeverageRestaurant[];
  diner_photo_row_count: number;
  distributors: AdminBeverageDistributor[];
  pending_wine_matches: Array<{
    id: string;
    source_table: string | null;
    source_id: string | null;
    reasons: string[] | null;
  }>;
}

/** GET /api/v1/admin/beverages/:id */
export async function getAdminBeverage(id: string): Promise<ApiResponse<AdminBeverageShow>> {
  return fetchWithAuth(`/api/v1/admin/beverages/${encodeURIComponent(id)}`);
}

/**
 * GET /api/v1/admin/beverages/summary: counts for the Beverages summary
 * strip (writer: QuoteMe Api::V1::Admin::BeveragesController#summary; reader:
 * BeveragesSummaryStrip). Every number is a count over ids.
 */
export interface AdminBeverageSummary {
  by_kind: Record<string, number>;
  total: number;
  producers: number;
  distributors_with_catalog: number;
  restaurants_carrying: number;
  wines_from_restaurant_lists: number;
  wines_from_distributor_catalogs: number;
  /** Echo of the distributor_id sent; null when none was sent. */
  estate_distributor_id: string | null;
  /** Wines that distributor sells; null when no distributor_id was sent. */
  estate_wines: number | null;
  waiting_for_review: number;
  distributor_restaurant_links: { confirmed: number; inferred: number };
  added_this_week: number;
  added_since: string;
  missing: {
    grape: number;
    tasting_note: number;
    /** Linked restaurant list rows of a wine that print no vintage (a beverage has none). */
    vintage_list_rows: number;
  };
}

export async function getAdminBeverageSummary(distributorId?: string): Promise<ApiResponse<AdminBeverageSummary>> {
  const id = distributorId?.trim();
  const query = id ? `?${new URLSearchParams({ distributor_id: id }).toString()}` : '';
  return fetchWithAuth(`/api/v1/admin/beverages/summary${query}`);
}

// DATA SUMMARY (Moose, 2026-10-30). Reader of QuoteMe
// GET /api/v1/admin/data_summary (Api::V1::Admin::DataSummaryController,
// DataSummary::Report). Market = the city + state in the restaurant's address.
// Counts only: every list carries the denominator it was counted against.
// No price amounts: glass vs bottle counts rows that print a price.

export interface DataSummaryDenominator {
  restaurants: number;
  list_rows: number;
}

export interface DataSummaryList<T> {
  items: (T & { restaurants: number; list_rows: number; share_of_restaurants: number | null })[];
  /** Distinct items before the limit. */
  distinct_total: number;
  denominator: DataSummaryDenominator;
  /** What the denominator counts, in words. */
  basis: string;
  /** Rows in the base with no value for this list (e.g. no country). */
  rows_without_value?: number;
}

export interface AdminDataSummary {
  market: { state: string | null; city: string | null; limit: number };
  markets: {
    states: { state: string; restaurants: number }[];
    cities: { city: string; restaurants: number }[];
  };
  coverage: {
    restaurants: number;
    with_food_menu: number;
    with_wine_list: number;
    with_linked_wine_rows: number;
    list_rows: number;
    linked_rows: number;
    unlinked_rows: number;
    linked_share: number | null;
  };
  wines: {
    carried: DataSummaryList<{
      beverage_id: string;
      name: string;
      color: string | null;
      producer_id: string | null;
      producer: string | null;
    }>;
    grapes: DataSummaryList<{ grape: string }>;
    colors: DataSummaryList<{ color: string }>;
    countries: DataSummaryList<{ country: string }>;
    regions: DataSummaryList<{ region: string }>;
    producers: DataSummaryList<{ producer_id: string; producer: string }>;
    glass_bottle: {
      glass_only: number;
      bottle_only: number;
      both: number;
      neither: number;
      restaurants_by_the_glass: number;
      restaurants_by_the_bottle: number;
      glass_share: number | null;
      bottle_share: number | null;
      denominator: DataSummaryDenominator;
      basis: string;
    };
  };
  generated_at: string;
}

export async function getAdminDataSummary(params: {
  state?: string;
  city?: string;
  limit?: number;
}): Promise<ApiResponse<AdminDataSummary>> {
  const q = new URLSearchParams();
  if (params.state) q.set('state', params.state);
  if (params.city) q.set('city', params.city);
  if (params.limit) q.set('limit', String(params.limit));
  const query = q.toString();
  return fetchWithAuth(`/api/v1/admin/data_summary${query ? `?${query}` : ''}`);
}

export type WineMatchStatus = 'pending' | 'approved' | 'archived';

export interface WineMatchSubmission {
  id: string;
  status: WineMatchStatus | string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by_user_id: string | null;
  review_notes: string | null;
  /** Written by Beverages::Resolver#open_submission! */
  source_data: {
    source_table?: string;
    source_id?: string;
    beverage_id?: string;
    outcome?: string;
    reasons?: string[];
    candidate_beverage_ids?: string[];
    identity_key?: string;
    source_ref?: Record<string, unknown>;
    raw?: Record<string, unknown>;
    relinked_from?: string;
  };
  resolved_data: Record<string, unknown> | null;
  beverage: {
    id: string;
    name: string;
    kind: string;
    color: string | null;
    brand: { id: string; name: string } | null;
  } | null;
}

export interface WineMatchSubmissionsPage {
  rows: WineMatchSubmission[];
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

/** GET /api/v1/admin/wine_match_submissions */
export async function getWineMatchSubmissions(query: {
  status?: WineMatchStatus;
  page: number;
  per_page: number;
}): Promise<ApiResponse<WineMatchSubmissionsPage>> {
  const params = new URLSearchParams({
    status: query.status || 'pending',
    page: String(query.page),
    per_page: String(query.per_page),
  });
  return fetchWithAuth(`/api/v1/admin/wine_match_submissions?${params.toString()}`);
}

/** POST /api/v1/admin/wine_match_submissions/:id/approve. The link stands. */
export async function approveWineMatch(id: string, reviewNotes?: string): Promise<ApiResponse<WineMatchSubmission>> {
  return fetchWithAuth(`/api/v1/admin/wine_match_submissions/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    body: JSON.stringify(reviewNotes ? { review_notes: reviewNotes } : {}),
  });
}

/** POST /api/v1/admin/wine_match_submissions/:id/relink. The source row moves to beverageId. */
export async function relinkWineMatch(
  id: string,
  beverageId: string,
  reviewNotes?: string,
): Promise<ApiResponse<WineMatchSubmission>> {
  return fetchWithAuth(`/api/v1/admin/wine_match_submissions/${encodeURIComponent(id)}/relink`, {
    method: 'POST',
    body: JSON.stringify({ beverage_id: beverageId, ...(reviewNotes ? { review_notes: reviewNotes } : {}) }),
  });
}

/** POST /api/v1/admin/wine_match_submissions/:id/reject. The source row is unlinked. */
export async function rejectWineMatch(id: string, reviewNotes?: string): Promise<ApiResponse<WineMatchSubmission>> {
  return fetchWithAuth(`/api/v1/admin/wine_match_submissions/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: JSON.stringify(reviewNotes ? { review_notes: reviewNotes } : {}),
  });
}
