{{
  config(
    materialized='incremental',
    unique_key=['flight_hash', 'hostel_id'],
    incremental_strategy='merge',
    on_schema_change='sync_all_columns',
    post_hook=[
      "CREATE INDEX IF NOT EXISTS idx_combo_score ON {{ this }} (combo_score DESC)",
      "CREATE INDEX IF NOT EXISTS idx_combo_flight ON {{ this }} (flight_hash)",
      "CREATE INDEX IF NOT EXISTS idx_combo_dest ON {{ this }} (dest_iata)",
    ]
  )
}}

/*
  gold_combo_deals — flight + hostel bundle deals.

  Joins gold_deals with silver_hostels on (dest_iata, date overlap) to create
  combo bundles showing total trip cost (flight A/R + hostel stay).

  A combo_score is computed as the weighted average of deal_score and a hostel
  quality score derived from price efficiency and rating.

  Only includes combos where:
    - The deal is still valid (valid_until > NOW())
    - The hostel check-in aligns with the flight departure date (±1 day tolerance)
    - Total package price < avg_price_90d + avg_hostel_price_per_night * nights
*/

WITH active_deals AS (
    SELECT *
    FROM {{ ref('gold_deals') }}
    WHERE valid_until > NOW()
),

hostel_scored AS (
    SELECT
        *,
        -- Hostel quality score (0-100)
        LEAST(100, GREATEST(0,
            -- 60% from price (cheaper = better, relative to avg 20€/night benchmark)
            ROUND(LEAST(60, GREATEST(0, (1 - price_per_night_eur / 40.0) * 60)) +
            -- 40% from rating (0-10 → 0-40 pts)
            ROUND(rating / 10.0 * 40))
        ))::INTEGER AS hostel_score
    FROM {{ ref('silver_hostels') }}
),

joined AS (
    SELECT
        d.flight_hash,
        d.origin_iata,
        d.dest_iata,
        d.origin_city,
        d.dest_city,
        d.origin_flag,
        d.dest_flag,
        d.departure_at,
        d.return_at,
        d.duration_days,
        d.airline,
        d.is_direct,
        d.price_eur                                    AS flight_price_eur,
        d.avg_price_90d                                AS flight_avg_price,
        d.savings_pct                                  AS flight_savings_pct,
        d.deal_score,
        d.deal_tier,
        d.deep_link                                    AS flight_booking_url,
        d.valid_until,
        d.created_at,

        h.hostel_id,
        h.name                                         AS hostel_name,
        h.price_per_night_eur,
        h.total_hostel_price_eur,
        h.rating                                       AS hostel_rating,
        h.booking_url                                  AS hostel_booking_url,
        h.image_url                                    AS hostel_image_url,
        h.dorm_available,
        h.private_available,
        h.nights,
        h.hostel_score,

        -- Total combo cost
        d.price_eur + h.total_hostel_price_eur         AS total_combo_price_eur,

        -- Combo score: weighted 60% flight deal quality + 40% hostel quality
        ROUND(d.deal_score * 0.6 + h.hostel_score * 0.4)::INTEGER AS combo_score

    FROM active_deals d
    INNER JOIN hostel_scored h
        ON  d.dest_iata = h.dest_iata
        -- Date alignment: hostel checkin within ±1 day of flight departure
        AND h.checkin BETWEEN DATE(d.departure_at) - INTERVAL '1 day'
                          AND DATE(d.departure_at) + INTERVAL '1 day'
        -- Checkout aligns with return
        AND h.nights = ROUND(d.duration_days)::INTEGER
),

final AS (
    SELECT
        *,
        -- Combo tier
        CASE
            WHEN combo_score >= 75 THEN 'hot'
            WHEN combo_score >= 55 THEN 'good'
            ELSE 'fair'
        END AS combo_tier
    FROM joined
    -- Only surface meaningful combo scores
    WHERE combo_score >= 40
)

SELECT * FROM final
