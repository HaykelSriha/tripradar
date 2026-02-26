# TripRadar — Backend API

---

## 1. Stack

- **Framework**: FastAPI (Python 3.12) — async, auto-generated OpenAPI docs
- **ORM**: SQLAlchemy 2.0 (async) + Alembic for migrations
- **Auth**: JWT (access token 15min) + Refresh token (7 days, stored in Redis)
- **Background tasks**: Celery + Redis (alert matching, email dispatch)
- **Push notifications**: firebase-admin Python SDK (FCM)
- **Email**: Resend API (beautiful transactional emails)
- **Validation**: Pydantic v2

---

## 2. Project Structure

```
apps/api/
├── main.py                  # FastAPI app factory
├── config.py                # Settings via pydantic-settings
├── database.py              # Async SQLAlchemy engine
├── dependencies.py          # FastAPI dependencies (get_db, get_current_user)
│
├── routers/
│   ├── auth.py              # POST /auth/register, /auth/login, /auth/refresh
│   ├── deals.py             # GET /deals, /deals/{id}
│   ├── users.py             # GET/PATCH /users/me, /users/me/preferences
│   ├── watchlist.py         # GET/POST/DELETE /users/me/watchlist
│   ├── alerts.py            # GET /users/me/alerts
│   ├── devices.py           # POST /devices (register FCM token)
│   └── internal.py          # POST /internal/process-alerts (Airflow → API)
│
├── models/                  # SQLAlchemy ORM models
│   ├── user.py
│   ├── deal.py
│   ├── watchlist.py
│   └── alert.py
│
├── schemas/                 # Pydantic request/response schemas
│   ├── auth.py
│   ├── deals.py
│   ├── users.py
│   └── alerts.py
│
├── services/
│   ├── alert_matcher.py     # Core: match deals to users
│   ├── notification.py      # FCM + email dispatch
│   ├── deal_service.py      # Deal querying logic
│   └── user_service.py      # User CRUD
│
├── workers/
│   ├── celery_app.py        # Celery config
│   └── tasks.py             # Celery task definitions
│
├── tests/
│   ├── test_deals.py
│   ├── test_auth.py
│   └── test_alerts.py
│
├── requirements.txt
└── Dockerfile
```

---

## 3. API Endpoints

### Authentication

```
POST   /auth/register
Body:  { email, password, name }
Resp:  { access_token, refresh_token, user }

POST   /auth/login
Body:  { email, password }
Resp:  { access_token, refresh_token, user }

POST   /auth/refresh
Body:  { refresh_token }
Resp:  { access_token }

POST   /auth/google
Body:  { id_token }   ← from Google Sign-In
Resp:  { access_token, refresh_token, user }

POST   /auth/logout
Auth:  Bearer token
Resp:  204 No Content
```

### Deals

```
GET    /deals
Auth:  Optional (personalised sort if authenticated)
Query: ?origin=CDG&dest=PRG&min_score=60&tier=hot&limit=20&cursor=...
Resp:  {
  deals: [DealCard],
  next_cursor: str | null,
  total: int
}

GET    /deals/{deal_id}
Resp:  {
  ...DealCard,
  price_history: [{ date, price }],    ← last 30 days for this route
  hostels: [HostelSummary],            ← cheapest 3 hostels
  weather: WeatherSummary,
  booking_url: str                     ← affiliate deep link
}

GET    /deals/inspire
Auth:  Optional
Query: ?origin=CDG&max_budget=100&duration_days=3
Resp:  { deals: [DealCard] }           ← random cheap destinations

GET    /deals/top
Resp:  { deals: [DealCard] }           ← top 10 deals of the day
```

### Deal Schema (DealCard)

```json
{
  "id": "uuid",
  "origin": {
    "iata": "CDG",
    "city": "Paris",
    "country": "France",
    "flag": "🇫🇷"
  },
  "destination": {
    "iata": "PRG",
    "city": "Prague",
    "country": "Tchéquie",
    "flag": "🇨🇿",
    "image_url": "https://..."
  },
  "departure_at": "2025-03-15T07:30:00Z",
  "return_at": "2025-03-18T21:45:00Z",
  "duration_days": 3.5,
  "price_eur": 34,
  "avg_price_90d": 89,
  "savings_pct": 61.8,
  "airline": "Ryanair",
  "airline_logo_url": "https://...",
  "is_direct": true,
  "deal_score": 87,
  "deal_tier": "hot",
  "booking_url": "https://...",
  "valid_until": "2025-02-25T18:00:00Z",
  "created_at": "2025-02-25T12:00:00Z"
}
```

### Users & Preferences

```
GET    /users/me
PATCH  /users/me
Body:  { name?, avatar_url? }

GET    /users/me/preferences
Resp:  {
  departure_airports: ["CDG", "ORY"],
  max_budget_eur: 150,
  date_flex_days: 14,
  trip_duration_min: 2,
  trip_duration_max: 7,
  notification_prefs: {
    email_enabled: true,
    push_enabled: true,
    min_deal_score: 70,
    quiet_hours_start: 22,
    quiet_hours_end: 8
  }
}

PATCH  /users/me/preferences
Body:  (partial of above)
```

### Watchlist

```
GET    /users/me/watchlist
Resp:  [{ id, destination_code, destination_name, added_at }]

POST   /users/me/watchlist
Body:  { destination_code: "PRG", destination_name: "Prague" }
       OR { region: "eastern_europe" }
Resp:  { id, ... }
Limit: 3 items (free tier), unlimited (premium)

DELETE /users/me/watchlist/{id}
```

### Alerts History

