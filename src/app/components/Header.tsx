import ProfilePopover from "@/components/ProfilePopover";

export default async function Header() {
  return (
    <nav className="flex justify-between items-center px-8 py-6">
      <div className="text-2xl font-black tracking-tight" style={{ color: "#2d2d2d" }}>
        expen<span style={{ color: "#7fb89a" }}>sa</span>
      </div>
      <ProfilePopover />
    </nav>
  );
}
