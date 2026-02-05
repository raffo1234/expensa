import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import ExploreNowButton from "./ExploreNowButton";
import { auth } from "@/lib/auth";

export default async function MissingReport() {
  const t = await getTranslations("MissingReport");
  const session = await auth();
  const userRoleId = session?.user?.role_id || "";

  return (
    <section className="relative py-32 bg-[#FCFCFC] overflow-hidden">
      <div className="absolute inset-0 [background-image:linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 relative group">
            <div className="relative aspect-square w-full bg-white border border-gray-100 rounded-3xl shadow-[0_0_80px_-15px_rgba(0,0,0,0.05)] flex items-center justify-center transition-all duration-700 hover:shadow-[0_0_100px_-10px_rgba(0,186,211,0.1)]">
              <div className="absolute top-8 left-8 right-8 bottom-8 border-[0.5px] border-gray-100 rounded-2xl flex items-center justify-center">
                <div className="absolute w-48 h-48 rounded-full border border-dashed border-cyan-200/50 animate-[spin_40s_linear_infinite]" />
                <div className="absolute w-32 h-32 rounded-full border border-cyan-100 animate-[spin_20s_linear_infinite_reverse]" />
                <div className="relative z-10 bg-white p-6 rounded-2xl shadow-xl border border-gray-50 transform group-hover:scale-110 transition-transform duration-500">
                  <Icon icon="solar:graph-up-bold-duotone" className="text-cyan-500 text-6xl" />
                  <div className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                  </div>
                </div>
                <div className="absolute top-4 left-4 flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-100" />
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-cyan-500/5 to-transparent -translate-y-full animate-[scan_4s_linear_infinite]" />
              </div>
              <div className="absolute -top-4 -right-4 bg-black text-white text-[10px] font-bold tracking-[0.2em] px-4 py-2 rounded-lg shadow-2xl uppercase">
                DICOM
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white text-gray-500 text-[10px] font-semibold tracking-[0.2em] px-4 py-2 rounded-lg shadow-xl border border-gray-100 uppercase">
                {t("status")}
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3">
                <span className="h-[1px] w-8 bg-cyan-500" />
                <span className="text-cyan-600 font-bold text-[10px] tracking-[0.4em] uppercase">
                  {t("badge")}
                </span>
              </div>
              <h2
                className="text-[#0A0A0A] font-medium tracking-[-0.04em] leading-[1.05] [font-family:var(--font-poppins)] [text-wrap:balance]"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4.8rem)" }}
              >
                {t("title")}
                <br />
                <span
                  className="italic font-light text-cyan-500"
                  style={{ fontFamily: "var(--font-ibm-plex-serif)" }}
                >
                  {t("italicTitle")}
                </span>
              </h2>
            </div>
            <p
              className="text-xl text-gray-500 font-light leading-relaxed max-w-xl"
              dangerouslySetInnerHTML={{ __html: t("description") }}
            />
            <div className="w-fit">
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
          </div>
        </div>
      </div>
    </section>
  );
}
