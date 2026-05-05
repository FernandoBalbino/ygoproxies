import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/generate-card": [
      "./public/assets/ygocarder/asset/image/**/*",
      "./public/assets/ygocarder/asset/font/**/*",
    ],
  },
};

export default nextConfig;
