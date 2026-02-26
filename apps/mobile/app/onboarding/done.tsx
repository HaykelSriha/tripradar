import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";

export default function DoneScreen() {
  async function finish() {
    // Mark onboarding as complete so _layout doesn't redirect here again
    await SecureStore.setItemAsync("onboarding_done", "true");
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.check}>🎉</Text>
          <Text style={styles.title}>Tu es prêt·e !</Text>
          <Text style={styles.subtitle}>
            TripRadar veille sur les deals pendant que tu vis ta vie. On te
            prévient dès qu'un vol canon apparaît.
          </Text>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>+1 200</Text>
              <Text style={styles.statLabel}>deals traités par jour</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>-42%</Text>
              <Text style={styles.statLabel}>d'économie moyenne</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>6h</Text>
              <Text style={styles.statLabel}>de fraîcheur des données</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottom}>
          <Pressable style={styles.btn} onPress={finish}>
            <Text style={styles.btnText}>Voir les deals →</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0A0B0F" },
  container: { flex: 1, padding: 24 },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  check: { fontSize: 80, marginBottom: 24 },
  title: {
    color: "#F1F2F6",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 36,
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
    marginBottom: 48,
  },
  stats: {
    flexDirection: "row",
    backgroundColor: "#13141A",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-around",
  },
  stat: { alignItems: "center", flex: 1 },
  statValue: {
    color: "#FF6B35",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    marginBottom: 4,
  },
  statLabel: {
    color: "#8B8FA8",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
  },
  statDivider: { width: 1, height: 40, backgroundColor: "#1C1D26" },
  bottom: { paddingTop: 16 },
  btn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 17 },
});
