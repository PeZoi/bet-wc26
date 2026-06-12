import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 300, // Cache client-side các trang dynamic (SSR) trong 300 giây (5 phút) khi di chuyển qua lại
      static: 180,  // Cache client-side các trang static trong 180 giây
    }
  }
};

export default nextConfig;
