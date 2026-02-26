interface DealTierBadgeProps {
  tier: "hot" | "good" | "fair";
}

export function DealTierBadge({ tier }: DealTierBadgeProps) {
  if (tier === "hot") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                   text-2xs font-bold bg-deal-hot text-white uppercase tracking-wider"
      >
        🔥 Deal chaud
      </span>
    );
  }
  if (tier === "good") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                   text-2xs font-bold bg-deal-good text-white uppercase tracking-wider"
      >
        ✨ Bonne affaire
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                 text-2xs font-bold bg-deal-fair text-white uppercase tracking-wider"
    >
      💡 Bon plan
    </span>
  );
}
