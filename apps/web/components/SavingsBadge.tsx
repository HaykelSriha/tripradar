interface SavingsBadgeProps {
  savingsPct: number;
  size?: "sm" | "md" | "lg";
}

export function SavingsBadge({ savingsPct, size = "sm" }: SavingsBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold text-success
                  bg-success/10 rounded-full ${sizeClasses[size]}`}
    >
      -{Math.round(savingsPct)}%
    </span>
  );
}
