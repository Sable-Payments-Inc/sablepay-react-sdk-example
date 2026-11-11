const { NetworkConfig } = require('@sablepay/react-sablepay-js');

/**
 * Resolve the real SablePay API URL the same way the SDK does:
 * an explicit NEXT_PUBLIC_SABLEPAY_BASE_URL wins, otherwise the
 * sandbox / production default is chosen from the API key prefix.
 */
function resolveSablePayBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_SABLEPAY_BASE_URL;
  if (explicit) return explicit;

  const apiKey = process.env.NEXT_PUBLIC_SABLEPAY_API_KEY || '';
  return apiKey.includes('_sand_')
    ? NetworkConfig.BASE_URL_SANDBOX
    : NetworkConfig.BASE_URL_PRODUCTION;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // NEXT_PUBLIC_* env vars are exposed to client-side code automatically.

  // Proxy API calls to avoid CORS — browser hits /api/proxy/... on same origin,
  // Next.js forwards to the real backend server-side.
  async rewrites() {
    const target = resolveSablePayBaseUrl().replace(/\/+$/, '');

    return [
      {
        source: '/api/proxy/:path*',
        destination: `${target}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
