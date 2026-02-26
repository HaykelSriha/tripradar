import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Info, Plane } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DealScoreRing } from "@/components/DealScoreRing";
import { DealTierBadge } from "@/components/DealTierBadge";
import { SavingsBadge } from "@/components/SavingsBadge";
import { PriceChart } from "@/components/PriceChart";
import { fetchDeal } from "@/lib/api";

// ── Metadata (dynamic OG) ─────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    const deal = await fetchDeal(params.id);
    return {
      title: `${deal.origin_city} → ${deal.dest_city} à ${Math.round(deal.price_eur)}€`,
      description: `Deal ${deal.deal_tier} : vol ${deal.origin_city} → ${deal.dest_city} à ${Math.round(deal.price_eur)}€ A/R (-${Math.round(deal.savings_pct)}% vs moyenne). Score : ${deal.deal_score}/100.`,
      openGraph: {
        title: `${deal.dest_flag} ${deal.origin_city} → ${deal.dest_city} à ${Math.round(deal.price_eur)}€ A/R`,
        description: `-${Math.round(deal.savings_pct)}% par rapport au prix habituel · Deal Score ${deal.deal_score}/100`,
      },
    };
  } catch {
    return { title: "Deal introuvable" };
  }
}

// ── Score breakdown component ─────────────────────────────────────────────────

