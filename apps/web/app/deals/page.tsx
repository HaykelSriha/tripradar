"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DealCard } from "@/components/DealCard";
import { DealCardSkeleton } from "@/components/DealCardSkeleton";
import { FilterBar } from "@/components/FilterBar";
import { useDealsInfinite } from "@/lib/queries";

export default function DealsPage() {
  const params = useSearchParams();

  const filters = {
    origin: params.get("origin") ?? undefined,
    destination: params.get("destination") ?? undefined,
    max_price: params.get("max_price") ? Number(params.get("max_price")) : undefined,
    tier: params.get("tier") ?? undefined,
    is_direct: params.get("is_direct") === "true" ? true : undefined,
    limit: 21,
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useDealsInfinite(filters);

  const allDeals = data?.pages.flatMap((p) => p.items) ?? [];
  const totalCount = data?.pages[0]?.total ?? 0;

  // ── Infinite scroll via Intersection Observer ──────────────────────────────
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // ── Active filter pills ────────────────────────────────────────────────────
  const activeFilters = [
    params.get("origin") && `Depuis ${params.get("origin")}`,
    params.get("max_price") && `≤ ${params.get("max_price")}€`,
    params.get("tier") && { hot: "🔥 Chaud", good: "✨ Bon", fair: "💡 Correct" }[params.get("tier")!],
    params.get("is_direct") === "true" && "Direct uniquement",
  ].filter(Boolean) as string[];

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="font-display font-bold text-3xl text-primary mb-2">
              Deals vols Europe
            </h1>
            <p className="text-secondary">
              {status === "success" && totalCount > 0
                ? `${totalCount} deal${totalCount > 1 ? "s" : ""} trouvé${totalCount > 1 ? "s" : ""}`
                : status === "pending"
                ? "Chargement des deals…"
                : "Aucun deal ne correspond à tes filtres pour le moment."}
            </p>

            {/* Active filter pills */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {activeFilters.map((f) => (
                  <span
                    key={f}
                    className="px-3 py-1 rounded-full text-xs bg-orange-500/10
                               border border-orange-500/20 text-orange-300"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Filter bar ───────────────────────────────────────────────── */}
          <div className="mb-8">
            <FilterBar />
          </div>

          {/* ── Deal grid ────────────────────────────────────────────────── */}
          {status === "pending" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <DealCardSkeleton key={i} />
              ))}
            </div>
          ) : status === "error" ? (
            <div className="text-center py-20 glass rounded-3xl border border-white/5">
              <p className="text-4xl mb-4">⚠️</p>
              <p className="text-secondary">
                Impossible de charger les deals. Vérifie ta connexion.
              </p>
            </div>
          ) : allDeals.length === 0 ? (
            <div className="text-center py-20 glass rounded-3xl border border-white/5">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-primary font-semibold mb-2">Aucun deal trouvé</p>
              <p className="text-secondary text-sm">
                Essaie d&apos;assouplir tes filtres ou reviens dans quelques heures.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allDeals.map((deal, i) => (
                  <DealCard key={deal.flight_hash} deal={deal} animationDelay={i * 40} />
                ))}

                {/* Skeleton placeholders while loading next page */}
                {isFetchingNextPage &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <DealCardSkeleton key={`sk-${i}`} />
                  ))}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-8 mt-4" />

              {!hasNextPage && allDeals.length > 0 && (
                <p className="text-center text-secondary text-sm mt-8">
                  Tu as tout vu ! 🎉 Reviens dans 6h pour de nouveaux deals.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
