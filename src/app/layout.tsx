import type { Metadata } from "next";
import "./globals.css";
import GlobalModal from "@/components/GlobalModal";
import { SWRConfig } from "swr";
import { fetchAllPermissionsServer, prefetchPermissionServer } from "@/utils/serverPermissions";
import { Toaster } from "react-hot-toast";
import { ReactScan } from "@/components/ReactScan";
import Slider from "@/components/Slider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import Providers from "@/components/Providers";
import { Cormorant, Manrope } from "next/font/google";

const siteName = "Finolis";
const title = "Finolis - Gestión de Gastos Inteligente";
const description =
  "Registra, organiza y analiza tus gastos en un solo lugar. Facturas, adjuntos y reportes en tiempo real.";

const url = "https://expensa-sigma.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title,
  description,
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title,
    description,
    url: url,
    siteName: siteName,
    images: [
      {
        url: "/expensa-hero.png?v=2",
        width: 1200,
        height: 630,
        alt: `${title} - ${description}`,
      },
    ],
    type: "website",
  },
};

interface LayoutProps {
  children: React.ReactNode;
}

const cormorant = Cormorant({
  subsets: ["latin"],
  variable: "--font-title",
  weight: ["300", "400", "500", "600"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export default async function Layout({ children }: Readonly<LayoutProps>) {
  const messages = await getMessages();
  const locale = await getLocale();
  const initialPermissions = {};
  const permissionSlugs = await fetchAllPermissionsServer();

  for (const slug of permissionSlugs) {
    const permissionData = await prefetchPermissionServer(slug);
    Object.assign(initialPermissions, permissionData);
  }

  return (
    <html lang={locale} className={`${cormorant.variable} ${manrope.variable}`}>
      <head>
        <meta property="og:logo" content="https://expensa-sigma.vercel.app/expensa-hero.png" />
      </head>
      <body
        style={{ backgroundImage: "url('/shapes.webp')", backgroundSize: "cover" }}
        className="bg-gray-50 font-sans"
      >
        <Toaster toastOptions={{ className: "text-xs" }} />
        <ReactScan />
        <Providers>
          <SWRConfig value={{ fallback: initialPermissions }}>
            <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
          </SWRConfig>
          <GlobalModal />
          <Slider />
        </Providers>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