function ScoreBreakdown({
  deal,
}: {
  deal: Awaited<ReturnType<typeof fetchDeal>>;
}) {
  const components = [
    {
      label: "Prix vs moy. 90j",
      value: deal.price_score,
      max: 50,
      color: "bg-orange-500",
    },
    {
      label: "Niveau de prix",
      value: deal.price_tier_score,
      max: 20,
      color: "bg-violet-500",
    },
    {
      label: "Vol direct",
      value: deal.directness_score,
      max: 10,
      color: "bg-blue-500",
    },
    {
      label: "Durée idéale",
      value: deal.duration_score,
      max: 10,
      color: "bg-success",
    },
    {
      label: "Popularité",
      value: deal.dest_score,
      max: 10,
      color: "bg-warning",
    },
  ];

  return (
    <div className="glass rounded-2xl p-6 border border-white/5">
      <h3 className="font-display font-semibold text-primary mb-4 flex items-center gap-2">
        <Info className="w-4 h-4 text-violet-400" />
        Détail du Deal Score
      </h3>
      <div className="space-y-3">
        {components.map((c) => (
          <div key={c.label} className="flex items-center gap-3">
            <span className="text-sm text-secondary w-36 flex-shrink-0">{c.label}</span>
            <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden">
              <div
                className={`h-full ${c.color} rounded-full transition-all duration-700`}
                style={{ width: `${(c.value / c.max) * 100}%` }}
              />
            </div>
            <span className="font-mono text-xs text-primary w-12 text-right">
              {c.value}/{c.max}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page (async server component) ─────────────────────────────────────────────

export default async function DealDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let deal;
  try {
    deal = await fetchDeal(params.id);
  } catch {
    notFound();
  }

  const departure = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(deal.departure_at));

  const returnDate = deal.return_at
    ? new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date(deal.return_at))
    : null;

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="pt-20 pb-24">
        {/* ── Hero image area ─────────────────────────────────────────────── */}
        <div className="relative h-64 sm:h-80 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://images.unsplash.com/photo-1488085061851-a223d81e4578?w=1200&q=80&auto=format`}
            alt={deal.dest_city}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-base via-base/60 to-transparent" />

          {/* Back button */}
          <div className="absolute top-6 left-4 sm:left-8">
            <Link
              href="/deals"
              className="flex items-center gap-2 px-4 py-2 glass rounded-xl border
                         border-white/10 text-sm text-primary hover:border-white/20
                         transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>
          </div>

          {/* Destination badge */}
          <div className="absolute bottom-6 left-4 sm:left-8">
            <div className="flex items-center gap-3">
              <span className="text-5xl drop-shadow-lg">{deal.dest_flag}</span>
              <div>
                <h1 className="font-display font-bold text-3xl sm:text-4xl text-white">
                  {deal.dest_city}
                </h1>
                <p className="text-white/70 text-sm">{deal.dest_country}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* ── Main content (2/3) ──────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Route + tier */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DealTierBadge tier={deal.deal_tier} />
                  <h2 className="font-display font-bold text-2xl text-primary mt-2">
                    {deal.origin_city} → {deal.dest_city}
                  </h2>
                  <p className="text-secondary text-sm mt-1">
                    {deal.is_direct
                      ? "✈️ Vol direct"
                      : `✈️ ${deal.stops} escale${deal.stops > 1 ? "s" : ""}`}
                    {" · "}
                    {deal.airline}
                  </p>
                </div>
                <DealScoreRing score={deal.deal_score} tier={deal.deal_tier} size={64} strokeWidth={5} />
              </div>

              {/* Flight details */}
              <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
                <h3 className="font-display font-semibold text-primary flex items-center gap-2">
                  <Plane className="w-4 h-4 text-orange-400" />
                  Détails du vol
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-elevated rounded-xl p-4">
                    <p className="text-2xs text-secondary uppercase tracking-wider mb-1">
                      Aller
                    </p>
                    <p className="text-sm text-primary font-medium capitalize">{departure}</p>
                    <p className="text-2xs text-muted mt-0.5">
                      {deal.origin_iata} → {deal.dest_iata}
                    </p>
                  </div>

                  {returnDate && (
                    <div className="bg-elevated rounded-xl p-4">
                      <p className="text-2xs text-secondary uppercase tracking-wider mb-1">
                        Retour
                      </p>
                      <p className="text-sm text-primary font-medium capitalize">{returnDate}</p>
                      <p className="text-2xs text-muted mt-0.5">
                        {deal.dest_iata} → {deal.origin_iata}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-2">
                  <div className="flex-1 text-center py-3 bg-elevated rounded-xl">
                    <p className="text-2xs text-secondary mb-1">Durée</p>
                    <p className="font-semibold text-primary">
                      {Math.round(deal.duration_days)} nuit{deal.duration_days > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex-1 text-center py-3 bg-elevated rounded-xl">
                    <p className="text-2xs text-secondary mb-1">Escales</p>
                    <p className="font-semibold text-primary">
                      {deal.is_direct ? "Direct" : deal.stops}
                    </p>
                  </div>
                  <div className="flex-1 text-center py-3 bg-elevated rounded-xl">
                    <p className="text-2xs text-secondary mb-1">Compagnie</p>
                    <p className="font-semibold text-primary">{deal.airline}</p>
                  </div>
                </div>
              </div>

              {/* Score breakdown */}
              <ScoreBreakdown deal={deal} />

              {/* Price history chart */}
              <div className="glass rounded-2xl p-6 border border-white/5">
                <h3 className="font-display font-semibold text-primary mb-1">
                  Historique des prix (90 jours)
                </h3>
                <p className="text-2xs text-secondary mb-4">
                  Ce prix est dans les meilleurs{" "}
                  <span className="text-success font-semibold">
                    {Math.round(100 - deal.savings_pct)}%
                  </span>{" "}
                  observés sur cette route.
                </p>
                <PriceChart
                  currentPrice={deal.price_eur}
                  avgPrice90d={deal.avg_price_90d}
                  dealScore={deal.deal_score}
                />
              </div>
            </div>

            {/* ── Sidebar (1/3) ────────────────────────────────────────────── */}
            <div className="space-y-4">
              {/* Price block */}
              <div className="glass rounded-2xl p-6 border border-white/5 sticky top-24">
                <div className="text-center mb-6">
                  <p className="text-2xs text-secondary uppercase tracking-wider mb-2">
                    Prix aller-retour
                  </p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="font-display font-bold text-5xl text-primary">
                      {Math.round(deal.price_eur)}€
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-sm text-muted line-through">
                      {Math.round(deal.avg_price_90d)}€
                    </span>
                    <SavingsBadge savingsPct={deal.savings_pct} size="md" />
                  </div>
                  <p className="text-2xs text-muted mt-2">
                    vs prix moyen sur 90 jours
                  </p>
                </div>

                <a
                  href={deal.deep_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl
                             bg-orange-500 hover:bg-orange-400 text-white font-bold text-base
                             transition-colors shadow-lg shadow-orange-500/20"
                >
                  Réserver maintenant
                  <ExternalLink className="w-4 h-4" />
                </a>

                <p className="text-2xs text-muted text-center mt-3">
                  Redirige vers Kiwi.com · Prix sans garantie
                </p>

                {/* Valid until */}
                <div className="mt-4 pt-4 border-t border-white/5 text-center">
                  <p className="text-2xs text-secondary">
                    Deal valide jusqu&apos;au{" "}
                    <span className="text-primary">
                      {new Intl.DateTimeFormat("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      }).format(new Date(deal.valid_until))}
                    </span>
                  </p>
                </div>
              </div>

              {/* Share */}
              <div className="glass rounded-2xl p-4 border border-white/5 text-center">
                <p className="text-sm text-secondary mb-3">Partager ce deal</p>
                <button
                  onClick={undefined}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-sm
                             text-secondary hover:text-primary hover:border-white/20
                             transition-colors"
                >
                  📋 Copier le lien
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
