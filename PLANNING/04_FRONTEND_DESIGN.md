# TripRadar — Frontend Design

---

## 1. Design Philosophy

**Vibe**: Premium travel app meets midnight deal-hunter. Dark, vibrant, high-contrast — not another generic blue SaaS tool. Think Airbnb × Revolut × Skyscanner's best moments, but with a distinctly French energy.

**Principles**:
- **Clarity first**: Price and deal score are always the hero — big, impossible to miss
- **Urgency cues**: "Valid for 4h 23min" timers, "🔥 Hot" badges — create FOMO without being spammy
- **Frictionless**: From app open to "book" in ≤ 3 taps
- **Mobile-first**: Most users discover on phone, may book on desktop
- **French tone of voice**: "Départ flexible ✓", "Plan du week-end ✓", tutoiement

---

## 2. Design System

### Color Palette

```
Background (Dark mode primary):
  bg-base:    #0A0B0F   ← near-black, not pure black (easier on eyes)
  bg-card:    #13141A   ← card surface
  bg-elevated:#1C1D26   ← modals, dropdowns

Accent (Brand):
  orange-500: #FF6B35   ← primary CTA, "hot deal" badges
  orange-400: #FF8B55   ← hover states
  orange-300: #FFAD88   ← light text on dark

Neon accent (secondary):
  violet-500: #7C3AED   ← "deal score" gradient start
  blue-500:   #3B82F6   ← deal score gradient end

Semantic:
  success:    #22C55E   ← savings percentage (green = money saved)
  warning:    #F59E0B   ← "fair" deal tier
  error:      #EF4444   ← error states

Text:
  text-primary:   #F1F2F6   ← main text
  text-secondary: #8B8FA8   ← metadata, labels
  text-muted:     #4B4F6B   ← placeholder, disabled

Gradients:
  deal-hot:   linear-gradient(135deg, #FF6B35, #FF1744)
  deal-good:  linear-gradient(135deg, #7C3AED, #3B82F6)
  background: radial-gradient(ellipse at top, #1a0a2e 0%, #0A0B0F 60%)
```

### Typography

```
Font stack:
  Display (hero prices, city names): "Space Grotesk" — geometric, modern
  Body:                               "Inter" — clean, readable at small sizes
  Mono (prices, scores):             "JetBrains Mono" — for numbers

Scale (Tailwind custom):
  text-2xs:  10px  — badges, fine print
  text-xs:   12px  — metadata
  text-sm:   14px  — body secondary
  text-base: 16px  — body primary
  text-lg:   18px  — card titles
  text-xl:   20px  — section headers
  text-2xl:  24px
  text-3xl:  30px  — deal prices (hero)
  text-4xl:  36px
  text-5xl:  48px  — homepage headline
```

### Component Token Examples

```css
/* Deal Score Ring */
.score-ring-hot   { --ring-color: #FF6B35; }
.score-ring-good  { --ring-color: #7C3AED; }
.score-ring-fair  { --ring-color: #F59E0B; }

/* Card glass effect */
.deal-card {
  background: rgba(19, 20, 26, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
}
```

---

## 3. Web App (Next.js 14)

### Pages / Routes

```
/                         → Home (hero + top deals today)
/deals                    → Deal feed (filterable list)
/deals/[id]               → Deal detail
/inspire                  → "Inspire me" — random discovery
/alerts                   → My alerts history
/watchlist                → My watchlist management
/preferences              → Notification & trip preferences
/auth/login               → Login
/auth/register            → Register
/auth/callback            → OAuth callback
```

### Homepage Layout

