/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // 'standalone' bundles the server + dependencies into .next/standalone/
  // — required for Node.js deployment on cPanel / VPS
  // Disabled for development — will re-enable for production builds
  // output: 'standalone',

  // Local /public assets only for next/image (avoids permissive remotePatterns in production)
  images: {
    remotePatterns: [],
    localPatterns: [
      { pathname: '/brand/**' },
      { pathname: '/uploads/logos/**' },
    ],
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  experimental: {
    // Tree-shake heavy packages (lucide-react omitted — can break icon resolution in some builds)
    optimizePackageImports: ['recharts', '@paypal/react-paypal-js'],
  },

  // Allow the app to know its own public URL at build-time (used for QR codes)
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://live-zapp.com',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
