import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Bell,
  Plane,
  MapPin,
  Shield,
  LogOut,
  ChevronRight,
  User,
} from "lucide-react-native";
import { useAuth } from "../../lib/auth";
import {
  usePreferences,
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  useWatchlist,
} from "../../lib/queries";

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Row({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: typeof User;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}>
        <Icon size={18} color="#8B8FA8" />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      <ChevronRight size={16} color="#4B4F6B" />
    </Pressable>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  value,
  onToggle,
}: {
  icon: typeof Bell;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={[styles.row, { paddingVertical: 14 }]}>
      <View style={styles.rowIcon}>
        <Icon size={18} color="#8B8FA8" />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#1C1D26", true: "rgba(255,107,53,0.4)" }}
        thumbColor={value ? "#FF6B35" : "#4B4F6B"}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const { data: prefs } = usePreferences();
  const { data: notifPrefs } = useNotificationPrefs();
  const { data: watchlist } = useWatchlist();
  const updateNotif = useUpdateNotificationPrefs();

  async function handleLogout() {
    Alert.alert("Déconnexion", "Confirmer la déconnexion ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnecter",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Profil</Text>
          <View style={styles.loginCard}>
            <View style={styles.avatar}>
              <User size={32} color="#FF6B35" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.loginTitle}>Connexion requise</Text>
              <Text style={styles.loginSub}>
                Connecte-toi pour sauvegarder tes préférences et recevoir des alertes.
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.loginBtn}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={styles.loginBtnText}>Se connecter</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/auth/register")}>
            <Text style={styles.registerLink}>Créer un compte</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profil</Text>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.is_premium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>✦ Premium</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notifications */}
        <SectionLabel label="Notifications" />
        <View style={styles.card}>
          <ToggleRow
            icon={Bell}
            label="Notifications push"
            value={notifPrefs?.push_enabled ?? true}
            onToggle={(v) => updateNotif.mutate({ push_enabled: v })}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon={Bell}
            label="Alertes email"
            value={notifPrefs?.email_enabled ?? true}
            onToggle={(v) => updateNotif.mutate({ email_enabled: v })}
          />
        </View>

        {/* Preferences */}
        <SectionLabel label="Préférences" />
        <View style={styles.card}>
          <Row
            icon={Plane}
            label="Aéroports de départ"
            value={prefs?.departure_airports?.join(", ") ?? "–"}
          />
          <View style={styles.divider} />
          <Row
            icon={MapPin}
            label="Mes destinations"
            value={`${watchlist?.length ?? 0} ajoutée${(watchlist?.length ?? 0) > 1 ? "s" : ""}`}
          />
          <View style={styles.divider} />
          <Row
            icon={Shield}
            label="Budget maximum"
            value={prefs ? `${prefs.max_budget_eur}€` : "–"}
          />
        </View>

        {/* Legal */}
        <SectionLabel label="À propos" />
        <View style={styles.card}>
          <Row icon={Shield} label="Politique de confidentialité" />
          <View style={styles.divider} />
          <Row icon={Shield} label="Conditions d'utilisation" />
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0A0B0F" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  title: {
    color: "#F1F2F6",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 30,
    marginBottom: 20,
  },
  loginCard: {
    backgroundColor: "#13141A",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  loginTitle: { color: "#F1F2F6", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  loginSub: { color: "#8B8FA8", fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4, lineHeight: 20 },
  loginBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  loginBtnText: { color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 16 },
  registerLink: {
    color: "#8B8FA8",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  userCard: {
    backgroundColor: "#13141A",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,107,53,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: "#FF6B35", fontFamily: "SpaceGrotesk_700Bold", fontSize: 22 },
  userName: { color: "#F1F2F6", fontFamily: "Inter_600SemiBold", fontSize: 17 },
  userEmail: { color: "#8B8FA8", fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  premiumBadge: {
    marginTop: 6,
    backgroundColor: "rgba(124,58,237,0.2)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  premiumText: { color: "#A78BFA", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  sectionLabel: {
    color: "#8B8FA8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#13141A",
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    backgroundColor: "#1C1D26",
    padding: 8,
    borderRadius: 10,
  },
  rowLabel: { color: "#F1F2F6", fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  rowValue: { color: "#8B8FA8", fontFamily: "Inter_400Regular", fontSize: 13, marginRight: 4 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginLeft: 50 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  logoutText: { color: "#ef4444", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
