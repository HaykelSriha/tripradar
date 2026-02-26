"use client";

import { useState } from "react";
import Link from "next/link";
import { BookMarked, Loader2, Plus, Trash2, X } from "lucide-react";
import { useWatchlist, useAddWatchlistItem, useRemoveWatchlistItem } from "@/lib/queries";
import type { Metadata } from "next";

const EU_DESTINATIONS = [
  { code: "BCN", name: "Barcelone 🇪🇸" },
  { code: "LIS", name: "Lisbonne 🇵🇹" },
  { code: "OPO", name: "Porto 🇵🇹" },
  { code: "PRG", name: "Prague 🇨🇿" },
  { code: "AMS", name: "Amsterdam 🇳🇱" },
  { code: "BUD", name: "Budapest 🇭🇺" },
  { code: "VIE", name: "Vienne 🇦🇹" },
  { code: "DUB", name: "Dublin 🇮🇪" },
  { code: "ATH", name: "Athènes 🇬🇷" },
  { code: "FCO", name: "Rome 🇮🇹" },
  { code: "CPH", name: "Copenhague 🇩🇰" },
  { code: "WAW", name: "Varsovie 🇵🇱" },
  { code: "KRK", name: "Cracovie 🇵🇱" },
  { code: "BRU", name: "Bruxelles 🇧🇪" },
  { code: "ARN", name: "Stockholm 🇸🇪" },
  { code: "HEL", name: "Helsinki 🇫🇮" },
  { code: "TLL", name: "Tallinn 🇪🇪" },
  { code: "RIX", name: "Riga 🇱🇻" },
  { code: "VNO", name: "Vilnius 🇱🇹" },
  { code: "BEG", name: "Belgrade 🇷🇸" },
  { code: "SVQ", name: "Séville 🇪🇸" },
  { code: "PMI", name: "Palma 🇪🇸" },
  { code: "VLC", name: "Valence 🇪🇸" },
];

function AddDestinationModal({
  onClose,
  existingCodes,
}: {
  onClose: () => void;
  existingCodes: Set<string>;
}) {
  const [search, setSearch] = useState("");
  const addMutation = useAddWatchlistItem();

  const filtered = EU_DESTINATIONS.filter(
    (d) =>
      !existingCodes.has(d.code) &&
      (search === "" ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.code.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = async (code: string, name: string) => {
    await addMutation.mutateAsync({ destination_code: code, destination_name: name });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass border border-white/10 rounded-3xl
                      shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h3 className="font-display font-semibold text-primary">Ajouter une destination</h3>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une ville..."
            autoFocus
            className="w-full bg-elevated text-primary text-sm rounded-xl px-4 py-3
                       border border-white/8 focus:outline-none focus:border-orange-500/60
                       placeholder:text-muted transition-colors mb-3"
          />

          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-secondary text-sm text-center py-6">Aucun résultat</p>
            ) : (
              filtered.map((d) => (
                <button
                  key={d.code}
                  onClick={() => handleAdd(d.code, d.name)}
                  disabled={addMutation.isPending}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl
                             hover:bg-elevated transition-colors text-left"
                >
                  <span className="text-sm text-primary">{d.name}</span>
                  <span className="text-2xs font-mono text-muted bg-elevated
                                   px-2 py-1 rounded-lg">{d.code}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WatchlistPage() {
  const { data: watchlist, isLoading, isError } = useWatchlist();
  const removeMutation = useRemoveWatchlistItem();
  const [showAdd, setShowAdd] = useState(false);

  const existingCodes = new Set((watchlist ?? []).map((w) => w.destination_code));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-orange-400" />
            Ma watchlist
          </h1>
          <p className="text-secondary text-sm mt-1">
            Tu recevras une alerte pour chaque deal vers ces destinations.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500
                     hover:bg-orange-400 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center py-16 glass rounded-2xl border border-white/5">
          <p className="text-secondary">Erreur de chargement. Réessaie.</p>
        </div>
      ) : watchlist && watchlist.length > 0 ? (
        <div className="space-y-2">
          {watchlist.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between glass border border-white/5
                         rounded-2xl px-5 py-4 group hover:border-white/10 transition-colors"
            >
              <div>
                <p className="text-primary font-medium">{item.destination_name}</p>
                <p className="text-2xs font-mono text-muted mt-0.5">{item.destination_code}</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Quick link to see deals for this destination */}
                <Link
                  href={`/deals?destination=${item.destination_code}`}
                  className="text-2xs text-orange-400 hover:text-orange-300 transition-colors
                             opacity-0 group-hover:opacity-100"
                >
                  Voir deals →
                </Link>

                <button
                  onClick={() => removeMutation.mutate(item.destination_code)}
                  disabled={removeMutation.isPending}
                  className="text-muted hover:text-danger transition-colors p-1.5
                             rounded-lg hover:bg-danger/10"
                >
                  {removeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 glass border border-white/5 rounded-3xl">
          <BookMarked className="w-10 h-10 text-muted mx-auto mb-4" />
          <p className="text-primary font-semibold mb-2">Watchlist vide</p>
          <p className="text-secondary text-sm mb-6 max-w-xs mx-auto">
            Ajoute des destinations pour recevoir des alertes quand un deal apparaît.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl
                       bg-orange-500 hover:bg-orange-400 text-white text-sm
                       font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter ma première destination
          </button>
        </div>
      )}

      {showAdd && (
        <AddDestinationModal
          onClose={() => setShowAdd(false)}
          existingCodes={existingCodes}
        />
      )}
    </div>
  );
}
