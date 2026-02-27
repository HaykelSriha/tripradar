import type { Metadata, Viewport } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TripRadar — Le bon plan, au bon moment.",
    template: "%s | TripRadar",
  },
  description:
    "Reçois des alertes dès qu'un vol pas cher vers ta destination préférée apparaît. Deals vols Europe en temps réel pour les jeunes Français.",
  keywords: [
    "vols pas chers",
    "bon plan voyage",
    "alerte prix vol",
    "Ryanair promo",
    "voyage Europe budget",
    "erasmus voyage",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://trigradar.fr",
    siteName: "TripRadar",
    title: "TripRadar — Le bon plan, au bon moment.",
    description: "Alertes vols pas chers en Europe pour les jeunes Français.",
    images: [
      {
        url: "https://trigradar.fr/og-default.png",
        width: 1200,
        height: 630,
        alt: "TripRadar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TripRadar — Le bon plan, au bon moment.",
    description: "Alertes vols pas chers en Europe pour les jeunes Français.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0A0B0F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
