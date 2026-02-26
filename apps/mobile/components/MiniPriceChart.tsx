"use client";
import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from "react-native-svg";

interface Props {
  avgPrice: number;
  currentPrice: number;
  width?: number;
  height?: number;
}

/** Deterministic mock 90-day price history (same algorithm as web PriceChart) */
function generateHistory(avgPrice: number, currentPrice: number, days = 90) {
  const points: number[] = [];
  for (let i = 0; i < days; i++) {
    const noise =
      Math.sin(i * 0.4 + avgPrice * 0.01) * avgPrice * 0.12 +
      Math.cos(i * 0.7 + avgPrice * 0.02) * avgPrice * 0.06;
    const trend = i > days - 14 ? ((i - (days - 14)) / 14) * (currentPrice - avgPrice) : 0;
    points.push(Math.max(1, avgPrice + noise + trend));
  }
  points[days - 1] = currentPrice;
  return points;
}

function buildPath(
  data: number[],
  w: number,
  h: number,
  min: number,
  max: number
): string {
  const range = max - min || 1;
  const xStep = w / (data.length - 1);
  return data
    .map((v, i) => {
      const x = i * xStep;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function MiniPriceChart({ avgPrice, currentPrice, width = 300, height = 100 }: Props) {
  const history = useMemo(
    () => generateHistory(avgPrice, currentPrice),
    [avgPrice, currentPrice]
  );
  const min = Math.min(...history) * 0.95;
  const max = Math.max(...history) * 1.05;
  const range = max - min || 1;
  const linePath = buildPath(history, width, height, min, max);
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  // Y positions for reference lines
  const avgY = height - ((avgPrice - min) / range) * height;
  const curY = height - ((currentPrice - min) / range) * height;
  const lastX = width;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {/* Area fill */}
        <Path d={areaPath} fill="url(#area)" />
        {/* Line */}
        <Path d={linePath} stroke="#7C3AED" strokeWidth={2} fill="none" />
        {/* Avg reference */}
        <Line
          x1={0} y1={avgY} x2={lastX} y2={avgY}
          stroke="#F59E0B" strokeWidth={1} strokeDasharray="4 4" opacity={0.6}
        />
        {/* Current price dot */}
        <Circle cx={lastX} cy={curY} r={4} fill="#22C55E" />
      </Svg>
    </View>
  );
}
