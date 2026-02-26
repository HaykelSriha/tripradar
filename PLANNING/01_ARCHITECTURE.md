# TripRadar — System Architecture

---

## 1. High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│                                                                      │
│   ┌─────────────────────────┐    ┌──────────────────────────────┐   │
│   │      Next.js (Web)      │    │   React Native / Expo (App)  │   │
│   │  trigradar.fr           │    │   Android (+ iOS later)      │   │
│   │  TailwindCSS            │    │   NativeWind                 │   │
│   │  React Query            │    │   Expo Notifications         │   │
│   └────────────┬────────────┘    └──────────────┬───────────────┘   │
└────────────────│─────────────────────────────────│──────────────────┘
                 │ HTTPS REST / WebSocket           │ HTTPS REST
                 │                                  │
┌────────────────▼──────────────────────────────────▼──────────────────┐
│                            API GATEWAY (Nginx)                        │
│              Rate limiting · SSL termination · Load balancing         │
└─────────────────────────────────┬────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼────────────────────────────────────┐
│                          BACKEND (FastAPI)                            │
│                                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  ┌─────────────┐  │
│  │  Auth       │  │  Deals API   │  │  Users    │  │  Alerts     │  │
│  │  /auth/*    │  │  /deals/*    │  │  /users/* │  │  /alerts/*  │  │
│  └─────────────┘  └──────────────┘  └───────────┘  └─────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    Background Workers (Celery)               │    │
│  │   - Alert matching worker (matches new deals to user prefs)  │    │
│  │   - Notification dispatcher (FCM + Email)                    │    │
│  └──────────────────────────────────────────────────────────────┘    │
└────────┬─────────────────────────────────┬────────────────────┬──────┘
         │                                 │                    │
┌────────▼──────┐   ┌──────────────────────▼────┐   ┌──────────▼─────┐
│  PostgreSQL   │   │  Redis                     │   │  Firebase FCM  │
│  + Timescale  │   │  - Session cache           │   │  Push Notifs   │
│  (main DB)    │   │  - Deal cache (15min TTL)  │   └────────────────┘
│  (warehouse)  │   │  - Pub/Sub for alerts      │
└───────────────┘   └────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                         DATA PLATFORM                                │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                   Apache Airflow 2.9                          │   │
│  │                                                               │   │
│  │  DAG: ingest_flights (every 6h)                              │   │
│  │  DAG: ingest_hostels (every 12h)                             │   │
│  │  DAG: run_dbt_transforms (every 6h, after ingest)            │   │
│  │  DAG: score_and_alert (every 6h, after transforms)           │   │
│  │  DAG: cleanup_old_prices (daily at 2am)                      │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                    dbt Transformations                        │   │
│  │                                                               │   │
│  │  BRONZE  →  SILVER  →  GOLD                                  │   │
│  │  (raw)      (clean)    (deals + scores)                      │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │             External Data Sources                             │   │
│  │                                                               │   │
│  │  Kiwi Tequila API · Ryanair · OpenWeather · SNCF · Hostelworld│  │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                         CI/CD (GitHub Actions)                       │
│  ci.yml: lint + test on every PR                                     │
│  deploy-api.yml: deploy FastAPI on merge to main                     │
│  deploy-web.yml: deploy Next.js to Vercel on merge to main           │
│  data-pipeline.yml: trigger Airflow DAG runs on schedule             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Architecture

### Main Application DB (PostgreSQL)

```sql
-- Users & Auth
users                  (id, email, name, avatar_url, created_at)
user_providers         (user_id, provider, provider_id)          -- OAuth
user_sessions          (id, user_id, token_hash, expires_at)
user_device_tokens     (id, user_id, fcm_token, platform, created_at)

-- Preferences
user_preferences       (user_id, max_budget_eur, date_flex_days,
                        departure_airports[], trip_duration_min,
                        trip_duration_max, updated_at)
user_watchlist_destinations (id, user_id, destination_code,
                              destination_name, is_region)

-- Notification settings
user_notification_prefs (user_id, email_enabled, push_enabled,
                          frequency, min_deal_score)

-- Alerts sent (dedup + tracking)
alerts_sent            (id, user_id, deal_id, channel, sent_at, opened_at)
```

### Data Warehouse (PostgreSQL + TimescaleDB)

```sql
-- BRONZE LAYER (raw)
bronze_flight_prices   (id, source, origin, destination,
                        departure_at, return_at, price_eur,
                        airline, deep_link, fetched_at)

bronze_hostel_prices   (id, source, city_code, hostel_name,
                        price_per_night_eur, rating,
                        check_in, check_out, fetched_at)

-- SILVER LAYER (cleaned, via dbt)
silver_flights         (id, origin_iata, dest_iata,
                        origin_city, dest_city, origin_country, dest_country,
                        departure_at, return_at, duration_h,
                        price_eur, airline, is_direct,
                        fetched_at, source)

silver_hostels         (...)

-- GOLD LAYER (business-ready, via dbt)
gold_route_stats       (origin_iata, dest_iata,
                        avg_price_30d, min_price_30d, max_price_30d,
                        avg_price_90d, percentile_20_90d)   -- for deal scoring

gold_deals             (id, origin_iata, dest_iata,
                        departure_at, return_at,
                        price_eur, airline, deep_link,
                        deal_score,          -- 0-100
                        price_vs_avg_pct,    -- -40% = 40% cheaper than usual
                        is_direct,
                        valid_until,
                        created_at)

gold_combo_deals       (id, flight_deal_id, hostel_deal_id,
                        total_price_eur, combo_score, nights)
```

> TimescaleDB is used to efficiently query price time-series for trend analysis.

---

## 3. Alert Flow

```
[Airflow: score_and_alert DAG]
         │
         ▼
  New deals in gold_deals
         │
         ▼
  POST /internal/process-alerts  (FastAPI internal endpoint)
         │
         ▼
  Alert Matching Worker
  ┌─────────────────────────────────────────────────────┐
  │  For each new deal:                                 │
  │  1. Query users whose watchlist matches destination │
  │  2. Filter by user's max_budget                     │
  │  3. Filter by user's date flexibility               │
  │  4. Filter by user's min_deal_score threshold       │
  │  5. Dedup: skip if alert sent for same route <24h   │
  └─────────────────────────────────────────────────────┘
         │
         ├─── Push Notification (FCM via firebase-admin)
         │    └─── Title: "✈️ Paris → Prague — 34€ !"
         │         Body:  "Deal score: 87/100 · Départ le 15 mars"
         │
         └─── Email (Resend API)
              └─── Rich HTML template with deal card
```

---

## 4. Deal Scoring Algorithm

```
DEAL SCORE (0–100) = weighted combination of:

  Price Score (50pts):
    Compare price to 90-day average for same route (same trip duration ±1d)
    price_score = clamp((avg_price_90d - price) / avg_price_90d * 100, 0, 50)
    → If price is 50%+ below avg: full 50pts
    → If price equals avg: 0pts

  Price Tier Score (20pts):
    Absolute price thresholds:
    < €30 one-way:  20pts
    < €50:          15pts
    < €80:          10pts
    < €120:          5pts

  Directness Score (10pts):
    Direct flight: 10pts
    1 stop:         5pts
    2+ stops:       0pts

  Duration Score (10pts):
    Trip 3–7 days:  10pts   ← sweet spot for young workers
    Trip 2 days:     7pts
    Trip 1 day:      4pts
    Trip > 10 days:  7pts   ← still good for students

  Destination Popularity Score (10pts):
    Based on a curated list of crowd-favourite EU destinations for French travellers
    Top tier (Prague, Lisbon, Barcelona, Rome, Budapest): 10pts
    Mid tier: 7pts
    Other: 5pts

FINAL SCORE = sum of above, rounded to integer
Deals with score ≥ 60 are surfaced as "Good Deal"
Deals with score ≥ 80 are surfaced as "Hot Deal 🔥"
```

---

## 5. Notification Strategy

| Tier | Frequency | Channel |
|---|---|---|
| Free | Daily digest (9am CET) | Email |
| Free | Real-time push for score ≥ 85 | Push (mobile only) |
| Premium | Every alert in real-time | Push + Email |

**Anti-spam rules:**
- Max 3 push notifications per user per day (free)
- Never send duplicate alerts for same route within 24h
- User-configurable quiet hours (e.g., 22h–8h)
- One-click unsubscribe in every email

---

## 6. Caching Strategy

```
Redis TTLs:
  deal_list:{filters_hash}      →  15 minutes   (browse feed cache)
  deal:{deal_id}                →  30 minutes   (deal detail cache)
  route_stats:{origin}:{dest}   →  1 hour       (price history)
  user_session:{token}          →  7 days       (auth session)
  user_prefs:{user_id}          →  1 hour       (preference cache)
```

---

## 7. Infrastructure (Docker Compose — Local Dev)

```yaml
services:
  postgres:       # PostgreSQL 16 + TimescaleDB
  redis:          # Redis 7
  airflow:        # Apache Airflow 2.9 (webserver + scheduler + worker)
  api:            # FastAPI
  web:            # Next.js (dev server)
  nginx:          # Reverse proxy (prod only)
```

**Production targets:**
- API + Airflow: VPS (Hetzner CX21, ~€5/mo) with Docker
- Web: Vercel (free tier for Next.js)
- Mobile: Expo EAS Build → Google Play Store
- DB: Managed PostgreSQL (Supabase free tier) OR self-hosted on same VPS
