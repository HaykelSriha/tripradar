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

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const strength =
    password.length === 0 ? 0 :
    password.length < 6 ? 1 :
    password.length < 10 ? 2 :
    /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;

  const strengthColors = ["#1C1D26", "#ef4444", "#f59e0b", "#22c55e", "#22c55e"];
  const strengthLabels = ["", "Trop court", "Moyen", "Bien", "Fort"];

  async function handleRegister() {
    if (!email || !name || password.length < 8) {
      Alert.alert("Erreur", "Remplis tous les champs (mot de passe ≥ 8 caractères).");
      return;
    }
    setLoading(true);
    try {
      await register(email, name, password);
      router.replace("/onboarding/welcome");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Inscription impossible.";
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
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>
            Gratuit — reçois des alertes vols personnalisées.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Marie"
              placeholderTextColor="#4B4F6B"
              autoComplete="name"
            />

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
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="minimum 8 caractères"
              placeholderTextColor="#4B4F6B"
              secureTextEntry
            />
            {/* Strength bar */}
            {password.length > 0 && (
              <View>
                <View style={styles.strengthBar}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSeg,
                        { backgroundColor: i <= strength ? strengthColors[strength] : "#1C1D26" },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strengthColors[strength] }]}>
                  {strengthLabels[strength]}
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.btnText}>
                {loading ? "Création..." : "Créer mon compte"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ? </Text>
            <Pressable onPress={() => router.push("/auth/login")}>
              <Text style={styles.footerLink}>Se connecter</Text>
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
  strengthBar: { flexDirection: "row", gap: 4, marginTop: 6 },
  strengthSeg: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },
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
