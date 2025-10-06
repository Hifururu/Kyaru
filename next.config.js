/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // No rompas el build si falta TypeScript o hay errores
    ignoreBuildErrors: true,
  },
  eslint: {
    // No correr ESLint en el build de producción (Cloudflare)
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Evita checks de rutas tipadas en prod
    typedRoutes: false,
  },
};

export default nextConfig;