```
┌─────────────────────────────────────────────────────────┐
│  NAVBAR                                                  │
│  [✈ TripRadar]          [Se connecter]  [Télécharger]  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                                                         │
│   Les meilleurs deals                                   │
│   d'Europe, en temps réel.                              │
│                                                         │
│   [Paris ▼]  [Budget max ▼]  [Dates flexibles ▼]       │
│   [────────────── Trouver un deal ──────────────]       │
│                                                         │
│              ·  ·  ·  (animated plane)                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  🔥 DEALS DU JOUR                              Voir tout │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ DEAL HOT │  │ DEAL HOT │  │GOOD DEAL │             │
│  │ PRG  🇨🇿 │  │ LIS  🇵🇹 │  │ BCN  🇪🇸 │             │
│  │          │  │          │  │          │             │
│  │   34€    │  │   49€    │  │   67€    │             │
│  │ -61% avg │  │ -48% avg │  │ -32% avg │             │
│  │ ⭐ 87    │  │ ⭐ 81    │  │ ⭐ 74    │             │
│  │ 15→18mar │  │ 22→25mar │  │ 8→11avr  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  HOW IT WORKS — 3 étapes                                │
│  1. Configure tes préférences   2. On surveille    3. Tu pars │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  📱 Télécharge l'app                                    │
│  [Google Play]  [App Store bientôt]                     │
└─────────────────────────────────────────────────────────┘
```

### Deal Card Component

```
┌─────────────────────────────────────┐
│ 🔥 DEAL CHAUD          [♡ Sauver]  │   ← tier badge + bookmark
│─────────────────────────────────────│
│  [destination image — 16:9 ratio]  │
│                              🇨🇿   │   ← flag overlay (bottom right)
│─────────────────────────────────────│
│  Paris → Prague                    │   ← Space Grotesk, text-lg
│  ✈️ Direct · Ryanair               │   ← text-xs, text-secondary
│─────────────────────────────────────│
│                                     │
│   34€    ████ -61% vs moy.         │   ← price hero + savings badge
│   ──────                           │
│   ~~89€~~                          │   ← strikethrough avg
│                                     │
│  📅 15 mar → 18 mar (3 nuits)      │
│                                     │
│  Deal Score ●━━━━━━━━━━━  87/100   │   ← animated progress arc
│                                     │
│  [───── VOIR LE DEAL ─────]        │   ← CTA button (orange gradient)
│                        ⏱ 4h 12min │   ← countdown timer
└─────────────────────────────────────┘
```

### Deal Feed Page

```
┌─────────────────────────────────────────────────────────┐
│  Tous les deals                                         │
│                                                         │
│  FILTRES:                                               │
│  [Paris ▼] [Destination ▼] [Budget ▼] [Durée ▼] [Score▼]│
│  Tri: [Score ▼]  [Prix ▼]  [Économies ▼]               │
│                                                         │
│  ── 42 deals trouvés ──────────────────────────────────│
│                                                         │
│  [DEAL CARD GRID — 3 col desktop, 2 col tablet, 1 mobile]│
│                                                         │
│  [Charger plus...]                                      │
└─────────────────────────────────────────────────────────┘
```

### Deal Detail Page

