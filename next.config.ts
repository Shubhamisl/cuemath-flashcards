import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  // pdfjs-dist dynamically imports its worker file at runtime. Because it's
  // an external package, Next doesn't trace the worker as a bundled asset —
  // so on Vercel the file is missing from /var/task and pdf-parse fails with
  // "Setting up fake worker failed". Force-include the worker so it lands
  // alongside the function bundle. Glob covers pnpm's hoisted layout.
  outputFileTracingIncludes: {
    '/api/ingest/[jobId]': [
      './node_modules/**/pdfjs-dist/legacy/build/pdf.worker.mjs',
    ],
  },
};

export default nextConfig;
