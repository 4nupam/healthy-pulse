/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4 scans these paths for class usage
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ── Brand Palette ───────────────────────────────────────────
        scanner: {
          bg: "#0f172a",       // Slate 900 — deep dark background
          surface: "#1e293b",  // Slate 800 — card surfaces
          border: "#334155",   // Slate 700 — subtle borders
          text: "#f8fafc",     // Slate 50 — primary text
          muted: "#94a3b8",    // Slate 400 — secondary text
          accent: "#22d3ee",   // Cyan 400 — primary accent
        },
        // ── Macro Card Colors ───────────────────────────────────────
        macro: {
          calories: {
            bg: "#064e3b",     // Emerald 900
            text: "#6ee7b7",   // Emerald 300
            accent: "#10b981", // Emerald 500
          },
          protein: {
            bg: "#4c0519",     // Rose 950
            text: "#fda4af",   // Rose 300
            accent: "#f43f5e", // Rose 500
          },
          carbs: {
            bg: "#451a03",     // Amber 950
            text: "#fcd34d",   // Amber 300
            accent: "#f59e0b", // Amber 500
          },
          fat: {
            bg: "#0c4a6e",     // Sky 900
            text: "#7dd3fc",   // Sky 300
            accent: "#0ea5e9", // Sky 500
          },
        },
      },
      fontFamily: {
        sans: ["Inter", "System"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};
