/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        base: "#0A0B0F",
        card: "#13141A",
        elevated: "#1C1D26",
        primary: "#F1F2F6",
        secondary: "#8B8FA8",
        muted: "#4B4F6B",
        orange: {
          300: "#FFAD88",
          400: "#FF8B55",
          500: "#FF6B35",
        },
        violet: {
          400: "#A78BFA",
          500: "#7C3AED",
        },
        success: "#22C55E",
      },
      fontFamily: {
        display: ["SpaceGrotesk_700Bold"],
        sans: ["Inter_400Regular"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
        mono: ["JetBrainsMono_400Regular"],
      },
    },
  },
  plugins: [],
};
