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

// Quote Types
export interface Menu {
  id: string;
  name: string;
  raw_text: string;
  component_count: number;
}

export interface Quote {
  id: string;
  menu_id: string;
  line_count: number;
  total_cents: number;
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

export async function createGuestQuote(quoteData: GuestQuote): Promise<ApiResponse<Quote>> {
  return fetchWithGuest('/api/v1/guest/quotes', {
    method: 'POST',
    body: JSON.stringify({ ...quoteData, distributor_id: '88c1038d-6b3b-4cc0-ba35-32c32f435f91' }),
  });
}

export async function getGuestQuote(id: string): Promise<ApiResponse<Quote>> {
  return fetchWithGuest(`/api/v1/guest/quotes/${id}`);
}

export async function convertGuestToUser(data: GuestConvertData): Promise<ApiResponse<{ message: string; user: any; quotes_used?: number }>> {
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

export async function getCatalogs(): Promise<ApiResponse<any[]>> {
  return fetchWithAuth('/api/v1/catalogs');
}

export async function uploadCatalog(skus: any[]): Promise<ApiResponse<any>> {
  return fetchWithAuth('/api/v1/catalogs', {
    method: 'POST',
    body: JSON.stringify({ skus }),
  });
}

export async function createMenu(menuData: { raw_text: string; name: string }): Promise<ApiResponse<Menu>> {
  return fetchWithAuth('/api/v1/menus', {
    method: 'POST',
    body: JSON.stringify(menuData),
  });
}

export async function getMenu(id: string): Promise<ApiResponse<Menu>> {
  return fetchWithAuth(`/api/v1/menus/${id}`);
}

export async function createQuote(menuId: string): Promise<ApiResponse<Quote>> {
  return fetchWithAuth('/api/v1/quotes', {
    method: 'POST',
    body: JSON.stringify({ menu_id: menuId }),
  });
}

export async function getQuote(id: string): Promise<ApiResponse<Quote>> {
  return fetchWithAuth(`/api/v1/quotes/${id}`);
}

export async function updateQuote(id: string, updates: any): Promise<ApiResponse<Quote>> {
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

export async function getMenuStatus(id: string): Promise<ApiResponse<{ status: string }>> {
  return fetchWithAuth(`/api/v1/menus/${id}/status`);
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
