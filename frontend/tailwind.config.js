/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        soc: {
          950: "#080C14",
          900: "#0D1424",
          850: "#111A2E",
          800: "#18233C",
          700: "#243354",
        },
        risk: {
          safe: "#10B981",
          low: "#14B8A6",
          suspicious: "#F59E0B",
          high: "#F97316",
          malicious: "#EF4444",
          critical: "#DC2626",
        },
      },
    },
  },
  plugins: [],
};
