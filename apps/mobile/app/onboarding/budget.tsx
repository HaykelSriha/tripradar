import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";

const MIN = 30;
const MAX = 500;

export default function BudgetScreen() {
  const [budget, setBudget] = useState(150);

  function next() {
    router.push("/onboarding/destinations");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.steps}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === 2 && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.title}>Ton budget max ?</Text>
        <Text style={styles.subtitle}>
          On t'alertera uniquement si le vol reste sous ce seuil.
        </Text>

        <View style={styles.center}>
          <Text style={styles.value}>{budget}€</Text>
          <Text style={styles.label}>par voyage (A/R)</Text>
          <View style={styles.sliderWrap}>
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={MIN}
              maximumValue={MAX}
              step={5}
              value={budget}
              onValueChange={(v) => setBudget(Math.round(v))}
              minimumTrackTintColor="#FF6B35"
              maximumTrackTintColor="#1C1D26"
              thumbTintColor="#FF6B35"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>{MIN}€</Text>
              <Text style={styles.sliderLabel}>{MAX}€</Text>
            </View>
          </View>

          <View style={styles.presets}>
            {[80, 150, 250, 400].map((v) => (
              <Pressable
                key={v}
                style={[styles.preset, budget === v && styles.presetActive]}
                onPress={() => setBudget(v)}
              >
                <Text
                  style={[
                    styles.presetText,
                    budget === v && styles.presetTextActive,
                  ]}
                >
                  {v}€
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.bottom}>
          <Pressable style={styles.btn} onPress={next}>
            <Text style={styles.btnText}>Continuer →</Text>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  value: {
    color: "#FF6B35",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 64,
  },
  label: {
    color: "#8B8FA8",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 40,
  },
  sliderWrap: { width: "100%", marginBottom: 32 },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  sliderLabel: {
    color: "#4B4F6B",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  presets: { flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" },
  preset: {
    borderWidth: 1,
    borderColor: "#1C1D26",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  presetActive: { borderColor: "#FF6B35", backgroundColor: "rgba(255,107,53,0.1)" },
  presetText: { color: "#8B8FA8", fontFamily: "Inter_500Medium", fontSize: 15 },
  presetTextActive: { color: "#FF6B35" },
  bottom: { paddingTop: 16 },
  btn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 16 },
});
