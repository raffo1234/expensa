import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import webpack from "webpack";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // 1. Transpilar paquetes que usan sintaxis de Node o ESM específica
  transpilePackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.freepik.com" },
      { protocol: "https", hostname: "**.supabase.co" }, // Acepta cualquier subdominio de Supabase
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "http", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "s.yimg.com" },
      { protocol: "https", hostname: "storage.cadia.pe" },
      { protocol: "https", hostname: "storage.cadia.cc" },
    ],
  },
  experimental: {
    esmExternals: "loose",
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Indicamos a Webpack que ignore estos módulos en el navegador
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
