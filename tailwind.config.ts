import type { Config } from "tailwindcss";

export default {
  // Tailwind fornisce solo il reset (preflight): gli stili dell'app sono in app/globals.css.
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
} satisfies Config;
