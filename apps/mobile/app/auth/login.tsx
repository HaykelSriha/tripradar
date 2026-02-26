import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import { ApiError } from "../../lib/api";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Connexion impossible.";
      Alert.alert("Erreur", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.back} onPress={() => router.back()}>
            ← Retour
          </Text>
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>Accède à tes alertes et watchlist.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@exemple.fr"
              placeholderTextColor="#4B4F6B"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.pwWrap}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#4B4F6B"
                secureTextEntry={!showPw}
              />
              <Pressable onPress={() => setShowPw((p) => !p)}>
                <Text style={styles.showPw}>{showPw ? "Cacher" : "Voir"}</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.btnText}>
                {loading ? "Connexion..." : "Se connecter"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ? </Text>
            <Pressable onPress={() => router.push("/auth/register")}>
              <Text style={styles.footerLink}>S'inscrire</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0A0B0F" },
  scroll: { padding: 24, flexGrow: 1 },
  back: { color: "#8B8FA8", fontFamily: "Inter_400Regular", fontSize: 15, marginBottom: 32 },
  title: {
    color: "#F1F2F6",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 32,
    marginBottom: 8,
  },
  subtitle: {
    color: "#8B8FA8",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    marginBottom: 36,
  },
  form: { gap: 12 },
  label: {
    color: "#8B8FA8",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginBottom: -4,
  },
  input: {
    backgroundColor: "#13141A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1C1D26",
    color: "#F1F2F6",
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    padding: 14,
  },
  pwWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#13141A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1C1D26",
    paddingRight: 14,
  },
  showPw: { color: "#FF6B35", fontFamily: "Inter_500Medium", fontSize: 14 },
  btn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 17 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: { color: "#8B8FA8", fontFamily: "Inter_400Regular", fontSize: 14 },
  footerLink: { color: "#FF6B35", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
