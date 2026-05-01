import ProfilePopover from "@/components/ProfilePopover";
import LogoLink from "./LogoLink";

export default async function Header() {
  return (
    <nav className="flex justify-between items-center px-8 py-5">
      <LogoLink />
      <ProfilePopover />
    </nav>
  );
}
