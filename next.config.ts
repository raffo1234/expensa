import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // ponytail: excludes /api/* — COEP there broke the browser's native
        // PDF viewer on direct file links (chrome-extension pdf viewer frame
        // isn't COEP-compatible); only pages rendering cornerstone.js need this
        source: "/((?!api/).*)",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/api/dicom-json/:path*",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
    ];
  },

  transpilePackages: ["@react-pdf/renderer"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.freepik.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "http", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "s.yimg.com" },
      { protocol: "https", hostname: "storage.cadia.pe" },
      { protocol: "https", hostname: "storage.cadia.cc" },
      { protocol: "https", hostname: "pub-c3fce7daeb3b43b5b514e48bccee2153.r2.dev" },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
