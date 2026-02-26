{{
  config(
    materialized='incremental',
    unique_key=['hostel_id', 'checkin', 'checkout'],
    incremental_strategy='merge',
    on_schema_change='sync_all_columns'
  )
}}

/*
  silver_hostels — cleaned hostel price records.

  Reads from bronze_hostel_prices (written by ingest_hostels_dag).
  Applies price/rating sanity filters and normalises field names
  to match the gold_combo_deals join requirements.
*/

WITH raw AS (
    SELECT *
    FROM {{ source('bronze', 'bronze_hostel_prices') }}
    {% if is_incremental() %}
    WHERE fetched_at > (
        SELECT COALESCE(MAX(fetched_at), '1970-01-01'::timestamptz)
        FROM {{ this }}
    )
    {% endif %}
),

cleaned AS (
    SELECT
        hostel_id,
        hostel_name                                  AS name,
        city,
        dest_iata,
        ROUND(price_per_night_eur::NUMERIC, 2)       AS price_per_night_eur,
        ROUND(COALESCE(rating, 0)::NUMERIC, 1)       AS rating,
        booking_url,
        image_url,
        dorm_available,
        private_available,
        checkin,
        checkout,
        nights,
        fetched_at,

        -- Total stay cost
        ROUND((price_per_night_eur * nights)::NUMERIC, 2) AS total_hostel_price_eur

    FROM raw
    WHERE
        -- Basic sanity guards
        price_per_night_eur BETWEEN 1 AND 200
        AND nights BETWEEN 1 AND 30
        AND hostel_id IS NOT NULL
        AND dest_iata IS NOT NULL
)

SELECT * FROM cleaned
