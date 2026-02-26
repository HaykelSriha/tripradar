import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";

const AIRPORTS = [
  { code: "CDG", name: "Paris Charles de Gaulle", flag: "🇫🇷" },
  { code: "ORY", name: "Paris Orly", flag: "🇫🇷" },
  { code: "LYS", name: "Lyon Saint-Exupéry", flag: "🇫🇷" },
  { code: "MRS", name: "Marseille Provence", flag: "🇫🇷" },
  { code: "NCE", name: "Nice Côte d'Azur", flag: "🇫🇷" },
  { code: "TLS", name: "Toulouse-Blagnac", flag: "🇫🇷" },
  { code: "NTE", name: "Nantes Atlantique", flag: "🇫🇷" },
  { code: "BOD", name: "Bordeaux-Mérignac", flag: "🇫🇷" },
  { code: "BES", name: "Brest Bretagne", flag: "🇫🇷" },
  { code: "SXB", name: "Strasbourg", flag: "🇫🇷" },
  { code: "BRU", name: "Bruxelles", flag: "🇧🇪" },
  { code: "GVA", name: "Genève", flag: "🇨🇭" },
];

export default function AirportsScreen() {
  const [selected, setSelected] = useState<string[]>(["CDG"]);

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function next() {
    await SecureStore.setItemAsync("ob_airports", JSON.stringify(selected));
    router.push("/onboarding/budget");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.steps}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.title}>D'où tu pars ?</Text>
        <Text style={styles.subtitle}>
          Sélectionne tes aéroports de départ habituels.
        </Text>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {AIRPORTS.map((a) => {
            const active = selected.includes(a.code);
            return (
              <Pressable
                key={a.code}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => toggle(a.code)}
              >
                <Text style={styles.flag}>{a.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.code}>{a.code}</Text>
                  <Text style={styles.name}>{a.name}</Text>
                </View>
                <View style={[styles.check, active && styles.checkActive]}>
                  {active && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.bottom}>
          <Pressable
            style={[styles.btn, selected.length === 0 && styles.btnDisabled]}
            onPress={next}
            disabled={selected.length === 0}
          >
            <Text style={styles.btnText}>
              Continuer ({selected.length} sélectionné{selected.length > 1 ? "s" : ""}) →
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0A0B0F" },
  container: { flex: 1, padding: 24 },
  steps: { flexDirection: "row", gap: 6, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1C1D26" },
  dotActive: { backgroundColor: "#FF6B35", width: 24 },
  title: {
    color: "#F1F2F6",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    color: "#8B8FA8",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#13141A",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowActive: { borderColor: "#FF6B35" },
  flag: { fontSize: 24 },
  code: { color: "#F1F2F6", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  name: { color: "#8B8FA8", fontFamily: "Inter_400Regular", fontSize: 13 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#4B4F6B",
    alignItems: "center",
    justifyContent: "center",
  },
  checkActive: { borderColor: "#FF6B35", backgroundColor: "#FF6B35" },
  checkMark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  bottom: { paddingTop: 16 },
  btn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 16 },
});
