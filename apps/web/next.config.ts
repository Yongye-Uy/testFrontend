import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/user-service/:path*",
        destination: `${process.env.NEXT_PUBLIC_USER_SERVICE_URL ?? "http://localhost:8080"}/:path*`,
      },
      {
        source: "/api/course-service/:path*",
        destination: `${process.env.NEXT_PUBLIC_COURSE_SERVICE_URL ?? "http://localhost:8081"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
