import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTopDeals } from "../../lib/queries";
import { useAuth } from "../../lib/auth";
import { DealCard } from "../../components/DealCard";
import { SkeletonCard } from "../../components/SkeletonCard";
import { EmptyState } from "../../components/EmptyState";

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: deals, isLoading, isError, refetch, isRefetching } = useTopDeals(8);

  const greeting = user ? `Bonjour, ${user.name.split(" ")[0]} 👋` : "Bonjour 👋";

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.title}>Deals du jour</Text>
          {deals && (
            <Text style={styles.subtitle}>
              {deals.length} deals actifs · mis à jour toutes les 6h
            </Text>
          )}
        </View>

        {/* Section label */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>🔥 Meilleurs deals</Text>
        </View>

        {/* Content */}
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : isError ? (
          <EmptyState
            icon="⚡"
            title="Erreur de connexion"
            subtitle="Impossible de charger les deals. Vérifie ta connexion."
          />
        ) : !deals?.length ? (
          <EmptyState
            icon="✈️"
            title="Aucun deal pour l'instant"
            subtitle="Les deals sont mis à jour toutes les 6 heures. Reviens bientôt !"
          />
        ) : (
          deals.map((deal) => <DealCard key={deal.flight_hash} deal={deal} />)
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
  greeting: { color: "#8B8FA8", fontFamily: "Inter_400Regular", fontSize: 14 },
  title: {
    color: "#F1F2F6",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 30,
    marginTop: 2,
  },
  subtitle: {
    color: "#4B4F6B",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 4,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionLabel: {
    color: "#F1F2F6",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
});
