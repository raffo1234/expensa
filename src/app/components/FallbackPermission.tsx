import { Icon } from "@iconify/react";
import Image from "next/image";
import Link from "next/link";

export default function FallbackPermission() {
  return (
    <div className="flex flex-col justify-center items-center gap-8">
      <h1 className="text-lg font-book text-navy-900">Opps!</h1>
      <p>You don&apos;t have permission to view this page.</p>
      <Image
        src="/opps.png"
        alt="You don't have permission to view this page"
        width={300}
        height={300}
        className="mb-6"
      />
      <Link
        href="/"
        title="Go home"
        className="text-lg flex items-center gap-4 px-8 py-2 bg-black text-white rounded-full transition-colors duration-700 hover:bg-gray-800 active:bg-gray-900"
      >
        <Icon icon="solar:home-smile-angle-broken" fontSize={24}></Icon>
        <span>Go home</span>
      </Link>
    </div>
  );
}
