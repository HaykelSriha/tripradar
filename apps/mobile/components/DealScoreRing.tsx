import React from "react";
import Svg, { Circle } from "react-native-svg";
import { View, Text } from "react-native";

interface Props {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
}

function tierColor(score: number): string {
  if (score >= 80) return "#FF6B35"; // hot — orange
  if (score >= 60) return "#7C3AED"; // good — violet
  return "#F59E0B"; // fair — amber
}

export function DealScoreRing({ score, size = 44, strokeWidth = 4 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = tierColor(score);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1C1D26"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Fill */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeDashoffset={circumference / 4} // start at top
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text
        style={{
          color,
          fontSize: size * 0.28,
          fontFamily: "JetBrainsMono_400Regular",
          fontWeight: "700",
        }}
      >
        {score}
      </Text>
    </View>
  );
}
