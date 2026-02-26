// ── Airport ───────────────────────────────────────────────────────────────────
export interface Airport {
  iata: string;
  city: string;
  city_fr?: string;       // French name (e.g. "Lisbonne" instead of "Lisbon")
  country: string;
  country_fr?: string;
  flag: string;
  image_url?: string;
}

// ── Deal ──────────────────────────────────────────────────────────────────────
export type DealTier = "hot" | "good" | "fair";

export interface Deal {
  id: string;
  origin: Airport;
  destination: Airport;
  departure_at: string;   // ISO 8601
  return_at: string;      // ISO 8601
  duration_days: number;
  price_eur: number;
  avg_price_90d: number;
  savings_pct: number;    // e.g. 61.8 means 61.8% cheaper than average
  airline: string;
  airline_logo_url?: string;
  is_direct: boolean;
  deal_score: number;     // 0–100
  deal_tier: DealTier;
  booking_url: string;
  valid_until: string;    // ISO 8601 — when this deal expires from the feed
  created_at: string;
}

// ── Hostel ────────────────────────────────────────────────────────────────────
export interface Hostel {
  id: string;
  name: string;
  city: string;
  price_per_night_eur: number;
  rating: number;         // 0–10
  booking_url: string;
  image_url?: string;
}

// ── Combo deal ────────────────────────────────────────────────────────────────
export interface ComboDeal {
  id: string;
  flight: Deal;
  hostel: Hostel;
  total_price_eur: number;
  nights: number;
  combo_score: number;
}

// ── User ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  is_premium: boolean;
  created_at: string;
}

// ── Preferences ───────────────────────────────────────────────────────────────
export interface UserPreferences {
  departure_airports: string[];   // IATA codes
  max_budget_eur: number;
  date_flex_days: number;
  trip_duration_min: number;
  trip_duration_max: number;
  notification_prefs: NotificationPrefs;
}

export interface NotificationPrefs {
  email_enabled: boolean;
  push_enabled: boolean;
  min_deal_score: number;         // only notify if score >= this
  quiet_hours_start: number;      // 0–23
  quiet_hours_end: number;        // 0–23
}

// ── Watchlist ─────────────────────────────────────────────────────────────────
export interface WatchlistItem {
  id: string;
  destination_code: string;      // IATA or region slug
  destination_name: string;
  is_region: boolean;
  added_at: string;
}

// ── Alert (notification history) ──────────────────────────────────────────────
export interface AlertRecord {
  id: string;
  deal: Deal;
  channel: "push" | "email";
  sent_at: string;
  opened_at?: string;
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface PaginatedDeals {
  deals: Deal[];
  next_cursor: string | null;
  total: number;
}

export interface DealFilters {
  origin?: string;         // IATA
  dest?: string;           // IATA
  min_score?: number;
  max_price?: number;
  tier?: DealTier;
  limit?: number;
  cursor?: string;
}

export interface HealthResponse {
  status: "ok" | "error";
  timestamp: string;
  database: string;
  version: string;
}
