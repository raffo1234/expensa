import { Icon } from "@iconify/react";
import Link from "next/link";
import Image from "next/image";
import { signOut, auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ICON_SIZE } from "@/constants";

export default async function ProfilePopover() {
  const session = await auth();
  const user = session?.user;
  let roleName = undefined;

  if (user?.id) {
    const { data } = await supabase
      .from("user")
      .select("role_id, template_id")
      .eq("id", user?.id)
      .single();

    if (data) {
      const { data: role } = await supabase
        .from("role")
        .select("name")
        .eq("id", data?.role_id)
        .single();

      roleName = role?.name;
    }
  }

  return (
    <>
      {session ? (
        <div className="flex items-center gap-4 relative group z-30 dropdown-parent">
          <div className="flex items-center">
            <button type="button" className="relative w-12 h-12 bg-gray-100 rounded-full">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  className="rounded-full object-cover"
                  width={48}
                  height={48}
                  alt={session.user.image}
                  priority={true}
                  quality={70}
                />
              ) : null}
              <div className="w-3 h-3 absolute top-9 right-0 rounded-full bg-green-400 border-2 border-white" />
            </button>
          </div>
          <div className="dropdown-child opacity-0 pt-2 transition-all duration-300 invisible translate-y-2 group-hover:translate-y-0 group-hover:visible group-hover:opacity-100 absolute top-full -right-3">
            <ul className="bg-white shadow-lg rounded-lg w-[300px] border border-gray-100">
              <li className="py-6 text-center">
                <div className="relative w-12 h-12 mb-4 mx-auto">
                  {session?.user?.image && session.user.name ? (
                    <Image
                      src={session.user.image}
                      className="rounded-full object-cover w-full h-full"
                      alt={session.user.name}
                      width={48}
                      height={48}
                      priority={false}
                    />
                  ) : null}
                  <div className="w-3 h-3 absolute top-9 right-0 rounded-full bg-green-400 border-2 border-white" />
                </div>
                <p className="text-center text-sm font-semibold w-full mb-1">
                  {session.user?.name}
                </p>
                <p className="text-sm text-gray-500">{roleName}</p>
              </li>
              <li>
                <Link href="/" className="py-2 px-6 hover:bg-gray-50 flex items-center gap-3.5">
                  <Icon icon="solar:home-smile-angle-broken" fontSize={21} />
                  <span>Home</span>
                </Link>
              </li>
              <li className="border-t border-gray-100">
                <form
                  action={async () => {
                    "use server";
                    await signOut();
                  }}
                >
                  <button className="hover:text-red-500 cursor-pointer w-full px-6 py-4 flex items-center gap-3.5 text-left transition-colors duration-300">
                    <Icon icon="solar:inbox-out-linear" className="-rotate-90" fontSize={21} />
                    <span>Sign Out</span>
                  </button>
                </form>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <Link
          title="Sign In"
          href="/session/new"
          className="cursor-pointer flex gap-4 hover:bg-rose-400 px-6 py-2 bg-black text-white rounded-full transition-colors duration-700 active:bg-gray-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={ICON_SIZE}
            height={ICON_SIZE}
            viewBox="0 0 24 24"
          >
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5">
              <path d="M8 16c0 2.828 0 4.243.879 5.121c.641.642 1.568.815 3.121.862M8 8c0-2.828 0-4.243.879-5.121C9.757 2 11.172 2 14 2h1c2.828 0 4.243 0 5.121.879C21 3.757 21 5.172 21 8v8c0 2.828 0 4.243-.879 5.121c-.768.769-1.946.865-4.121.877M3 9.5v5c0 2.357 0 3.535.732 4.268S5.643 19.5 8 19.5M3.732 5.232C4.464 4.5 5.643 4.5 8 4.5" />
              <path strokeLinejoin="round" d="M6 12h9m0 0l-2.5 2.5M15 12l-2.5-2.5" />
            </g>
          </svg>
          <span>Sign in</span>
        </Link>
      )}
    </>
  );
}
