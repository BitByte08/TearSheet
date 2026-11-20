import type { NextConfig } from "next";

// Cloudflare Pages 에 올릴 정적 사이트 (out/ 폴더)
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
