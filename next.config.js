/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' bundles the server + dependencies into .next/standalone/
  // — required for Node.js deployment on cPanel / VPS
  // Disabled for development — will re-enable for production builds
  // output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Allow the app to know its own public URL at build-time (used for QR codes)
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://www.livezapp.com',
  },
}

module.exports = nextConfig
