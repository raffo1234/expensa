import "../globals.css";
import { auth } from "@/lib/auth";
import Aside from "@/components/Aside";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { SessionProvider } from "next-auth/react";
import AdminLayoutContent from "@/components/AdminLayoutContent";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { Suspense } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: Readonly<AdminLayoutProps>) {
  const session = await auth();
  const user = session?.user;

  const [currentUser, { data: settingData }] = await Promise.all([
    getCurrentUser(),
    supabase
      .from("user_setting")
      .select("setting_value")
      .eq("user_id", user?.id)
      .eq("setting_key", "is_menu_contrated")
      .maybeSingle(),
  ]);

  const isMenuContracted = settingData?.setting_value === "true";

  return (
    <SessionProvider session={session}>
      <header className="w-full h-20 pr-16 lg:pr-0 bg-white">
        <Suspense>
          <Header />
        </Suspense>
      </header>
      <div className="border-t border-gray-200">
        <main
          className="flex items-start w-full z-10"

        >
          <Suspense>
            {currentUser && user?.name ? (
              <Aside
                userId={currentUser.id}
                userRoleId={currentUser.roleId}
                userImage={user.image}
                userName={user.name}
                isMenuContracted={isMenuContracted}
              />
            ) : null}
          </Suspense>
          <Suspense>
            <AdminLayoutContent isContracted={isMenuContracted}>{children}</AdminLayoutContent>
          </Suspense>
        </main>
      </div>
    </SessionProvider>
  );
}
