import Image from "next/image";
import Link from "next/link";

export default function Page() {
  return (
    <div className="w-full flex items-center justify-center h-lvh">
      <div>
        <Image src="/404.jpg" width={600} height={600} alt="404" className="" />
        <Link
          href="/"
          title="Back Home"
          style={{ fontFamily: "poppins" }}
          className="w-fit mx-auto mt-6 text-lg flex items-center gap-4 px-8 py-3 bg-black text-white rounded-full transition-colors duration-700 hover:bg-gray-800 active:bg-gray-900"
        >
          <svg
            className="rotate-180"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M4 12h16m0 0l-6-6m6 6l-6 6"
            />
          </svg>
          <span>Back Home</span>
        </Link>
      </div>
    </div>
  );
}
