import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/backend/:path*",
          destination: "https://webeducation.onrender.com/api/:path*",
        },
      ],
    };
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
