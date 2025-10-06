import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Si no usas alias, puedes borrar todo el bloque webpack.
  webpack: (config) => {
    // ejemplo de alias raíz "@"
    config.resolve.alias['@'] = path.resolve(__dirname)
    return config
  },
}

export default nextConfig
