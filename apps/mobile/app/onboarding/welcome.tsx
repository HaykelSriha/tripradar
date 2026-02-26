import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Step indicator */}
        <View style={styles.steps}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.content}>
          <Text style={styles.logo}>✈️</Text>
          <Text style={styles.title}>Bienvenue sur{"\n"}TripRadar</Text>
          <Text style={styles.subtitle}>
            Des alertes vols en temps réel pour voyager plus, dépenser moins.
            Configurons ensemble tes préférences en 2 minutes.
          </Text>
        </View>

        <View style={styles.bottom}>
          <Pressable
            style={styles.btn}
            onPress={() => router.push("/onboarding/airports")}
          >
            <Text style={styles.btnText}>Commencer →</Text>
          </Pressable>
          <Pressable onPress={() => router.replace("/(tabs)")}>
            <Text style={styles.skip}>Passer pour l'instant</Text>
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
  logo: { fontSize: 64, marginBottom: 24 },
  title: {
    color: "#F1F2F6",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 36,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 44,
  },
  subtitle: {
    color: "#8B8FA8",
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 26,
    maxWidth: 300,
  },
  bottom: { gap: 16 },
  btn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17,
  },
  skip: {
    color: "#4B4F6B",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
