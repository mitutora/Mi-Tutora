import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  serverExternalPackages: ['firebase-admin'],
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'mitutora.in',
          },
        ],
        destination: 'https://www.mitutora.in/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
