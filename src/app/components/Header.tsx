import ProfilePopover from "@/components/ProfilePopover";
import LocaleSwitcher from "./LocaleSwitcher";
import LogoLink from "./LogoLink";

export default async function Header() {
  return (
    <nav className="max-w-[1816px] w-full mx-auto p-4 justify-between flex items-center">
      <LogoLink />
      <div className="flex gap-2 items-center">
        <LocaleSwitcher />
        <ProfilePopover />
      </div>
    </nav>
  );
}
