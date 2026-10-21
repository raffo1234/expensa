import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  transpilePackages: ["@react-pdf/renderer"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.freepik.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "http", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "s.yimg.com" },
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
