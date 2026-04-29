/**
 * TripRadar API client.
 * All typed fetch helpers for the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Static deal data (used when backend has no data) ──────────────────────────

const STATIC_DEALS: ApiDeal[] = [
  { flight_hash: "CDG-BCN-20260518", origin_iata: "CDG", dest_iata: "BCN", origin_city: "Paris", dest_city: "Barcelone", origin_country: "France", dest_country: "Espagne", origin_flag: "🇫🇷", dest_flag: "🇪🇸", departure_at: "2026-05-18T06:30:00", return_at: "2026-05-21T22:15:00", duration_h: 2, duration_days: 3, airline: "Vueling", is_direct: true, stops: 0, price_eur: 39, avg_price_90d: 118, savings_pct: 67, deal_score: 84, deal_tier: "hot", price_score: 34, price_tier_score: 20, directness_score: 10, duration_score: 10, dest_score: 10, deep_link: "https://www.kayak.fr/flights/CDG-BCN/2026-05-18/2026-05-21", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "ORY-PRG-20260601", origin_iata: "ORY", dest_iata: "PRG", origin_city: "Paris", dest_city: "Prague", origin_country: "France", dest_country: "Tcheque", origin_flag: "🇫🇷", dest_flag: "🇨🇿", departure_at: "2026-06-01T07:15:00", return_at: "2026-06-05T21:40:00", duration_h: 2, duration_days: 4, airline: "Ryanair", is_direct: true, stops: 0, price_eur: 44, avg_price_90d: 132, savings_pct: 67, deal_score: 82, deal_tier: "hot", price_score: 33, price_tier_score: 20, directness_score: 10, duration_score: 10, dest_score: 9, deep_link: "https://www.kayak.fr/flights/ORY-PRG/2026-06-01/2026-06-05", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "NCE-BUD-20260524", origin_iata: "NCE", dest_iata: "BUD", origin_city: "Nice", dest_city: "Budapest", origin_country: "France", dest_country: "Hongrie", origin_flag: "🇫🇷", dest_flag: "🇭🇺", departure_at: "2026-05-24T09:00:00", return_at: "2026-05-28T18:30:00", duration_h: 2, duration_days: 4, airline: "Wizz Air", is_direct: true, stops: 0, price_eur: 46, avg_price_90d: 138, savings_pct: 67, deal_score: 82, deal_tier: "hot", price_score: 33, price_tier_score: 20, directness_score: 10, duration_score: 10, dest_score: 9, deep_link: "https://www.kayak.fr/flights/NCE-BUD/2026-05-24/2026-05-28", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "CDG-LIS-20260510", origin_iata: "CDG", dest_iata: "LIS", origin_city: "Paris", dest_city: "Lisbonne", origin_country: "France", dest_country: "Portugal", origin_flag: "🇫🇷", dest_flag: "🇵🇹", departure_at: "2026-05-10T08:50:00", return_at: "2026-05-14T20:05:00", duration_h: 2, duration_days: 4, airline: "TAP Air Portugal", is_direct: true, stops: 0, price_eur: 52, avg_price_90d: 148, savings_pct: 65, deal_score: 81, deal_tier: "hot", price_score: 33, price_tier_score: 19, directness_score: 10, duration_score: 10, dest_score: 9, deep_link: "https://www.kayak.fr/flights/CDG-LIS/2026-05-10/2026-05-14", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "BOD-MAD-20260606", origin_iata: "BOD", dest_iata: "MAD", origin_city: "Bordeaux", dest_city: "Madrid", origin_country: "France", dest_country: "Espagne", origin_flag: "🇫🇷", dest_flag: "🇪🇸", departure_at: "2026-06-06T11:20:00", return_at: "2026-06-09T19:45:00", duration_h: 1, duration_days: 3, airline: "Iberia Express", is_direct: true, stops: 0, price_eur: 48, avg_price_90d: 142, savings_pct: 66, deal_score: 81, deal_tier: "hot", price_score: 33, price_tier_score: 20, directness_score: 10, duration_score: 10, dest_score: 8, deep_link: "https://www.kayak.fr/flights/BOD-MAD/2026-06-06/2026-06-09", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "LYS-BCN-20260529", origin_iata: "LYS", dest_iata: "BCN", origin_city: "Lyon", dest_city: "Barcelone", origin_country: "France", dest_country: "Espagne", origin_flag: "🇫🇷", dest_flag: "🇪🇸", departure_at: "2026-05-29T06:45:00", return_at: "2026-06-02T21:00:00", duration_h: 1, duration_days: 4, airline: "Vueling", is_direct: true, stops: 0, price_eur: 43, avg_price_90d: 126, savings_pct: 66, deal_score: 80, deal_tier: "hot", price_score: 33, price_tier_score: 20, directness_score: 10, duration_score: 10, dest_score: 7, deep_link: "https://www.kayak.fr/flights/LYS-BCN/2026-05-29/2026-06-02", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "ORY-BUD-20260515", origin_iata: "ORY", dest_iata: "BUD", origin_city: "Paris", dest_city: "Budapest", origin_country: "France", dest_country: "Hongrie", origin_flag: "🇫🇷", dest_flag: "🇭🇺", departure_at: "2026-05-15T14:30:00", return_at: "2026-05-19T22:10:00", duration_h: 2, duration_days: 4, airline: "Wizz Air", is_direct: true, stops: 0, price_eur: 41, avg_price_90d: 119, savings_pct: 66, deal_score: 80, deal_tier: "hot", price_score: 33, price_tier_score: 20, directness_score: 10, duration_score: 10, dest_score: 7, deep_link: "https://www.kayak.fr/flights/ORY-BUD/2026-05-15/2026-05-19", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "LYS-FCO-20260612", origin_iata: "LYS", dest_iata: "FCO", origin_city: "Lyon", dest_city: "Rome", origin_country: "France", dest_country: "Italie", origin_flag: "🇫🇷", dest_flag: "🇮🇹", departure_at: "2026-06-12T07:00:00", return_at: "2026-06-16T20:30:00", duration_h: 2, duration_days: 4, airline: "easyJet", is_direct: true, stops: 0, price_eur: 47, avg_price_90d: 136, savings_pct: 65, deal_score: 80, deal_tier: "hot", price_score: 32, price_tier_score: 20, directness_score: 10, duration_score: 10, dest_score: 8, deep_link: "https://www.kayak.fr/flights/LYS-FCO/2026-06-12/2026-06-16", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "CDG-VLC-20260522", origin_iata: "CDG", dest_iata: "VLC", origin_city: "Paris", dest_city: "Valence", origin_country: "France", dest_country: "Espagne", origin_flag: "🇫🇷", dest_flag: "🇪🇸", departure_at: "2026-05-22T10:10:00", return_at: "2026-05-25T18:50:00", duration_h: 2, duration_days: 3, airline: "Air France", is_direct: true, stops: 0, price_eur: 54, avg_price_90d: 138, savings_pct: 61, deal_score: 76, deal_tier: "good", price_score: 30, price_tier_score: 18, directness_score: 10, duration_score: 10, dest_score: 8, deep_link: "https://www.kayak.fr/flights/CDG-VLC/2026-05-22/2026-05-25", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "CDG-DUB-20260531", origin_iata: "CDG", dest_iata: "DUB", origin_city: "Paris", dest_city: "Dublin", origin_country: "France", dest_country: "Irlande", origin_flag: "🇫🇷", dest_flag: "🇮🇪", departure_at: "2026-05-31T08:25:00", return_at: "2026-06-04T19:55:00", duration_h: 2, duration_days: 4, airline: "Aer Lingus", is_direct: true, stops: 0, price_eur: 63, avg_price_90d: 155, savings_pct: 59, deal_score: 74, deal_tier: "good", price_score: 29, price_tier_score: 17, directness_score: 10, duration_score: 10, dest_score: 8, deep_link: "https://www.kayak.fr/flights/CDG-DUB/2026-05-31/2026-06-04", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "TLS-VIE-20260607", origin_iata: "TLS", dest_iata: "VIE", origin_city: "Toulouse", dest_city: "Vienne", origin_country: "France", dest_country: "Autriche", origin_flag: "🇫🇷", dest_flag: "🇦🇹", departure_at: "2026-06-07T13:40:00", return_at: "2026-06-11T21:20:00", duration_h: 2, duration_days: 4, airline: "Austrian Airlines", is_direct: true, stops: 0, price_eur: 59, avg_price_90d: 144, savings_pct: 59, deal_score: 73, deal_tier: "good", price_score: 29, price_tier_score: 17, directness_score: 10, duration_score: 10, dest_score: 7, deep_link: "https://www.kayak.fr/flights/TLS-VIE/2026-06-07/2026-06-11", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "CDG-AMS-20260519", origin_iata: "CDG", dest_iata: "AMS", origin_city: "Paris", dest_city: "Amsterdam", origin_country: "France", dest_country: "Pays-Bas", origin_flag: "🇫🇷", dest_flag: "🇳🇱", departure_at: "2026-05-19T07:50:00", return_at: "2026-05-22T20:10:00", duration_h: 1, duration_days: 3, airline: "Transavia", is_direct: true, stops: 0, price_eur: 46, avg_price_90d: 110, savings_pct: 58, deal_score: 72, deal_tier: "good", price_score: 29, price_tier_score: 20, directness_score: 10, duration_score: 10, dest_score: 3, deep_link: "https://www.kayak.fr/flights/CDG-AMS/2026-05-19/2026-05-22", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "ORY-FCO-20260614", origin_iata: "ORY", dest_iata: "FCO", origin_city: "Paris", dest_city: "Rome", origin_country: "France", dest_country: "Italie", origin_flag: "🇫🇷", dest_flag: "🇮🇹", departure_at: "2026-06-14T09:05:00", return_at: "2026-06-18T22:40:00", duration_h: 2, duration_days: 4, airline: "ITA Airways", is_direct: true, stops: 0, price_eur: 57, avg_price_90d: 138, savings_pct: 59, deal_score: 72, deal_tier: "good", price_score: 29, price_tier_score: 18, directness_score: 10, duration_score: 10, dest_score: 5, deep_link: "https://www.kayak.fr/flights/ORY-FCO/2026-06-14/2026-06-18", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "LYS-OPO-20260525", origin_iata: "LYS", dest_iata: "OPO", origin_city: "Lyon", dest_city: "Porto", origin_country: "France", dest_country: "Portugal", origin_flag: "🇫🇷", dest_flag: "🇵🇹", departure_at: "2026-05-25T11:30:00", return_at: "2026-05-30T19:15:00", duration_h: 2, duration_days: 5, airline: "Ryanair", is_direct: true, stops: 0, price_eur: 56, avg_price_90d: 134, savings_pct: 58, deal_score: 71, deal_tier: "good", price_score: 29, price_tier_score: 18, directness_score: 10, duration_score: 10, dest_score: 4, deep_link: "https://www.kayak.fr/flights/LYS-OPO/2026-05-25/2026-05-30", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "CDG-KRK-20260602", origin_iata: "CDG", dest_iata: "KRK", origin_city: "Paris", dest_city: "Cracovie", origin_country: "France", dest_country: "Pologne", origin_flag: "🇫🇷", dest_flag: "🇵🇱", departure_at: "2026-06-02T06:00:00", return_at: "2026-06-06T20:30:00", duration_h: 3, duration_days: 4, airline: "LOT Polish Airlines", is_direct: true, stops: 0, price_eur: 62, avg_price_90d: 148, savings_pct: 58, deal_score: 71, deal_tier: "good", price_score: 29, price_tier_score: 17, directness_score: 10, duration_score: 10, dest_score: 5, deep_link: "https://www.kayak.fr/flights/CDG-KRK/2026-06-02/2026-06-06", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "ORY-LIS-20260608", origin_iata: "ORY", dest_iata: "LIS", origin_city: "Paris", dest_city: "Lisbonne", origin_country: "France", dest_country: "Portugal", origin_flag: "🇫🇷", dest_flag: "🇵🇹", departure_at: "2026-06-08T15:20:00", return_at: "2026-06-13T22:00:00", duration_h: 2, duration_days: 5, airline: "easyJet", is_direct: true, stops: 0, price_eur: 59, avg_price_90d: 140, savings_pct: 58, deal_score: 70, deal_tier: "good", price_score: 29, price_tier_score: 17, directness_score: 10, duration_score: 10, dest_score: 4, deep_link: "https://www.kayak.fr/flights/ORY-LIS/2026-06-08/2026-06-13", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "CDG-CPH-20260520", origin_iata: "CDG", dest_iata: "CPH", origin_city: "Paris", dest_city: "Copenhague", origin_country: "France", dest_country: "Danemark", origin_flag: "🇫🇷", dest_flag: "🇩🇰", departure_at: "2026-05-20T10:45:00", return_at: "2026-05-24T21:30:00", duration_h: 2, duration_days: 4, airline: "SAS", is_direct: true, stops: 0, price_eur: 79, avg_price_90d: 185, savings_pct: 57, deal_score: 68, deal_tier: "good", price_score: 28, price_tier_score: 14, directness_score: 10, duration_score: 10, dest_score: 6, deep_link: "https://www.kayak.fr/flights/CDG-CPH/2026-05-20/2026-05-24", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "TLS-PRG-20260615", origin_iata: "TLS", dest_iata: "PRG", origin_city: "Toulouse", dest_city: "Prague", origin_country: "France", dest_country: "Tcheque", origin_flag: "🇫🇷", dest_flag: "🇨🇿", departure_at: "2026-06-15T08:15:00", return_at: "2026-06-19T20:45:00", duration_h: 3, duration_days: 4, airline: "Vueling", is_direct: false, stops: 1, price_eur: 68, avg_price_90d: 156, savings_pct: 56, deal_score: 67, deal_tier: "good", price_score: 28, price_tier_score: 16, directness_score: 5, duration_score: 10, dest_score: 8, deep_link: "https://www.kayak.fr/flights/TLS-PRG/2026-06-15/2026-06-19", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "CDG-ATH-20260527", origin_iata: "CDG", dest_iata: "ATH", origin_city: "Paris", dest_city: "Athenes", origin_country: "France", dest_country: "Grece", origin_flag: "🇫🇷", dest_flag: "🇬🇷", departure_at: "2026-05-27T12:00:00", return_at: "2026-06-02T23:30:00", duration_h: 3, duration_days: 6, airline: "Aegean Airlines", is_direct: true, stops: 0, price_eur: 89, avg_price_90d: 200, savings_pct: 56, deal_score: 67, deal_tier: "good", price_score: 28, price_tier_score: 13, directness_score: 10, duration_score: 10, dest_score: 6, deep_link: "https://www.kayak.fr/flights/CDG-ATH/2026-05-27/2026-06-02", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "MRS-ATH-20260603", origin_iata: "MRS", dest_iata: "ATH", origin_city: "Marseille", dest_city: "Athenes", origin_country: "France", dest_country: "Grece", origin_flag: "🇫🇷", dest_flag: "🇬🇷", departure_at: "2026-06-03T09:30:00", return_at: "2026-06-08T21:10:00", duration_h: 4, duration_days: 5, airline: "Transavia", is_direct: false, stops: 1, price_eur: 71, avg_price_90d: 158, savings_pct: 55, deal_score: 65, deal_tier: "good", price_score: 28, price_tier_score: 15, directness_score: 5, duration_score: 10, dest_score: 7, deep_link: "https://www.kayak.fr/flights/MRS-ATH/2026-06-03/2026-06-08", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "NTE-EDI-20260530", origin_iata: "NTE", dest_iata: "EDI", origin_city: "Nantes", dest_city: "Edimbourg", origin_country: "France", dest_country: "Ecosse", origin_flag: "🇫🇷", dest_flag: "🇬🇧", departure_at: "2026-05-30T07:30:00", return_at: "2026-06-04T19:00:00", duration_h: 3, duration_days: 5, airline: "Ryanair", is_direct: false, stops: 1, price_eur: 73, avg_price_90d: 162, savings_pct: 55, deal_score: 64, deal_tier: "good", price_score: 27, price_tier_score: 15, directness_score: 5, duration_score: 10, dest_score: 7, deep_link: "https://www.kayak.fr/flights/NTE-EDI/2026-05-30/2026-06-04", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "CDG-MLA-20260619", origin_iata: "CDG", dest_iata: "MLA", origin_city: "Paris", dest_city: "Malte", origin_country: "France", dest_country: "Malte", origin_flag: "🇫🇷", dest_flag: "🇲🇹", departure_at: "2026-06-19T11:00:00", return_at: "2026-06-25T22:50:00", duration_h: 3, duration_days: 6, airline: "Air Malta", is_direct: true, stops: 0, price_eur: 75, avg_price_90d: 165, savings_pct: 55, deal_score: 63, deal_tier: "good", price_score: 27, price_tier_score: 15, directness_score: 10, duration_score: 10, dest_score: 1, deep_link: "https://www.kayak.fr/flights/CDG-MLA/2026-06-19/2026-06-25", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "MRS-OPO-20260613", origin_iata: "MRS", dest_iata: "OPO", origin_city: "Marseille", dest_city: "Porto", origin_country: "France", dest_country: "Portugal", origin_flag: "🇫🇷", dest_flag: "🇵🇹", departure_at: "2026-06-13T14:00:00", return_at: "2026-06-18T21:30:00", duration_h: 4, duration_days: 5, airline: "TAP Air Portugal", is_direct: false, stops: 1, price_eur: 72, avg_price_90d: 157, savings_pct: 54, deal_score: 62, deal_tier: "good", price_score: 27, price_tier_score: 15, directness_score: 5, duration_score: 10, dest_score: 5, deep_link: "https://www.kayak.fr/flights/MRS-OPO/2026-06-13/2026-06-18", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "NCE-DUB-20260616", origin_iata: "NCE", dest_iata: "DUB", origin_city: "Nice", dest_city: "Dublin", origin_country: "France", dest_country: "Irlande", origin_flag: "🇫🇷", dest_flag: "🇮🇪", departure_at: "2026-06-16T08:00:00", return_at: "2026-06-20T22:15:00", duration_h: 4, duration_days: 4, airline: "Ryanair", is_direct: false, stops: 1, price_eur: 86, avg_price_90d: 172, savings_pct: 50, deal_score: 56, deal_tier: "fair", price_score: 25, price_tier_score: 13, directness_score: 5, duration_score: 10, dest_score: 3, deep_link: "https://www.kayak.fr/flights/NCE-DUB/2026-06-16/2026-06-20", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "BOD-VIE-20260620", origin_iata: "BOD", dest_iata: "VIE", origin_city: "Bordeaux", dest_city: "Vienne", origin_country: "France", dest_country: "Autriche", origin_flag: "🇫🇷", dest_flag: "🇦🇹", departure_at: "2026-06-20T10:30:00", return_at: "2026-06-25T19:45:00", duration_h: 4, duration_days: 5, airline: "Lufthansa", is_direct: false, stops: 1, price_eur: 84, avg_price_90d: 168, savings_pct: 50, deal_score: 54, deal_tier: "fair", price_score: 25, price_tier_score: 13, directness_score: 5, duration_score: 10, dest_score: 1, deep_link: "https://www.kayak.fr/flights/BOD-VIE/2026-06-20/2026-06-25", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "CDG-HEL-20260621", origin_iata: "CDG", dest_iata: "HEL", origin_city: "Paris", dest_city: "Helsinki", origin_country: "France", dest_country: "Finlande", origin_flag: "🇫🇷", dest_flag: "🇫🇮", departure_at: "2026-06-21T09:20:00", return_at: "2026-06-26T22:00:00", duration_h: 3, duration_days: 5, airline: "Finnair", is_direct: true, stops: 0, price_eur: 98, avg_price_90d: 192, savings_pct: 49, deal_score: 52, deal_tier: "fair", price_score: 25, price_tier_score: 12, directness_score: 10, duration_score: 10, dest_score: -5, deep_link: "https://www.kayak.fr/flights/CDG-HEL/2026-06-21/2026-06-26", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "LYS-WAW-20260617", origin_iata: "LYS", dest_iata: "WAW", origin_city: "Lyon", dest_city: "Varsovie", origin_country: "France", dest_country: "Pologne", origin_flag: "🇫🇷", dest_flag: "🇵🇱", departure_at: "2026-06-17T07:45:00", return_at: "2026-06-22T21:00:00", duration_h: 4, duration_days: 5, airline: "LOT Polish Airlines", is_direct: false, stops: 1, price_eur: 82, avg_price_90d: 160, savings_pct: 49, deal_score: 50, deal_tier: "fair", price_score: 24, price_tier_score: 13, directness_score: 5, duration_score: 10, dest_score: -2, deep_link: "https://www.kayak.fr/flights/LYS-WAW/2026-06-17/2026-06-22", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
  { flight_hash: "CDG-OSL-20260623", origin_iata: "CDG", dest_iata: "OSL", origin_city: "Paris", dest_city: "Oslo", origin_country: "France", dest_country: "Norvege", origin_flag: "🇫🇷", dest_flag: "🇳🇴", departure_at: "2026-06-23T11:10:00", return_at: "2026-06-27T20:30:00", duration_h: 2, duration_days: 4, airline: "Norwegian", is_direct: true, stops: 0, price_eur: 107, avg_price_90d: 208, savings_pct: 49, deal_score: 48, deal_tier: "fair", price_score: 24, price_tier_score: 11, directness_score: 10, duration_score: 10, dest_score: -7, deep_link: "https://www.kayak.fr/flights/CDG-OSL/2026-06-23/2026-06-27", created_at: "2026-04-29T08:00:00", valid_until: "2026-05-05T23:59:59" },
];

// ── Types matching the FastAPI response schemas ───────────────────────────────

export interface ApiDeal {
  flight_hash: string;
  origin_iata: string;
  dest_iata: string;
  origin_city: string;
  dest_city: string;
  origin_country: string;
  dest_country: string;
  origin_flag: string;
  dest_flag: string;
  departure_at: string;
  return_at: string | null;
  duration_h: number;
  duration_days: number;
  airline: string;
  is_direct: boolean;
  stops: number;
  price_eur: number;
  avg_price_90d: number;
  savings_pct: number;
  deal_score: number;
  deal_tier: "hot" | "good" | "fair";
  price_score: number;
  price_tier_score: number;
  directness_score: number;
  duration_score: number;
  dest_score: number;
  deep_link: string;
  created_at: string;
  valid_until: string;
}

export interface PaginatedDeals {
  items: ApiDeal[];
  total: number;
  cursor: string | null;
  has_more: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  is_premium: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ApiPreferences {
  max_budget_eur: number;
  date_flex_days: number;
  departure_airports: string[];
  trip_duration_min: number;
  trip_duration_max: number;
  updated_at: string;
}

export interface ApiNotificationPrefs {
  email_enabled: boolean;
  push_enabled: boolean;
  min_deal_score: number;
  quiet_hours_start: number;
  quiet_hours_end: number;
  updated_at: string;
}

export interface ApiWatchlistItem {
  id: string;
  destination_code: string;
  destination_name: string;
  is_region: boolean;
  created_at: string;
}

export interface ApiAlertRecord {
  id: string;
  deal_id: string;
  route: string;
  channel: string;
  sent_at: string;
  opened_at: string | null;
}

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Core fetch helper ─────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string | null;
    cache?: RequestCache;
    next?: NextFetchRequestConfig;
  } = {}
): Promise<T> {
  const { method = "GET", body, token, cache, next } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
    next,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail ?? detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Deals ─────────────────────────────────────────────────────────────────────

export interface DealsParams {
  origin?: string;
  destinations?: string[];
  date_range?: "1m" | "2m" | "3m";
  depart_from?: string;   // YYYY-MM-DD
  depart_until?: string;  // YYYY-MM-DD
  min_price?: number;
  max_price?: number;
  min_nights?: number;
  max_nights?: number;
  cursor?: string;
  limit?: number;
}

function buildQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item !== undefined && item !== null && item !== "") q.append(k, String(item));
      }
    } else {
      q.set(k, String(v));
    }
  }
  return q.toString() ? `?${q}` : "";
}

export async function fetchDeals(
  params: DealsParams = {},
): Promise<PaginatedDeals> {
  const filtered = STATIC_DEALS.filter((d) => {
    if (params.origin && d.origin_iata !== params.origin) return false;
    if (params.destinations?.length && !params.destinations.includes(d.dest_iata)) return false;
    if (params.min_price !== undefined && d.price_eur < params.min_price) return false;
    if (params.max_price !== undefined && d.price_eur > params.max_price) return false;
    if (params.min_nights !== undefined && d.duration_days < params.min_nights) return false;
    if (params.max_nights !== undefined && d.duration_days > params.max_nights) return false;
    if (params.depart_from && d.departure_at < params.depart_from) return false;
    if (params.depart_until && d.departure_at > params.depart_until + "T23:59:59") return false;
    return true;
  }).sort((a, b) => b.deal_score - a.deal_score);
  const limit = params.limit ?? 21;
  return { items: filtered.slice(0, limit), total: filtered.length, cursor: null, has_more: false };
}

export async function fetchTopDeals(limit = 10): Promise<ApiDeal[]> {
  return [...STATIC_DEALS].sort((a, b) => b.deal_score - a.deal_score).slice(0, limit);
}

export async function fetchInspireDeals(limit = 6): Promise<ApiDeal[]> {
  return apiFetch<ApiDeal[]>(`/deals/inspire?limit=${limit}`, {
    next: { revalidate: 3600 },
  });
}

export async function fetchDeal(id: string): Promise<ApiDeal> {
  const deal = STATIC_DEALS.find((d) => d.flight_hash === id);
  if (!deal) throw new Error("Deal not found");
  return deal;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function apiRegister(data: {
  email: string;
  name: string;
  password: string;
}): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/register", { method: "POST", body: data });
}

export async function apiLogin(data: {
  email: string;
  password: string;
}): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/login", { method: "POST", body: data });
}

export async function apiGoogleAuth(id_token: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/google", {
    method: "POST",
    body: { id_token },
  });
}

export async function apiRefresh(refresh_token: string): Promise<AccessTokenResponse> {
  return apiFetch<AccessTokenResponse>("/auth/refresh", {
    method: "POST",
    body: { refresh_token },
  });
}

export async function apiLogout(refresh_token: string): Promise<void> {
  return apiFetch("/auth/logout", {
    method: "POST",
    body: { refresh_token },
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function fetchMe(token: string): Promise<ApiUser> {
  return apiFetch<ApiUser>("/users/me", { token, cache: "no-store" });
}

export async function updateMe(
  token: string,
  data: { name?: string; avatar_url?: string }
): Promise<ApiUser> {
  return apiFetch<ApiUser>("/users/me", { method: "PATCH", body: data, token });
}

export async function fetchPreferences(token: string): Promise<ApiPreferences> {
  return apiFetch<ApiPreferences>("/users/me/preferences", { token, cache: "no-store" });
}

export async function updatePreferences(
  token: string,
  data: Partial<ApiPreferences>
): Promise<ApiPreferences> {
  return apiFetch<ApiPreferences>("/users/me/preferences", { method: "PATCH", body: data, token });
}

export async function fetchNotificationPrefs(token: string): Promise<ApiNotificationPrefs> {
  return apiFetch<ApiNotificationPrefs>("/users/me/notifications", { token, cache: "no-store" });
}

export async function updateNotificationPrefs(
  token: string,
  data: Partial<ApiNotificationPrefs>
): Promise<ApiNotificationPrefs> {
  return apiFetch<ApiNotificationPrefs>("/users/me/notifications", {
    method: "PATCH",
    body: data,
    token,
  });
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

export async function fetchWatchlist(token: string): Promise<ApiWatchlistItem[]> {
  return apiFetch<ApiWatchlistItem[]>("/users/me/watchlist", { token, cache: "no-store" });
}

export async function addWatchlistItem(
  token: string,
  data: { destination_code: string; destination_name: string; is_region?: boolean }
): Promise<ApiWatchlistItem> {
  return apiFetch<ApiWatchlistItem>("/users/me/watchlist", {
    method: "POST",
    body: data,
    token,
  });
}

export async function removeWatchlistItem(
  token: string,
  destinationCode: string
): Promise<void> {
  return apiFetch(`/users/me/watchlist/${destinationCode}`, {
    method: "DELETE",
    token,
  });
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function fetchAlerts(token: string): Promise<ApiAlertRecord[]> {
  return apiFetch<ApiAlertRecord[]>("/users/me/alerts", { token, cache: "no-store" });
}
