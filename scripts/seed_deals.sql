-- ── Seed gold_deals in trigradar_dw for local development ───────────────────
-- Creates the table and inserts ~20 realistic European flight deals
-- so the frontend works without a live Kiwi API connection.

CREATE TABLE IF NOT EXISTS gold_deals (
    flight_hash       TEXT PRIMARY KEY,
    origin_iata       TEXT NOT NULL,
    dest_iata         TEXT NOT NULL,
    origin_city       TEXT NOT NULL,
    dest_city         TEXT NOT NULL,
    origin_country    TEXT NOT NULL,
    dest_country      TEXT NOT NULL,
    origin_flag       TEXT NOT NULL,
    dest_flag         TEXT NOT NULL,
    departure_at      TIMESTAMPTZ NOT NULL,
    return_at         TIMESTAMPTZ,
    duration_h        NUMERIC NOT NULL,
    duration_days     NUMERIC NOT NULL,
    airline           TEXT NOT NULL,
    is_direct         BOOLEAN NOT NULL DEFAULT true,
    stops             INTEGER NOT NULL DEFAULT 0,
    deep_link         TEXT NOT NULL,
    price_eur         NUMERIC NOT NULL,
    avg_price_90d     NUMERIC NOT NULL,
    savings_pct       NUMERIC NOT NULL,
    price_score       INTEGER NOT NULL,
    price_tier_score  INTEGER NOT NULL,
    directness_score  INTEGER NOT NULL,
    duration_score    INTEGER NOT NULL,
    dest_score        INTEGER NOT NULL,
    deal_score        INTEGER NOT NULL,
    deal_tier         TEXT NOT NULL CHECK (deal_tier IN ('hot','good','fair')),
    source            TEXT NOT NULL DEFAULT 'kiwi',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until       TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 hours'
);

CREATE INDEX IF NOT EXISTS idx_deals_score        ON gold_deals (deal_score DESC);
CREATE INDEX IF NOT EXISTS idx_deals_origin_score ON gold_deals (origin_iata, deal_score DESC);
CREATE INDEX IF NOT EXISTS idx_deals_dest         ON gold_deals (dest_iata);
CREATE INDEX IF NOT EXISTS idx_deals_valid_until  ON gold_deals (valid_until);

-- Clear existing seed data and re-insert fresh
TRUNCATE gold_deals;

INSERT INTO gold_deals
(flight_hash, origin_iata, dest_iata, origin_city, dest_city, origin_country, dest_country,
 origin_flag, dest_flag, departure_at, return_at, duration_h, duration_days,
 airline, is_direct, stops, deep_link,
 price_eur, avg_price_90d, savings_pct,
 price_score, price_tier_score, directness_score, duration_score, dest_score,
 deal_score, deal_tier, valid_until)
VALUES

-- 🔥 HOT deals (score ≥ 80)
('hash_cdg_bcn_001', 'CDG', 'BCN', 'Paris', 'Barcelone', 'France', 'Espagne',
 '🇫🇷', '🇪🇸',
 NOW() + INTERVAL '12 days', NOW() + INTERVAL '16 days', 2.0, 4,
 'Vueling', true, 0, 'https://www.kiwi.com/deep?from=CDG&to=BCN',
 24, 89, 73.0,
 36, 20, 10, 10, 10, 86, 'hot', NOW() + INTERVAL '7 hours'),

('hash_ory_mad_001', 'ORY', 'MAD', 'Paris Orly', 'Madrid', 'France', 'Espagne',
 '🇫🇷', '🇪🇸',
 NOW() + INTERVAL '8 days', NOW() + INTERVAL '13 days', 2.25, 5,
 'Iberia Express', true, 0, 'https://www.kiwi.com/deep?from=ORY&to=MAD',
 19, 72, 73.6,
 36, 20, 10, 10, 7, 83, 'hot', NOW() + INTERVAL '7 hours'),

('hash_cdg_lis_001', 'CDG', 'LIS', 'Paris', 'Lisbonne', 'France', 'Portugal',
 '🇫🇷', '🇵🇹',
 NOW() + INTERVAL '15 days', NOW() + INTERVAL '22 days', 2.5, 7,
 'TAP Air Portugal', true, 0, 'https://www.kiwi.com/deep?from=CDG&to=LIS',
 28, 104, 73.1,
 36, 20, 10, 10, 10, 86, 'hot', NOW() + INTERVAL '7 hours'),

