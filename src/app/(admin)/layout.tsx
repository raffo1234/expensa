import "../globals.css";
import { auth } from "@/lib/auth";
import Aside from "@/components/Aside";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { SessionProvider } from "next-auth/react";
import AdminLayoutContent from "@/components/AdminLayoutContent";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { Suspense } from "react";
import NoAccess from "@/components/NoAccess";
import { SWRConfig } from "swr";
import { SWR_KEY_USER_ROLE } from "@/constants";
import { fetchRolePermissionSlugs, rolePermissionSlugsKey } from "@/lib/rolePermissions";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: Readonly<AdminLayoutProps>) {
  const session = await auth();
  const user = session?.user;

  const sessionRoleId = user?.role_id;

  // Permissions are loaded here, in parallel, so the menu and every
  // permission check on the page render without waiting on the browser.
  const [currentUser, { data: settingData }, roleSlugs] = await Promise.all([
    getCurrentUser(),
    supabase
      .from("user_setting")
      .select("setting_value")
      .eq("user_id", user?.id)
      .eq("setting_key", "is_menu_contrated")
      .maybeSingle(),
    sessionRoleId ? fetchRolePermissionSlugs(sessionRoleId).catch(() => null) : null,
  ]);

  if (!currentUser?.roleId) return <NoAccess />;

  const isMenuContracted = settingData?.setting_value === "true";

  const swrFallback: Record<string, unknown> = {
    [SWR_KEY_USER_ROLE]: [{ name: currentUser.roleName }],
  };
  if (sessionRoleId && roleSlugs) swrFallback[rolePermissionSlugsKey(sessionRoleId)] = roleSlugs;

  return (
    <SessionProvider session={session}>
      <SWRConfig value={{ fallback: swrFallback }}>
        <header className="w-full pr-16 lg:pr-0 bg-white">
          <Suspense>
            <Header />
          </Suspense>
        </header>
        <div className="border-t border-gray-200">
          <main className="flex items-start w-full z-10">
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
      </SWRConfig>
    </SessionProvider>
  );
}
