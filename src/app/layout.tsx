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

const title = "Cadia - Encuentra la Claridad para tu Diagnóstico";
const description =
  "Segunda Opinión Experta para Tomografía, Resonancia y Rayos X. Obtén la certeza que necesitas en menos de 24 horas";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cadia.cc/"),
  title,
  description,
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title,
    description,
    url: "https://www.cadia.cc/",
    siteName: "CADIA",
    images: [
      {
        url: "/radiologist.png",
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
    <html lang={locale}>
      <body id="admin">
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
