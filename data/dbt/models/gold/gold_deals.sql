{{
  config(
    materialized='incremental',
    unique_key=['origin_iata', 'dest_iata', 'departure_at', 'return_at'],
    incremental_strategy='merge',
    on_schema_change='sync_all_columns',
    post_hook=[
      "CREATE INDEX IF NOT EXISTS idx_deals_score ON {{ this }} (deal_score DESC)",
      "CREATE INDEX IF NOT EXISTS idx_deals_origin_score ON {{ this }} (origin_iata, deal_score DESC)",
      "CREATE INDEX IF NOT EXISTS idx_deals_dest ON {{ this }} (dest_iata)",
      "CREATE INDEX IF NOT EXISTS idx_deals_valid_until ON {{ this }} (valid_until)",
    ]
  )
}}

/*
  gold_deals — scored flight deals ready for the API and alert system.

  Only includes flights where the current price is below the 90-day average.
  Each deal gets a Deal Score (0–100) composed of:

    Price Score      (0–50 pts): % cheaper than 90-day average
    Price Tier Score (0–20 pts): absolute price bracket
    Directness Score (0–10 pts): direct vs 1 stop vs 2+ stops
    Duration Score   (0–10 pts): trip duration sweet spot (2–7 nights)
    Destination Score(0–10 pts): destination popularity tier

  Deals with score ≥ 80 → "hot"
  Deals with score ≥ 60 → "good"
  Deals with score ≥ 40 → "fair" (minimum threshold to appear)

  Incremental: processes only silver_flights added since the last run,
  joined against the freshly rebuilt gold_route_stats (full table).
*/

WITH latest_silver AS (
    SELECT f.*
    FROM {{ ref('silver_flights') }} f
    {% if is_incremental() %}
    -- Only process flights fetched since the last gold_deals run
    WHERE f.fetched_at > (
        SELECT COALESCE(MAX(created_at), '1970-01-01'::timestamptz)
        FROM {{ this }}
    )
    {% endif %}
),

-- Keep only the cheapest offer per unique flight slot.
-- silver_flights deduplicates on flight_hash, but the same
-- (origin, dest, departure_at, return_at) can appear with different
-- airlines or prices across ingestion runs.
deduped AS (
    SELECT DISTINCT ON (origin_iata, dest_iata, departure_at, return_at)
        *
    FROM latest_silver
    ORDER BY origin_iata, dest_iata, departure_at, return_at, price_eur ASC
),

joined AS (
    SELECT
        f.*,
        s.avg_price_90d,
        s.p20_price_90d,
        s.min_price_90d,
        s.sample_count_90d
    FROM deduped f
    INNER JOIN {{ ref('gold_route_stats') }} s
        ON  f.origin_iata = s.origin_iata
        AND f.dest_iata   = s.dest_iata
    WHERE
        -- Only routes with enough historical data to score reliably
        s.sample_count_90d >= 2
        -- Only deals cheaper than the route average
        AND f.price_eur < s.avg_price_90d
        -- Must depart at least 3 days from now
        AND f.departure_at > NOW() + INTERVAL '3 days'
),

scored AS (
    SELECT
        *,

        -- ── Price Score (0–50 pts) ───────────────────────────────────────────
        -- Proportional to how much cheaper this price is vs the 90-day average
        LEAST(50, GREATEST(0,
            ROUND(((avg_price_90d - price_eur) / avg_price_90d) * 100)
        ))::INTEGER                                         AS price_score,

        -- ── Price Tier Score (0–20 pts) ──────────────────────────────────────
        -- Rewards absolutely cheap prices regardless of % savings
        CASE
            WHEN price_eur < 30  THEN 20
            WHEN price_eur < 50  THEN 15
            WHEN price_eur < 80  THEN 10
            WHEN price_eur < 120 THEN  5
            ELSE 0
        END                                                 AS price_tier_score,

        -- ── Directness Score (0–10 pts) ──────────────────────────────────────
        CASE
            WHEN is_direct THEN 10
            WHEN stops = 1  THEN  5
            ELSE 0
        END                                                 AS directness_score,

        -- ── Duration Score (0–10 pts) ────────────────────────────────────────
        -- 2–7 nights = sweet spot for young workers with limited PTO
        CASE
            WHEN duration_days BETWEEN 2 AND 7   THEN 10
            WHEN duration_days BETWEEN 7 AND 14  THEN  7
            WHEN duration_days = 1               THEN  5
            WHEN duration_days > 14              THEN  5
            ELSE 3
        END                                                 AS duration_score,

        -- ── Destination Score (0–10 pts) ─────────────────────────────────────
        CASE dest_popularity_tier
            WHEN 1 THEN 10
            WHEN 2 THEN  7
            WHEN 3 THEN  5
            ELSE 0
        END                                                 AS dest_score

    FROM joined
),

final AS (
    SELECT
        -- Identity
        origin_iata,
        dest_iata,
        origin_city,
        dest_city,
        origin_country,
        dest_country,
        origin_flag,
        dest_flag,

        -- Flight details
        departure_at,
        return_at,
        duration_h,
        ROUND(duration_days::NUMERIC, 1) AS duration_days,
        airline,
        is_direct,
        stops,
        deep_link,

        -- Pricing
        price_eur,
        ROUND(avg_price_90d::NUMERIC, 2) AS avg_price_90d,
        ROUND(
            ((avg_price_90d - price_eur) / avg_price_90d * 100)::NUMERIC,
            1
        )                                AS savings_pct,

        -- Score components (for transparency / debugging)
        price_score,
        price_tier_score,
        directness_score,
        duration_score,
        dest_score,

        -- ── FINAL DEAL SCORE (0–100) ──────────────────────────────────────
        (price_score + price_tier_score + directness_score + duration_score + dest_score)
                                         AS deal_score,

        -- Deal tier label
        CASE
            WHEN (price_score + price_tier_score + directness_score + duration_score + dest_score) >= 80
                THEN 'hot'
            WHEN (price_score + price_tier_score + directness_score + duration_score + dest_score) >= 60
                THEN 'good'
            ELSE 'fair'
        END                              AS deal_tier,

        -- Metadata
        source,
        flight_hash,
        NOW()                            AS created_at,
        -- Deal expires when the next pipeline run overwrites it (6h cadence)
        NOW() + INTERVAL '7 hours'      AS valid_until

    FROM scored
    WHERE
        -- Minimum quality threshold — hide very low-quality results
        (price_score + price_tier_score + directness_score + duration_score + dest_score) >= 40
)

SELECT * FROM final
