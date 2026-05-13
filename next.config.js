/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript checking for deployment
  typescript: {
    ignoreBuildErrors: true
  },
  // Next.js 16 moved this out of `experimental`
  serverExternalPackages: []
}

module.exports = nextConfig
