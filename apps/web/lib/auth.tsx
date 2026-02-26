"use client";

/**
 * Auth context — stores JWT tokens in localStorage, provides login/logout helpers.
 * Tokens are decoded client-side to get user info (no server round-trip needed).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  ApiUser,
  TokenResponse,
  apiGoogleAuth,
  apiLogin,
  apiLogout,
  apiRefresh,
  apiRegister,
  fetchMe,
} from "./api";

interface AuthState {
  user: ApiUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccess: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

const ACCESS_KEY = "tr_access";
const REFRESH_KEY = "tr_refresh";

function getStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function storeTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Boot: restore session from localStorage ──────────────────────────────
  useEffect(() => {
    const stored = getStored(ACCESS_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    // Validate token by fetching /users/me
    fetchMe(stored)
      .then((me) => {
        setAccessToken(stored);
        setUser(me);
      })
      .catch(async () => {
        // Access token expired — try refresh
        const refresh = getStored(REFRESH_KEY);
        if (refresh) {
          try {
            const { access_token } = await apiRefresh(refresh);
            const me = await fetchMe(access_token);
            localStorage.setItem(ACCESS_KEY, access_token);
            setAccessToken(access_token);
            setUser(me);
          } catch {
            clearTokens();
          }
        } else {
          clearTokens();
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const applyTokenResponse = useCallback(async (resp: TokenResponse) => {
    storeTokens(resp.access_token, resp.refresh_token);
    setAccessToken(resp.access_token);
    const me = await fetchMe(resp.access_token);
    setUser(me);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const resp = await apiLogin({ email, password });
      await applyTokenResponse(resp);
    },
    [applyTokenResponse]
  );

  const register = useCallback(
    async (email: string, name: string, password: string) => {
      const resp = await apiRegister({ email, name, password });
      await applyTokenResponse(resp);
    },
    [applyTokenResponse]
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const resp = await apiGoogleAuth(idToken);
      await applyTokenResponse(resp);
    },
    [applyTokenResponse]
  );

  const logout = useCallback(async () => {
    const refresh = getStored(REFRESH_KEY);
    if (refresh) {
      try {
        await apiLogout(refresh);
      } catch {}
    }
    clearTokens();
    setAccessToken(null);
    setUser(null);
  }, []);

  const refreshAccess = useCallback(async (): Promise<string | null> => {
    const refresh = getStored(REFRESH_KEY);
    if (!refresh) return null;
    try {
      const { access_token } = await apiRefresh(refresh);
      localStorage.setItem(ACCESS_KEY, access_token);
      setAccessToken(access_token);
      return access_token;
    } catch {
      clearTokens();
      setUser(null);
      setAccessToken(null);
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
