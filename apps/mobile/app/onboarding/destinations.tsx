import { useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const DESTINATIONS = [
  { code: "BCN", name: "Barcelone", flag: "🇪🇸" },
  { code: "LIS", name: "Lisbonne", flag: "🇵🇹" },
  { code: "PRG", name: "Prague", flag: "🇨🇿" },
  { code: "BUD", name: "Budapest", flag: "🇭🇺" },
  { code: "KRK", name: "Cracovie", flag: "🇵🇱" },
  { code: "ATH", name: "Athènes", flag: "🇬🇷" },
  { code: "DUB", name: "Dublin", flag: "🇮🇪" },
  { code: "AMS", name: "Amsterdam", flag: "🇳🇱" },
  { code: "BER", name: "Berlin", flag: "🇩🇪" },
  { code: "VIE", name: "Vienne", flag: "🇦🇹" },
  { code: "CPH", name: "Copenhague", flag: "🇩🇰" },
  { code: "WAW", name: "Varsovie", flag: "🇵🇱" },
  { code: "FCO", name: "Rome", flag: "🇮🇹" },
  { code: "NAP", name: "Naples", flag: "🇮🇹" },
  { code: "OPO", name: "Porto", flag: "🇵🇹" },
  { code: "MAD", name: "Madrid", flag: "🇪🇸" },
  { code: "TFS", name: "Ténérife", flag: "🇪🇸" },
  { code: "LPA", name: "Las Palmas", flag: "🇪🇸" },
  { code: "PMI", name: "Palma", flag: "🇪🇸" },
  { code: "AGP", name: "Málaga", flag: "🇪🇸" },
  { code: "OSL", name: "Oslo", flag: "🇳🇴" },
  { code: "MXP", name: "Milan", flag: "🇮🇹" },
  { code: "GVA", name: "Genève", flag: "🇨🇭" },
];

export default function DestinationsScreen() {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function next() {
    router.push("/onboarding/notifications");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.steps}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === 3 && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.title}>Tes rêves de voyage ?</Text>
        <Text style={styles.subtitle}>
          On te pinga dès qu'un bon deal apparaît vers ces destinations.
        </Text>

        <FlatList
          data={DESTINATIONS}
          keyExtractor={(d) => d.code}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: d }) => {
            const active = selected.includes(d.code);
            return (
              <Pressable
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggle(d.code)}
              >
                <Text style={styles.chipFlag}>{d.flag}</Text>
                <Text style={[styles.chipName, active && styles.chipNameActive]}>
                  {d.name}
                </Text>
              </Pressable>
            );
          }}
        />

        <View style={styles.bottom}>
          <Pressable style={styles.btn} onPress={next}>
            <Text style={styles.btnText}>
              {selected.length > 0
                ? `Continuer (${selected.length}) →`
                : "Passer →"}
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
  chip: {
    flex: 1,
    backgroundColor: "#13141A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: { borderColor: "#FF6B35", backgroundColor: "rgba(255,107,53,0.08)" },
  chipFlag: { fontSize: 28 },
  chipName: {
    color: "#8B8FA8",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  chipNameActive: { color: "#F1F2F6" },
  bottom: { paddingTop: 16 },
  btn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 16 },
});
