import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These server packages include native assets or runtime-loaded modules.
  serverExternalPackages: ['pdf2json', '@napi-rs/canvas', 'pdfjs-dist'],
  outputFileTracingIncludes: {
    '/api/ingest/*': [
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
    ],
  },
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
