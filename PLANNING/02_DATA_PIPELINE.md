# TripRadar — Data Pipeline

---

## 1. Overview: The 3-Layer Medallion Architecture

```
EXTERNAL APIs & SCRAPERS
        │
        ▼
┌───────────────┐
│  BRONZE LAYER │  Raw, untransformed data as-received
│  (PostgreSQL) │  Append-only. Never modify bronze.
└───────┬───────┘
        │  dbt bronze → silver models
        ▼
┌───────────────┐
│  SILVER LAYER │  Cleaned, typed, deduplicated, normalised
│  (PostgreSQL) │  Consistent schema across all sources
└───────┬───────┘
        │  dbt silver → gold models
        ▼
┌───────────────┐
│  GOLD LAYER   │  Business logic: deal scoring, route stats
│  (PostgreSQL) │  What the API reads from
└───────────────┘
        │
        ▼
  FastAPI reads gold_deals → serves to users → triggers alerts
```

---

## 2. Apache Airflow DAGs

### DAG 1: `ingest_flights` (every 6 hours)

```python
# data/airflow/dags/ingest_flights_dag.py

"""
Schedule: 0 */6 * * *  (00:00, 06:00, 12:00, 18:00 UTC)
Purpose : Fetch cheapest flights for all origin/destination pairs
          and load into bronze_flight_prices
"""

FRENCH_AIRPORTS = ["CDG", "ORY", "LYS", "MRS", "BOD", "NTE", "NCE", "TLS", "LIL"]

EU_DESTINATIONS = [
    "PRG", "BUD", "WAW", "KRK", "BCN", "LIS", "FCO", "CIA",
    "ATH", "DUB", "AMS", "BER", "VIE", "BRU", "CPH", "ARN",
    "HEL", "TLL", "RIX", "VNO", "BTS", "ZAG", "SOF", "OTP",
    "SKP", "TIA", "OPO", "SVQ", "PMI", "VLC", "AGP",
]

with DAG("ingest_flights", schedule="0 */6 * * *", ...) as dag:

    for origin in FRENCH_AIRPORTS:
        for dest in EU_DESTINATIONS:
            fetch_task = PythonOperator(
                task_id=f"fetch_{origin}_{dest}",
                python_callable=fetch_kiwi_flights,
                op_kwargs={"origin": origin, "dest": dest,
                           "date_from": "today+3d",
                           "date_to": "today+90d",
                           "nights_min": 2,
                           "nights_max": 10}
            )
```

**Kiwi Tequila API call (per pair):**
```
GET https://tequila.kiwi.com/v2/search
  ?fly_from={origin}
  &fly_to={dest}
  &date_from={date_from}
  &date_to={date_to}
  &nights_in_dst_from={nights_min}
  &nights_in_dst_to={nights_max}
  &flight_type=round
  &one_for_city=1        ← cheapest per city
  &curr=EUR
  &limit=10
  &sort=price
```

**Bronze insert:**
```sql
INSERT INTO bronze_flight_prices
  (source, origin, destination, departure_at, return_at,
   price_eur, airline, deep_link, raw_json, fetched_at)
VALUES (...)
ON CONFLICT DO NOTHING;  -- dedup by (origin, dest, departure_at, return_at, price_eur)
```

---

### DAG 2: `ingest_hostels` (every 12 hours)

```python
# data/airflow/dags/ingest_hostels_dag.py
"""
Schedule: 0 */12 * * *
Purpose : Fetch cheapest hostel prices per destination city
          Load into bronze_hostel_prices
"""

# Hostelworld API (partner) or scraping fallback
for dest_city in EU_DESTINATION_CITIES:
    for checkin_offset in [7, 14, 21, 30, 45, 60]:  # days from now
        fetch_hostel_prices(city=dest_city, checkin_offset=checkin_offset)
```

---

### DAG 3: `run_dbt_transforms` (every 6 hours, after ingest)

