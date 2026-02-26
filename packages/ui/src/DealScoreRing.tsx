interface DealScoreRingProps {
  score: number;
  tier: "hot" | "good" | "fair";
  size?: number;
  strokeWidth?: number;
}

export function DealScoreRing({
  score,
  tier,
  size = 56,
  strokeWidth = 4,
}: DealScoreRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (score / 100);
  const cx = size / 2;
  const cy = size / 2;
  const color =
    tier === "hot" ? "#FF6B35" : tier === "good" ? "#7C3AED" : "#F59E0B";

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1C1D26" strokeWidth={strokeWidth} />
        <circle
          cx={cx} cy={cy} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute font-mono font-bold text-primary"
        style={{ fontSize: size * 0.25 }}
      >
        {score}
      </span>
    </div>
  );
}
