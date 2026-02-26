import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, BellOff, ArrowRight } from "lucide-react-native";
import { router } from "expo-router";
import { useAlerts } from "../../lib/queries";
import { useAuth } from "../../lib/auth";
import { EmptyState } from "../../components/EmptyState";
import type { ApiAlertRecord } from "../../lib/api";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `Il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

function ChannelBadge({ channel }: { channel: "push" | "email" }) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: channel === "push" ? "rgba(124,58,237,0.2)" : "rgba(59,130,246,0.2)" },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: channel === "push" ? "#A78BFA" : "#60A5FA" },
        ]}
      >
        {channel === "push" ? "Push" : "Email"}
      </Text>
    </View>
  );
}

function AlertRow({ alert }: { alert: ApiAlertRecord }) {
  const isUnread = !alert.opened_at;
  return (
    <Pressable
      style={[styles.row, isUnread && styles.rowUnread]}
      onPress={() => router.push(`/deal/${alert.deal_id}`)}
    >
      {isUnread && <View style={styles.unreadBar} />}
      <View style={styles.rowInner}>
        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={styles.dealId} numberOfLines={1}>
              Deal #{alert.deal_id.slice(0, 8)}
            </Text>
            <ChannelBadge channel={alert.channel} />
          </View>
          <Text style={styles.sentAt}>{timeAgo(alert.sent_at)}</Text>
        </View>
        <ArrowRight size={16} color="#4B4F6B" />
      </View>
    </Pressable>
  );
}

export default function AlertsScreen() {
  const { isAuthenticated } = useAuth();
  const { data: alerts, isLoading, refetch, isRefetching } = useAlerts();

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Mes alertes</Text>
        </View>
        <EmptyState
          icon="🔒"
          title="Connexion requise"
          subtitle="Connecte-toi pour voir ton historique d'alertes."
          action={
            <Pressable
              style={styles.loginBtn}
              onPress={() => router.push("/auth/login")}
            >
              <Text style={styles.loginBtnText}>Se connecter</Text>
            </Pressable>
          }
        />
      </SafeAreaView>
    );
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
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Mes alertes</Text>
            {alerts && (
              <Text style={styles.subtitle}>{alerts.length} alertes reçues</Text>
            )}
          </View>
          <View style={styles.bellBtn}>
            <Bell size={18} color="#8B8FA8" />
          </View>
        </View>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={[styles.row, { height: 72, backgroundColor: "#13141A" }]} />
          ))
        ) : !alerts?.length ? (
          <EmptyState
            icon="🔔"
            title="Aucune alerte reçue"
            subtitle="Ajoute des destinations à ta watchlist pour commencer à recevoir des alertes."
            action={
              <View style={styles.noAlertHint}>
                <BellOff size={28} color="#4B4F6B" />
                <Text style={styles.noAlertText}>
                  Ajoute des destinations dans Profil → Watchlist
                </Text>
              </View>
            }
          />
        ) : (
          <View style={styles.list}>
            {alerts.map((a) => (
              <AlertRow key={a.id} alert={a} />
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
  header: { padding: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    color: "#F1F2F6",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 30,
  },
  subtitle: {
    color: "#4B4F6B",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 4,
  },
  bellBtn: {
    backgroundColor: "#13141A",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1C1D26",
    marginTop: 4,
  },
  list: { gap: 8 },
  row: {
    backgroundColor: "#13141A",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowUnread: { borderColor: "rgba(255,107,53,0.25)" },
  unreadBar: { height: 2, backgroundColor: "rgba(255,107,53,0.6)" },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  dealId: { color: "#F1F2F6", fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
  sentAt: { color: "#4B4F6B", fontFamily: "Inter_400Regular", fontSize: 12 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  loginBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  loginBtnText: { color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 15 },
  noAlertHint: { alignItems: "center", gap: 8 },
  noAlertText: {
    color: "#8B8FA8",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
  },
});
