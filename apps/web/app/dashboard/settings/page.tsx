"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Save, Settings, Sliders } from "lucide-react";
import { clsx } from "clsx";
import {
  usePreferences,
  useNotificationPrefs,
  useUpdatePreferences,
  useUpdateNotificationPrefs,
} from "@/lib/queries";

const FRENCH_AIRPORTS = [
  { code: "CDG", label: "Paris CDG" },
  { code: "ORY", label: "Paris Orly" },
  { code: "LYS", label: "Lyon" },
  { code: "MRS", label: "Marseille" },
  { code: "BOD", label: "Bordeaux" },
  { code: "NTE", label: "Nantes" },
  { code: "NCE", label: "Nice" },
  { code: "TLS", label: "Toulouse" },
  { code: "LIL", label: "Lille" },
];

const HOUR_LABELS = [
  "00h", "01h", "02h", "03h", "04h", "05h", "06h", "07h", "08h", "09h",
  "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h", "18h", "19h",
  "20h", "21h", "22h", "23h",
];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-orange-500" : "bg-elevated border border-white/10"
      )}
    >
      <span
        className={clsx(
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="glass border border-white/5 rounded-2xl p-6 mb-4">
      <h2 className="font-display font-semibold text-primary flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4 text-orange-400" />
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { data: prefs, isLoading: prefsLoading } = usePreferences();
  const { data: notif, isLoading: notifLoading } = useNotificationPrefs();
  const updatePrefs = useUpdatePreferences();
  const updateNotif = useUpdateNotificationPrefs();

  // ── Local state mirrors ────────────────────────────────────────────────────
  const [budget, setBudget] = useState(150);
  const [airports, setAirports] = useState<string[]>([]);
  const [durationMin, setDurationMin] = useState(2);
  const [durationMax, setDurationMax] = useState(7);

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [minScore, setMinScore] = useState(70);
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(8);

  const [savedPrefs, setSavedPrefs] = useState(false);
  const [savedNotif, setSavedNotif] = useState(false);

  // Populate from API
  useEffect(() => {
    if (prefs) {
      setBudget(prefs.max_budget_eur);
      setAirports(prefs.departure_airports);
      setDurationMin(prefs.trip_duration_min);
      setDurationMax(prefs.trip_duration_max);
    }
  }, [prefs]);

  useEffect(() => {
    if (notif) {
      setEmailEnabled(notif.email_enabled);
      setPushEnabled(notif.push_enabled);
      setMinScore(notif.min_deal_score);
      setQuietStart(notif.quiet_hours_start);
      setQuietEnd(notif.quiet_hours_end);
    }
  }, [notif]);

  const toggleAirport = (code: string) => {
    setAirports((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSavePrefs = async () => {
    await updatePrefs.mutateAsync({
      max_budget_eur: budget,
      departure_airports: airports,
      trip_duration_min: durationMin,
      trip_duration_max: durationMax,
    });
    setSavedPrefs(true);
    setTimeout(() => setSavedPrefs(false), 2500);
  };

  const handleSaveNotif = async () => {
    await updateNotif.mutateAsync({
      email_enabled: emailEnabled,
      push_enabled: pushEnabled,
      min_deal_score: minScore,
      quiet_hours_start: quietStart,
      quiet_hours_end: quietEnd,
    });
    setSavedNotif(true);
    setTimeout(() => setSavedNotif(false), 2500);
  };

  if (prefsLoading || notifLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary flex items-center gap-2">
          <Settings className="w-5 h-5 text-orange-400" />
          Préférences
        </h1>
        <p className="text-secondary text-sm mt-1">
          Configure tes critères de voyage pour des alertes personnalisées.
        </p>
      </div>

      {/* ── Travel preferences ─────────────────────────────────────────────── */}
      <Section title="Préférences de voyage" icon={Sliders}>
        {/* Budget */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-secondary">Budget maximum A/R</label>
            <span className="font-mono text-primary font-bold text-lg">{budget}€</span>
          </div>
          <input
            type="range"
            min={30}
            max={500}
            step={10}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-orange-500
                       bg-elevated"
          />
          <div className="flex justify-between text-2xs text-muted mt-1">
            <span>30€</span>
            <span>500€</span>
          </div>
        </div>

        {/* Departure airports */}
        <div className="mb-6">
          <label className="block text-sm text-secondary mb-3">
            Aéroports de départ
            <span className="text-muted ml-2">(sélectionne ceux qui te conviennent)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {FRENCH_AIRPORTS.map((a) => (
              <button
                key={a.code}
                type="button"
                onClick={() => toggleAirport(a.code)}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-sm border transition-colors",
                  airports.includes(a.code)
                    ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                    : "bg-elevated border-white/8 text-secondary hover:border-white/20"
                )}
              >
                {airports.includes(a.code) && "✓ "}{a.label} ({a.code})
              </button>
            ))}
          </div>
        </div>

        {/* Trip duration */}
        <div className="mb-6">
          <label className="block text-sm text-secondary mb-3">
            Durée du voyage (nuits)
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-2xs text-muted mb-1">Minimum</p>
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full bg-elevated text-primary text-sm rounded-xl px-3 py-2.5
                           border border-white/8 focus:outline-none focus:border-orange-500/60"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>{n} nuit{n > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <span className="text-secondary mt-4">→</span>
            <div className="flex-1">
              <p className="text-2xs text-muted mb-1">Maximum</p>
              <select
                value={durationMax}
                onChange={(e) => setDurationMax(Number(e.target.value))}
                className="w-full bg-elevated text-primary text-sm rounded-xl px-3 py-2.5
                           border border-white/8 focus:outline-none focus:border-orange-500/60"
              >
                {[3, 5, 7, 10, 14, 21, 30].map((n) => (
                  <option key={n} value={n}>{n} nuit{n > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleSavePrefs}
          disabled={updatePrefs.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500
                     hover:bg-orange-400 text-white text-sm font-semibold transition-colors
                     disabled:opacity-60"
        >
          {updatePrefs.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {savedPrefs ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </Section>

      {/* ── Notification preferences ───────────────────────────────────────── */}
      <Section title="Notifications" icon={Bell}>
        {/* Toggles */}
        <div className="space-y-4 mb-6">
          {[
            {
              label: "Alertes email",
              desc: "Reçois un email pour chaque deal qui te correspond",
              value: emailEnabled,
              onChange: setEmailEnabled,
            },
            {
              label: "Notifications push",
              desc: "Notifications instantanées sur ton téléphone",
              value: pushEnabled,
              onChange: setPushEnabled,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start justify-between gap-4 py-3 border-b
                         border-white/5 last:border-0"
            >
              <div>
                <p className="text-sm text-primary font-medium">{item.label}</p>
                <p className="text-2xs text-secondary mt-0.5">{item.desc}</p>
              </div>
              <Toggle checked={item.value} onChange={item.onChange} />
            </div>
          ))}
        </div>

        {/* Min deal score */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-sm text-secondary">Score Deal minimum pour alerte</label>
              <p className="text-2xs text-muted mt-0.5">
                Plus le score est élevé, moins tu recevras d&apos;alertes
              </p>
            </div>
            <span className="font-mono text-primary font-bold text-lg ml-4">{minScore}</span>
          </div>
          <input
            type="range"
            min={40}
            max={95}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-orange-500
                       bg-elevated"
          />
          <div className="flex justify-between text-2xs text-muted mt-1">
            <span>40 (tous)</span>
            <span>95 (top deals)</span>
          </div>
        </div>

        {/* Quiet hours */}
        <div className="mb-6">
          <label className="block text-sm text-secondary mb-3">
            Heures silencieuses
            <span className="text-muted ml-2">(pas de notifications pendant cette plage)</span>
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-2xs text-muted mb-1">De</p>
              <select
                value={quietStart}
                onChange={(e) => setQuietStart(Number(e.target.value))}
                className="w-full bg-elevated text-primary text-sm rounded-xl px-3 py-2.5
                           border border-white/8 focus:outline-none focus:border-orange-500/60"
              >
                {HOUR_LABELS.map((h, i) => (
                  <option key={i} value={i}>{h}</option>
                ))}
              </select>
            </div>
            <span className="text-secondary mt-4">→</span>
            <div className="flex-1">
              <p className="text-2xs text-muted mb-1">À</p>
              <select
                value={quietEnd}
                onChange={(e) => setQuietEnd(Number(e.target.value))}
                className="w-full bg-elevated text-primary text-sm rounded-xl px-3 py-2.5
                           border border-white/8 focus:outline-none focus:border-orange-500/60"
              >
                {HOUR_LABELS.map((h, i) => (
                  <option key={i} value={i}>{h}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveNotif}
          disabled={updateNotif.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500
                     hover:bg-orange-400 text-white text-sm font-semibold transition-colors
                     disabled:opacity-60"
        >
          {updateNotif.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {savedNotif ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </Section>
    </div>
  );
}
