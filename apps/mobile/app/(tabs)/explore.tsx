import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Shuffle } from "lucide-react-native";
import { useInspireDeals } from "../../lib/queries";
import { SkeletonCard } from "../../components/SkeletonCard";
import { EmptyState } from "../../components/EmptyState";
import type { ApiDeal } from "../../lib/api";

// Unsplash images by IATA (same map as DealCard)
const DEST_IMAGES: Record<string, string> = {
  BCN: "1539037116277-4db20889f2d4",
  LIS: "1558618666-fcd25c85cd64",
  PRG: "1467269204594-9661b134dd2b",
  BUD: "1549488344-1f9b8d2bd1f3",
  KRK: "1577791965377-5f9f6b974c85",
  WAW: "1607427289124-6c7c3e12a783",
  DUB: "1549476464-37392f717d84",
  ATH: "1555993539-1732b0258235",
  AMS: "1576924542622-772281b13ea3",
  BER: "1560969184-10fe8719e047",
  FCO: "1531572753322-ad063ceae51a",
  MAD: "1539037116277-4db20889f2d4",
  VIE: "1516550135131-4b4e4b15c6f4",
  OPO: "1555881400-74d7acaacd8b",
};

function getImg(iata: string) {
  const id = DEST_IMAGES[iata] ?? "1488646953014-85cb44e25828";
  return `https://images.unsplash.com/photo-${id}?w=400&q=70&auto=format`;
}

function DestCard({ deal }: { deal: ApiDeal }) {
  return (
    <Pressable
      style={styles.destCard}
      onPress={() => router.push(`/deal/${deal.flight_hash}`)}
    >
      <Image
        source={{ uri: getImg(deal.destination) }}
        style={styles.destImage}
        contentFit="cover"
      />
      <View style={styles.destOverlay} />
      <View style={styles.destContent}>
        <Text style={styles.destFlag}>{deal.destination_flag}</Text>
        <Text style={styles.destCity}>{deal.destination_city}</Text>
        <Text style={styles.destPrice}>à partir de {deal.price_eur}€</Text>
      </View>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const { data: deals, isLoading, isError, refetch, isRefetching } =
    useInspireDeals(12);

  // Pick a random deal for "Inspire me"
  function goRandom() {
    if (deals && deals.length > 0) {
      const d = deals[Math.floor(Math.random() * deals.length)];
      router.push(`/deal/${d.flight_hash}`);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#FF6B35"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Explorer</Text>
          <Text style={styles.subtitle}>
            Laisse-toi inspirer par les destinations tendance
          </Text>
        </View>

        {/* Inspire me button */}
        <Pressable
          style={styles.inspireBtn}
          onPress={goRandom}
          disabled={!deals?.length}
        >
          <View>
            <Text style={styles.inspireBtnTitle}>Inspire-moi 🎲</Text>
            <Text style={styles.inspireBtnSub}>On te trouve un deal surprise</Text>
          </View>
          <View style={styles.inspireIcon}>
            <Shuffle size={20} color="#FF6B35" />
          </View>
        </Pressable>

        <Text style={styles.sectionLabel}>Destinations tendance</Text>

        {isLoading ? (
          <View style={styles.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[styles.destCard, { height: 160, backgroundColor: "#1C1D26" }]} />
            ))}
          </View>
        ) : isError ? (
          <EmptyState icon="⚡" title="Erreur de chargement" />
        ) : !deals?.length ? (
          <EmptyState icon="🌍" title="Aucune destination" subtitle="Reviens bientôt !" />
        ) : (
          <View style={styles.grid}>
            {deals.map((d) => (
              <DestCard key={d.flight_hash} deal={d} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0A0B0F" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  title: {
    color: "#F1F2F6",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 30,
  },
  subtitle: {
    color: "#4B4F6B",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
  },
  inspireBtn: {
    backgroundColor: "#13141A",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#1C1D26",
  },
  inspireBtnTitle: {
    color: "#F1F2F6",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  inspireBtnSub: {
    color: "#4B4F6B",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  inspireIcon: {
    backgroundColor: "rgba(255,107,53,0.15)",
    padding: 12,
    borderRadius: 12,
  },
  sectionLabel: {
    color: "#8B8FA8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  destCard: {
    width: "47.5%",
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  destImage: { width: "100%", height: "100%", position: "absolute" },
  destOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,11,15,0.5)",
  },
  destContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  destFlag: { fontSize: 22, marginBottom: 2 },
  destCity: {
    color: "#F1F2F6",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  destPrice: {
    color: "#FF6B35",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    marginTop: 2,
  },
});
