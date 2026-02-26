import type { Metadata } from "next";
import Link from "next/link";
import { fetchInspireDeals } from "@/lib/api";
import { DealCard } from "@/components/DealCard";
import type { ApiDeal } from "@/lib/api";

export const metadata: Metadata = {
  title: "Inspire-moi — TripRadar",
  description:
    "Laisse-toi surprendre : des deals aléatoires triés sur le volet pour les voyageurs spontanés.",
  openGraph: {
    title: "Inspire-moi — TripRadar",
    description: "Destinations coup de cœur sélectionnées par notre algorithme.",
  },
};

export const revalidate = 3600; // refresh inspire page every hour

const REGIONS = [
  { name: "Europe du Sud", flags: "🇪🇸🇮🇹🇵🇹🇬🇷", codes: ["BCN", "FCO", "LIS", "ATH", "NAP", "MAD", "OPO"] },
  { name: "Europe centrale", flags: "🇨🇿🇭🇺🇵🇱🇦🇹", codes: ["PRG", "BUD", "KRK", "WAW", "VIE"] },
  { name: "Europe du Nord", flags: "🇮🇪🇳🇱🇩🇰🇩🇪", codes: ["DUB", "AMS", "CPH", "BER"] },
  { name: "Îles & Plages", flags: "🏖️🌊☀️", codes: ["TFS", "LPA", "PMI", "AGP"] },
];

function DealCount({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-400 text-sm font-semibold px-3 py-1 rounded-full border border-orange-500/20">
      <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
      {count} deals disponibles
    </span>
  );
}

export default async function InspirePage() {
  let deals: ApiDeal[] = [];
  try {
    deals = await fetchInspireDeals(12);
  } catch {
    deals = [];
  }

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="pt-28 pb-16 px-6 text-center">
        <DealCount count={deals.length} />
        <h1 className="mt-6 text-5xl md:text-6xl font-display font-bold text-primary leading-tight">
          Inspire-moi 🎲
        </h1>
        <p className="mt-4 text-secondary text-lg max-w-2xl mx-auto leading-relaxed">
          Tu ne sais pas où aller ? Laisse notre algorithme choisir pour toi.
          Des deals sélectionnés parmi les meilleures opportunités du moment.
        </p>
      </section>

      {/* Region filters */}
      <section className="px-6 pb-10 max-w-6xl mx-auto">
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/inspire"
            className="px-4 py-2 rounded-full bg-orange-500 text-white text-sm font-semibold"
          >
            Tous
          </Link>
          {REGIONS.map((r) => (
            <Link
              key={r.name}
              href={`/deals?destination=${r.codes[0]}`}
              className="px-4 py-2 rounded-full bg-card border border-border text-secondary text-sm hover:border-orange-500/50 hover:text-primary transition-colors"
            >
              {r.flags} {r.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Deal grid */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        {deals.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-secondary text-lg">Aucun deal disponible pour l&apos;instant.</p>
            <p className="text-muted text-sm mt-2">Les deals sont mis à jour toutes les 6 heures.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {deals.map((deal, i) => (
                <DealCard key={deal.flight_hash} deal={deal} animationDelay={i * 60} />
              ))}
            </div>

            {/* Refresh hint */}
            <div className="mt-12 text-center">
              <p className="text-muted text-sm">
                Pas ce que tu cherches ?{" "}
                <Link href="/inspire" className="text-orange-400 hover:underline">
                  Actualiser la sélection
                </Link>
              </p>
            </div>
          </>
        )}
      </section>

      {/* CTA banner */}
      <section className="mx-6 mb-20 max-w-3xl lg:mx-auto rounded-2xl bg-gradient-to-r from-orange-500/15 to-violet-500/15 border border-orange-500/20 p-8 text-center">
        <h2 className="text-2xl font-display font-bold text-primary mb-3">
          Tu as des destinations en tête ?
        </h2>
        <p className="text-secondary mb-6">
          Ajoute-les à ta watchlist pour recevoir des alertes dès qu&apos;un deal apparaît.
        </p>
        <Link
          href="/auth/register"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Créer une alerte gratuite →
        </Link>
      </section>
    </main>
  );
}
