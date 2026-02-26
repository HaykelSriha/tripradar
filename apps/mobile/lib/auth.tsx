import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import {
  ApiUser,
  apiLogin,
  apiLogout,
  apiRefresh,
  apiRegister,
  fetchMe,
  ApiError,
} from "./api";

const ACCESS_KEY = "tr_access";
const REFRESH_KEY = "tr_refresh";

// ─── Context types ─────────────────────────────────────────────────────────────

interface AuthState {
  user: ApiUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccess: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Boot: validate stored access token
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(ACCESS_KEY);
        if (!stored) return;
        try {
          const me = await fetchMe(stored);
          setAccessToken(stored);
          setUser(me);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            // Try refresh
            const refreshed = await refreshAccess();
            if (!refreshed) {
              await SecureStore.deleteItemAsync(ACCESS_KEY);
              await SecureStore.deleteItemAsync(REFRESH_KEY);
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const storeTokens = useCallback(
    async (access: string, refresh: string, me: ApiUser) => {
      await SecureStore.setItemAsync(ACCESS_KEY, access);
      await SecureStore.setItemAsync(REFRESH_KEY, refresh);
      setAccessToken(access);
      setUser(me);
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await apiLogin({ email, password });
    const me = await fetchMe(tokens.access_token);
    await storeTokens(tokens.access_token, tokens.refresh_token, me);
  }, [storeTokens]);

  const register = useCallback(
    async (email: string, name: string, password: string) => {
      const tokens = await apiRegister({ email, name, password });
      const me = await fetchMe(tokens.access_token);
      await storeTokens(tokens.access_token, tokens.refresh_token, me);
    },
    [storeTokens]
  );

  const refreshAccess = useCallback(async (): Promise<string | null> => {
    try {
      const rt = await SecureStore.getItemAsync(REFRESH_KEY);
      if (!rt) return null;
      const data = await apiRefresh(rt);
      await SecureStore.setItemAsync(ACCESS_KEY, data.access_token);
      setAccessToken(data.access_token);
      const me = await fetchMe(data.access_token);
      setUser(me);
      return data.access_token;
    } catch {
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const rt = await SecureStore.getItemAsync(REFRESH_KEY);
      if (rt && accessToken) await apiLogout(rt, accessToken);
    } catch {}
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    setAccessToken(null);
    setUser(null);
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
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
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
