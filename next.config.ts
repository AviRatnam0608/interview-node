import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true, // This line ignores ESLint errors during the build process
  },
};

export default nextConfig;
