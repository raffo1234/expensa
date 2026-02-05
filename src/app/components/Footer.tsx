import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import { getTranslations } from "next-intl/server";
import ExploreNowButton from "./ExploreNowButton";
import { auth } from "@/lib/auth";

export default async function Footer() {
  const t = await getTranslations("Footer");
  const session = await auth();
  const userRoleId = session?.user?.role_id || "";

  return (
    <footer className="w-full bg-[#FCFCFC] border-t border-gray-100 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12 mb-24">
          <div className="space-y-8 max-w-2xl">
            <h2 className="text-[clamp(3rem,12vw,9.5rem)] font-medium leading-[0.8] tracking-[-0.06em] text-[#0A0A0A] [font-family:var(--font-poppins)]">
              CADIA<span className="text-cyan-500">.</span>
            </h2>
            <p className="text-xl text-gray-500 font-light leading-relaxed max-w-md [text-wrap:balance]">
              {t("description")}
            </p>
          </div>
          {session ? (
            <ExploreNowButton userRoleId={userRoleId} />
          ) : (
            <Link
              href="/session/new"
              title={t("cta")}
              type="submit"
              className="group cursor-pointer text-lg flex items-center gap-4 px-8 py-3 bg-black text-white rounded-full transition-colors duration-500 hover:bg-gray-800 active:bg-gray-900"
            >
              <span>{t("cta")}</span>
              <Icon
                icon="solar:arrow-right-linear"
                className="group-hover:translate-x-2 transition-transform duration-500"
                fontSize={24}
              ></Icon>
            </Link>
          )}
        </div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-16 border-y border-gray-100 gap-12">
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold text-gray-900 border-b border-cyan-500 w-fit pb-1 mb-4">
              {t("socialTitle")}
            </h4>
            <p className="text-sm text-gray-400 font-light italic">{t("socialSubtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-8 lg:gap-16">
            <Link
              href="https://www.tiktok.com/@cadia_pe"
              target="_blank"
              className="group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-500">
                <Icon icon="ri:tiktok-fill" fontSize={20} />
              </div>
              <span className="text-sm font-light uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">
                TikTok
              </span>
            </Link>
            <Link
              href="https://www.instagram.com/cadia_pe"
              target="_blank"
              className="group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-[#E4405F] group-hover:text-white transition-all duration-500">
                <Icon icon="ri:instagram-line" fontSize={20} />
              </div>
              <span className="text-sm font-light uppercase tracking-widest text-gray-400 group-hover:text-[#E4405F] transition-colors">
                Instagram
              </span>
            </Link>
            <Link
              href="https://www.facebook.com/profile.php?id=61582707291150"
              target="_blank"
              className="group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-[#1877F2] group-hover:text-white transition-all duration-500">
                <Icon icon="ri:facebook-fill" fontSize={20} />
              </div>
              <span className="text-sm font-light uppercase tracking-widest text-gray-400 group-hover:text-[#1877F2] transition-colors">
                Facebook
              </span>
            </Link>
          </div>
        </div>
        <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-medium tracking-[0.3em] uppercase">
          <p className="text-gray-300">{t("copyright")}</p>
          {/* <div className="flex gap-8 text-gray-400">
            <Link href="/privacy" className="hover:text-cyan-600 transition-colors">
              {t("privacy")}
            </Link>
            <Link href="/terms" className="hover:text-cyan-600 transition-colors">
              {t("terms")}
            </Link>
          </div> */}
        </div>
      </div>
    </footer>
  );
}
