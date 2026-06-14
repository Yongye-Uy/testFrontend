import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["@mui/icons-material", "framer-motion"],
  },
  async rewrites() {
    const kongUrl = process.env.NEXT_PUBLIC_KONG_URL ?? "http://localhost:8000";

    return [
      {
        source: "/api/courses/:path*",
        destination: `${kongUrl}/api/courses/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${kongUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