```python
# data/airflow/dags/dbt_transforms_dag.py
"""
Schedule: triggered by ingest_flights DAG completion
          (TriggerDagRunOperator)
Purpose : Run dbt models Bronze → Silver → Gold
"""

with DAG("run_dbt_transforms", ...) as dag:

    dbt_silver_flights = BashOperator(
        task_id="dbt_silver_flights",
        bash_command="cd /opt/dbt && dbt run --select silver.flights"
    )
    dbt_silver_hostels = BashOperator(
        task_id="dbt_silver_hostels",
        bash_command="cd /opt/dbt && dbt run --select silver.hostels"
    )
    dbt_gold_route_stats = BashOperator(
        task_id="dbt_gold_route_stats",
        bash_command="cd /opt/dbt && dbt run --select gold.route_stats"
    )
    dbt_gold_deals = BashOperator(
        task_id="dbt_gold_deals",
        bash_command="cd /opt/dbt && dbt run --select gold.deals"
    )
    dbt_tests = BashOperator(
        task_id="dbt_tests",
        bash_command="cd /opt/dbt && dbt test"
    )

    [dbt_silver_flights, dbt_silver_hostels] >> dbt_gold_route_stats
    dbt_gold_route_stats >> dbt_gold_deals >> dbt_tests
```

---

### DAG 4: `score_and_alert` (every 6 hours, after dbt)

```python
# data/airflow/dags/score_and_alert_dag.py
"""
Triggered after run_dbt_transforms completes.
1. Reads newly scored deals from gold_deals (created in last 6h)
2. Calls FastAPI internal endpoint to trigger alert matching
"""

notify_api = SimpleHttpOperator(
    task_id="notify_api_new_deals",
    http_conn_id="api_internal",
    endpoint="/internal/process-alerts",
    method="POST",
    headers={"X-Internal-Token": "{{ var.value.INTERNAL_API_TOKEN }}"},
    data=json.dumps({"since": "{{ ds }}T{{ execution_date.hour }}:00:00"})
)
```

---

### DAG 5: `cleanup_old_prices` (daily at 2am)

```sql
-- Keeps bronze lean: delete raw data older than 180 days
-- Silver/Gold partitioned by month, drop old partitions
DELETE FROM bronze_flight_prices WHERE fetched_at < NOW() - INTERVAL '180 days';
DELETE FROM bronze_hostel_prices WHERE fetched_at < NOW() - INTERVAL '180 days';
```

---

## 3. dbt Models

### Bronze (source declarations only — raw tables)

```yaml
# data/dbt/models/bronze/schema.yml
version: 2
sources:
  - name: bronze
    schema: public
    tables:
      - name: bronze_flight_prices
        columns:
          - name: id
          - name: source
          - name: origin         # IATA code
          - name: destination    # IATA code
          - name: departure_at
          - name: return_at
          - name: price_eur
          - name: airline
          - name: deep_link
          - name: fetched_at
      - name: bronze_hostel_prices
        ...
```

---

### Silver: `silver_flights`

```sql
-- data/dbt/models/silver/silver_flights.sql
{{
  config(
    materialized='incremental',
    unique_key='id',
    partition_by={'field': 'departure_at', 'data_type': 'timestamp'},
    incremental_strategy='merge'
  )
}}

WITH raw AS (
  SELECT *
  FROM {{ source('bronze', 'bronze_flight_prices') }}
  {% if is_incremental() %}
  WHERE fetched_at > (SELECT MAX(fetched_at) FROM {{ this }})
  {% endif %}
),

cleaned AS (
  SELECT
    id,
    UPPER(TRIM(origin))       AS origin_iata,
    UPPER(TRIM(destination))  AS dest_iata,
    -- Join with airport reference table
    airports_o.city           AS origin_city,
    airports_d.city           AS dest_city,
    airports_o.country        AS origin_country,
    airports_d.country        AS dest_country,
    departure_at::TIMESTAMPTZ,
    return_at::TIMESTAMPTZ,
    EXTRACT(EPOCH FROM (return_at - departure_at)) / 3600 AS duration_h,
    ROUND(price_eur::NUMERIC, 2)   AS price_eur,
    airline,
    deep_link,
    source,
    fetched_at
  FROM raw
  LEFT JOIN ref_airports airports_o ON airports_o.iata = UPPER(TRIM(origin))
  LEFT JOIN ref_airports airports_d ON airports_d.iata = UPPER(TRIM(destination))
  WHERE price_eur > 0
    AND price_eur < 2000        -- sanity filter
    AND departure_at > NOW()    -- only future flights
    AND origin IS NOT NULL
    AND destination IS NOT NULL
)

SELECT * FROM cleaned
```

