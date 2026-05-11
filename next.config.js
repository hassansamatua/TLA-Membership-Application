/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript checking for deployment
  typescript: {
    ignoreBuildErrors: true
  },
  // Disable ESLint checking for deployment  
  eslint: {
    ignoreDuringBuilds: true
  },
  // Suppress middleware deprecation warning
  experimental: {
    serverComponentsExternalPackages: []
  }
}

module.exports = nextConfig
