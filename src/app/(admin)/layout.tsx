import "../globals.css";
import { auth } from "@/lib/auth";
import Aside from "@/components/Aside";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { SessionProvider } from "next-auth/react";
import AdminLayoutContent from "@/components/AdminLayoutContent";
import { Suspense } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: Readonly<AdminLayoutProps>) {
  const session = await auth();
  const user = session?.user;

  const [{ data: userData }, { data: settingData }] = await Promise.all([
    supabase.from("user").select("role_id").eq("id", user?.id).single(),
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
      <header className="w-full h-20 pr-16 lg:pr-0">
        <Suspense>
          <Header />
        </Suspense>
      </header>
      <div className="border-t border-gray-200">
        <main className="flex items-start w-full z-10 bg-slate-50">
          <Suspense>
            {user && userData?.role_id && user.name ? (
              <Aside
                userId={user?.id}
                userRoleId={userData.role_id}
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
