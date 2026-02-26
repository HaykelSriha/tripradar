"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PriceChartProps {
  currentPrice: number;
  avgPrice90d: number;
  dealScore: number;
}

/** Generates plausible 90-day price history ending at the deal price. */
function generateHistory(
  avgPrice: number,
  currentPrice: number,
  days = 90
): { day: string; price: number }[] {
  const data: { day: string; price: number }[] = [];
  const now = new Date();
  const seed = Math.sin(currentPrice * 13.37); // deterministic from price

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const dayLabel = date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });

    // Noise: ±25% around average, trending downward at the end
    const noise = Math.sin(i * 0.42 + seed * 7) * 0.18 + Math.cos(i * 0.17 + seed * 3) * 0.12;
    const trendFactor = i < 14 ? (1 - (14 - i) / 14) * 0.3 : 0; // prices drop in last 14d
    const rawPrice = avgPrice * (1 + noise - trendFactor);

    // Last point = current deal price
    const price = i === 0 ? currentPrice : Math.max(currentPrice * 0.7, Math.round(rawPrice));

    data.push({ day: dayLabel, price });
  }
  return data;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass border border-white/10 rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="text-secondary text-xs mb-1">{label}</p>
      <p className="text-primary font-bold">{payload[0].value}€</p>
    </div>
  );
};

export function PriceChart({ currentPrice, avgPrice90d }: PriceChartProps) {
  const data = generateHistory(avgPrice90d, currentPrice);
  const minY = Math.floor(currentPrice * 0.8 / 10) * 10;
  const maxY = Math.ceil(avgPrice90d * 1.3 / 10) * 10;

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

          <XAxis
            dataKey="day"
            tick={{ fill: "#4B4F6B", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={14}
          />
          <YAxis
            domain={[minY, maxY]}
            tick={{ fill: "#4B4F6B", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}€`}
          />

          {/* Average price line */}
          <ReferenceLine
            y={avgPrice90d}
            stroke="#F59E0B"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={{ value: "Moy. 90j", fill: "#F59E0B", fontSize: 10, position: "insideTopRight" }}
          />

          {/* Current deal price line */}
          <ReferenceLine
            y={currentPrice}
            stroke="#22C55E"
            strokeDasharray="4 4"
            strokeOpacity={0.8}
            label={{ value: "Ce deal", fill: "#22C55E", fontSize: 10, position: "insideBottomRight" }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="price"
            stroke="#7C3AED"
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#7C3AED", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
