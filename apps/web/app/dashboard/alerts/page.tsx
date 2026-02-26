"use client";

import Link from "next/link";
import { Bell, ExternalLink, Loader2, Mail, Smartphone } from "lucide-react";
import { useAlerts } from "@/lib/queries";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function parseRoute(route: string): { from: string; to: string } {
  const parts = route.split("-");
  return { from: parts[0] ?? "?", to: parts[1] ?? "?" };
}

function ChannelBadge({ channel }: { channel: string }) {
  if (channel === "push") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                       text-2xs bg-violet-500/15 border border-violet-500/25 text-violet-300">
        <Smartphone className="w-3 h-3" />
        Push
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                     text-2xs bg-blue-500/15 border border-blue-500/25 text-blue-300">
      <Mail className="w-3 h-3" />
      Email
    </span>
  );
}

export default function AlertsPage() {
  const { data: alerts, isLoading, isError } = useAlerts();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-400" />
          Mes alertes
        </h1>
        <p className="text-secondary text-sm mt-1">
          Historique des notifications que tu as reçues.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center py-16 glass rounded-2xl border border-white/5">
          <p className="text-secondary">Erreur de chargement. Réessaie.</p>
        </div>
      ) : alerts && alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const { from, to } = parseRoute(alert.route);
            const isNew = !alert.opened_at;

            return (
              <div
                key={alert.id}
                className="glass border border-white/5 rounded-2xl px-5 py-4
                           hover:border-white/10 transition-colors flex items-start
                           justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Unread dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    {isNew ? (
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-elevated border border-white/10" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-primary">
                        ✈️ {from} → {to}
                      </p>
                      <ChannelBadge channel={alert.channel} />
                      {isNew && (
                        <span className="text-2xs text-orange-400 font-medium">Nouveau</span>
                      )}
                    </div>
                    <p className="text-2xs text-muted mt-0.5">
                      {formatDate(alert.sent_at)}
                      {alert.opened_at && (
                        <span className="ml-2 text-secondary">
                          · Vu le {formatDate(alert.opened_at)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Link to deal */}
                <Link
                  href={`/deals/${alert.deal_id}`}
                  className="flex-shrink-0 flex items-center gap-1 text-2xs text-orange-400
                             hover:text-orange-300 transition-colors"
                >
                  Voir deal
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 glass border border-white/5 rounded-3xl">
          <Bell className="w-10 h-10 text-muted mx-auto mb-4" />
          <p className="text-primary font-semibold mb-2">Aucune alerte pour l&apos;instant</p>
          <p className="text-secondary text-sm mb-6 max-w-xs mx-auto">
            Ajoute des destinations à ta watchlist pour commencer à recevoir des alertes.
          </p>
          <Link
            href="/dashboard/watchlist"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl
                       bg-orange-500 hover:bg-orange-400 text-white text-sm
                       font-semibold transition-colors"
          >
            Configurer ma watchlist
          </Link>
        </div>
      )}
    </div>
  );
}
