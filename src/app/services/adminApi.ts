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