---

### Gold: `gold_route_stats`

```sql
-- data/dbt/models/gold/gold_route_stats.sql
{{
  config(
    materialized='table',    -- recompute fully each run
    post_hook="CREATE INDEX IF NOT EXISTS idx_route_stats ON gold_route_stats(origin_iata, dest_iata)"
  )
}}

SELECT
  origin_iata,
  dest_iata,
  AVG(price_eur)                                        AS avg_price_30d,
  MIN(price_eur)                                        AS min_price_30d,
  PERCENTILE_CONT(0.2) WITHIN GROUP (ORDER BY price_eur) AS p20_price_30d,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_eur) AS median_price_30d,
  COUNT(*)                                              AS sample_count_30d,

  -- 90-day window for more stable baseline
  AVG(price_eur) FILTER (WHERE fetched_at > NOW() - INTERVAL '90 days') AS avg_price_90d,
  MIN(price_eur) FILTER (WHERE fetched_at > NOW() - INTERVAL '90 days') AS min_price_90d,
  PERCENTILE_CONT(0.2) WITHIN GROUP (ORDER BY price_eur)
    FILTER (WHERE fetched_at > NOW() - INTERVAL '90 days')              AS p20_price_90d,

  NOW()                                                 AS computed_at

FROM {{ ref('silver_flights') }}
WHERE fetched_at > NOW() - INTERVAL '30 days'
GROUP BY origin_iata, dest_iata
HAVING COUNT(*) >= 5    -- need at least 5 samples for reliable stats
```

---

### Gold: `gold_deals`

```sql
-- data/dbt/models/gold/gold_deals.sql
{{
  config(
    materialized='incremental',
    unique_key='id',
    post_hook=[
      "CREATE INDEX IF NOT EXISTS idx_deals_score ON gold_deals(deal_score DESC)",
      "CREATE INDEX IF NOT EXISTS idx_deals_origin ON gold_deals(origin_iata, deal_score DESC)"
    ]
  )
}}

WITH latest_flights AS (
  SELECT f.*,
         s.avg_price_90d,
         s.p20_price_90d,
         s.sample_count_30d
  FROM {{ ref('silver_flights') }} f
  LEFT JOIN {{ ref('gold_route_stats') }} s
    ON f.origin_iata = s.origin_iata AND f.dest_iata = s.dest_iata
  WHERE f.fetched_at > NOW() - INTERVAL '6 hours'  -- only newly ingested
    AND f.departure_at > NOW() + INTERVAL '3 days' -- min 3 days lead time
    AND s.avg_price_90d IS NOT NULL
    AND s.sample_count_30d >= 5
),

scored AS (
  SELECT
    *,
    -- Price score vs 90d average (0–50 pts)
    LEAST(50,
      GREATEST(0,
        ROUND(((avg_price_90d - price_eur) / avg_price_90d * 100))
      )
    ) AS price_score,

    -- Absolute price tier score (0–20 pts)
    CASE
      WHEN price_eur < 30  THEN 20
      WHEN price_eur < 50  THEN 15
      WHEN price_eur < 80  THEN 10
      WHEN price_eur < 120 THEN  5
      ELSE 0
    END AS price_tier_score,

    -- Duration score (0–10 pts)
    CASE
      WHEN duration_h BETWEEN 48 AND 168  THEN 10  -- 2–7 days
      WHEN duration_h BETWEEN 24 AND 48   THEN  7  -- 1–2 days
      WHEN duration_h > 168               THEN  7  -- > 7 days
      ELSE 4
    END AS duration_score,

    -- Destination popularity score (0–10 pts) — hardcoded tier list
    CASE
      WHEN dest_iata IN ('PRG','BUD','LIS','BCN','FCO','ATH','DUB','AMS') THEN 10
      WHEN dest_iata IN ('WAW','KRK','VIE','BER','CPH','OPO','SVQ') THEN 7
      ELSE 5
    END AS dest_score

  FROM latest_flights
  WHERE price_eur < avg_price_90d  -- only show deals cheaper than average
),

final AS (
  SELECT
    id,
    origin_iata, dest_iata,
    origin_city, dest_city, origin_country, dest_country,
    departure_at, return_at,
    ROUND(duration_h / 24.0, 1)   AS duration_days,
    price_eur,
    airline, deep_link,
    avg_price_90d,
    ROUND((avg_price_90d - price_eur) / avg_price_90d * 100, 1) AS savings_pct,

    -- FINAL DEAL SCORE
    (price_score + price_tier_score + duration_score + dest_score) AS deal_score,

    CASE
      WHEN (price_score + price_tier_score + duration_score + dest_score) >= 80 THEN 'hot'
      WHEN (price_score + price_tier_score + duration_score + dest_score) >= 60 THEN 'good'
      ELSE 'fair'
    END AS deal_tier,

    NOW()                          AS created_at,
    NOW() + INTERVAL '6 hours'    AS valid_until   -- expire after next run
  FROM scored
  WHERE (price_score + price_tier_score + duration_score + dest_score) >= 40  -- min threshold
)

SELECT * FROM final
```

