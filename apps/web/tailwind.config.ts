import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds ──────────────────────────────────────────────────────
        base: "#0A0B0F",
        card: "#13141A",
        elevated: "#1C1D26",
        border: "rgba(255,255,255,0.06)",

        // ── Brand Orange ─────────────────────────────────────────────────────
        orange: {
          300: "#FFAD88",
          400: "#FF8B55",
          500: "#FF6B35",
          600: "#E05520",
        },

        // ── Violet accent ─────────────────────────────────────────────────────
        violet: {
          400: "#A78BFA",
          500: "#7C3AED",
          600: "#6D28D9",
        },

        // ── Text ──────────────────────────────────────────────────────────────
        primary: "#F1F2F6",
        secondary: "#8B8FA8",
        muted: "#4B4F6B",

        // ── Semantic ──────────────────────────────────────────────────────────
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
      },

      fontFamily: {
        display: ["var(--font-syne)", "sans-serif"],
        sans: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },

      fontSize: {
        "2xs": ["10px", { lineHeight: "14px" }],
      },

      backgroundImage: {
        "page-gradient":
          "radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #0A0B0F 60%)",
        "deal-hot":
          "linear-gradient(135deg, #FF6B35 0%, #FF1744 100%)",
        "deal-good":
          "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)",
        "deal-fair":
          "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
        "card-shine":
          "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 60%)",
      },

      borderRadius: {
        "4xl": "2rem",
      },

      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "fade-up": "fadeUp 0.4s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
      },

      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
