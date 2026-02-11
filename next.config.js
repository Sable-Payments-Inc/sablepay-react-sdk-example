/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile the local SDK package
  transpilePackages: ['@sablepay/react-sablepay-js'],

  // Expose PUBLIC_* env vars to client-side code
  // (Next.js only auto-exposes NEXT_PUBLIC_* by default)
  env: {
    PUBLIC_SABLEPAY_API_KEY: process.env.PUBLIC_SABLEPAY_API_KEY,
    PUBLIC_SABLEPAY_MERCHANT_ID: process.env.PUBLIC_SABLEPAY_MERCHANT_ID,
    PUBLIC_SABLEPAY_BASE_URL: process.env.PUBLIC_SABLEPAY_BASE_URL,
  },

  // Proxy API calls to avoid CORS — browser hits /api/proxy/... on same origin,
  // Next.js forwards to the real backend server-side.
  async rewrites() {
    const baseUrl = process.env.PUBLIC_SABLEPAY_BASE_URL || '';
    // Strip trailing slash
    const target = baseUrl.replace(/\/+$/, '');

    return [
      {
        source: '/api/proxy/:path*',
        destination: `${target}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
