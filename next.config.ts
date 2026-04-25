import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf2json is pure JS — no native deps, no worker tracing required.
  serverExternalPackages: ['pdf2json'],
};

export default nextConfig;
