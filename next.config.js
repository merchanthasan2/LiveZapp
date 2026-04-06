/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' bundles the server + dependencies into .next/standalone/
  // — required for Node.js deployment on cPanel / VPS
  // Disabled for development — will re-enable for production builds
  // output: 'standalone',

  // Local /public assets only for next/image (avoids permissive remotePatterns in production)

  experimental: {
    // Tree-shake heavy packages (lucide-react omitted — can break icon resolution in some builds)
    optimizePackageImports: ['recharts', '@paypal/react-paypal-js'],
  },

  // Allow the app to know its own public URL at build-time (used for QR codes)
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://www.live-zapp.com',
  },
}

module.exports = nextConfig
