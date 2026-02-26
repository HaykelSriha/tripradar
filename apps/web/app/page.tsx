import { ArrowRight, Bell, ChevronRight, Plane, Zap } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DealCard } from "@/components/DealCard";
import { fetchTopDeals } from "@/lib/api";
import type { ApiDeal } from "@/lib/api";

export const metadata: Metadata = {
  title: "TripRadar — Le bon plan, au bon moment.",
};

// ── Server-side data fetch ────────────────────────────────────────────────────

async function getTopDeals(): Promise<ApiDeal[]> {
  try {
    return await fetchTopDeals(6);
  } catch {
    return [];
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      icon: Bell,
      title: "Configure tes alertes",
      desc: "Choisis ta ville de départ, ton budget max et les destinations qui te font rêver.",
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      icon: Zap,
      title: "On surveille pour toi",
      desc: "Notre moteur analyse 240 routes européennes toutes les 6h et score chaque deal.",
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      icon: Plane,
      title: "Tu pars !",
      desc: "Reçois une notification push dès qu'un deal correspond exactement à tes critères.",
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display font-bold text-3xl text-center text-primary mb-3">
          Comment ça marche ?
        </h2>
        <p className="text-secondary text-center mb-16 max-w-md mx-auto">
          En 3 étapes, ne rate plus jamais un bon plan voyage.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative text-center">
              <span
                className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full
                             bg-elevated border border-white/10 text-secondary text-sm
                             flex items-center justify-center font-mono"
              >
                {i + 1}
              </span>
              <div className={`inline-flex p-4 rounded-2xl ${step.bg} mb-5`}>
                <step.icon className={`w-7 h-7 ${step.color}`} />
              </div>
              <h3 className="font-display font-semibold text-lg text-primary mb-2">
                {step.title}
              </h3>
              <p className="text-secondary text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Main page (async server component) ───────────────────────────────────────

export default async function HomePage() {
  const topDeals = await getTopDeals();

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4 text-center relative overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]
                      bg-violet-600/10 blur-[120px] rounded-full pointer-events-none"
        />
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] h-[200px]
                      bg-orange-500/8 blur-[80px] rounded-full pointer-events-none"
        />

        <div className="relative max-w-4xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                        bg-orange-500/10 border border-orange-500/20 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse-slow" />
            <span className="text-xs text-orange-300 font-medium">
              {topDeals.length > 0
                ? `${topDeals.length} deals actifs en ce moment`
                : "Deals rechargés toutes les 6h"}
            </span>
          </div>

          <h1
            className="font-display font-bold text-5xl sm:text-6xl text-primary
                        leading-tight tracking-tight mb-6"
          >
            Les meilleurs deals
            <br />
            <span className="text-gradient-hot">d&apos;Europe</span>, en temps réel.
          </h1>

          <p className="text-xl text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Vols pas chers depuis les aéroports français. Configure tes critères,
            on te notifie dès que le deal parfait apparaît.
          </p>

          {/* Search bar */}
          <div
            className="max-w-2xl mx-auto glass rounded-2xl p-4 flex flex-col sm:flex-row
                        gap-3 border border-white/5"
          >
            <select
              className="flex-1 bg-elevated text-primary text-sm rounded-xl px-4 py-3
                         border border-white/5 focus:outline-none focus:border-orange-500/50
                         transition-colors cursor-pointer"
              defaultValue=""
            >
              <option value="">✈️ Départ depuis...</option>
              <option value="CDG">Paris Charles de Gaulle (CDG)</option>
              <option value="ORY">Paris Orly (ORY)</option>
              <option value="LYS">Lyon (LYS)</option>
              <option value="MRS">Marseille (MRS)</option>
              <option value="BOD">Bordeaux (BOD)</option>
              <option value="NTE">Nantes (NTE)</option>
              <option value="NCE">Nice (NCE)</option>
              <option value="TLS">Toulouse (TLS)</option>
            </select>

            <select
              className="flex-1 bg-elevated text-primary text-sm rounded-xl px-4 py-3
                         border border-white/5 focus:outline-none focus:border-orange-500/50
                         transition-colors cursor-pointer"
              defaultValue=""
            >
              <option value="">💶 Budget max...</option>
              <option value="50">≤ 50€</option>
              <option value="100">≤ 100€</option>
              <option value="150">≤ 150€</option>
              <option value="250">≤ 250€</option>
            </select>

            <Link
              href="/deals"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                         bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm
                         transition-colors whitespace-nowrap"
            >
              Trouver un deal
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-xs text-muted mt-4">
            Destinations populaires : Prague · Lisbonne · Barcelone · Budapest · Porto · Dublin
          </p>
        </div>
      </section>

      {/* ── Deals du jour (real data from API) ───────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="font-display font-bold text-2xl text-primary">
                🔥 Deals du jour
              </h2>
              <p className="text-secondary text-sm mt-1">
                Sélectionnés par notre algorithme · Score Deal ≥ 70
              </p>
            </div>
            <Link
              href="/deals"
              className="flex items-center gap-1.5 text-sm text-orange-400
                         hover:text-orange-300 transition-colors font-medium"
            >
              Voir tous les deals
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {topDeals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topDeals.slice(0, 6).map((deal, i) => (
                <DealCard key={deal.flight_hash} deal={deal} animationDelay={i * 80} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 glass rounded-3xl border border-white/5">
              <p className="text-4xl mb-4">✈️</p>
              <p className="text-secondary">
                Les deals sont en cours de chargement. Reviens dans quelques minutes !
              </p>
              <p className="text-muted text-sm mt-2">
                La pipeline Airflow tourne toutes les 6h.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Deal Score explainer ──────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div
            className="glass rounded-3xl p-8 md:p-12 border border-white/5
                        relative overflow-hidden"
          >
            <div
              className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10
                          blur-[80px] rounded-full pointer-events-none"
            />
            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <div>
                <span
                  className="text-2xs text-violet-400 font-bold uppercase
                               tracking-widest mb-3 block"
                >
                  Transparent par design
                </span>
                <h2 className="font-display font-bold text-3xl text-primary mb-4 leading-tight">
                  Le Deal Score : comment on évalue un bon plan ?
                </h2>
                <p className="text-secondary leading-relaxed mb-6">
                  Chaque deal reçoit un score de 0 à 100 calculé en temps réel.
                  Tu sais exactement pourquoi c&apos;est une bonne affaire.
                </p>
                <Link
                  href="/deals"
                  className="inline-flex items-center gap-2 text-sm font-medium
                             text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Explorer les deals
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Prix vs moyenne 90 jours", pts: "50 pts", color: "bg-orange-500" },
                  { label: "Niveau de prix absolu", pts: "20 pts", color: "bg-violet-500" },
                  { label: "Vol direct", pts: "10 pts", color: "bg-blue-500" },
                  { label: "Durée idéale (2–7 nuits)", pts: "10 pts", color: "bg-success" },
                  { label: "Popularité destination", pts: "10 pts", color: "bg-warning" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${item.color} flex-shrink-0`}
                    />
                    <div className="flex-1 text-sm text-secondary">{item.label}</div>
                    <span
                      className="font-mono text-xs text-primary bg-elevated
                                   px-2 py-1 rounded-lg"
                    >
                      {item.pts}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <HowItWorks />

      {/* ── App download CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex p-4 rounded-2xl bg-orange-500/10 mb-6">
            <Bell className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="font-display font-bold text-3xl text-primary mb-4">
            Ne rate plus jamais un deal.
          </h2>
          <p className="text-secondary mb-8 leading-relaxed">
            L&apos;app TripRadar t&apos;envoie une notification push dès qu&apos;un vol
            correspond à tes critères. Disponible sur Android, iOS bientôt.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#"
              className="flex items-center gap-3 px-6 py-4 rounded-2xl glass
                         border border-white/10 hover:border-orange-500/30
                         transition-all"
            >
              <span className="text-2xl">🤖</span>
              <div className="text-left">
                <p className="text-2xs text-secondary">Disponible sur</p>
                <p className="font-semibold text-primary text-sm">Google Play</p>
              </div>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-6 py-4 rounded-2xl glass
                         border border-white/5 opacity-50 cursor-not-allowed"
            >
              <span className="text-2xl">🍎</span>
              <div className="text-left">
                <p className="text-2xs text-secondary">Bientôt sur</p>
                <p className="font-semibold text-primary text-sm">App Store</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
