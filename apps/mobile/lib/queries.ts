import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addWatchlistItem,
  fetchAlerts,
  fetchDeals,
  fetchDeal,
  fetchInspireDeals,
  fetchMe,
  fetchNotificationPrefs,
  fetchPreferences,
  fetchTopDeals,
  fetchWatchlist,
  removeWatchlistItem,
  updateNotificationPrefs,
  updatePreferences,
} from "./api";
import { useAuth } from "./auth";

// ─── Deals ─────────────────────────────────────────────────────────────────────

export function useTopDeals(limit = 6) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["deals", "top", limit],
    queryFn: () => fetchTopDeals(limit, accessToken ?? undefined),
    staleTime: 1000 * 60 * 15,
  });
}

export function useInspireDeals(limit = 12) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["deals", "inspire", limit],
    queryFn: () => fetchInspireDeals(limit, accessToken ?? undefined),
    staleTime: 1000 * 60 * 60,
  });
}

export function useDeal(id: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["deal", id],
    queryFn: () => fetchDeal(id, accessToken ?? undefined),
    staleTime: 1000 * 60 * 5,
    enabled: !!id,
  });
}

export function useDealsInfinite(
  filters: Record<string, string | number | boolean | undefined> = {}
) {
  const { accessToken } = useAuth();
  return useInfiniteQuery({
    queryKey: ["deals", "infinite", filters],
    queryFn: ({ pageParam }) =>
      fetchDeals(
        { ...filters, cursor: pageParam as string | undefined },
        accessToken ?? undefined
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.cursor ?? undefined,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── User ──────────────────────────────────────────────────────────────────────

export function useMe() {
  const { accessToken, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(accessToken!),
    enabled: isAuthenticated && !!accessToken,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePreferences() {
  const { accessToken, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["preferences"],
    queryFn: () => fetchPreferences(accessToken!),
    enabled: isAuthenticated && !!accessToken,
  });
}

export function useUpdatePreferences() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updatePreferences>[0]) =>
      updatePreferences(data, accessToken!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preferences"] }),
  });
}

export function useNotificationPrefs() {
  const { accessToken, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["notif-prefs"],
    queryFn: () => fetchNotificationPrefs(accessToken!),
    enabled: isAuthenticated && !!accessToken,
  });
}

export function useUpdateNotificationPrefs() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateNotificationPrefs>[0]) =>
      updateNotificationPrefs(data, accessToken!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-prefs"] }),
  });
}

// ─── Watchlist ─────────────────────────────────────────────────────────────────

export function useWatchlist() {
  const { accessToken, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["watchlist"],
    queryFn: () => fetchWatchlist(accessToken!),
    enabled: isAuthenticated && !!accessToken,
  });
}

export function useAddWatchlistItem() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      destination_code,
      destination_name,
    }: {
      destination_code: string;
      destination_name: string;
    }) => addWatchlistItem(destination_code, destination_name, accessToken!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}

export function useRemoveWatchlistItem() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => removeWatchlistItem(code, accessToken!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}

// ─── Alerts ────────────────────────────────────────────────────────────────────

export function useAlerts(limit = 50) {
  const { accessToken, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["alerts", limit],
    queryFn: () => fetchAlerts(accessToken!, limit),
    enabled: isAuthenticated && !!accessToken,
  });
}
