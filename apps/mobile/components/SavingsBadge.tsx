import React from "react";
import { View, Text } from "react-native";

interface Props {
  savingsPct: number;
  size?: "sm" | "md";
}

export function SavingsBadge({ savingsPct, size = "md" }: Props) {
  const small = size === "sm";
  return (
    <View
      style={{
        backgroundColor: "rgba(34,197,94,0.15)",
        borderRadius: 6,
        paddingHorizontal: small ? 6 : 8,
        paddingVertical: small ? 2 : 4,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          color: "#22C55E",
          fontSize: small ? 10 : 12,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        -{Math.round(savingsPct)}%
      </Text>
    </View>
  );
}
