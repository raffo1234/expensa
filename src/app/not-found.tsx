import Image from "next/image";
import Link from "next/link";
import { ICON_SIZE, PRIMARY_BUTTON_CLASS } from "./constants";

export default function Page() {
  return (
    <div className="w-full flex items-center justify-center h-lvh">
      <div>
        <Image src="/404.svg" width={600} height={600} alt="Página no encontrada" className="" />
        <div className="flex justify-center mt-10">
          <Link href="/" className={PRIMARY_BUTTON_CLASS}>
            <svg
              className="rotate-180"
              xmlns="http://www.w3.org/2000/svg"
              width={ICON_SIZE}
              height={ICON_SIZE}
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
            <span>Ir al inicio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
