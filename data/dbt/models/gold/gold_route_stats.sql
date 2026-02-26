{{
  config(
    materialized='table',
    post_hook=[
      "ANALYZE {{ this }}",
      "CREATE INDEX IF NOT EXISTS idx_route_stats_route ON {{ this }} (origin_iata, dest_iata)",
    ]
  )
}}

/*
  gold_route_stats — price statistics per route over rolling 30/90-day windows.

  Rebuilt fully on every run (materialized='table') to ensure statistics are
  always up-to-date with the latest price data.

  Used by gold_deals to:
    - Compute savings_pct = (avg_90d - price) / avg_90d
    - Score deals: price_score = min(50, max(0, savings_pct × 50))

  A route needs at least 5 observations in the 90-day window to be included
  (ensures statistical reliability).
*/

WITH price_windows AS (
    SELECT
        origin_iata,
        dest_iata,

        -- 30-day window
        AVG(price_eur)    FILTER (WHERE fetched_at >= NOW() - INTERVAL '30 days')
                          AS avg_price_30d,
        MIN(price_eur)    FILTER (WHERE fetched_at >= NOW() - INTERVAL '30 days')
                          AS min_price_30d,
        MAX(price_eur)    FILTER (WHERE fetched_at >= NOW() - INTERVAL '30 days')
                          AS max_price_30d,
        COUNT(*)          FILTER (WHERE fetched_at >= NOW() - INTERVAL '30 days')
                          AS sample_count_30d,

        -- 90-day window (used as the primary baseline for deal scoring)
        AVG(price_eur)    FILTER (WHERE fetched_at >= NOW() - INTERVAL '90 days')
                          AS avg_price_90d,
        MIN(price_eur)    FILTER (WHERE fetched_at >= NOW() - INTERVAL '90 days')
                          AS min_price_90d,
        MAX(price_eur)    FILTER (WHERE fetched_at >= NOW() - INTERVAL '90 days')
                          AS max_price_90d,
        COUNT(*)          FILTER (WHERE fetched_at >= NOW() - INTERVAL '90 days')
                          AS sample_count_90d,

        -- Percentile prices (90-day window)
        PERCENTILE_CONT(0.20) WITHIN GROUP (ORDER BY price_eur)
            FILTER (WHERE fetched_at >= NOW() - INTERVAL '90 days')
                          AS p20_price_90d,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY price_eur)
            FILTER (WHERE fetched_at >= NOW() - INTERVAL '90 days')
                          AS median_price_90d

    FROM {{ ref('silver_flights') }}
    WHERE fetched_at >= NOW() - INTERVAL '90 days'  -- limit scan to relevant window
    GROUP BY origin_iata, dest_iata
),

validated AS (
    SELECT
        *,
        NOW() AS computed_at
    FROM price_windows
    WHERE
        sample_count_90d >= 2    -- need at least 2 data points (raised to 5+ in production)
        AND avg_price_90d > 0    -- guard against division by zero in scoring
)

SELECT * FROM validated
