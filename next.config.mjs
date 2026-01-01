/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  // Fix workspace root warning by explicitly setting Turbopack root
  experimental: {
    turbo: {
      root: '.',
    },
  },
}

export default nextConfig
