import "../globals.css";
import { auth } from "@/lib/auth";
import Aside from "@/components/Aside";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { SessionProvider } from "next-auth/react";
import AdminLayoutContent from "@/components/AdminLayoutContent";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: Readonly<AdminLayoutProps>) {
  const session = await auth();
  const user = session?.user;

  const { data } = await supabase.from("user").select("role_id").eq("id", user?.id).single();

  if (!user || !data) return null;

  return (
    <SessionProvider session={session}>
      <header className="w-full pr-16 lg:pr-0">
        <Header />
      </header>
      <div className="border-t border-gray-200">
        <main className="flex items-start w-full z-10">
          {user && data?.role_id && user.name ? (
            <Aside
              userId={user?.id}
              userRoleId={data.role_id}
              userImage={user.image}
              userName={user.name}
            />
          ) : null}
          <AdminLayoutContent>{children}</AdminLayoutContent>
        </main>
      </div>
    </SessionProvider>
  );
}
