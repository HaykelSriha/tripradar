import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import type { ApiDeal } from "../lib/api";
import { DealScoreRing } from "./DealScoreRing";
import { SavingsBadge } from "./SavingsBadge";
import { DealTierBadge } from "./DealTierBadge";

// Curated Unsplash image map by IATA code
const DEST_IMAGES: Record<string, string> = {
  BCN: "1539037116277-4db20889f2d4",
  LIS: "1558618666-fcd25c85cd64",
  PRG: "1467269204594-9661b134dd2b",
  BUD: "1549488344-1f9b8d2bd1f3",
  KRK: "1577791965377-5f9f6b974c85",
  WAW: "1607427289124-6c7c3e12a783",
  DUB: "1549476464-37392f717d84",
  ATH: "1555993539-1732b0258235",
  CDG: "1499856871958-5b9627545d1a",
  AMS: "1576924542622-772281b13ea3",
  BER: "1560969184-10fe8719e047",
  FCO: "1531572753322-ad063ceae51a",
  MAD: "1539037116277-4db20889f2d4",
  VIE: "1516550135131-4b4e4b15c6f4",
  CPH: "1513622470522-26c3c8a854bc",
  OSL: "1601439848526-a58a3e66a0d6",
  LPA: "1589308158935-36d38d95b813",
  AGP: "1498579397153-d0d38b514d28",
  TFS: "1516709088-40ab3c5add6f",
  PMI: "1520681279154-51d822c8f7d9",
  OPO: "1555881400-74d7acaacd8b",
  NAP: "1533105079780-92b9be4f5452",
  MXP: "1554168726-53c97c6f5af9",
};

function getDestImage(iata: string): string {
  const id = DEST_IMAGES[iata] ?? "1488646953014-85cb44e25828";
  return `https://images.unsplash.com/photo-${id}?w=600&q=75&auto=format`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

interface Props {
  deal: ApiDeal;
}

export function DealCard({ deal }: Props) {
  return (
    <Pressable
      onPress={() => router.push(`/deal/${deal.flight_hash}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}
    >
      {/* Hero image */}
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: getDestImage(deal.destination) }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        <View style={styles.imageOverlay} />
        {/* Badges over image */}
        <View style={styles.badges}>
          <DealTierBadge tier={deal.deal_tier} />
          <SavingsBadge savingsPct={deal.savings_pct} size="sm" />
        </View>
        {/* Destination */}
        <View style={styles.destRow}>
          <Text style={styles.flag}>{deal.destination_flag}</Text>
          <Text style={styles.destCity}>{deal.destination_city}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.routeRow}>
          <Text style={styles.route}>
            {deal.origin} → {deal.destination}
          </Text>
          <DealScoreRing score={deal.deal_score} size={40} />
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{deal.price_eur}€</Text>
          <Text style={styles.avg}>moy. {Math.round(deal.avg_price_90d)}€</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {formatDate(deal.departure_at)} → {formatDate(deal.return_at)}
          </Text>
          <Text style={styles.meta}>
            {deal.is_direct ? "Direct" : "Escale"} · {deal.airline}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#13141A",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  imageWrap: {
    height: 140,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,11,15,0.45)",
  },
  badges: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    gap: 6,
  },
  destRow: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  flag: { fontSize: 22 },
  destCity: {
    color: "#F1F2F6",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
  },
  body: { padding: 14 },
  routeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  route: {
    color: "#8B8FA8",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 8,
  },
  price: {
    color: "#F1F2F6",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
  },
  avg: { color: "#4B4F6B", fontFamily: "Inter_400Regular", fontSize: 13 },
  metaRow: { gap: 2 },
  meta: { color: "#4B4F6B", fontFamily: "Inter_400Regular", fontSize: 12 },
});
