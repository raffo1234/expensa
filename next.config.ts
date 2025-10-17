import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  transpilePackages: ["@react-pdf/renderer"], //dynamic import on Vercel ESM packages
  images: {
    remotePatterns: [
      new URL("https://img.freepik.com/free-vector/**"),
      new URL("https://bzhqohtiptcvesotbvgh.supabase.co/storage/v1/object/public/**"),
      new URL("https://ihykrbwvzhpvedkygqfk.supabase.co/storage/v1/object/public/**"),
      new URL("https://lh3.googleusercontent.com/**"),
      new URL("https://s.yimg.com/ag/**"),
      new URL("https://storage.cadia.pe/dicom/**"),
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
};

export default withNextIntl(nextConfig);
