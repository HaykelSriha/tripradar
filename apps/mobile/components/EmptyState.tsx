import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = "✈️", title, subtitle, action }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 32 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: {
    color: "#F1F2F6",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#8B8FA8",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  action: { marginTop: 24 },
});
