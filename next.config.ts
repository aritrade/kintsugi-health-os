import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The workspace contains multiple lockfiles; pin tracing to this project.
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
