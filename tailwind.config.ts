import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        caja: { DEFAULT: "#0047AB", medio: "#0072C6", header: "#00529B", acento: "#F9A825", fondo: "#F7F7F7", borde: "#D6E4F5", texto: "#1A1A1A", noche: "#071A33" },
        arena: { DEFAULT: "#F6E7C8", clara: "#FBF4E6", oscura: "#E8CF9E" },
        // Tokens con nombres de shadcn para que los componentes de cult-ui funcionen sin tocarlos
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        border: "hsl(var(--border))",
      },
      fontFamily: {
        display: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Display"', '"Plus Jakarta Sans Variable"', "system-ui", "sans-serif"],
        sans: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', '"Plus Jakarta Sans Variable"', "system-ui", "sans-serif"],
      },
      borderRadius: { tarjeta: "14px" },
    },
  },
  plugins: [],
} satisfies Config;
