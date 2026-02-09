/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile the local SDK package
  transpilePackages: ['@sablepay/sdk'],

  // Proxy API calls to avoid CORS — browser hits /api/proxy/... on same origin,
  // Next.js forwards to the real backend server-side.
  async rewrites() {
    const baseUrl = process.env.NEXT_PUBLIC_SABLEPAY_BASE_URL || '';
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
