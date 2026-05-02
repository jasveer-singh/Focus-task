import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Cormorant Garamond'", "'Tiempos Headline'", "Georgia", "serif"],
        sans:    ["'Inter'", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono:    ["'JetBrains Mono'", "ui-monospace", "monospace"]
      },
      colors: {
        // ── Canvas & surfaces ──────────────────────────────────────────────
        canvas:  "#faf9f5",
        surface: {
          soft:          "#f5f0e8",
          card:          "#efe9de",
          cream:         "#e8e0d2",
          dark:          "#181715",
          "dark-elevated": "#252320",
          "dark-soft":   "#1f1e1b"
        },
        // ── Text ───────────────────────────────────────────────────────────
        ink: {
          DEFAULT: "#141413",
          strong:  "#252523",
          body:    "#3d3d3a",
          muted:   "#6c6a64",
          soft:    "#8e8b82"
        },
        "on-dark": {
          DEFAULT: "#faf9f5",
          soft:    "#a09d96"
        },
        // ── Brand accent (coral) ───────────────────────────────────────────
        coral: {
          DEFAULT:  "#cc785c",
          active:   "#a9583e",
          disabled: "#e6dfd8"
        },
        // ── Borders ────────────────────────────────────────────────────────
        hairline: {
          DEFAULT: "#e6dfd8",
          soft:    "#ebe6df"
        },
        // ── Secondary accents ──────────────────────────────────────────────
        teal:    "#5db8a6",
        amber:   "#e8a55a",
        success: "#5db872",
        warning: "#d4a017",
        error:   "#c64545",

        // ── Legacy aliases (keep so non-redesigned components don't break) ─
        mist: { 50: "#f5f0e8", 100: "#efe9de", 200: "#e6dfd8" },
        accent: { 500: "#cc785c", 600: "#a9583e" }
      },
      borderRadius: {
        xs:   "4px",
        sm:   "6px",
        md:   "8px",
        lg:   "12px",
        xl:   "16px",
        pill: "9999px",
        full: "9999px"
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(20,20,19,0.08)",
        // keep old names mapped to subtle so existing shadow-card classes still work
        card:   "0 1px 3px rgba(20,20,19,0.08)",
        glow:   "0 0 0 3px rgba(204,120,92,0.18)"
      }
    }
  },
  plugins: []
};

export default config;
