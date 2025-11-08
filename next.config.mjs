/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Skip ESLint during production builds (CI) to prevent warnings from failing the build
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fsn1.your-objectstorage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
