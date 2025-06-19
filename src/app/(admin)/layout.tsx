import "../globals.css";
import { auth } from "@/lib/auth";
import Aside from "@/components/Aside";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({
  children,
}: Readonly<AdminLayoutProps>) {
  const session = await auth();
  const user = session?.user;

  if (user?.id) {
    const { data } = await supabase
      .from("user")
      .select("role_id, template_id")
      .eq("id", user?.id)
      .single();

    user.role_id = data?.role_id;
    user.template_id = data?.template_id;
  }

  return (
    <>
      <Header />
      <div className="border-t border-gray-200">
        <main className="flex items-start w-full z-10 relative">
          {user && user?.role_id && user?.name ? (
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
    </>
  );
}
