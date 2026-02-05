import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      fontFamily: {
        display: ["'Sora'", "ui-sans-serif", "system-ui"],
        body: ["'IBM Plex Sans'", "ui-sans-serif", "system-ui"]
      },
      colors: {
        ink: {
          900: "#121318",
          700: "#2A2E38",
          500: "#4A5162",
          300: "#8B93A7"
        },
        mist: {
          50: "#F7F7FB",
          100: "#EEEFF7",
          200: "#DADFF0"
        },
        accent: {
          500: "#FF7A59",
          600: "#F56643"
        }
      },
      boxShadow: {
        card: "0 20px 60px rgba(22, 25, 34, 0.15)",
        glow: "0 10px 30px rgba(255, 122, 89, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