---

### dbt Tests

```yaml
# data/dbt/models/gold/schema.yml
version: 2
models:
  - name: gold_deals
    tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns: [origin_iata, dest_iata, departure_at, return_at]
    columns:
      - name: deal_score
        tests:
          - not_null
          - accepted_range:
              min_value: 0
              max_value: 100
      - name: price_eur
        tests:
          - not_null
          - accepted_range:
              min_value: 5
              max_value: 1999
      - name: savings_pct
        tests:
          - accepted_range:
              min_value: 0
              max_value: 100
```

---

## 4. GitHub Actions for Pipeline

### `.github/workflows/data-pipeline.yml`

```yaml
name: Data Pipeline Trigger

on:
  schedule:
    - cron: '0 */6 * * *'   # Every 6 hours (backup trigger if Airflow is down)
  workflow_dispatch:          # Manual trigger from GitHub UI
    inputs:
      dag_id:
        description: 'DAG to trigger'
        required: true
        default: 'ingest_flights'

jobs:
  trigger-airflow-dag:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Airflow DAG via REST API
        run: |
          curl -X POST \
            "${{ secrets.AIRFLOW_BASE_URL }}/api/v1/dags/${{ inputs.dag_id }}/dagRuns" \
            -H "Content-Type: application/json" \
            -u "${{ secrets.AIRFLOW_USER }}:${{ secrets.AIRFLOW_PASS }}" \
            -d '{"conf": {}}'
```

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  test-api:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r apps/api/requirements.txt
      - run: pytest apps/api/tests/ -v

  test-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run type-check --workspace=apps/web
      - run: npm run test --workspace=apps/web

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

  dbt-compile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install dbt-postgres
      - run: cd data/dbt && dbt compile --profiles-dir .
```

---

## 5. Data Volume Estimates

```
Routes:   8 French airports × 30 EU destinations = 240 route pairs
Fetches:  4 times/day × 10 results per route     = 9,600 records/day
Monthly:  ~288,000 bronze flight records
Annual:   ~3.5M records

After silver dedup:  ~60% of bronze = ~2.1M rows/year
Gold deals:          ~2–5% of silver (actual deals) = ~40K–100K deals/year

Storage estimate: ~2GB/year for flight data at this scale
TimescaleDB compression: ~5× → effectively ~400MB/year
```
