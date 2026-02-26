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

const BUDGET_OPTIONS = [
  { value: "50", label: "≤ 50€" },
  { value: "80", label: "≤ 80€" },
  { value: "120", label: "≤ 120€" },
  { value: "200", label: "≤ 200€" },
];

const TIER_OPTIONS = [
  { value: "hot", label: "🔥 Chaud (≥80)" },
  { value: "good", label: "✨ Bon (≥60)" },
  { value: "fair", label: "💡 Correct (≥40)" },
];

export function FilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      // Reset pagination when filters change
      next.delete("cursor");
      startTransition(() => {
        router.push(`/deals?${next.toString()}`);
      });
    },
    [params, router]
  );

  const clearAll = useCallback(() => {
    startTransition(() => router.push("/deals"));
  }, [router]);

  const hasFilters =
    params.has("origin") ||
    params.has("max_price") ||
    params.has("tier") ||
    params.has("is_direct");

  return (
    <div className="glass border border-white/5 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-medium text-primary">Filtres</span>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="ml-auto flex items-center gap-1 text-2xs text-secondary
                       hover:text-primary transition-colors"
          >
            <X className="w-3 h-3" />
            Effacer tout
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Origin */}
        <select
          value={params.get("origin") ?? ""}
          onChange={(e) => updateParam("origin", e.target.value)}
          className="bg-elevated text-sm text-primary rounded-xl px-3 py-2 border
                     border-white/5 focus:outline-none focus:border-orange-500/50
                     transition-colors cursor-pointer"
        >
          <option value="">✈️ Départ</option>
          {FRENCH_AIRPORTS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>

        {/* Budget */}
        <select
          value={params.get("max_price") ?? ""}
          onChange={(e) => updateParam("max_price", e.target.value)}
          className="bg-elevated text-sm text-primary rounded-xl px-3 py-2 border
                     border-white/5 focus:outline-none focus:border-orange-500/50
                     transition-colors cursor-pointer"
        >
          <option value="">💶 Budget</option>
          {BUDGET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Tier */}
        <select
          value={params.get("tier") ?? ""}
          onChange={(e) => updateParam("tier", e.target.value)}
          className="bg-elevated text-sm text-primary rounded-xl px-3 py-2 border
                     border-white/5 focus:outline-none focus:border-orange-500/50
                     transition-colors cursor-pointer"
        >
          <option value="">⭐ Qualité</option>
          {TIER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Direct only */}
        <label
          className="flex items-center gap-2 bg-elevated text-sm text-primary rounded-xl
                     px-3 py-2 border border-white/5 cursor-pointer hover:border-orange-500/30
                     transition-colors"
        >
          <input
            type="checkbox"
            checked={params.get("is_direct") === "true"}
            onChange={(e) =>
              updateParam("is_direct", e.target.checked ? "true" : "")
            }
            className="accent-orange-500 w-3.5 h-3.5"
          />
          Vols directs
        </label>
      </div>

      {isPending && (
        <div className="mt-3 flex items-center gap-2 text-2xs text-secondary">
          <div className="w-3 h-3 rounded-full border border-orange-500 border-t-transparent animate-spin" />
          Mise à jour…
        </div>
      )}
    </div>
  );
}
