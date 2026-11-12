import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  devIndicators: false,
  distDir: process.env.REGALANDO_BUILD_DIR || ".next",
  async headers() {
    return [{ source: "/invite/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
