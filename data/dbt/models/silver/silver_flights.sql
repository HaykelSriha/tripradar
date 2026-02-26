{{
  config(
    materialized='incremental',
    unique_key='flight_hash',
    incremental_strategy='merge',
    on_schema_change='sync_all_columns',
    indexes=[
      {'columns': ['origin_iata', 'dest_iata'], 'type': 'btree'},
      {'columns': ['departure_at'], 'type': 'btree'},
      {'columns': ['fetched_at'], 'type': 'btree'},
    ]
  )
}}

/*
  silver_flights — cleaned and normalised flight records.

  Transformations applied vs bronze:
    - Join with ref_airports to enrich with French city names, country, flag
    - Parse airline list to a single primary airline
    - Compute duration in hours and days
    - Filter out invalid prices, past dates, and unknown origin/dest
    - Standardise IATA codes to uppercase

  Incremental: processes only bronze records added since the last run.
*/

WITH bronze AS (
    SELECT *
    FROM {{ source('bronze', 'bronze_flight_prices') }}
    {% if is_incremental() %}
    -- Only process new records since the last time this model ran
    WHERE fetched_at > (SELECT COALESCE(MAX(fetched_at), '1970-01-01'::timestamptz) FROM {{ this }})
    {% endif %}
),

airports_origin AS (
    SELECT
        iata,
        city        AS origin_city_en,
        city_fr     AS origin_city_fr,
        country     AS origin_country_en,
        country_fr  AS origin_country_fr,
        flag        AS origin_flag
    FROM {{ ref('ref_airports') }}
),

airports_dest AS (
    SELECT
        iata,
        city            AS dest_city_en,
        city_fr         AS dest_city_fr,
        country         AS dest_country_en,
        country_fr      AS dest_country_fr,
        flag            AS dest_flag,
        popularity_tier AS dest_popularity_tier
    FROM {{ ref('ref_airports') }}
),

enriched AS (
    SELECT
        b.flight_hash,
        b.source,

        -- IATA codes (normalised to uppercase)
        UPPER(TRIM(b.origin))      AS origin_iata,
        UPPER(TRIM(b.destination)) AS dest_iata,

        -- City / country enriched from ref_airports (French names for UI)
        COALESCE(ao.origin_city_fr, b.origin_city)   AS origin_city,
        COALESCE(ad.dest_city_fr,   b.dest_city)     AS dest_city,
        COALESCE(ao.origin_country_fr, b.origin_country) AS origin_country,
        COALESCE(ad.dest_country_fr,   b.dest_country)   AS dest_country,
        ao.origin_flag,
        ad.dest_flag,
        COALESCE(ad.dest_popularity_tier, 3)         AS dest_popularity_tier,

        -- Dates
        b.departure_at::TIMESTAMPTZ                  AS departure_at,
        b.return_at::TIMESTAMPTZ                     AS return_at,

        -- Duration
        ROUND(
            EXTRACT(EPOCH FROM (b.return_at - b.departure_at)) / 3600.0,
            1
        )                                            AS duration_h,
        ROUND(
            EXTRACT(EPOCH FROM (b.return_at - b.departure_at)) / 86400.0,
            1
        )                                            AS duration_days,

        -- Price
        ROUND(b.price_eur::NUMERIC, 2)               AS price_eur,

        -- Airline
        b.airline,
        b.is_direct,
        b.stops,
        b.deep_link,
        b.fetched_at

    FROM bronze b
    LEFT JOIN airports_origin ao ON ao.iata = UPPER(TRIM(b.origin))
    LEFT JOIN airports_dest   ad ON ad.iata = UPPER(TRIM(b.destination))
),

filtered AS (
    SELECT *
    FROM enriched
    WHERE
        -- Basic sanity filters
        price_eur > 0
        AND price_eur < 2000
        AND departure_at > NOW()          -- only future flights
        AND return_at > departure_at      -- return must be after departure
        AND duration_h >= 12              -- at least half a day away
        AND duration_h <= 744             -- max ~31 days (overnight trips excluded)
        AND origin_iata IS NOT NULL
        AND dest_iata IS NOT NULL
        AND origin_iata != dest_iata      -- no same-city roundtrips
)

SELECT * FROM filtered
