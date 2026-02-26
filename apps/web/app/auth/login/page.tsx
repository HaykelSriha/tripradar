"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Plane, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Metadata } from "next";

// ── Google Identity Services loader ──────────────────────────────────────────

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
        callback: (response) => onSuccess(response.credential),
      });
      window.google.accounts.id.renderButton(divRef.current, {
        theme: "filled_black",
        size: "large",
        width: divRef.current.offsetWidth,
        text: "signin_with",
        locale: "fr",
      });
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [onSuccess]);

  return divRef;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard/watchlist");
  }, [isAuthenticated, router]);

  const handleGoogleSuccess = async (idToken: string) => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle(idToken);
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connexion Google échouée.");
    } finally {
      setLoading(false);
    }
  };

  const googleRef = useGoogleOAuth(handleGoogleSuccess);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px]
                      bg-violet-600/8 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-10">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-primary">TripRadar</span>
        </Link>

        <div className="glass border border-white/8 rounded-3xl p-8">
          <h1 className="font-display font-bold text-2xl text-primary mb-1">
            Content de te revoir !
          </h1>
          <p className="text-secondary text-sm mb-8">
            Connecte-toi pour accéder à tes alertes et ta watchlist.
          </p>

          {/* Error */}
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

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-2xs text-muted">ou par email</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between mb-2">
                <label className="text-2xs text-secondary uppercase tracking-wider">
                  Mot de passe
                </label>
                <button type="button" className="text-2xs text-orange-400 hover:text-orange-300">
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <p className="text-center text-sm text-secondary mt-6">
            Pas encore de compte ?{" "}
            <Link
              href="/auth/register"
              className="text-orange-400 hover:text-orange-300 font-medium"
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
