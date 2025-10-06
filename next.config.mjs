/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // opcional, pero útil en PaaS:
  experimental: { outputFileTracingRoot: __dirname },
};
module.exports = nextConfig;
