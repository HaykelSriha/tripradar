import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { requestPushPermission } from "../../lib/notifications";

export default function NotificationsScreen() {
  const [requesting, setRequesting] = useState(false);

  async function enableNotifications() {
    setRequesting(true);
    try {
      const token = await requestPushPermission();
      if (!token) {
        Alert.alert(
          "Notifications désactivées",
          "Tu peux les activer plus tard dans les réglages.",
          [{ text: "OK", onPress: () => router.push("/onboarding/done") }]
        );
      } else {
        router.push("/onboarding/done");
      }
    } finally {
      setRequesting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.steps}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === 4 && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.content}>
          <Text style={styles.bell}>🔔</Text>
          <Text style={styles.title}>Active les alertes</Text>
          <Text style={styles.subtitle}>
            On te notifie instantanément quand un deal en béton apparaît vers
            tes destinations. Ne rate plus jamais un bon vol.
          </Text>

          <View style={styles.perks}>
            {[
              "🚀 Alerte en quelques secondes",
              "💶 Économise jusqu'à -60% sur tes vols",
              "🔕 Heures silencieuses configurables",
            ].map((p) => (
              <View key={p} style={styles.perkRow}>
                <Text style={styles.perkText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottom}>
          <Pressable
            style={[styles.btn, requesting && { opacity: 0.6 }]}
            onPress={enableNotifications}
            disabled={requesting}
          >
            <Text style={styles.btnText}>
              {requesting ? "Activation..." : "Activer les notifications"}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push("/onboarding/done")}>
            <Text style={styles.skip}>Pas maintenant</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0A0B0F" },
  container: { flex: 1, padding: 24 },
  steps: { flexDirection: "row", gap: 6, marginBottom: 48 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1C1D26" },
  dotActive: { backgroundColor: "#FF6B35", width: 24 },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  bell: { fontSize: 72, marginBottom: 24 },
  title: {
    color: "#F1F2F6",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 32,
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    color: "#8B8FA8",
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 26,
    maxWidth: 300,
    marginBottom: 36,
  },
  perks: { gap: 12, width: "100%" },
  perkRow: {
    backgroundColor: "#13141A",
    borderRadius: 10,
    padding: 14,
  },
  perkText: {
    color: "#F1F2F6",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  bottom: { gap: 16 },
  btn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 17 },
  skip: {
    color: "#4B4F6B",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
