/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 🔒 Evita que Next intente usar TypeScript en el build
  typescript: { ignoreBuildErrors: true },
  // (opcional, evita que ESLint tumbe el build)
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