('hash_lys_ath_001', 'LYS', 'ATH', 'Lyon', 'Athènes', 'France', 'Grèce',
 '🇫🇷', '🇬🇷',
 NOW() + INTERVAL '20 days', NOW() + INTERVAL '27 days', 3.0, 7,
 'easyJet', true, 0, 'https://www.kiwi.com/deep?from=LYS&to=ATH',
 39, 148, 73.6,
 36, 20, 10, 10, 10, 86, 'hot', NOW() + INTERVAL '7 hours'),

('hash_cdg_prg_001', 'CDG', 'PRG', 'Paris', 'Prague', 'France', 'Tchéquie',
 '🇫🇷', '🇨🇿',
 NOW() + INTERVAL '10 days', NOW() + INTERVAL '14 days', 1.75, 4,
 'Ryanair', true, 0, 'https://www.kiwi.com/deep?from=CDG&to=PRG',
 22, 78, 71.8,
 35, 20, 10, 10, 7, 82, 'hot', NOW() + INTERVAL '7 hours'),

('hash_nce_dub_001', 'NCE', 'DUB', 'Nice', 'Dublin', 'France', 'Irlande',
 '🇫🇷', '🇮🇪',
 NOW() + INTERVAL '18 days', NOW() + INTERVAL '23 days', 2.75, 5,
 'Ryanair', true, 0, 'https://www.kiwi.com/deep?from=NCE&to=DUB',
 31, 115, 73.0,
 36, 20, 10, 10, 7, 83, 'hot', NOW() + INTERVAL '7 hours'),

('hash_mrs_ams_001', 'MRS', 'AMS', 'Marseille', 'Amsterdam', 'France', 'Pays-Bas',
 '🇫🇷', '🇳🇱',
 NOW() + INTERVAL '7 days', NOW() + INTERVAL '10 days', 2.0, 3,
 'Transavia', true, 0, 'https://www.kiwi.com/deep?from=MRS&to=AMS',
 26, 97, 73.2,
 36, 20, 10, 10, 7, 83, 'hot', NOW() + INTERVAL '7 hours'),

-- ✅ GOOD deals (score 60–79)
('hash_cdg_rom_001', 'CDG', 'FCO', 'Paris', 'Rome', 'France', 'Italie',
 '🇫🇷', '🇮🇹',
 NOW() + INTERVAL '25 days', NOW() + INTERVAL '31 days', 2.25, 6,
 'Air France', true, 0, 'https://www.kiwi.com/deep?from=CDG&to=FCO',
 49, 134, 63.4,
 31, 15, 10, 10, 10, 76, 'good', NOW() + INTERVAL '7 hours'),

('hash_bor_bud_001', 'BOD', 'BUD', 'Bordeaux', 'Budapest', 'France', 'Hongrie',
 '🇫🇷', '🇭🇺',
 NOW() + INTERVAL '30 days', NOW() + INTERVAL '36 days', 2.0, 6,
 'Wizz Air', true, 0, 'https://www.kiwi.com/deep?from=BOD&to=BUD',
 44, 118, 62.7,
 31, 15, 10, 10, 5, 71, 'good', NOW() + INTERVAL '7 hours'),

('hash_cdg_cph_001', 'CDG', 'CPH', 'Paris', 'Copenhague', 'France', 'Danemark',
 '🇫🇷', '🇩🇰',
 NOW() + INTERVAL '14 days', NOW() + INTERVAL '19 days', 2.0, 5,
 'SAS', true, 0, 'https://www.kiwi.com/deep?from=CDG&to=CPH',
 52, 142, 63.4,
 31, 15, 10, 10, 5, 71, 'good', NOW() + INTERVAL '7 hours'),

('hash_tlse_vie_001', 'TLS', 'VIE', 'Toulouse', 'Vienne', 'France', 'Autriche',
 '🇫🇷', '🇦🇹',
 NOW() + INTERVAL '22 days', NOW() + INTERVAL '29 days', 2.0, 7,
 'easyJet', true, 0, 'https://www.kiwi.com/deep?from=TLS&to=VIE',
 47, 126, 62.7,
 31, 15, 10, 10, 5, 71, 'good', NOW() + INTERVAL '7 hours'),

('hash_cdg_waw_001', 'CDG', 'WAW', 'Paris', 'Varsovie', 'France', 'Pologne',
 '🇫🇷', '🇵🇱',
 NOW() + INTERVAL '9 days', NOW() + INTERVAL '13 days', 2.5, 4,
 'Lot Polish', true, 0, 'https://www.kiwi.com/deep?from=CDG&to=WAW',
 58, 156, 62.8,
 31, 10, 10, 10, 5, 66, 'good', NOW() + INTERVAL '7 hours'),

