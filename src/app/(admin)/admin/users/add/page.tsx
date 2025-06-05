import CheckPermission from "@/components/CheckPermission";
import FallbackPermission from "@/components/FallbackPermission";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Permissions } from "@/types/propertyState";
import { supabase } from "@/lib/supabase";

export default async function Page() {
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

  if (!user?.id || !user.role_id) return null;

  return (
    <>
      <h1 className="mb-8 font-semibold text-lg block">Add User</h1>
      <CheckPermission
        userRoleId={user.role_id}
        requiredPermission={Permissions.MANAGE_USERS}
        fallback={<FallbackPermission />}
      >
        <form method="post" action="/admin/users/add">
          <div className="flex flex-col gap-4">
            <fieldset>
              <label htmlFor="username" className="inline-block mb-2 text-sm">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                required
                className="bg-white w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
              />
            </fieldset>
            <fieldset>
              <label htmlFor="email" className="inline-block mb-2 text-sm">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="bg-white w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
              />
            </fieldset>
            <fieldset>
              <label htmlFor="password" className="inline-block mb-2 text-sm">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                className="bg-white w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
              />
            </fieldset>
          </div>
          <footer className="mt-10 gap-3 flex items-center">
            <Link
              href="/admin/users"
              title="Usuarios"
              className="font-semibold disabled:border-gray-100 disabled:bg-gray-100 inline-block py-3 px-10 bg-white text-sm border border-gray-100 rounded-lg transition-colors hover:border-gray-200 duration-500 active:border-gray-300"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="text-white font-semibold disabled:border-gray-100 disabled:bg-gray-100 inline-block py-3 px-10 text-sm bg-cyan-500 hover:bg-cyan-400 transition-colors duration-500 rounded-lg"
            >
              Guardar
            </button>
          </footer>
        </form>
      </CheckPermission>
    </>
  );
}
