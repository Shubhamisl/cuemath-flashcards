import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These server packages include native assets or runtime-loaded modules.
  serverExternalPackages: ['pdf2json', '@napi-rs/canvas'],
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
