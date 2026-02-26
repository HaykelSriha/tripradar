import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { TrendingDown, ArrowRight, Plane, ArrowLeft } from "lucide-react-native";
import { useDeal } from "../../lib/queries";
import { DealScoreRing } from "../../components/DealScoreRing";
import { DealTierBadge } from "../../components/DealTierBadge";
import { MiniPriceChart } from "../../components/MiniPriceChart";
import { SkeletonCard } from "../../components/SkeletonCard";

const DEST_IMAGES: Record<string, string> = {
  BCN: "1539037116277-4db20889f2d4",
  LIS: "1558618666-fcd25c85cd64",
  PRG: "1467269204594-9661b134dd2b",
  BUD: "1549488344-1f9b8d2bd1f3",
  KRK: "1577791965377-5f9f6b974c85",
  DUB: "1549476464-37392f717d84",
  ATH: "1555993539-1732b0258235",
  AMS: "1576924542622-772281b13ea3",
  BER: "1560969184-10fe8719e047",
  FCO: "1531572753322-ad063ceae51a",
  OPO: "1555881400-74d7acaacd8b",
};

function getImg(iata: string) {
  const id = DEST_IMAGES[iata] ?? "1488646953014-85cb44e25828";
  return `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format`;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DealTimer({ validUntil }: { validUntil: string }) {
  const diff = new Date(validUntil).getTime() - Date.now();
  if (diff <= 0) return <Text style={styles.expired}>Deal expiré</Text>;
  const s = Math.floor(diff / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const urgent = h === 0 && m < 30;
  return (
    <Text style={[styles.timer, urgent && { color: "#ef4444" }]}>
      ⏱ Expire dans {h > 0 ? `${h}h ` : ""}{m}min
    </Text>
  );
}

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { data: deal, isLoading, isError } = useDeal(id);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !deal) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.error}>
          <Text style={styles.errorText}>Deal introuvable 😕</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>← Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safe}>
      {/* Hero image */}
      <View style={{ height: 240 }}>
        <Image
          source={{ uri: getImg(deal.destination) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,11,15,0.55)" }]} />
        {/* Back button */}
        <SafeAreaView edges={["top"]} style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#F1F2F6" />
          </Pressable>
        </SafeAreaView>
        {/* Flag + city */}
        <View style={styles.heroContent}>
          <Text style={styles.heroFlag}>{deal.destination_flag}</Text>
          <Text style={styles.heroCity}>{deal.destination_city}</Text>
          <Text style={styles.heroRoute}>
            {deal.origin} → {deal.destination}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Tier + score */}
        <View style={styles.topRow}>
          <DealTierBadge tier={deal.deal_tier} />
          <DealScoreRing score={deal.deal_score} size={52} />
        </View>

        {/* Price */}
        <Text style={styles.price}>{deal.price_eur}€</Text>
        <Text style={styles.priceLabel}>aller-retour · par personne</Text>
        <View style={styles.savingsRow}>
          <TrendingDown size={16} color="#22C55E" />
          <Text style={styles.savingsPct}>-{Math.round(deal.savings_pct)}%</Text>
          <Text style={styles.avgPrice}>vs moy. {Math.round(deal.avg_price_90d)}€</Text>
        </View>

        {/* Validity */}
        <DealTimer validUntil={deal.valid_until} />

        {/* Price chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Historique des prix (90j)</Text>
          <MiniPriceChart
            avgPrice={deal.avg_price_90d}
            currentPrice={deal.price_eur}
            width={width - 64}
            height={100}
          />
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
              <Text style={styles.legendText}>Prix moyen</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} />
              <Text style={styles.legendText}>Ce deal</Text>
            </View>
          </View>
        </View>

        {/* Flight details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Détails du vol</Text>
          <View style={styles.flightRow}>
            <Plane size={16} color="#8B8FA8" />
            <Text style={styles.flightMeta}>
              {deal.is_direct ? "Direct" : "Avec escale"} · {deal.airline}
            </Text>
          </View>
          <View style={styles.legRow}>
            <View>
              <Text style={styles.legLabel}>ALLER</Text>
              <Text style={styles.legDate}>{fmt(deal.departure_at)}</Text>
              <Text style={styles.legTime}>{fmtTime(deal.departure_at)}</Text>
            </View>
            <View style={styles.legArrow}>
              <View style={styles.legLine} />
              <ArrowRight size={14} color="#4B4F6B" />
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.legLabel}>RETOUR</Text>
              <Text style={styles.legDate}>{fmt(deal.return_at)}</Text>
              <Text style={styles.legTime}>{fmtTime(deal.return_at)}</Text>
            </View>
          </View>
          <View style={styles.legFooter}>
            <Text style={styles.nights}>📅 {deal.duration_days} nuits</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <SafeAreaView
        edges={["bottom"]}
        style={styles.cta}
      >
        <Pressable
          style={styles.ctaBtn}
          onPress={() => deal.deep_link && Linking.openURL(deal.deep_link)}
        >
          <Text style={styles.ctaBtnText}>Réserver · {deal.price_eur}€</Text>
          <ArrowRight size={18} color="white" />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0A0B0F" },
  backBtn: {
    backgroundColor: "rgba(10,11,15,0.6)",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  heroContent: {
    position: "absolute",
    bottom: 16,
    left: 16,
  },
  heroFlag: { fontSize: 32, marginBottom: 4 },
  heroCity: { color: "#F1F2F6", fontFamily: "SpaceGrotesk_700Bold", fontSize: 26 },
  heroRoute: { color: "rgba(241,242,246,0.7)", fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  price: { color: "#F1F2F6", fontFamily: "SpaceGrotesk_700Bold", fontSize: 48 },
  priceLabel: { color: "#8B8FA8", fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2 },
  savingsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, marginBottom: 10 },
  savingsPct: { color: "#22C55E", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  avgPrice: { color: "#4B4F6B", fontFamily: "Inter_400Regular", fontSize: 13 },
  timer: { color: "#F59E0B", fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 20 },
  expired: { color: "#4B4F6B", fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 20 },
  card: {
    backgroundColor: "#13141A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: "#8B8FA8", fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 },
  chartLegend: { flexDirection: "row", gap: 16, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: "#8B8FA8", fontFamily: "Inter_400Regular", fontSize: 11 },
  flightRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  flightMeta: { color: "#8B8FA8", fontFamily: "Inter_400Regular", fontSize: 13 },
  legRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  legArrow: { flexDirection: "row", alignItems: "center", flex: 1, marginHorizontal: 8 },
  legLine: { flex: 1, height: 1, backgroundColor: "#1C1D26" },
  legLabel: { color: "#4B4F6B", fontFamily: "Inter_600SemiBold", fontSize: 9, letterSpacing: 1 },
  legDate: { color: "#F1F2F6", fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 2 },
  legTime: { color: "#8B8FA8", fontFamily: "Inter_400Regular", fontSize: 13 },
  legFooter: { borderTopWidth: 1, borderColor: "rgba(255,255,255,0.05)", marginTop: 14, paddingTop: 12 },
  nights: { color: "#8B8FA8", fontFamily: "Inter_400Regular", fontSize: 13 },
  cta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0A0B0F",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  ctaBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaBtnText: { color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 17 },
  error: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  errorText: { color: "#F1F2F6", fontFamily: "SpaceGrotesk_700Bold", fontSize: 20 },
  backLink: { color: "#FF6B35", fontFamily: "Inter_400Regular", fontSize: 15 },
});
