import { Icon } from "@iconify/react";
import Link from "next/link";
import Image from "next/image";
import { signIn, signOut, auth } from "@/lib/auth";

export default async function ProfilePopover() {
  const session = await auth();

  return (
    <>
      {session ? (
        <div className="flex items-center gap-4 relative group z-30 dropdown-parent">
          <button
            type="button"
            className="relative w-12 h-12 bg-gray-100 rounded-full"
          >
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
                <p className="text-center text-sm font-semibold w-full">
                  {session.user?.name}
                </p>
              </li>
              <li>
                <Link
                  href="/"
                  className="py-2 px-6 hover:bg-gray-50 flex items-center gap-3.5"
                >
                  <Icon icon="solar:home-smile-angle-broken" />
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
                  <button className="hover:text-red-500 w-full px-6 py-4 flex items-center gap-3.5 text-left transition-colors">
                    <Icon
                      icon="solar:inbox-out-linear"
                      className="-rotate-90"
                    />
                    <span>Sign Out</span>
                  </button>
                </form>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button
            type="submit"
            className="cursor-pointer flex gap-4 hover:bg-rose-400 px-6 py-2 bg-black text-white rounded-full transition-colors duration-700 active:bg-gray-900"
          >
            <Icon icon="solar:login-3-broken" fontSize={24}></Icon>
            <span>Sign in</span>
          </button>
        </form>
      )}
    </>
  );
}
