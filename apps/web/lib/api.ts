/**
 * TripRadar API client.
 * All typed fetch helpers for the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types matching the FastAPI response schemas ───────────────────────────────

export interface ApiDeal {
  flight_hash: string;
  origin_iata: string;
  dest_iata: string;
  origin_city: string;
  dest_city: string;
  origin_country: string;
  dest_country: string;
  origin_flag: string;
  dest_flag: string;
  departure_at: string;
  return_at: string | null;
  duration_h: number;
  duration_days: number;
  airline: string;
  is_direct: boolean;
  stops: number;
  price_eur: number;
  avg_price_90d: number;
  savings_pct: number;
  deal_score: number;
  deal_tier: "hot" | "good" | "fair";
  price_score: number;
  price_tier_score: number;
  directness_score: number;
  duration_score: number;
  dest_score: number;
  deep_link: string;
  created_at: string;
  valid_until: string;
}

export interface PaginatedDeals {
  items: ApiDeal[];
  total: number;
  cursor: string | null;
  has_more: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  is_premium: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ApiPreferences {
  max_budget_eur: number;
  date_flex_days: number;
  departure_airports: string[];
  trip_duration_min: number;
  trip_duration_max: number;
  updated_at: string;
}

export interface ApiNotificationPrefs {
  email_enabled: boolean;
  push_enabled: boolean;
  min_deal_score: number;
  quiet_hours_start: number;
  quiet_hours_end: number;
  updated_at: string;
}

export interface ApiWatchlistItem {
  id: string;
  destination_code: string;
  destination_name: string;
  is_region: boolean;
  created_at: string;
}

export interface ApiAlertRecord {
  id: string;
  deal_id: string;
  route: string;
  channel: string;
  sent_at: string;
  opened_at: string | null;
}

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Core fetch helper ─────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string | null;
    cache?: RequestCache;
    next?: NextFetchRequestConfig;
  } = {}
): Promise<T> {
  const { method = "GET", body, token, cache, next } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
    next,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail ?? detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Deals ─────────────────────────────────────────────────────────────────────

export interface DealsParams {
  origin?: string;
  destination?: string;
  max_price?: number;
  min_score?: number;
  tier?: string;
  is_direct?: boolean;
  max_duration_days?: number;
  cursor?: string;
  limit?: number;
}

function buildQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  return q.toString() ? `?${q}` : "";
}

export async function fetchDeals(
  params: DealsParams = {},
  token?: string | null
): Promise<PaginatedDeals> {
  return apiFetch<PaginatedDeals>(`/deals${buildQuery(params as Record<string, unknown>)}`, { token, cache: "no-store" });
}

export async function fetchTopDeals(limit = 10): Promise<ApiDeal[]> {
  return apiFetch<ApiDeal[]>(`/deals/top?limit=${limit}`, {
    next: { revalidate: 900 },
  });
}

export async function fetchInspireDeals(limit = 6): Promise<ApiDeal[]> {
  return apiFetch<ApiDeal[]>(`/deals/inspire?limit=${limit}`, {
    next: { revalidate: 3600 },
  });
}

export async function fetchDeal(id: string): Promise<ApiDeal> {
  return apiFetch<ApiDeal>(`/deals/${id}`, { next: { revalidate: 900 } });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function apiRegister(data: {
  email: string;
  name: string;
  password: string;
}): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/register", { method: "POST", body: data });
}

export async function apiLogin(data: {
  email: string;
  password: string;
}): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/login", { method: "POST", body: data });
}

export async function apiGoogleAuth(id_token: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/google", {
    method: "POST",
    body: { id_token },
  });
}

export async function apiRefresh(refresh_token: string): Promise<AccessTokenResponse> {
  return apiFetch<AccessTokenResponse>("/auth/refresh", {
    method: "POST",
    body: { refresh_token },
  });
}

export async function apiLogout(refresh_token: string): Promise<void> {
  return apiFetch("/auth/logout", {
    method: "POST",
    body: { refresh_token },
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function fetchMe(token: string): Promise<ApiUser> {
  return apiFetch<ApiUser>("/users/me", { token, cache: "no-store" });
}

export async function updateMe(
  token: string,
  data: { name?: string; avatar_url?: string }
): Promise<ApiUser> {
  return apiFetch<ApiUser>("/users/me", { method: "PATCH", body: data, token });
}

export async function fetchPreferences(token: string): Promise<ApiPreferences> {
  return apiFetch<ApiPreferences>("/users/me/preferences", { token, cache: "no-store" });
}

export async function updatePreferences(
  token: string,
  data: Partial<ApiPreferences>
): Promise<ApiPreferences> {
  return apiFetch<ApiPreferences>("/users/me/preferences", { method: "PATCH", body: data, token });
}

export async function fetchNotificationPrefs(token: string): Promise<ApiNotificationPrefs> {
  return apiFetch<ApiNotificationPrefs>("/users/me/notifications", { token, cache: "no-store" });
}

export async function updateNotificationPrefs(
  token: string,
  data: Partial<ApiNotificationPrefs>
): Promise<ApiNotificationPrefs> {
  return apiFetch<ApiNotificationPrefs>("/users/me/notifications", {
    method: "PATCH",
    body: data,
    token,
  });
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

export async function fetchWatchlist(token: string): Promise<ApiWatchlistItem[]> {
  return apiFetch<ApiWatchlistItem[]>("/users/me/watchlist", { token, cache: "no-store" });
}

export async function addWatchlistItem(
  token: string,
  data: { destination_code: string; destination_name: string; is_region?: boolean }
): Promise<ApiWatchlistItem> {
  return apiFetch<ApiWatchlistItem>("/users/me/watchlist", {
    method: "POST",
    body: data,
    token,
  });
}

export async function removeWatchlistItem(
  token: string,
  destinationCode: string
): Promise<void> {
  return apiFetch(`/users/me/watchlist/${destinationCode}`, {
    method: "DELETE",
    token,
  });
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function fetchAlerts(token: string): Promise<ApiAlertRecord[]> {
  return apiFetch<ApiAlertRecord[]>("/users/me/alerts", { token, cache: "no-store" });
}
