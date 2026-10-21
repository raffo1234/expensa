"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

// Data table styled after Fly.io's dashboard tables. Spacing, type and color
// live in Th/Td so every table that uses them stays identical.

type Align = "left" | "right" | "center";
export type DataTableColumn = { label: string; align?: Align };

const ALIGN: Record<Align, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/**
 * Size of every control inside a row (buttons, chips, icon badges): 36px tall
 * with the app's standard icon (ICON_SIZE). Keeps rows visually even.
 */
export const ROW_CONTROL = "h-9";

// Shared cell box: 12px sides, 24px at the row edges, 16px vertical.
// Header: 16px text on a 24px line → 56px tall, as on Fly.io (~56.5px).
// Body: 14.5px text on a 1.5 line → ~54px tall, as on Fly.io (~54.25px).
const CELL = "px-3 py-4 first:pl-6 last:pr-6";

export function Th({ align = "left", children }: { align?: Align; children?: ReactNode }) {
  return (
    <th
      scope="col"
      className={`${CELL} ${ALIGN[align]} whitespace-nowrap bg-navy-50 text-base leading-6 font-book`}
    >
      {children}
    </th>
  );
}

export function Td({
  align = "left",
  className = "",
  children,
  colSpan,
}: {
  align?: Align;
  className?: string;
  children?: ReactNode;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`${CELL} ${ALIGN[align]} whitespace-nowrap text-cell text-navy-500 ${className}`}
    >
      {children}
    </td>
  );
}

/**
 * The row's single real link (for keyboard and screen readers). The rest of
 * the row is clickable through DataTableRow's `href`.
 */
export function RowLink({
  href,
  newTab = false,
  className = "",
  children,
}: {
  href: string;
  newTab?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </Link>
  );
}

export function DataTableRow({
  href,
  newTab = false,
  className = "",
  children,
}: {
  /** Makes the whole row open this page (controls inside the row keep working). */
  href?: string;
  newTab?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLTableRowElement>) => {
    if (!href) return;
    // Clicks on links, buttons or inputs inside the row do their own thing.
    if ((e.target as HTMLElement).closest("a, button, input, select, textarea, label")) return;
    if (newTab || e.metaKey || e.ctrlKey) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(href);
  };

  return (
    <tr
      onClick={handleClick}
      className={`transition-colors hover:bg-navy-50 ${href ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </tr>
  );
}

export default function DataTable({
  columns,
  isEmpty,
  isLoading,
  emptyMessage,
  children,
}: {
  columns: DataTableColumn[];
  isEmpty?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-card bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-navy-200">
          <thead className="text-navy-900">
            <tr>
              {columns.map((col, i) => (
                <Th key={i} align={col.align}>
                  {col.label}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-200">
            {isLoading ? (
              Array.from({ length: 10 }, (_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <Td key={j}>
                      <div className="h-4 animate-pulse rounded bg-navy-100" />
                    </Td>
                  ))}
                </tr>
              ))
            ) : isEmpty ? (
              <tr>
                <Td colSpan={columns.length} align="center" className="py-10">
                  {emptyMessage ?? "No hay datos"}
                </Td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
