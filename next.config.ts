import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Skip ESLint during production builds (CI) to prevent warnings from failing the build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
