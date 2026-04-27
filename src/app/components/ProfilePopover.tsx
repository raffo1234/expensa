import Link from "next/link";
import { auth } from "@/lib/auth";
import { ICON_SIZE } from "@/constants";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/getCurrentUser";
import ProfilePopoverDropdown from "./ProfilePopoverDropdown";

export default async function ProfilePopover() {
  const session = await auth();
  const user = await getCurrentUser();
  const t = await getTranslations("Popover");
  console.log({user})
  return (
    <>
      {session?.user && user ? (
        <ProfilePopoverDropdown
          userImage={session.user?.image}
          userName={session.user?.name}
          userRole={user.roleName}
          userEmail={session.user?.email}
        />
      ) : (
        <Link
          title={t("sign-in")}
          href="/session/new"
          className="cursor-pointer flex gap-4 bg-cyan-400 hover:bg-cyan-500 font-semibold px-6 py-2 text-white rounded-full transition-colors duration-700 active:bg-gray-900"
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
          <span>{t("sign-in")}</span>
        </Link>
      )}
    </>
  );
}
