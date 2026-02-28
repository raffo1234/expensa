import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

export default async function LogoLink() {
  const t = await getTranslations("Logo");

  return (
    <Link href="/" title="Cadia" className="flex items-center gap-2">
      <Image
        src="/images/logo.png"
        priority
        alt="Cadia"
        className="flex-shrink-0"
        width={36}
        height={36}
        style={{ width: "auto", height: "auto" }}
      />
      <span className="hidden md:block">
        <span className="text-lg leading-5 block font-semibold">CADIA</span>
        <span className="font-normal block">{t("logotipo")}</span>
      </span>
    </Link>
  );
}
