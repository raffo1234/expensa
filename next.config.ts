import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // 1. Cabeceras CORS para permitir a OHIF acceder a la API
  async headers() {
    return [
      {
        // Aplica a todas las rutas bajo /api/dicom-json/
        source: "/api/dicom-json/:path*",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "https://viewer.ohif.org" },
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

  // 2. Transpilar paquetes que usan sintaxis de Node o ESM específica
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
