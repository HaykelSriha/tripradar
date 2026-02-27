"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";

const FRENCH_AIRPORTS = [
  { value: "CDG", label: "Paris CDG" },
  { value: "ORY", label: "Paris Orly" },
  { value: "LYS", label: "Lyon" },
  { value: "MRS", label: "Marseille" },
  { value: "BOD", label: "Bordeaux" },
  { value: "NTE", label: "Nantes" },
  { value: "NCE", label: "Nice" },
  { value: "TLS", label: "Toulouse" },
  { value: "LIL", label: "Lille" },
];

const EU_DESTINATIONS = [
  { value: "BCN", label: "Barcelone" },
  { value: "LIS", label: "Lisbonne" },
  { value: "OPO", label: "Porto" },
  { value: "ROM", label: "Rome", iata: "FCO" },
  { value: "AMS", label: "Amsterdam" },
  { value: "BER", label: "Berlin" },
  { value: "PRG", label: "Prague" },
  { value: "VIE", label: "Vienne" },
  { value: "BUD", label: "Budapest" },
  { value: "ATH", label: "Athènes" },
  { value: "DUB", label: "Dublin" },
  { value: "WAW", label: "Varsovie" },
  { value: "KRK", label: "Cracovie" },
  { value: "CPH", label: "Copenhague" },
  { value: "ARN", label: "Stockholm" },
  { value: "PMI", label: "Majorque" },
  { value: "SVQ", label: "Séville" },
  { value: "AGP", label: "Malaga" },
  { value: "BRU", label: "Bruxelles" },
  { value: "SOF", label: "Sofia" },
  { value: "OTP", label: "Bucarest" },
  { value: "ZAG", label: "Zagreb" },
].map((d) => ({ value: d.iata ?? d.value, label: d.label }));

const DATE_RANGE_OPTIONS = [
  { value: "1m", label: "Mois prochain" },
  { value: "2m", label: "2 prochains mois" },
  { value: "3m", label: "3 prochains mois" },
];

const INPUT_CLASS =
  "bg-elevated text-sm text-primary rounded-xl px-3 py-2 border " +
  "border-white/5 focus:outline-none focus:border-orange-500/50 transition-colors";

export function FilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // current active destinations (multi-value)
  const activeDestinations = params.getAll("destinations");

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("cursor");
      startTransition(() => router.push(`/deals?${next.toString()}`));
    },
    [params, router]
  );

  const toggleDestination = useCallback(
    (iata: string) => {
      const next = new URLSearchParams();
      // Rebuild all params except 'destinations'
      for (const [k, v] of params.entries()) {
        if (k !== "destinations" && k !== "cursor") next.append(k, v);
      }
      const current = params.getAll("destinations");
      const next_dests = current.includes(iata)
        ? current.filter((d) => d !== iata)
        : [...current, iata];
      for (const d of next_dests) next.append("destinations", d);
      startTransition(() => router.push(`/deals?${next.toString()}`));
    },
    [params, router]
  );

  const clearAll = useCallback(() => {
    startTransition(() => router.push("/deals"));
  }, [router]);

  const hasFilters =
    params.has("origin") ||
    params.has("destinations") ||
    params.has("date_range") ||
    params.has("depart_from") ||
    params.has("min_price") ||
    params.has("max_price") ||
    params.has("min_nights") ||
    params.has("max_nights");

  return (
    <div className="glass border border-white/5 rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-medium text-primary">Filtres</span>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="ml-auto flex items-center gap-1 text-xs text-secondary
                       hover:text-primary transition-colors"
          >
            <X className="w-3 h-3" />
            Effacer tout
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* ── Departure airport ──────────────────────────────────────────── */}
        <select
          value={params.get("origin") ?? ""}
          onChange={(e) => setParam("origin", e.target.value)}
          className={INPUT_CLASS + " cursor-pointer"}
        >
          <option value="">Départ</option>
          {FRENCH_AIRPORTS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>

        {/* ── Date range ────────────────────────────────────────────────── */}
        <select
          value={params.get("date_range") ?? ""}
          onChange={(e) => {
            setParam("date_range", e.target.value);
            // Clear manual date range when switching to shorthand
            const next = new URLSearchParams(params.toString());
            next.delete("depart_from");
            next.delete("depart_until");
            next.delete("cursor");
            if (e.target.value) next.set("date_range", e.target.value);
            else next.delete("date_range");
            startTransition(() => router.push(`/deals?${next.toString()}`));
          }}
          className={INPUT_CLASS + " cursor-pointer"}
        >
          <option value="">Quand ?</option>
          {DATE_RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* ── Custom date range (shown only when no shorthand) ──────────── */}
        {!params.get("date_range") && (
          <>
            <input
              type="date"
              value={params.get("depart_from") ?? ""}
              onChange={(e) => setParam("depart_from", e.target.value)}
              placeholder="Départ à partir du"
              className={INPUT_CLASS}
            />
            <input
              type="date"
              value={params.get("depart_until") ?? ""}
              onChange={(e) => setParam("depart_until", e.target.value)}
              placeholder="Départ avant le"
              className={INPUT_CLASS}
            />
          </>
        )}

        {/* ── Price range ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            step={10}
            value={params.get("min_price") ?? ""}
            onChange={(e) => setParam("min_price", e.target.value)}
            placeholder="Min €"
            className={INPUT_CLASS + " w-24"}
          />
          <span className="text-secondary text-xs">–</span>
          <input
            type="number"
            min={0}
            step={10}
            value={params.get("max_price") ?? ""}
            onChange={(e) => setParam("max_price", e.target.value)}
            placeholder="Max €"
            className={INPUT_CLASS + " w-24"}
          />
        </div>

        {/* ── Nights range ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={30}
            value={params.get("min_nights") ?? ""}
            onChange={(e) => setParam("min_nights", e.target.value)}
            placeholder="Min nuits"
            className={INPUT_CLASS + " w-24"}
          />
          <span className="text-secondary text-xs">–</span>
          <input
            type="number"
            min={1}
            max={30}
            value={params.get("max_nights") ?? ""}
            onChange={(e) => setParam("max_nights", e.target.value)}
            placeholder="Max nuits"
            className={INPUT_CLASS + " w-24"}
          />
        </div>
      </div>

      {/* ── Destinations (multi-select pills) ─────────────────────────────── */}
      <div>
        <p className="text-xs text-secondary mb-2">Destinations</p>
        <div className="flex flex-wrap gap-2">
          {EU_DESTINATIONS.map((dest) => {
            const active = activeDestinations.includes(dest.value);
            return (
              <button
                key={dest.value}
                onClick={() => toggleDestination(dest.value)}
                className={`px-3 py-1 rounded-full text-xs border transition-all ${
                  active
                    ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                    : "bg-white/5 border-white/10 text-secondary hover:border-orange-500/30 hover:text-primary"
                }`}
              >
                {dest.label}
              </button>
            );
          })}
        </div>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 text-xs text-secondary">
          <div className="w-3 h-3 rounded-full border border-orange-500 border-t-transparent animate-spin" />
          Mise à jour…
        </div>
      )}
    </div>
  );
}
