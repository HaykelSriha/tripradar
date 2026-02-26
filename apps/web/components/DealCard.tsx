import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ApiDeal } from "@/lib/api";
import { DealScoreRing } from "./DealScoreRing";
import { DealTierBadge } from "./DealTierBadge";

// Curated Unsplash image IDs per destination IATA
const DEST_IMAGES: Record<string, string> = {
  BCN: "1539037116277-4db20889f2d4",
  LIS: "1555881400-74d7acaacd8b",
  OPO: "1555881400-74d7acaacd8b",
  PRG: "1541849546-216549ae216d",
  AMS: "1534351590666-13e3e96b5017",
  BUD: "1551867633-194f125bddfa",
  VIE: "1516550893923-42d28e5677af",
  DUB: "1548438294-1ad5d35bccc2",
  ATH: "1555993539-1732b0258235",
  FCO: "1552832230-c0197dd311b5",
  CIA: "1552832230-c0197dd311b5",
  CPH: "1513622470522-26c3c8a854bc",
  WAW: "1540518614846-3e8b0c6e3e09",
  KRK: "1540518614846-3e8b0c6e3e40",
  BRU: "1509356843151-3e7d96241e11",
  ARN: "1578662996442-48f60103fc96",
  HEL: "1559627096-b08ee1e78b83",
  TLL: "1599946347371-68eb71b16aee",
  RIX: "1577733980729-0d31c7e8f5e3",
  VNO: "1518730400887-ae1c2ce57ccc",
  ZAG: "1531572753322-ad063cecc140",
  SOF: "1519677100203-a0e668c92439",
  OTP: "1564760055775-d63b17a55c44",
  SKP: "1555993539-1732b0258235",
  TIA: "1555993539-1732b0258235",
  BEG: "1580273916550-89914eb1ce2d",
  BTS: "1516550893923-42d28e5677af",
  SVQ: "1555835613-c4c3b2e9c3f9",
  PMI: "1507525428034-b723cf961d3e",
  VLC: "1518509562904-e7ef99cdaad0",
  AGP: "1507525428034-b723cf961d3e",
};

const FALLBACK_IMAGE = "1488085061851-a223d81e4578";

function getDestImage(iata: string): string {
  const id = DEST_IMAGES[iata] ?? FALLBACK_IMAGE;
  return `https://images.unsplash.com/photo-${id}?w=600&q=75&auto=format`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

interface DealCardProps {
  deal: ApiDeal;
  /** Staggered animation delay in ms */
  animationDelay?: number;
}

export function DealCard({ deal, animationDelay = 0 }: DealCardProps) {
  const departure = formatDate(deal.departure_at);
  const returnDate = deal.return_at ? formatDate(deal.return_at) : null;
  const durationNights = Math.round(deal.duration_days);
  const imageUrl = getDestImage(deal.dest_iata);

  return (
    <div
      className="group relative rounded-3xl overflow-hidden glass border border-white/5
                 hover:border-white/10 transition-all duration-300 hover:-translate-y-1
                 hover:shadow-2xl hover:shadow-orange-500/5 animate-fade-up"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Destination image */}
      <div className="relative h-48 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={deal.dest_city}
          className="absolute inset-0 w-full h-full object-cover transition-transform
                     duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

        {/* Tier badge */}
        <div className="absolute top-3 left-3">
          <DealTierBadge tier={deal.deal_tier} />
        </div>

        {/* Flag */}
        <span className="absolute bottom-3 right-3 text-3xl drop-shadow-lg">
          {deal.dest_flag}
        </span>
      </div>

      {/* Card body */}
      <div className="p-5">
        {/* Route + score */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 mr-3">
            <h3 className="font-display font-semibold text-lg text-primary leading-tight truncate">
              {deal.origin_city} → {deal.dest_city}
            </h3>
            <p className="text-2xs text-secondary mt-0.5">
              {deal.is_direct ? "✈️ Direct" : `✈️ ${deal.stops} escale${deal.stops > 1 ? "s" : ""}`}{" "}
              · {deal.airline}
            </p>
          </div>
          <DealScoreRing score={deal.deal_score} tier={deal.deal_tier} />
        </div>

        {/* Price */}
        <div className="flex items-end gap-3 mb-3">
          <div>
            <span className="font-display font-bold text-4xl text-primary">
              {Math.round(deal.price_eur)}€
            </span>
            <span className="text-sm text-secondary ml-1">A/R</span>
          </div>
          <div className="pb-1">
            <span className="text-xs text-muted line-through">
              {Math.round(deal.avg_price_90d)}€
            </span>
            <span className="ml-1.5 text-sm font-semibold text-success">
              -{Math.round(deal.savings_pct)}%
            </span>
          </div>
        </div>

        {/* Dates */}
        <p className="text-xs text-secondary mb-4">
          📅 {departure}
          {returnDate ? ` → ${returnDate}` : ""} · {durationNights} nuit
          {durationNights > 1 ? "s" : ""}
        </p>

        {/* CTA */}
        <Link
          href={`/deals/${deal.flight_hash}`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl
                     bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm
                     transition-colors"
        >
          Voir le deal
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
