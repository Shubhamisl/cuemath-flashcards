import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf2json is pure JS — no native deps, no worker tracing required.
  serverExternalPackages: ['pdf2json', '@napi-rs/canvas', 'pdfjs-dist'],
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