('hash_lys_bcn_001', 'LYS', 'BCN', 'Lyon', 'Barcelone', 'France', 'Espagne',
 '🇫🇷', '🇪🇸',
 NOW() + INTERVAL '11 days', NOW() + INTERVAL '15 days', 1.5, 4,
 'Vueling', true, 0, 'https://www.kiwi.com/deep?from=LYS&to=BCN',
 36, 99, 63.6,
 31, 20, 10, 10, 10, 81, 'hot', NOW() + INTERVAL '7 hours'),

-- 🟡 FAIR deals (score 40–59)
('hash_cdg_ber_001', 'CDG', 'BER', 'Paris', 'Berlin', 'France', 'Allemagne',
 '🇫🇷', '🇩🇪',
 NOW() + INTERVAL '28 days', NOW() + INTERVAL '32 days', 1.75, 4,
 'easyJet', true, 0, 'https://www.kiwi.com/deep?from=CDG&to=BER',
 68, 142, 52.1,
 26, 10, 10, 10, 5, 61, 'good', NOW() + INTERVAL '7 hours'),

('hash_cdg_vce_001', 'CDG', 'VCE', 'Paris', 'Venise', 'France', 'Italie',
 '🇫🇷', '🇮🇹',
 NOW() + INTERVAL '35 days', NOW() + INTERVAL '40 days', 2.0, 5,
 'Transavia', true, 0, 'https://www.kiwi.com/deep?from=CDG&to=VCE',
 72, 148, 51.4,
 25, 10, 10, 10, 10, 65, 'good', NOW() + INTERVAL '7 hours'),

('hash_mrs_bud_001', 'MRS', 'BUD', 'Marseille', 'Budapest', 'France', 'Hongrie',
 '🇫🇷', '🇭🇺',
 NOW() + INTERVAL '40 days', NOW() + INTERVAL '45 days', 2.5, 5,
 'Wizz Air', false, 1, 'https://www.kiwi.com/deep?from=MRS&to=BUD',
 54, 112, 51.8,
 25, 15, 5, 10, 5, 60, 'good', NOW() + INTERVAL '7 hours'),

('hash_cdg_dub_001', 'CDG', 'DUB', 'Paris', 'Dublin', 'France', 'Irlande',
 '🇫🇷', '🇮🇪',
 NOW() + INTERVAL '45 days', NOW() + INTERVAL '50 days', 1.5, 5,
 'Aer Lingus', true, 0, 'https://www.kiwi.com/deep?from=CDG&to=DUB',
 78, 158, 50.6,
 25, 10, 10, 10, 7, 62, 'good', NOW() + INTERVAL '7 hours'),

('hash_cdg_bud_001', 'CDG', 'BUD', 'Paris', 'Budapest', 'France', 'Hongrie',
 '🇫🇷', '🇭🇺',
 NOW() + INTERVAL '50 days', NOW() + INTERVAL '54 days', 2.25, 4,
 'Wizz Air', true, 0, 'https://www.kiwi.com/deep?from=CDG&to=BUD',
 42, 86, 51.2,
 25, 15, 10, 10, 5, 65, 'good', NOW() + INTERVAL '7 hours'),

('hash_cdg_opo_001', 'CDG', 'OPO', 'Paris', 'Porto', 'France', 'Portugal',
 '🇫🇷', '🇵🇹',
 NOW() + INTERVAL '17 days', NOW() + INTERVAL '24 days', 2.25, 7,
 'TAP Air Portugal', true, 0, 'https://www.kiwi.com/deep?from=CDG&to=OPO',
 33, 67, 50.7,
 25, 20, 10, 10, 10, 75, 'good', NOW() + INTERVAL '7 hours'),

('hash_cdg_svg_001', 'CDG', 'SVQ', 'Paris', 'Séville', 'France', 'Espagne',
 '🇫🇷', '🇪🇸',
 NOW() + INTERVAL '23 days', NOW() + INTERVAL '28 days', 2.5, 5,
 'Vueling', true, 0, 'https://www.kiwi.com/deep?from=CDG&to=SVQ',
 38, 77, 50.6,
 25, 20, 10, 10, 10, 75, 'good', NOW() + INTERVAL '7 hours');

SELECT COUNT(*) AS deals_seeded FROM gold_deals;
