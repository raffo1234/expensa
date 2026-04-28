import Link from "next/link";

export default async function LogoLink() {
  return (
    <Link href="/" title="Cadia" className="flex items-center gap-2">
      <div className="text-2xl font-black tracking-tight" style={{ color: "#2d2d2d" }}>
        expen<span style={{ color: "#7fb89a" }}>sa</span>
      </div>
    </Link>
  );
}
