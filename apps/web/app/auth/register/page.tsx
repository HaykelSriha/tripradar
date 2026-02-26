"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Plane } from "lucide-react";
import { useAuth } from "@/lib/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (r: { credential: string }) => void;
          }) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function useGoogleOAuth(onSuccess: (idToken: string) => void) {
  const divRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (r) => onSuccess(r.credential),
      });
      window.google.accounts.id.renderButton(divRef.current, {
        theme: "filled_black",
        size: "large",
        width: divRef.current.offsetWidth,
        text: "signup_with",
        locale: "fr",
      });
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [onSuccess]);

  return divRef;
}

export default function RegisterPage() {
  const { register, loginWithGoogle, isAuthenticated } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard/watchlist");
  }, [isAuthenticated, router]);

  const handleGoogleSuccess = async (idToken: string) => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle(idToken);
      router.push("/dashboard/settings");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Inscription Google échouée.");
    } finally {
      setLoading(false);
    }
  };

  const googleRef = useGoogleOAuth(handleGoogleSuccess);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register(email, name, password);
      router.push("/dashboard/settings");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Inscription échouée. Essaie un autre email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px]
                      bg-orange-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-10">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-primary">TripRadar</span>
        </Link>

        <div className="glass border border-white/8 rounded-3xl p-8">
          <h1 className="font-display font-bold text-2xl text-primary mb-1">
            Crée ton compte gratuit
          </h1>
          <p className="text-secondary text-sm mb-8">
            Reçois des alertes dès qu&apos;un deal correspond à tes critères.
          </p>

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Google button */}
          <div className="mb-5">
            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
              <div ref={googleRef} className="w-full h-11" />
            ) : (
              <button
                disabled
                className="w-full py-3 rounded-xl border border-white/10 text-sm
                           text-secondary flex items-center justify-center gap-3 opacity-60"
              >
                <span className="text-base">G</span>
                Continuer avec Google
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-2xs text-muted">ou avec un email</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-2xs text-secondary uppercase tracking-wider mb-2">
                Prénom / Pseudo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alice"
                required
                autoComplete="name"
                className="w-full bg-elevated text-primary text-sm rounded-xl px-4 py-3
                           border border-white/8 focus:outline-none focus:border-orange-500/60
                           placeholder:text-muted transition-colors"
              />
            </div>

            <div>
              <label className="block text-2xs text-secondary uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@example.com"
                required
                autoComplete="email"
                className="w-full bg-elevated text-primary text-sm rounded-xl px-4 py-3
                           border border-white/8 focus:outline-none focus:border-orange-500/60
                           placeholder:text-muted transition-colors"
              />
            </div>

            <div>
              <label className="block text-2xs text-secondary uppercase tracking-wider mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full bg-elevated text-primary text-sm rounded-xl px-4 py-3 pr-11
                             border border-white/8 focus:outline-none focus:border-orange-500/60
                             placeholder:text-muted transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted
                             hover:text-secondary transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= i * 3
                          ? i <= 1
                            ? "bg-danger"
                            : i <= 2
                            ? "bg-warning"
                            : "bg-success"
                          : "bg-elevated"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400
                         text-white font-semibold text-sm transition-colors
                         disabled:opacity-60 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Création…" : "Créer mon compte"}
            </button>
          </form>

          <p className="text-center text-2xs text-muted mt-5">
            En créant un compte tu acceptes nos{" "}
            <Link href="/terms" className="text-secondary hover:text-primary">
              CGU
            </Link>{" "}
            et notre{" "}
            <Link href="/privacy" className="text-secondary hover:text-primary">
              politique de confidentialité
            </Link>
            .
          </p>

          <p className="text-center text-sm text-secondary mt-4">
            Déjà un compte ?{" "}
            <Link
              href="/auth/login"
              className="text-orange-400 hover:text-orange-300 font-medium"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
