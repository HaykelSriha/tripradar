import React from "react";
import { View, Text } from "react-native";

interface Props {
  tier: "hot" | "good" | "fair";
}

const CONFIG = {
  hot: { label: "🔥 HOT", bg: "rgba(255,107,53,0.2)", color: "#FF6B35" },
  good: { label: "✦ GOOD", bg: "rgba(124,58,237,0.2)", color: "#A78BFA" },
  fair: { label: "◆ FAIR", bg: "rgba(245,158,11,0.15)", color: "#F59E0B" },
} as const;

export function DealTierBadge({ tier }: Props) {
  const { label, bg, color } = CONFIG[tier];
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          color,
          fontSize: 10,
          fontFamily: "Inter_600SemiBold",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
