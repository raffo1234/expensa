import ProfilePopover from "@/components/ProfilePopover";

export default async function Header() {
  return (
    <nav className="flex justify-between items-center px-8 py-6">
      <span
        className="text-sm font-semibold tracking-widest uppercase"
        style={{ color: "#4d1d6a" }}
      >
        Expensa
      </span>
      <ProfilePopover />
    </nav>
  );
}
