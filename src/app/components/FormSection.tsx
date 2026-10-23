import { ICON_SIZE } from "@/constants";
import Link from "next/link";

export default function FormSection({
  title,
  padding = true,
  children,
  backUrl,
  actions,
}: {
  title?: React.ReactNode;
  /** Section-header links on the right of the title (Fly.io style). */
  actions?: React.ReactNode;
  padding?: boolean;
  backUrl?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card bg-white shadow-card">
      {title && (
        // Section header, Fly.io style: title on the left, section links on the right.
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-divider px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="mr-auto flex items-center gap-3 text-title font-book text-navy-900">
            {backUrl && (
              <Link
                href={backUrl}
                title="Volver"
                aria-label="Volver"
                // Standard square icon button (44px phones, 38px from sm). The negative
                // margin makes it take the old button's 33.5px in the layout, so the
                // header keeps its exact height.
                className="-my-[5.25px] flex size-11 flex-shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy-700 transition-colors duration-300 hover:bg-navy-100 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:-my-[2.25px] sm:size-9.5"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                  aria-hidden
                  viewBox="0 0 24 24"
                >
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="M10.53 5.47a.75.75 0 0 1 0 1.06l-4.72 4.72H20a.75.75 0 0 1 0 1.5H5.81l4.72 4.72a.75.75 0 1 1-1.06 1.06l-6-6a.75.75 0 0 1 0-1.06l6-6a.75.75 0 0 1 1.06 0"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            )}
            {title}
          </h2>
          {actions && (
            <nav
              aria-label="Acciones de la sección"
              className="flex flex-wrap items-center gap-x-1 gap-y-1 sm:gap-x-4"
            >
              {actions}
            </nav>
          )}
        </div>
      )}
      <div className={padding ? "p-4 sm:p-6" : ""}>{children}</div>
    </div>
  );
}
