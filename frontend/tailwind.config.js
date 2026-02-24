/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          50: "#2a2a2a",
          100: "#232323",
          200: "#1e1e1e",
          300: "#1a1a1a",
          400: "#151515",
          500: "#111111",
          600: "#0d0d0d",
          700: "#0a0a0a",
          800: "#070707",
          900: "#030303",
        },
        accent: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
      },
      boxShadow: {
        "neo-sm":
          "4px 4px 8px rgba(0, 0, 0, 0.4), -2px -2px 6px rgba(255, 255, 255, 0.03)",
        neo: "6px 6px 12px rgba(0, 0, 0, 0.5), -3px -3px 8px rgba(255, 255, 255, 0.04)",
        "neo-lg":
          "8px 8px 16px rgba(0, 0, 0, 0.6), -4px -4px 10px rgba(255, 255, 255, 0.05)",
        "neo-inset":
          "inset 4px 4px 8px rgba(0, 0, 0, 0.4), inset -2px -2px 6px rgba(255, 255, 255, 0.03)",
        "glow-accent": "0 0 30px rgba(249, 115, 22, 0.35)",
        "glow-accent-sm": "0 0 16px rgba(249, 115, 22, 0.20)",
        /* Elevation system */
        "elevation-1":
          "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        "elevation-2":
          "0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.25)",
        "elevation-3":
          "0 12px 32px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(249,115,22,0.08)",
        /* Glass card shadow */
        glass:
          "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        "glass-lg":
          "0 16px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      keyframes: {
        "enter-up": {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "enter-scale": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "enter-fade": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "shimmer-sweep": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(249, 115, 22, 0.20)" },
          "50%": { boxShadow: "0 0 30px rgba(249, 115, 22, 0.35)" },
        },
      },
      animation: {
        "enter-up": "enter-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "enter-up-1":
          "enter-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards",
        "enter-up-2":
          "enter-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards",
        "enter-up-3":
          "enter-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards",
        "enter-up-4":
          "enter-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards",
        "enter-scale":
          "enter-scale 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "enter-fade": "enter-fade 0.3s ease forwards",
        float: "float 3s ease-in-out infinite",
        "shimmer-sweep": "shimmer-sweep 1.8s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.5s ease-in-out infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
        "bounce-out": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
