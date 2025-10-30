import ExploreNowButton from "@/components/ExploreNowButton";
import { auth } from "@/lib/auth";
import { Icon } from "@iconify/react/dist/iconify.js";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function Index() {
  const session = await auth();
  const userRoleId = session?.user?.role_id || "";
  const t = await getTranslations("HomePage");

  return (
    <div className="flex flex-col justify-center items-center gap-5 sm:gap-7">
      <h1
        className="text-center leading-13 sm:leading-20 tracking-tighter"
        style={{
          fontSize: "clamp(14px, 10vw + .3rem, 70px)",
          fontFamily: "poppins",
        }}
      >
        {t("title")}
      </h1>
      <p className="sm:text-xl text-gray-500">{t("description")}</p>
      {session ? (
        <ExploreNowButton userRoleId={userRoleId} />
      ) : (
        <Link
          href="/session/new"
          title={t("button")}
          type="submit"
          className="cursor-pointer text-lg flex items-center gap-4 px-8 py-3 bg-black text-white rounded-full transition-colors duration-700 hover:bg-gray-800 active:bg-gray-900"
        >
          <span>{t("button")}</span>
          <Icon icon="solar:arrow-right-linear" fontSize={24}></Icon>
        </Link>
      )}
      <div className="relative w-full max-w-[1000px] mx-auto sm:aspect-[5/3] aspect-[4/3] mb-8">
        <Image
          src="/radiologist.png"
          priority
          fill
          alt="Radiologist"
          className="h-auto object-cover rounded-2xl "
        />
      </div>
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="max-w-3/4 text-center p-20 rounded-2xl bg-white mx-auto">
          <h2
            style={{
              fontSize: "clamp(12px, 10vw + .3rem, 60px)",
              fontFamily: "poppins",
            }}
            className="text-center leading-11 sm:leading-16 tracking-tighter mb-8"
          >
            {t("title2")}
          </h2>
          <p className="sm:text-xl text-gray-600">{t("description2")}</p>
        </div>
      </div>
    </div>
  );
}