```
┌─────────────────────────────────────────────────────────┐
│  ← Retour                                               │
│                                                         │
│  [HERO IMAGE — destination panorama, full width]        │
│                                                         │
│  🔥 Paris → Prague                                      │
│  ██████████████████████████                            │
│                                                         │
│  ┌───────────────────┐  ┌──────────────────────────┐   │
│  │  34€              │  │  Deal Score               │   │
│  │  aller-retour     │  │  ┌─────────────────┐      │   │
│  │  ~~89€~~ (-61%)   │  │  │    ( 87 )       │      │   │
│  │                   │  │  │  ●━━━━━━━━━━━   │      │   │
│  │  ✈️ Direct        │  │  └─────────────────┘      │   │
│  │  Ryanair          │  │  HOT DEAL 🔥              │   │
│  └───────────────────┘  └──────────────────────────┘   │
│                                                         │
│  📅 Dates                                               │
│  Aller:  Sam. 15 mars · 07:30 → 09:45  (2h15)         │
│  Retour: Mar. 18 mars · 21:00 → 23:15  (2h15)         │
│  Durée:  3 nuits                                       │
│                                                         │
│  📊 Historique des prix (30 derniers jours)            │
│  [LINE CHART — price timeline for CDG→PRG route]       │
│  "Ce prix est dans les 5% les moins chers enregistrés" │
│                                                         │
│  🏨 Hébergements recommandés                           │
│  ┌──────┐ ┌──────┐ ┌──────┐                           │
│  │ 18€/n│ │ 22€/n│ │ 29€/n│                           │
│  │ ⭐4.2│ │ ⭐4.5│ │ ⭐4.7│                           │
│  └──────┘ └──────┘ └──────┘                           │
│  Budget total estimé : 34 + 54 (3n×18€) = ~88€        │
│                                                         │
│  🌤️ Météo prévue · Prague · 15 mars                    │
│  8°C · Ensoleillé partiellement                        │
│                                                         │
│  [──────────── RÉSERVER CE VOL ─────────────]          │
│  Redirige vers Ryanair.com (lien affilié)              │
│                                                         │
│  [Partager]  [Ajouter à ma liste]                      │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Mobile App (React Native + Expo)

### Tech Stack

```
expo: ~51.0.0
react-native: 0.74
expo-router: 3.x         ← file-based routing (like Next.js App Router)
nativewind: 4.x          ← TailwindCSS for React Native
@tanstack/react-query    ← data fetching
expo-notifications       ← local + push notification handling
expo-secure-store        ← JWT token storage (encrypted)
react-native-reanimated  ← animations (deal score ring, card animations)
react-native-svg         ← score ring, price charts
victory-native           ← price history charts
@gorhom/bottom-sheet     ← filter sheets, deal detail sheet
```

### Mobile Navigation (Expo Router)

```
app/
├── (auth)/
│   ├── login.tsx
│   └── register.tsx
├── (tabs)/
│   ├── _layout.tsx       ← Tab bar definition
│   ├── index.tsx         ← Home feed
│   ├── explore.tsx       ← "Inspire me" / map
│   ├── alerts.tsx        ← Notification history
│   └── profile.tsx       ← Preferences + settings
├── deal/
│   └── [id].tsx          ← Deal detail (pushed on stack)
└── onboarding/
    └── index.tsx          ← First launch: set preferences
```

### Mobile Tab Bar

```
┌─────────────────────────────────────────────┐
│                                             │
│        [  screen content  ]                │
│                                             │
├─────────┬──────────┬──────────┬────────────┤
│  🏠     │  🧭      │  🔔      │  👤        │
│  Deals  │  Explorer│  Alertes │  Profil    │
└─────────┴──────────┴──────────┴────────────┘
```

### Mobile Home Feed

```
┌────────────────────────────┐
│ status bar                 │
│────────────────────────────│
│ 🌍 TripRadar          🔔  │
│ Paris · Bonjour Haykel    │
│────────────────────────────│
│ [────── Chercher ──────]  │
│ 🛫 Départ · Budget · Dates│
│────────────────────────────│
│ 🔥 DEALS DU JOUR          │
│                            │
│ ┌──────────────────────┐  │
│ │ [destination image]  │  │
│ │ Paris → Prague  🇨🇿  │  │
│ │                      │  │
│ │  34€      ⭐87       │  │
│ │  -61% 🔥            │  │
│ │  15→18 mars · Direct│  │
│ │  [VOIR LE DEAL]     │  │
│ └──────────────────────┘  │
│                            │
│ ┌──────────────────────┐  │
│ │ [destination image]  │  │
│ │ Paris → Lisbonne 🇵🇹 │  │
│ │  49€      ⭐81       │  │
│ │  -48%               │  │
│ └──────────────────────┘  │
│                            │
│ BONNES AFFAIRES           │
│ [horizontal scroll]        │
│  ┌────┐ ┌────┐ ┌────┐    │
│  │ 67€│ │ 54€│ │ 79€│   │
│  │BCN │ │BER │ │BUD │    │
│  └────┘ └────┘ └────┘    │
└────────────────────────────┘
```

### Mobile Deal Detail (Stack Screen)

```
┌────────────────────────────┐
│ [← Retour]                 │
│────────────────────────────│
│ [HERO IMAGE - full width]  │
│ Paris → Prague 🇨🇿         │
│ 🔥 DEAL CHAUD              │
│────────────────────────────│
│                            │
│   34€                      │  ← 48px, Space Grotesk Bold
│   aller-retour             │
│   ~~89€~~ · -61%          │
│                            │
│ ┌──────────────────────┐   │
│ │  Score  (87)  ●━━━   │   │  ← animated ring
│ └──────────────────────┘   │
│                            │
│ ✈️ Direct · Ryanair        │
│ 15 mars 07:30 → 09:45     │
│ 3 nuits                   │
│                            │
│ [Prix sur 30 jours chart]  │
│                            │
│ 🏨 Hébergements            │
│ À partir de 18€/nuit       │
│                            │
│ 🌤 8°C · Ensoleillé        │
│────────────────────────────│
│ [─── RÉSERVER — 34€ ───]  │  ← sticky bottom CTA
└────────────────────────────┘
```

### Onboarding Flow (First Launch)

```
Screen 1: Welcome
  "Trouve tes prochaines aventures"
  [Commencer →]

