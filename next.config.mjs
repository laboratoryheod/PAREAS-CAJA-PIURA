/** @type {import('next').NextConfig} */
const nextConfig = {
  // Paquetes nativos o pesados que solo corren en el servidor: no se empaquetan
  serverExternalPackages: ["better-sqlite3", "exceljs"],
  experimental: {
    // Importa solo lo que se usa de estas librerías (menos JS en el navegador)
    optimizePackageImports: ["lucide-react", "motion"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  compiler: {
    // En producción se quitan los console.log (se mantienen los errores y advertencias)
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  poweredByHeader: false,
  async headers() {
    // Imágenes y fuentes propias: caché larga en el navegador
    return [{ source: "/:carpeta(pareas|caja)/:archivo*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] }];
  },
};
export default nextConfig;
