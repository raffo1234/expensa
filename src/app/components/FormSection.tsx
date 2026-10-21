import Link from "next/link";

export default function FormSection({
  title,
  padding = true,
  children,
  backUrl,
}: {
  title?: string;
  padding?: boolean;
  backUrl?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border-violet-200 shadow-violet-100 shadow-lg ${padding ? "p-4 sm:p-6" : ""} bg-white border rounded-xl`}
    >
      {title && (
        <h2 className="border-b flex gap-3 items-center px-4 sm:px-6 pb-4 sm:pb-6 mb-4 sm:mb-6 -mx-4 sm:-mx-6 border-gray-200 text-lg font-semibold text-gray-800">
          {backUrl && (
            <Link
              href={backUrl}
              title="Volver"
              aria-label="Volver"
              className="px-3 py-1 bg-slate-100 rounded-md hover:text-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
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
      )}
      {children}
    </div>
  );
}
