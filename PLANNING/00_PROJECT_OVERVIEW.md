# TripRadar — Project Overview

> **Tagline**: "Le bon plan, au bon moment." *(The right deal, at the right time.)*

---

## 1. Vision

TripRadar is a deal-alert platform targeting **young French adults** (18–30) — Erasmus students, young workers, and budget travellers — who want cheap spontaneous trips across Europe. Users set up their preferences (budget, favourite destinations, departure airport, date flexibility) and get **push notifications + email alerts** the moment a qualifying deal is found.

The differentiator vs. existing tools (Kayak, Google Flights, Skyscanner):
- **Proactive** — we notify you, you don't have to search
- **Curated deals** with a transparent "Deal Score"
- **French-first** UX and French departure cities as first-class citizens
- **Holistic packages** — flight + hostel combo scoring, not just flights

---

## 2. Target Audience

| Segment | Profile | Key Need |
|---|---|---|
| Young workers (22–30) | CDI/CDD, 2–3 weeks RTT, SNCF card | Weekend & long-weekend escapes, ≤ €150 total |
| Erasmus students (18–25) | Budget-constrained, ultra-flexible dates | City hops ≤ €60 flight, hostels |
| Digital nomads (25–35) | Work remotely, very flexible | 1–2 week escapes, decent WiFi |

**Primary departure cities**: Paris (CDG/ORY), Lyon (LYS), Marseille (MRS), Bordeaux (BOD), Nantes (NTE), Nice (NCE), Toulouse (TLS), Lille (LIL)

**Target destinations**: All of Europe, prioritising Ryanair/easyJet hubs: Porto, Séville, Budapest, Prague, Varsovie, Barcelone, Rome, Athènes, Lisbonne, Dublin, Berlin, Amsterdam, Cracovie, Bucarest, Tallinn, Riga, etc.

---

## 3. Core Features

### MVP (Phase 1)
- [ ] User registration / login (email + Google OAuth)
- [ ] Preference setup: departure airport(s), max budget, favourite destination regions, date flexibility window
- [ ] Daily deal discovery pipeline (flights via Kiwi Tequila API)
- [ ] Deal scoring engine (price vs. historical average)
- [ ] Push notifications (mobile) + email alerts
- [ ] Deal feed (web + mobile) — browse current best deals
- [ ] Deal detail page

### Phase 2
- [ ] Hostel/accommodation price integration (Hostelworld)
- [ ] Combo deal scoring (flight + hostel package)
- [ ] Price history charts per route
- [ ] "Inspire me" mode — random cheap destinations
- [ ] User deal bookmarks / wishlist
- [ ] Social sharing (WhatsApp, Instagram Stories card)

### Phase 3
- [ ] Train/bus alternatives (SNCF, Flixbus, BlaBlaCar Bus)
- [ ] Weather & events overlay on destination cards
- [ ] Group trips (share a deal with friends, coordinate)
- [ ] Premium tier: real-time alerts (every 2h vs. daily)

---

## 4. Tech Stack Summary

```
┌─────────────────────────────────────────────────────────┐
│                     USER INTERFACES                      │
│  Next.js 14 (Web)        React Native + Expo (Mobile)   │
│  TailwindCSS              NativeWind                     │
└────────────────────────┬────────────────────────────────┘
                         │ REST + WebSocket
┌────────────────────────▼────────────────────────────────┐
│                      BACKEND API                         │
│  FastAPI (Python 3.12)   Uvicorn + Gunicorn              │
│  PostgreSQL + TimescaleDB   Redis (cache + pub/sub)      │
│  Firebase Cloud Messaging (push notifications)           │
│  Resend (transactional email)                            │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    DATA PLATFORM                         │
│  Apache Airflow 2.9   (orchestration)                    │
│  dbt Core             (SQL transformations)              │
│  PostgreSQL           (data warehouse)                   │
│  GitHub Actions       (CI/CD + lightweight ETL triggers) │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                   EXTERNAL SOURCES                       │
│  Kiwi Tequila API   Hostelworld API   OpenWeather API    │
│  Ryanair (scraping) easyJet (scraping) SNCF Open API    │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Monorepo Structure

```
trip-radar/
├── PLANNING/                    ← you are here
│   ├── 00_PROJECT_OVERVIEW.md
│   ├── 01_ARCHITECTURE.md
│   ├── 02_DATA_PIPELINE.md
│   ├── 03_BACKEND_API.md
│   ├── 04_FRONTEND_DESIGN.md
│   └── 05_ROADMAP.md
│
├── apps/
│   ├── web/                     ← Next.js 14 app
│   ├── mobile/                  ← React Native + Expo
│   └── api/                     ← FastAPI backend
│
├── packages/
│   ├── ui/                      ← Shared React components (web)
│   ├── types/                   ← Shared TypeScript interfaces
│   └── config/                  ← ESLint, TS, Tailwind configs
│
├── data/
│   ├── airflow/
│   │   ├── dags/                ← Airflow DAG definitions
│   │   └── plugins/             ← Custom Airflow operators
│   ├── dbt/
│   │   ├── models/
│   │   │   ├── bronze/          ← Raw ingested data (source)
│   │   │   ├── silver/          ← Cleaned & normalised
│   │   │   └── gold/            ← Business-ready (deals, scores)
│   │   └── dbt_project.yml
│   └── scripts/
│       ├── ingest_flights.py
│       ├── ingest_hostels.py
│       └── score_deals.py
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml   ← Local dev stack
│   │   └── docker-compose.prod.yml
│   └── nginx/
│       └── nginx.conf
│
├── .github/
│   └── workflows/
│       ├── ci.yml               ← Tests + linting on PR
│       ├── deploy-api.yml       ← Deploy FastAPI
│       ├── deploy-web.yml       ← Deploy Next.js
│       └── data-pipeline.yml    ← Trigger Airflow DAGs
│
├── .env.example
├── turbo.json                   ← Turborepo config
└── package.json                 ← Root workspace
```

---

## 6. Data Sources & APIs

| Source | Data | Tier | Cost |
|---|---|---|---|
| **Kiwi Tequila API** | Flights, flexible date search | Primary | Free (rate-limited) |
| **Amadeus Self-Service** | Flights, price trends | Secondary | Free tier: 2000 req/mo |
| **Hostelworld API** | Hostel availability + price | Accommodation | Partnership / scraping |
| **Booking.com Affiliate** | Hotels, avg price per city | Accommodation | Affiliate program |
| **OpenWeather API** | Destination weather | Enrichment | Free tier |
| **Ryanair (unofficial)** | Live fares | Flights | Scraping (respectfully) |
| **SNCF Open Data** | Train prices FR → EU | Ground transport | Free |

---

## 7. Business Model (future)

- **Free tier**: Daily alerts, max 3 destination watchlists
- **Premium (€4.99/mo)**: Real-time alerts (every 2h), unlimited watchlists, price history, combo deals
- **Affiliate revenue**: Booking.com / Hostelworld referral links on every deal
- **Sponsorship**: Destination tourism boards (e.g., "Featured: Barcelone this week")
