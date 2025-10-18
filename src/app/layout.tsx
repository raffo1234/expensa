import type { Metadata } from "next";
import "./globals.css";
import GlobalModal from "@/components/GlobalModal";
import { SWRConfig } from "swr";
import { fetchAllPermissionsServer, prefetchPermissionServer } from "@/utils/serverPermissions";
import { Toaster } from "react-hot-toast";
import { ReactScan } from "@/components/ReactScan";
import Slider from "@/components/Slider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

const title = "Cadia - MRI Segunda Opinión";
const description = "Acceda a sus escaneos al instante";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cadia.pe/"),
  title,
  description,
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title,
    description,
    url: "https://www.quidyrafael.com/",
    siteName: "CADIA.PE",
    images: [
      {
        url: "/opengraph-image.jpg",
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
  const initialPermissions = {};
  const permissionSlugs = await fetchAllPermissionsServer();

  for (const slug of permissionSlugs) {
    const permissionData = await prefetchPermissionServer(slug);
    Object.assign(initialPermissions, permissionData);
  }

  return (
    <html lang="es">
      <body id="admin" className="text-sm">
        <Toaster
          toastOptions={{
            className: "text-xs",
          }}
        />
        <ReactScan />
        <SWRConfig value={{ fallback: initialPermissions }}>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </SWRConfig>
        <GlobalModal />
        <Slider />
      </body>
    </html>
  );
}
