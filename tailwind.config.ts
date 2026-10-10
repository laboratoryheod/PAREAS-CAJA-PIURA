import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        caja: { DEFAULT: "#0047AB", medio: "#0072C6", header: "#00529B", acento: "#F9A825", fondo: "#F7F7F7", borde: "#D6E4F5", texto: "#1A1A1A" },
      },
      borderRadius: { tarjeta: "14px" },
    },
  },
  plugins: [],
} satisfies Config;
