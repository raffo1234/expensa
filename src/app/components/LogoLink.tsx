import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";

export default async function LogoLink() {
  return (
    <Link
      href="/"
      title="Finolis"
      className="flex text-3xl items-center font-black tracking-tight gap-1"
    >
      <Icon icon="solar:wallet-bold"></Icon>
      <span>
        fino<span className="text-purple-400">lis</span>
      </span>
    </Link>
  );
}
