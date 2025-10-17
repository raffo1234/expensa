import Link from "next/link";
import ProfilePopover from "@/components/ProfilePopover";
import LocaleSwitcher from "./LocaleSwitcher";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

export default async function Header() {
  const t = await getTranslations("Logo");

  return (
    <nav className="max-w-[1816px] w-full mx-auto p-4 justify-between flex items-center">
      <Link href="/" title="Cadia" className="flex  items-center gap-2">
        <Image
          src="/images/logo.png"
          alt="Cadia"
          className="flex-shrink-0"
          width={36}
          height={36}
        />
        <span className="hidden md:block">
          <span className="text-lg leading-5 block font-semibold">CADIA</span>
          <span className="font-normal block">{t("logotipo")}</span>
        </span>
      </Link>
      <div className="flex gap-2 items-center">
        <LocaleSwitcher />
        <ProfilePopover />
      </div>
    </nav>
  );
}
