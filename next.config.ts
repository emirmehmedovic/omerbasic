import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Skip ESLint during production builds (CI) to prevent warnings from failing the build
    ignoreDuringBuilds: true,
  },
  images: {
    // Allow placeholder images from placehold.co
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
    // Increase the device sizes for better responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Disable image optimization for local development to speed up builds
    // In production, Next.js will optimize images from public/
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;
