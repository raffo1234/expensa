import ExploreNowButton from "@/components/ExploreNowButton";
import { auth } from "@/lib/auth";
import { Icon } from "@iconify/react/dist/iconify.js";
import Image from "next/image";
import Link from "next/link";

export default async function Index() {
  const session = await auth();
  const userRoleId = session?.user?.role_id || "";

  return (
    <div className="flex flex-col justify-center items-center gap-5 sm:gap-7">
      <h1
        className="leading-13 sm:leading-20 tracking-tighter"
        style={{
          fontSize: "clamp(14px, 10vw + .3rem, 70px)",
          fontFamily: "poppins",
        }}
      >
        Your Scans, Instantly Accessible
      </h1>
      <p className="sm:text-xl text-gray-500">
        Process DICOM & Create Reports with Ease
      </p>
      {session ? (
        <ExploreNowButton userRoleId={userRoleId} />
      ) : (
        <Link
          href="/session/new"
          title="Sing In to Explore"
          type="submit"
          className="cursor-pointer text-lg flex items-center gap-4 px-8 py-3 bg-black text-white rounded-full transition-colors duration-700 hover:bg-gray-800 active:bg-gray-900"
        >
          <span>Sing In to Explore</span>
          <Icon icon="solar:arrow-right-linear" fontSize={24}></Icon>
        </Link>
      )}
      <div className="relative w-full max-w-[1000px] mx-auto sm:aspect-[5/3] aspect-[4/3]">
        <Image
          src="/radiologist.png"
          priority
          fill
          alt="Radiologist"
          className=" h-auto object-cover rounded-2xl "
        />
      </div>
    </div>
  );
}