Screen 2: Departure airports
  "D'où pars-tu habituellement ?"
  [Multi-select chips: CDG · ORY · LYS · MRS · ...]
  [→ Suivant]

Screen 3: Dream destinations
  "Quelles destinations te font rêver ?"
  [Scrollable grid with flags + city names]
  [Skip · → Suivant]

Screen 4: Budget
  "Quel est ton budget max ?"
  [Slider: 30€ ──●────── 500€]
  → Current: 150€

Screen 5: Flexibility
  "Jusqu'à quand tu peux être flexible ?"
  [± 3 jours · ± 1 semaine · ± 2 semaines · Très flexible]

Screen 6: Notifications
  [Enable Notifications?]
  "Pour ne jamais manquer un deal."
  [Activer les notifs ✓]
  [Plus tard]

Screen 7: Done
  "Tu es prêt à décoller ! 🚀"
  [Voir mes deals →]
```

---

## 5. Shared Component Library (`packages/ui`)

### Key Components

```typescript
// DealCard (web + mobile variants)
<DealCard
  deal={deal}
  variant="vertical" | "horizontal" | "mini"
  onBookmark={fn}
  onPress={fn}
/>

// DealScoreRing
<DealScoreRing
  score={87}
  tier="hot" | "good" | "fair"
  size={80}
  animated
/>

// SavingsBadge
<SavingsBadge percentage={61} />
// → renders "-61% 🔥" with gradient background

// PriceChart
<PriceChart
  data={priceHistory}
  currentPrice={34}
  averagePrice={89}
/>

// DealTimer
<DealTimer validUntil={deal.valid_until} />
// → "Expire dans 4h 23min" with pulse animation

// FilterSheet (mobile bottom sheet)
<FilterSheet
  filters={activeFilters}
  onChange={setFilters}
/>
```

---

## 6. Animations & Motion

```typescript
// Deal card entrance animation (Framer Motion — web)
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" }
  })
}

// Score ring fill (React Native Reanimated)
// SVG circle strokeDashoffset animates from 100% → (100 - score)%
// Color transitions: grey → violet/blue (good) → orange/red (hot)

// Deal card long-press haptic feedback (mobile)
// Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

// Hot deal pulse badge
// CSS: animation: pulse 2s ease-in-out infinite
```

---

## 7. Key UX Decisions

| Decision | Rationale |
|---|---|
| Dark mode only (MVP) | Target demo skews night-owl, dark = premium feel |
| French language only (MVP) | Focus wins over i18n complexity |
| Price as the hero element | Users scan for price first — make it 48px bold |
| Countdown timer on deals | Real FOMO without deception (prices do change) |
| "Inspire me" feature | Many users don't have a destination in mind |
| Score ring visualisation | Builds trust: transparent about WHY it's a deal |
| Bottom sheet filters (mobile) | Native feel, no navigation stack overhead |
| Affiliate links (not iframes) | Simpler, fewer legal issues, faster implementation |
