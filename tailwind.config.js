/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#f5f1eb",
        ink: "#1f2937",
        cafe: {
          50: "#fbf8f4",
          100: "#f6efe5",
          200: "#ead9c4",
          300: "#ddbc95",
          400: "#c99762",
          500: "#b57d45",
          600: "#9e6535",
          700: "#7f4e2c",
          800: "#5e3a24",
          900: "#3c2618"
        },
        status: {
          healthy: "#16a34a",
          low: "#f59e0b",
          critical: "#dc2626",
          offline: "#64748b",
          synced: "#0891b2"
        }
      },
      boxShadow: {
        soft: "0 12px 32px rgba(15, 23, 42, 0.08)"
      },
      borderRadius: {
        "2xl": "1.25rem"
      }
    }
  },
  plugins: []
};
