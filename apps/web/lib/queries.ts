"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  DealsParams,
  addWatchlistItem,
  fetchAlerts,
  fetchDeals,
  fetchDeal,
  fetchNotificationPrefs,
  fetchPreferences,
  fetchTopDeals,
  fetchWatchlist,
  removeWatchlistItem,
  updateNotificationPrefs,
  updatePreferences,
} from "./api";
import { useAuth } from "./auth";

// ── Deals ─────────────────────────────────────────────────────────────────────

export function useTopDeals(limit = 6) {
  return useQuery({
    queryKey: ["deals", "top", limit],
    queryFn: () => fetchTopDeals(limit),
    staleTime: 1000 * 60 * 15, // 15 min
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ["deals", id],
    queryFn: () => fetchDeal(id),
    staleTime: 1000 * 60 * 15,
  });
}

export function useDealsInfinite(filters: Omit<DealsParams, "cursor">) {
  return useInfiniteQuery({
    queryKey: ["deals", "list", filters],
    queryFn: ({ pageParam }) =>
      fetchDeals({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.cursor ?? undefined) : undefined,
    staleTime: 1000 * 60 * 5,
  });
}

// ── User data (requires auth) ─────────────────────────────────────────────────

export function usePreferences() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["preferences"],
    queryFn: () => fetchPreferences(accessToken!),
    enabled: !!accessToken,
  });
}

export function useUpdatePreferences() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updatePreferences>[1]) =>
      updatePreferences(accessToken!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preferences"] }),
  });
}

export function useNotificationPrefs() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["notif-prefs"],
    queryFn: () => fetchNotificationPrefs(accessToken!),
    enabled: !!accessToken,
  });
}

export function useUpdateNotificationPrefs() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateNotificationPrefs>[1]) =>
      updateNotificationPrefs(accessToken!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-prefs"] }),
  });
}

export function useWatchlist() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["watchlist"],
    queryFn: () => fetchWatchlist(accessToken!),
    enabled: !!accessToken,
  });
}

export function useAddWatchlistItem() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { destination_code: string; destination_name: string }) =>
      addWatchlistItem(accessToken!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}

export function useRemoveWatchlistItem() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => removeWatchlistItem(accessToken!, code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}

export function useAlerts() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["alerts"],
    queryFn: () => fetchAlerts(accessToken!),
    enabled: !!accessToken,
  });
}
