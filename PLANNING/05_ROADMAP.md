# TripRadar — Implementation Roadmap

> Each phase produces a working, shippable product. We build incrementally.

---

## Phase 0 — Foundation ✅ COMPLETE
*Goal: monorepo scaffolded, local dev stack running, CI green*

### Tasks

- [x] **Monorepo setup**
  - Turborepo + npm workspaces
  - `turbo.json`, `.gitignore`, `.env.example`, `.gitattributes`

- [x] **Docker Compose (local dev)**
  - `infrastructure/docker/docker-compose.yml` — Postgres+TimescaleDB, Redis, Airflow, API, Web
  - `postgres-init.sh` — creates trigradar, trigradar_dw, airflow databases

- [x] **Database schema**
  - `apps/api/alembic/versions/001_initial_schema.py` — all app-DB tables
  - Warehouse tables created by dbt in Phase 1

- [x] **GitHub Actions CI**
  - `ci.yml` — API tests, web type-check+lint, mobile type-check, dbt compile
  - `deploy-api.yml` — SSH deploy on push to main
  - `data-pipeline.yml` — trigger Airflow DAGs on schedule

- [x] **FastAPI skeleton**
  - `GET /health` endpoint, SQLAlchemy async engine, Alembic, pytest

- [x] **Next.js skeleton**
  - Full design system (Tailwind tokens), attractive landing page, all fonts configured

- [x] **React Native skeleton**
  - Expo 51 + expo-router, NativeWind, 4-tab nav, all screens, deal detail

- [x] **Shared packages**
  - `packages/types` — all TypeScript interfaces (Deal, User, Preferences, etc.)
  - `packages/ui` — placeholder (populated Phase 3)

- [x] **Data platform scaffold**
  - `data/dbt/dbt_project.yml` + `profiles.yml`
  - `data/airflow/dags/` directory ready for Phase 1 DAGs

- [x] **Git initialised**
  - 68 files tracked, `.gitattributes` for cross-platform line endings


- [ ] **FastAPI skeleton**
  - `apps/api/`: FastAPI app with health endpoint `GET /health → {status: ok}`
  - SQLAlchemy async engine connected to Postgres
  - Alembic integrated
  - Dockerfile

- [ ] **Next.js skeleton**
  - `apps/web/`: Next.js 14 app router, TailwindCSS configured
  - Font imports: Space Grotesk, Inter, JetBrains Mono
  - Design tokens in `tailwind.config.ts` (color palette from design doc)
  - Dark mode forced (no toggle in MVP)

- [ ] **React Native skeleton**
  - `apps/mobile/`: Expo 51 + expo-router + NativeWind
  - Tab navigation scaffolded (4 tabs)
  - Expo dev client setup

**Exit criteria**: `docker compose up` starts all services, `GET /health` returns 200, Next.js hot-reloads, Airflow UI accessible.

---

## Phase 1 — Data Pipeline MVP ✅ COMPLETE
*Goal: real flight deals flowing into gold_deals table every 6 hours*

### Tasks

- [x] **Kiwi Tequila API integration**
  - `data/scripts/kiwi_client.py` — async client with retry + rate-limit handling
  - `data/scripts/db_utils.py` — bronze DDL, parse_kiwi_result, insert_bronze_flights
  - `data/scripts/ingest_flights.py` — CLI + Airflow-callable entry points
  - `data/scripts/tests/test_kiwi_client.py` + `test_db_utils.py`

- [x] **dbt project setup**
  - `data/dbt/dbt_project.yml`, `profiles.yml`, `packages.yml` (dbt-utils)
  - `data/dbt/seeds/ref_airports.csv` — 41 airports with French names + tiers
  - `data/dbt/models/bronze/schema.yml` — source declarations + freshness checks

