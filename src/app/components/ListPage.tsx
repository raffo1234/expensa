import type { ReactNode } from "react";

/**
 * Shared layout for list screens (expenses, summary): controls on top, then the
 * table with the same pager above and below it. All vertical spacing lives here
 * so every list screen keeps the same rhythm.
 */
export default function ListPage({
  controls,
  pager,
  children,
}: {
  /** Header, search and filters. Stacked with uniform spacing. */
  controls: ReactNode;
  /** Pagination, shown above and below the table; null when there's one page. */
  pager?: ReactNode;
  /** The table. */
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-10 space-y-8">{controls}</div>
      {pager && <div className="mb-4">{pager}</div>}
      {children}
      {pager && <div className="mt-4">{pager}</div>}
    </div>
  );
}