```
GET    /users/me/alerts
Query: ?limit=20&cursor=...
Resp:  {
  alerts: [{
    id, deal: DealCard, sent_at, channel, was_opened
  }],
  next_cursor
}
```

### Device Registration (Push)

```
POST   /devices
Auth:  Bearer token
Body:  { fcm_token: str, platform: "android" | "ios" }
Resp:  { device_id: uuid }

DELETE /devices/{fcm_token}
Auth:  Bearer token
```

### Internal (Airflow → API)

```
POST   /internal/process-alerts
Header: X-Internal-Token: {secret}
Body:  { since: "2025-02-25T12:00:00Z" }
Resp:  { processed: 42, notifications_sent: 18 }
```

---

## 4. Alert Matching Service

```python
# apps/api/services/alert_matcher.py

async def process_new_deals(db: AsyncSession, since: datetime) -> dict:
    """
    Called by Airflow after each pipeline run.
    Matches new deals to eligible users and dispatches notifications.
    """

    # 1. Fetch new deals from gold layer
    new_deals = await db.execute(
        select(GoldDeal)
        .where(GoldDeal.created_at >= since)
        .where(GoldDeal.deal_score >= 40)
        .order_by(GoldDeal.deal_score.desc())
    )

    notifications_sent = 0

    for deal in new_deals.scalars():

        # 2. Find matching users
        # User must have:
        #   - deal destination in their watchlist OR watchlist includes the region
        #   - deal origin in their departure_airports
        #   - deal price <= their max_budget
        #   - deal departure within their date flexibility window
        #   - deal score >= their min_deal_score threshold
        matching_users = await find_matching_users(db, deal)

        for user in matching_users:

            # 3. Dedup: skip if we already alerted this user for same route today
            already_sent = await check_recent_alert(db, user.id, deal)
            if already_sent:
                continue

            # 4. Respect quiet hours
            if is_in_quiet_hours(user.notification_prefs):
                # Queue for later (Celery delay)
                schedule_delayed_notification.delay(user.id, deal.id)
                continue

            # 5. Free tier: max 3 push notifs/day
            daily_count = await get_daily_push_count(db, user.id)
            if not user.is_premium and daily_count >= 3:
                # Queue for daily email digest instead
                add_to_digest_queue(user.id, deal)
                continue

            # 6. Dispatch
            await dispatch_notification(db, user, deal)
            notifications_sent += 1

    return {"processed": len(new_deals), "notifications_sent": notifications_sent}
```

---

## 5. Push Notification Payloads

### FCM (Firebase Cloud Messaging)

```python
# Push notification for a hot deal
message = messaging.Message(
    token=user_device.fcm_token,
    notification=messaging.Notification(
        title=f"✈️ {deal.origin_city} → {deal.dest_city} — {deal.price_eur}€ !",
        body=f"Deal score: {deal.deal_score}/100 · Départ le {format_date_fr(deal.departure_at)}"
    ),
    data={
        "deal_id": str(deal.id),
        "deal_score": str(deal.deal_score),
        "price_eur": str(deal.price_eur),
        "dest_city": deal.dest_city,
        "type": "new_deal"
    },
    android=messaging.AndroidConfig(
        priority="high",
        notification=messaging.AndroidNotification(
            icon="ic_plane",
            color="#FF6B35",    # Brand orange
            channel_id="deals",
        )
    )
)
```

### Email Template Structure (Resend + React Email)

```
Subject: ✈️ [DEAL 🔥] Paris → Prague — 34€ aller-retour !

┌─────────────────────────────────────┐
│  🔥 DEAL CHAUD                       │
│                                     │
│  Paris → Prague                     │
│  🇫🇷          🇨🇿                   │
│                                     │
│     34€                             │
│  ~~~~                               │
│  Habituellement 89€ (−61%)          │
│                                     │
│  📅 15 mars → 18 mars (3 nuits)     │
│  ✈️ Direct · Ryanair                │
│  ⭐ Deal Score: 87/100              │
│                                     │
│  [  RÉSERVER MAINTENANT  ]          │
│                                     │
│  Offre valable jusqu'à 18h00        │
└─────────────────────────────────────┘

Pourquoi ce deal ? Prix 61% sous la moyenne des 90 derniers jours.
```

---

## 6. Database Migrations (Alembic)

```
apps/api/
├── alembic/
│   ├── versions/
│   │   ├── 001_initial_schema.py
│   │   ├── 002_add_notifications.py
│   │   └── 003_add_premium_fields.py
│   └── env.py
└── alembic.ini
```

---

## 7. Configuration (`.env.example`)

```bash
# App
SECRET_KEY=your-secret-key-here
ENVIRONMENT=development
DEBUG=true

# Database
DATABASE_URL=postgresql+asyncpg://trigradar:password@localhost:5432/trigradar
WAREHOUSE_URL=postgresql+asyncpg://trigradar:password@localhost:5432/trigradar_dw

# Redis
REDIS_URL=redis://localhost:6379/0

# External APIs
KIWI_TEQUILA_API_KEY=your-key
OPENWEATHER_API_KEY=your-key
HOSTELWORLD_API_KEY=your-key

# Firebase (FCM)
FIREBASE_CREDENTIALS_JSON={"type": "service_account", ...}

# Email
RESEND_API_KEY=your-key
FROM_EMAIL=alertes@trigradar.fr

# Internal
INTERNAL_API_TOKEN=random-secret-for-airflow

# Airflow
AIRFLOW_BASE_URL=http://localhost:8080
AIRFLOW_USER=admin
AIRFLOW_PASS=admin
```