- [x] **dbt models**
  - `silver/silver_flights.sql` — incremental, LEFT JOIN ref_airports, filters
  - `gold/gold_route_stats.sql` — full refresh, 30/90d stats, percentiles
  - `gold/gold_deals.sql` — incremental, 5-component scoring formula
  - `schema.yml` tests on all models (unique, not_null, accepted_range, dbt_utils)

- [x] **Airflow DAGs**
  - `ingest_flights_dag.py` — every 6h, kiwi_api_pool (max 3 concurrent)
  - `run_dbt_transforms_dag.py` — triggered by ingest, seed→silver→gold→test→alert
  - `score_and_alert_dag.py` — logs new deals, POSTs to FastAPI /internal/process-alerts
  - `cleanup_dag.py` — daily 2am, delete >180d records, VACUUM ANALYZE

- [x] **Docker Compose updated**
  - Airflow containers: dbt + httpx + psycopg2 via _PIP_ADDITIONAL_REQUIREMENTS
  - Volume mounts: data/scripts → /opt/airflow/scripts, data/dbt → /opt/airflow/dbt
  - kiwi_api_pool created on Airflow init (limits concurrency to 3)

- [x] **CI updated**
  - `test-data-pipeline` job: runs pytest on data/scripts/tests/

**Exit criteria**: Airflow runs full pipeline, `gold_deals` has real data, dbt tests green.

---

## Phase 2 — Backend API ✅ COMPLETE
*Goal: all API endpoints implemented, auth working, alerts wired to Airflow*

### Tasks

- [x] **Auth system**
  - `POST /auth/register` (email + password, Argon2 hashing)
  - `POST /auth/login` (returns JWT access + refresh token pair)
  - `POST /auth/refresh`
  - `POST /auth/google` (verify Google ID token via tokeninfo, upsert user)
  - `POST /auth/logout` (delete refresh token from Redis)
  - `apps/api/services/auth.py` — JWT + Argon2 + Google token verify
  - `apps/api/dependencies.py` — `get_current_user` Bearer JWT dependency

- [x] **Deals API** — reads from `gold_deals` warehouse table
  - `GET /deals` (filters: origin, dest, max_price, tier, is_direct; cursor pagination)
  - `GET /deals/top` (top N by score)
  - `GET /deals/inspire` (random deals with score ≥ 60)
  - `GET /deals/{id}` (single deal by flight_hash)
  - Redis caching layer: 15min TTL on all deal queries
  - `apps/api/routers/deals.py`

- [x] **User API**
  - `GET/PATCH /users/me` — profile
  - `DELETE /users/me` — GDPR account deletion
  - `GET/PATCH /users/me/preferences` — budget, airports, trip duration
  - `GET/PATCH /users/me/notifications` — email/push toggles, quiet hours
  - `GET/POST/DELETE /users/me/watchlist` — destination watchlist
  - `GET /users/me/alerts` — alert history
  - `POST/DELETE /users/me/devices` — FCM token registration
  - `apps/api/routers/users.py`

- [x] **Alert matching worker**
  - `apps/api/services/alert_matcher.py` — match deals to users (budget + airports + watchlist + dedup + quiet hours)
  - `apps/api/workers/celery_app.py` + `alert_worker.py` — Celery/Redis async task
  - `apps/api/routers/internal.py` — `POST /internal/process-alerts` (token-protected, called by Airflow)
  - FCM push via `services/fcm.py` (firebase-admin multicast)
  - HTML email via `services/email.py` (Resend)

- [x] **ORM models** — `apps/api/models/user.py` (User, Provider, Device, Prefs, NotifPrefs, Watchlist, AlertSent)

- [x] **API tests**
  - `tests/test_auth.py` — register, login, wrong password, refresh, logout, JWT
  - `tests/test_deals.py` — list, top, inspire, single, not-found, filter validation
  - `tests/test_users.py` — profile, preferences, watchlist CRUD, alerts, devices

**Exit criteria**: All endpoints return correct data, auth flow works end-to-end, manual test of push notification delivery on Android device.

---

## Phase 3 — Web App ✅ COMPLETE
*Goal: beautiful Next.js app with all core screens*

