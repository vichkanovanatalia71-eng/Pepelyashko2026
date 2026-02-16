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
        "glow-accent": "0 0 20px rgba(249, 115, 22, 0.15)",
      },
    },
  },
  plugins: [],
};
