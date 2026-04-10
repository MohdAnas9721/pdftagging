/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#0f172a",
          panel: "#fffaf2",
          accent: "#0f766e",
          warm: "#f59e0b",
          rose: "#e11d48",
        },
      },
      fontFamily: {
        sans: ["Segoe UI", "Trebuchet MS", "sans-serif"],
        display: ["Trebuchet MS", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 60px rgba(15, 23, 42, 0.12)",
      },
      backgroundImage: {
        grid: "radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.16) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};
