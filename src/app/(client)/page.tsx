import ExploreNowButton from "@/components/ExploreNowButton";
import { auth } from "@/lib/auth";
import { Icon } from "@iconify/react/dist/iconify.js";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Why from "@/components/Why";

export default async function Index() {
  const session = await auth();
  const userRoleId = session?.user?.role_id || "";
  const t = await getTranslations("HomePage");

  return (
    <main className="flex flex-col justify-center items-center gap-5 sm:gap-7">
      <h1
        className="text-center leading-12 sm:leading-20 tracking-tighter"
        style={{
          fontSize: "clamp(14px, 10vw + .3rem, 70px)",
          fontFamily: "poppins",
        }}
      >
        {t("title")}{" "}
        <span
          className="italic text-cyan-500"
          style={{ fontFamily: "ibm-plex-san", fontSize: "1.15em" }}
        >
          {t("italicTitle")}
        </span>
      </h1>
      <p className="sm:text-xl text-center text-gray-500">{t("description")}</p>
      {session ? (
        <ExploreNowButton userRoleId={userRoleId} />
      ) : (
        <Link
          href="/session/new"
          title={t("button")}
          type="submit"
          className="group cursor-pointer text-lg flex items-center gap-4 px-8 py-3 bg-black text-white rounded-full transition-colors duration-500 hover:bg-gray-800 active:bg-gray-900"
        >
          <span>{t("button")}</span>
          <Icon
            icon="solar:arrow-right-linear"
            className="group-hover:translate-x-2 transition-transform duration-500"
            fontSize={24}
          ></Icon>
        </Link>
      )}
      <header className="relative w-full max-w-[1000px] mx-auto sm:aspect-[5/3] aspect-[4/3] mb-8">
        <Image
          src="/radiologist.png"
          priority
          fill
          alt="Radiologo"
          className="h-auto object-cover rounded-2xl "
        />
      </header>
      <section className="relative overflow-hidden bg-white border border-gray-100 rounded-[3rem] p-6 md:p-12 lg:p-20 flex flex-col lg:flex-row items-center gap-16 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.05)]">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-50 rounded-full blur-[100px] opacity-60 pointer-events-none" />
        <div className="lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left z-10">
          <span className="mb-6 px-4 py-1.5 bg-cyan-50 text-cyan-700 text-[10px] font-bold tracking-[0.3em] uppercase rounded-full">
            {t("priorityBadge")}
          </span>
          <h2
            className="leading-[0.95] tracking-[-0.05em] text-[#0A0A0A] mb-8 [font-family:var(--font-poppins)]"
            style={{ fontSize: "clamp(2rem, 6vw + 1rem, 4.5rem)" }}
          >
            {t("title2")}
          </h2>
          <p className="mb-12 text-gray-500 text-lg md:text-xl font-light leading-relaxed max-w-lg [text-wrap:balance]">
            {t("description2")}
          </p>
          <Link
            target="_blank"
            href="https://wa.me/51939331390?text=Hola..."
            className="group relative flex items-center gap-6 p-2 pr-10 bg-white border border-gray-100 rounded-full shadow-lg shadow-gray-200/50 hover:shadow-green-200/50 hover:border-green-200 transition-all duration-500"
          >
            <div className="w-14 h-14 flex items-center justify-center bg-[#25D366] text-white rounded-full group-hover:scale-90 transition-transform duration-500 shadow-lg shadow-green-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M16.6 14c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1s-.6.8-.8 1c-.1.2-.3.2-.5.1c-.7-.3-1.4-.7-2-1.2c-.5-.5-1-1.1-1.4-1.7c-.1-.2 0-.4.1-.5s.2-.3.4-.4c.1-.1.2-.3.2-.4c.1-.1.1-.3 0-.4S9.7 8.5 9.5 8c-.1-.7-.3-.7-.5-.7h-.5c-.2 0-.5.2-.6.3Q7 8.5 7 9.7c.1.9.4 1.8 1 2.6c1.1 1.6 2.5 2.9 4.2 3.7c.5.2.9.4 1.4.5c.5.2 1 .2 1.6.1c.7-.1 1.3-.6 1.7-1.2c.2-.4.2-.8.1-1.2zm2.5-9.1C15.2 1 8.9 1 5 4.9c-3.2 3.2-3.8 8.1-1.6 12L2 22l5.3-1.4c1.5.8 3.1 1.2 4.7 1.2c5.5 0 9.9-4.4 9.9-9.9c.1-2.6-1-5.1-2.8-7m-2.7 14c-1.3.8-2.8 1.3-4.4 1.3c-1.5 0-2.9-.4-4.2-1.1l-.3-.2l-3.1.8l.8-3l-.2-.3c-2.4-4-1.2-9 2.7-11.5S16.6 3.7 19 7.5c2.4 3.9 1.3 9-2.6 11.4"
                />
              </svg>
            </div>
            <div className="text-left">
              <span className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                24/7
              </span>
              <span className="text-lg font-semibold text-gray-800">Contactar Especialista</span>
            </div>
          </Link>
        </div>
        <div className="lg:w-1/2 w-full relative group">
          <div className="absolute -inset-4 bg-gradient-to-tr from-cyan-100 to-transparent rounded-[2.5rem] -z-10 opacity-40 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative overflow-hidden rounded-[2rem] border-[10px] border-white shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]">
            <video
              src="/videos/video.webm"
              className="w-full h-auto object-cover aspect-square lg:aspect-video grayscale-[0.3] hover:grayscale-0 transition-all duration-1000"
              muted
              playsInline
              loop
              autoPlay
            />
            <div className="absolute top-4 left-4 backdrop-blur-md bg-black/20 border border-white/20 px-3 py-1 rounded-md">
              <div className="text-[8px] font-mono text-white/80 uppercase tracking-tighter italic">
                Live DICOM Analysis Process
              </div>
            </div>
          </div>
        </div>
      </section>
      <Why />
    </main>
  );
}
