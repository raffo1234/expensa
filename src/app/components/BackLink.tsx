import Link from "next/link";

export default function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex w-fit items-center gap-2 text-sm font-semibold">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      {children}
    </Link>
  );
}
