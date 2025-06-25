import type { Metadata } from "next";
import "./globals.css";
import GlobalModal from "@/components/GlobalModal";
import { SWRConfig } from "swr";
import {
  fetchAllPermissionsServer,
  prefetchPermissionServer,
} from "@/utils/serverPermissions";
import { Toaster } from "react-hot-toast";
import { ReactScan } from "@/components/ReactScan";
import Slider from "@/components/Slider";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cadia.pe/"),
  title: "Cadia - Your Scans, Instantly Accessible",
  description: "Process DICOM & Create Reports with Ease",
  icons: {
    icon: "/favicon.png",
  },
};

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: Readonly<LayoutProps>) {
  const initialPermissions = {};
  const permissionSlugs = await fetchAllPermissionsServer();

  for (const slug of permissionSlugs) {
    const permissionData = await prefetchPermissionServer(slug);
    Object.assign(initialPermissions, permissionData);
  }

  return (
    <html lang="es">
      <body id="admin">
        <Toaster
          toastOptions={{
            className: "text-xs",
          }}
        />
        <ReactScan />
        <SWRConfig value={{ fallback: initialPermissions }}>
          {children}
        </SWRConfig>
        <GlobalModal />
        <Slider />
      </body>
    </html>
  );
}
