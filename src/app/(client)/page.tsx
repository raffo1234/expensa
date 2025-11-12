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
        className="text-center leading-12 sm:leading-20 tracking-tighter"
        style={{
          fontSize: "clamp(14px, 10vw + .3rem, 70px)",
          fontFamily: "poppins",
        }}
      >
        {t("title")}
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
      <div className="relative w-full max-w-[1000px] mx-auto sm:aspect-[5/3] aspect-[4/3] mb-8">
        <Image
          src="/radiologist.png"
          priority
          fill
          alt="Radiologo"
          className="h-auto object-cover rounded-2xl "
        />
      </div>
      <div className="bg-slate-50 rounded-lg p-4 md:flex items-center">
        <div className="md:max-w-3/4 text-center flex-1/2 p-5 md:p-20 rounded-2xl">
          <h2
            style={{
              fontSize: "clamp(14px, 10vw + .3rem, 70px)",
              fontFamily: "poppins",
            }}
            className="text-center leading-12 sm:leading-20 tracking-tighter mb-8"
          >
            {t("title2")}
          </h2>
          <p className="mb-10 sm:text-xl text-gray-600">{t("description2")}</p>
          <Link
            target="_blank"
            href="https://wa.me/51939331390?text=Hola,%20quiero%20solicitar%20mi%20informe%20de%20segunda%20opinion%20en%20menos%20de%2024%20horas."
            title="Whatsapp Cadia: 939331390"
            className="cursor-pointer flex gap-4 items-center justify-center w-fit mx-auto text-lg text-center bg-[#4dca5a] hover:bg-[#47b752] px-8 py-3 text-white rounded-full transition-colors duration-700 active:bg-[#3c9b46]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M16.6 14c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1s-.6.8-.8 1c-.1.2-.3.2-.5.1c-.7-.3-1.4-.7-2-1.2c-.5-.5-1-1.1-1.4-1.7c-.1-.2 0-.4.1-.5s.2-.3.4-.4c.1-.1.2-.3.2-.4c.1-.1.1-.3 0-.4S9.7 8.5 9.5 8c-.1-.7-.3-.7-.5-.7h-.5c-.2 0-.5.2-.6.3Q7 8.5 7 9.7c.1.9.4 1.8 1 2.6c1.1 1.6 2.5 2.9 4.2 3.7c.5.2.9.4 1.4.5c.5.2 1 .2 1.6.1c.7-.1 1.3-.6 1.7-1.2c.2-.4.2-.8.1-1.2zm2.5-9.1C15.2 1 8.9 1 5 4.9c-3.2 3.2-3.8 8.1-1.6 12L2 22l5.3-1.4c1.5.8 3.1 1.2 4.7 1.2c5.5 0 9.9-4.4 9.9-9.9c.1-2.6-1-5.1-2.8-7m-2.7 14c-1.3.8-2.8 1.3-4.4 1.3c-1.5 0-2.9-.4-4.2-1.1l-.3-.2l-3.1.8l.8-3l-.2-.3c-2.4-4-1.2-9 2.7-11.5S16.6 3.7 19 7.5c2.4 3.9 1.3 9-2.6 11.4"
              />
            </svg>
            <span>Whatsapp</span>
          </Link>
        </div>
        <div className="flex-1/2 rounded-xl">
          <video
            src="/videos/video.webm"
            className="w-full h-auto"
            muted
            playsInline
            loop
            autoPlay
          ></video>
        </div>
      </div>
    </div>
  );
}
