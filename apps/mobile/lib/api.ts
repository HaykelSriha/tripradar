import Constants from "expo-constants";

const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:8000";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ApiDeal {
  flight_hash: string;
  origin: string;
  origin_city: string;
  destination: string;
  destination_city: string;
  destination_flag: string;
  departure_at: string;
  return_at: string;
  duration_days: number;
  price_eur: number;
  avg_price_90d: number;
  savings_pct: number;
  airline: string;
  is_direct: boolean;
  deal_score: number;
  deal_tier: "hot" | "good" | "fair";
  deep_link: string;
  valid_until: string;
  created_at: string;
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
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  is_premium: boolean;
  created_at: string;
}

export interface ApiPreferences {
  departure_airports: string[];
  max_budget_eur: number;
  trip_duration_min: number;
  trip_duration_max: number;
  date_flex_days: number;
  min_deal_score: number;
}

export interface ApiNotificationPrefs {
  email_enabled: boolean;
  push_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  min_deal_score: number;
}

export interface ApiWatchlistItem {
  destination_code: string;
  destination_name: string;
  is_region: boolean;
  added_at: string;
}

export interface ApiAlertRecord {
  id: string;
  deal_id: string;
  channel: "push" | "email";
  sent_at: string;
  opened_at: string | null;
}

export interface ApiHostel {
  id: string;
  name: string;
  city: string;
  price_per_night_eur: number;
  rating: number;
  booking_url: string;
  image_url: string | null;
}

// ─── Core fetch ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {}
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Deals ─────────────────────────────────────────────────────────────────────

export function fetchTopDeals(limit = 6, token?: string) {
  return apiFetch<ApiDeal[]>(`/deals/top?limit=${limit}`, { token });
}

export function fetchInspireDeals(limit = 12, token?: string) {
  return apiFetch<ApiDeal[]>(`/deals/inspire?limit=${limit}`, { token });
}

export function fetchDeal(id: string, token?: string) {
  return apiFetch<ApiDeal>(`/deals/${id}`, { token });
}

export function fetchDeals(
  params: Record<string, string | number | boolean | undefined>,
  token?: string
) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
  return apiFetch<PaginatedDeals>(`/deals?${qs}`, { token });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function apiRegister(payload: {
  email: string;
  name: string;
  password: string;
}) {
  return apiFetch<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiLogin(payload: { email: string; password: string }) {
  return apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiRefresh(refresh_token: string) {
  return apiFetch<{ access_token: string; token_type: string }>(
    "/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    }
  );
}

export function apiLogout(refresh_token: string, token: string) {
  return apiFetch<void>("/auth/logout", {
    method: "POST",
    token,
    body: JSON.stringify({ refresh_token }),
  });
}

// ─── User ──────────────────────────────────────────────────────────────────────

export function fetchMe(token: string) {
  return apiFetch<ApiUser>("/users/me", { token });
}

export function fetchPreferences(token: string) {
  return apiFetch<ApiPreferences>("/users/me/preferences", { token });
}

export function updatePreferences(data: Partial<ApiPreferences>, token: string) {
  return apiFetch<ApiPreferences>("/users/me/preferences", {
    method: "PATCH",
    token,
    body: JSON.stringify(data),
  });
}

export function fetchNotificationPrefs(token: string) {
  return apiFetch<ApiNotificationPrefs>("/users/me/notifications", { token });
}

export function updateNotificationPrefs(
  data: Partial<ApiNotificationPrefs>,
  token: string
) {
  return apiFetch<ApiNotificationPrefs>("/users/me/notifications", {
    method: "PATCH",
    token,
    body: JSON.stringify(data),
  });
}

export function fetchWatchlist(token: string) {
  return apiFetch<ApiWatchlistItem[]>("/users/me/watchlist", { token });
}

export function addWatchlistItem(
  destination_code: string,
  destination_name: string,
  token: string
) {
  return apiFetch<ApiWatchlistItem>("/users/me/watchlist", {
    method: "POST",
    token,
    body: JSON.stringify({ destination_code, destination_name }),
  });
}

export function removeWatchlistItem(code: string, token: string) {
  return apiFetch<void>(`/users/me/watchlist/${code}`, {
    method: "DELETE",
    token,
  });
}

export function fetchAlerts(token: string, limit = 50) {
  return apiFetch<ApiAlertRecord[]>(`/users/me/alerts?limit=${limit}`, {
    token,
  });
}

export function registerDevice(fcm_token: string, token: string) {
  return apiFetch<void>("/users/me/devices", {
    method: "POST",
    token,
    body: JSON.stringify({ fcm_token, platform: "android" }),
  });
}

export function unregisterDevice(fcm_token: string, token: string) {
  return apiFetch<void>(`/users/me/devices/${fcm_token}`, {
    method: "DELETE",
    token,
  });
}