### Tasks

- [x] **Design system + shared UI**
  - Tailwind dark theme with full token palette (brand orange #FF6B35, violet #7C3AED)
  - `packages/ui/src/DealScoreRing.tsx` — SVG score ring (shared)
  - `packages/ui/src/SavingsBadge.tsx` — savings % badge (shared)
  - `packages/ui/src/DealTimer.tsx` — countdown timer with "Expiré" state (shared)
  - `packages/ui/src/index.ts` — barrel export
  - `packages/ui/package.json` — lucide-react peer dep, types entry point
  - `packages/ui/tsconfig.json` — react-jsx, Bundler module resolution
  - `apps/web/tsconfig.json` — `@trigradar/ui` path alias added

- [x] **API + auth layer**
  - `apps/web/lib/api.ts` — typed `apiFetch`, all API functions (deals, auth, user, watchlist, alerts)
  - `apps/web/lib/auth.tsx` — `AuthContext` + `AuthProvider`, localStorage JWT, auto-refresh on boot
  - `apps/web/lib/queries.ts` — React Query hooks (useDealsInfinite, useWatchlist, useAlerts, etc.)
  - `apps/web/app/providers.tsx` — `QueryClientProvider` + `AuthProvider` wrapper

- [x] **Shared components**
  - `apps/web/components/DealCard.tsx` — Unsplash destination images, tier badge, score ring, savings badge, timer
  - `apps/web/components/DealCardSkeleton.tsx` — shimmer skeleton matching DealCard layout
  - `apps/web/components/DealScoreRing.tsx` — local SVG score ring (app-level)
  - `apps/web/components/SavingsBadge.tsx` — local savings badge (app-level)
  - `apps/web/components/DealTierBadge.tsx` — hot/good/fair gradient badge
  - `apps/web/components/Navbar.tsx` — client navbar with auth dropdown
  - `apps/web/components/Footer.tsx` — static footer
  - `apps/web/components/FilterBar.tsx` — URL-driven filters (origin, budget, tier, is_direct)
  - `apps/web/components/PriceChart.tsx` — Recharts AreaChart with deterministic mock history

- [x] **Home page** — async server component, ISR 900s, real API data (top 6 deals)
  - `apps/web/app/page.tsx`
  - `apps/web/app/layout.tsx` — Providers wrapper, OG metadata

- [x] **Deal feed page** (`/deals`) — infinite scroll, URL filter state, skeleton grid
  - `apps/web/app/deals/page.tsx`

- [x] **Deal detail page** (`/deals/[id]`) — SSR, dynamic OG tags, score breakdown, PriceChart
  - `apps/web/app/deals/[id]/page.tsx`

- [x] **Auth pages** — Google Identity Services (GIS) OAuth, no NextAuth.js
  - `apps/web/app/auth/login/page.tsx` — email + Google, show/hide pw
  - `apps/web/app/auth/register/page.tsx` — email + Google, password strength bar

- [x] **Protected dashboard** — auth guard in layout, sidebar navigation
  - `apps/web/app/dashboard/layout.tsx`
  - `apps/web/app/dashboard/watchlist/page.tsx` — add/remove EU destinations
  - `apps/web/app/dashboard/settings/page.tsx` — budget slider, airport toggles, notification prefs
  - `apps/web/app/dashboard/alerts/page.tsx` — alert history with channel badges

- [x] **SEO**
  - `metadata` exports on all pages, dynamic OG for deal pages
  - `apps/web/app/sitemap.ts` — static sitemap

- [x] **Env**
  - `.env.example` — `NEXT_PUBLIC_GOOGLE_CLIENT_ID` added

**Exit criteria**: All pages live on Vercel, deal feed shows real data, auth works, Lighthouse score ≥ 80.

---

## Phase 4 — Mobile App ✅ COMPLETE
*Goal: Android APK on Play Store (internal testing track)*

### Tasks

- [x] **EAS Build config**
  - `apps/mobile/eas.json` — development (APK), preview, production (AAB) profiles

- [x] **API + Auth layer**
  - `apps/mobile/lib/api.ts` — typed API client (all endpoints, ApiError class)
  - `apps/mobile/lib/auth.tsx` — `AuthContext` with SecureStore JWT storage, auto-refresh on boot
  - `apps/mobile/lib/queries.ts` — React Query hooks (useTopDeals, useDealsInfinite, useAlerts, etc.)
  - `apps/mobile/lib/notifications.ts` — `requestPushPermission`, `registerPushToken`, `subscribeToDealTaps`

- [x] **Root layout**
  - `apps/mobile/app/_layout.tsx` — QueryClientProvider + AuthProvider + notification tap handler + font loading

- [x] **Shared components**
  - `apps/mobile/components/DealCard.tsx` — Unsplash images, score ring, tier badge, savings badge
  - `apps/mobile/components/DealScoreRing.tsx` — SVG ring with react-native-svg
  - `apps/mobile/components/SavingsBadge.tsx` — green savings % badge
  - `apps/mobile/components/DealTierBadge.tsx` — hot/good/fair badges
  - `apps/mobile/components/MiniPriceChart.tsx` — SVG price chart (90-day mock history)
  - `apps/mobile/components/SkeletonCard.tsx` — shimmer skeleton
  - `apps/mobile/components/EmptyState.tsx` — empty/error state component

- [x] **Onboarding flow** (5 screens, SecureStore persistence)
  - `apps/mobile/app/onboarding/welcome.tsx`
  - `apps/mobile/app/onboarding/airports.tsx` — multi-select departure airports
  - `apps/mobile/app/onboarding/budget.tsx` — slider + presets
  - `apps/mobile/app/onboarding/destinations.tsx` — 23-destination grid
  - `apps/mobile/app/onboarding/notifications.tsx` — push permission request
  - `apps/mobile/app/onboarding/done.tsx` — stats + redirect to tabs

- [x] **Auth screens**
  - `apps/mobile/app/auth/login.tsx` — email + password, error handling
  - `apps/mobile/app/auth/register.tsx` — email + name + password strength bar

- [x] **Tab screens (all real API)**
  - `apps/mobile/app/(tabs)/index.tsx` — top deals feed, pull-to-refresh, skeleton
  - `apps/mobile/app/(tabs)/explore.tsx` — inspire deals grid with Unsplash images, random deal button
  - `apps/mobile/app/(tabs)/alerts.tsx` — real alert history, auth guard, channel badges
  - `apps/mobile/app/(tabs)/profile.tsx` — user card, notif toggles (real API), watchlist count, logout

- [x] **Deal detail screen**
  - `apps/mobile/app/deal/[id].tsx` — hero image, score ring, price chart, flight details, sticky CTA with Linking.openURL

- [x] **Push notifications**
  - Permission request in onboarding screen
  - Notification tap → navigate to deal via `subscribeToDealTaps`

**Exit criteria**: App installable on Android, notifications received, deal opens correctly from notification tap.

---

## Phase 5 — Hostel Integration + Polish ✅ COMPLETE
*Goal: combo deals, price history, real hostel data, legal pages*

### Tasks

- [x] **Hostelworld data pipeline**
  - `data/scripts/hostel_client.py` — async Hostelworld API client with IATA city ID map
  - `data/airflow/dags/ingest_hostels_dag.py` — every 12h, fetches hostels for active deal destinations, writes to `bronze_hostel_prices`

- [x] **dbt hostel models**
  - `data/dbt/models/silver/silver_hostels.sql` — cleaned hostel records (incremental)
  - `data/dbt/models/gold/gold_combo_deals.sql` — flight + hostel bundles, combo_score (60% flight + 40% hostel quality)
  - `data/dbt/models/silver/schema.yml` — added silver_hostels tests
  - `data/dbt/models/gold/schema.yml` — added gold_combo_deals tests

- [x] **API hostel + price history endpoints**
  - `GET /deals/{id}/hostels` — returns matching hostel options from bronze_hostel_prices
  - `GET /deals/{id}/price-history` — TimescaleDB time_bucket aggregation, 90-day history
  - `apps/api/schemas/deals.py` — `HostelResponse`, `PriceHistoryResponse`, `PricePoint` schemas

- [x] **Inspire me page**
  - `apps/web/app/inspire/page.tsx` — ISR 1h, real API inspire deals, region filter links

- [x] **Legal pages (RGPD)**
  - `apps/web/app/privacy/page.tsx` — full French privacy policy (data collected, rights, contact)
  - `apps/web/app/cgu/page.tsx` — conditions générales d'utilisation

- [x] **Sitemap updated**
  - `/inspire`, `/privacy`, `/cgu` added

- [x] **Mobile Explore tab**
  - Real inspire API data (replaced mock destinations)
  - Unsplash hero images in grid, random deal button

**Exit criteria**: Full pipeline running in production, combo deals visible, legal pages live.

---

## Phase 6 — Production Hardening ✅ COMPLETE
*Goal: production-grade reliability + monitoring*

### Tasks

- [x] **Nginx reverse proxy**
  - `infrastructure/nginx/nginx.conf` — SSL termination, rate limiting zones, HTTP→HTTPS redirect, /internal block by IP, gzip, HSTS
  - `infrastructure/nginx/Dockerfile` — nginx:1.27-alpine

- [x] **GitHub Actions deploy pipelines**
  - `deploy-api.yml` — SSH deploy with health check + auto-rollback on failure, Celery restart, GitHub issue on failure
  - `ci.yml` — added `security-audit` job (npm audit + Python safety check), `WAREHOUSE_URL` env var

- [x] **Rate limiting (slowapi)**
  - `apps/api/requirements.txt` — `slowapi==0.1.9` added
  - `apps/api/main.py` — `Limiter` middleware registered
  - `apps/api/routers/auth.py` — `@limiter.limit("5/minute")` on register, `10/minute` on login

- [x] **Sentry error tracking**
  - `apps/api/requirements.txt` — `sentry-sdk[fastapi]==2.19.2` added
  - `apps/api/main.py` — `sentry_sdk.init()` with environment + sampling rates
  - `.env.example` — `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` added

- [x] **GDPR compliance**
  - `apps/web/app/privacy/page.tsx` — full privacy policy (Phase 5)
  - `apps/web/app/cgu/page.tsx` — CGU (Phase 5)
  - `apps/api/routers/users.py` — `GET /users/me/export` GDPR Article 20 data export (JSON download)
  - Account deletion: `DELETE /users/me` (Phase 2)

**Exit criteria**: Zero-downtime deploys, Sentry receiving events, 99% uptime over 7 days.

---

## Tech Debt / Later

- [ ] iOS support (Expo already supports it — just need Apple Developer account)
- [ ] Train/bus integration (SNCF, Flixbus)
- [ ] Premium subscription (Stripe)
- [ ] Destination map view (Mapbox)
- [ ] Group trip coordination
- [ ] A/B testing on deal score formula
- [ ] ML-based personalisation (collaborative filtering on user bookmarks)

---

## Dependencies & Order

```
Phase 0 (Foundation)
    │
    ▼
Phase 1 (Data Pipeline) ─── can start Phase 3 web skeleton in parallel
    │
    ▼
Phase 2 (Backend API)
    │
    ├── Phase 3 (Web App)
    │
    └── Phase 4 (Mobile App)
            │
            ▼
        Phase 5 (Hostel + Polish)
            │
            ▼
        Phase 6 (Production)
```

---

## File: Tracking Build Progress

As we build each component, this file should be updated with:
- [x] completed items (cross off)
- Notes on deviations from the plan
- Links to key files created

This is a living document. The plan may evolve.
