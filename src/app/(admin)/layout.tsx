import type { Metadata } from "next";
import "../globals.css";
import { auth } from "@/lib/auth";
import GlobalModal from "@/components/GlobalModal";
import Aside from "@/components/Aside";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Your Scans, Instantly Accessible",
  description: "Process DICOM & Create Reports with Ease",
  icons: {
    icon: "/favicon.png",
  },
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user;

  return (
    <html lang="es">
      <body id="admin">
        <Header />
        <div className="border-t border-gray-200">
          <main className="flex items-start w-full z-10 relative">
            {user && user?.role_id && user?.name && user?.image ? (
              <Aside
                userRoleId={user.role_id}
                userName={user.name}
                userImage={user.image}
              />
            ) : null}
            <section
              style={{
                minHeight: "calc(100vh - 81px)",
                width: "calc(100% - 286px)",
              }}
              className="bg-slate-50 flex-grow relative px-4 md:px-7 lg:px-10 py-14 lg:border-l lg:border-gray-200"
            >
              {children}
            </section>
          </main>
        </div>
        <GlobalModal />
      </body>
    </html>
  );
}
