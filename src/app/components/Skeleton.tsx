import type { CSSProperties, ReactNode } from "react";
import DataTable, { type DataTableColumn } from "./DataTable";
import ListPage from "./ListPage";

// Loading skeletons built from the same boxes as the real screens (same
// heights, borders and spacing), so nothing jumps when the content arrives.
// Server-safe: no hooks or event handlers.

/** One pulsing placeholder. A <span> so it can sit inside headings. */
export function Bone({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden
      style={style}
      className={`block animate-pulse rounded bg-navy-100 ${className}`}
    />
  );
}

// Same box as INPUT_CLASS / SECONDARY_BUTTON_CLASS: 44px on phones, 38px from sm.
const FIELD_BOX = "h-11 rounded-md border border-zinc-200 bg-white sm:h-9.5";

/** An input, select or button outline with a short line of text inside. */
export function FieldSkeleton({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`${FIELD_BOX} flex items-center px-3 ${className}`}>
      <Bone className="h-3 w-1/3 min-w-8" />
    </span>
  );
}

/** Label above a field, as in <Field>. */
export function LabeledFieldSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Bone className="mb-2 h-3.5 w-20" />
      <FieldSkeleton />
    </div>
  );
}

/** Section-header links (Fly.io style), e.g. "Exportar CSV". */
export function HeaderLinksSkeleton({ count }: { count: number }) {
  return (
    // Icon-only on phones, icon + label from sm, like the real header links.
    <span className="flex items-center gap-x-1 sm:gap-x-4">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="flex size-11 items-center justify-center sm:size-auto">
          <Bone className="size-[19px] rounded-md sm:h-3.5 sm:w-24 sm:rounded" />
        </span>
      ))}
    </span>
  );
}

/** "Total gastado" block: label, big amount, record count, primary action. */
export function TotalHeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Bone className="my-[3px] h-3.5 w-28" />
        <Bone className="mt-2 h-8 w-52" />
        <Bone className="mt-2.5 h-3.5 w-16" />
      </div>
      {action && <Bone className="h-11 w-full rounded-md sm:w-40" />}
    </div>
  );
}

/** Two tab buttons (OptionButton). */
export function TabsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Bone key={i} className="h-10.5 w-24 rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Search row: search box, optional extra inputs (pass their sm: widths),
 * the Filtros toggle and the clear-filters icon button.
 */
export function SearchRowSkeleton({
  inputs = [],
  filters = true,
  clear = true,
}: {
  inputs?: string[];
  filters?: boolean;
  clear?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
      <FieldSkeleton className="col-span-2 sm:flex-1" />
      {inputs.map((width, i) => (
        <FieldSkeleton key={i} className={width} />
      ))}
      <div className="col-span-2 flex items-center gap-2 sm:contents">
        {filters && <FieldSkeleton className="flex-1 sm:w-26 sm:flex-none" />}
        {clear && <span aria-hidden className={`${FIELD_BOX} size-11 flex-shrink-0 sm:size-9.5`} />}
      </div>
    </div>
  );
}

/** PageNavigator: rows-per-page box, then ‹ x / y › on the right. */
export function PagerSkeleton({ pageSize = true }: { pageSize?: boolean }) {
  return (
    <div aria-hidden className="flex items-center justify-end gap-2 px-1">
      {pageSize && (
        <div className="mr-2 flex items-center gap-2">
          <Bone className="hidden h-3.5 w-24 sm:block" />
          <span className="h-11 w-16 rounded-lg border border-navy-200 sm:h-9.5" />
        </div>
      )}
      {/* One bordered group: ‹ x / y › */}
      <span className="flex h-11 items-stretch rounded-lg border border-navy-200 sm:h-9.5">
        <span className="w-11 sm:w-9.5" />
        <span className="flex min-w-14 items-center justify-center px-1">
          <Bone className="h-3.5 w-10" />
        </span>
        <span className="w-11 sm:w-9.5" />
      </span>
    </div>
  );
}

/** Real table headers with pulsing rows. */
export function TableSkeleton({
  columns,
  rows = 10,
  numbered = true,
}: {
  columns: DataTableColumn[];
  rows?: number;
  numbered?: boolean;
}) {
  return <DataTable columns={columns} numbered={numbered} isLoading loadingRows={rows} />;
}

/** A full list screen: controls, pager above and below, and the table. */
export function ListPageSkeleton({
  controls,
  columns,
  pageSize = true,
}: {
  controls: ReactNode;
  columns: DataTableColumn[];
  pageSize?: boolean;
}) {
  return (
    <ListPage controls={controls} pager={<PagerSkeleton pageSize={pageSize} />}>
      <TableSkeleton columns={columns} />
    </ListPage>
  );
}

/** Same box as FieldsSection, with a title and the given body. */
export function FieldsSectionSkeleton({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5 md:p-6">
      <Bone className="h-4 w-40" />
      {children}
    </div>
  );
}

/** Mirrors UserCard: avatar, name, email, role pill, date, two round buttons. */
export function UserCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <Bone className="mx-auto mb-3 size-11 rounded-full" />
      <Bone className="mx-auto mb-2 h-4 w-3/4" />
      <Bone className="mx-auto mb-3 h-3 w-2/3" />
      <Bone className="mx-auto mb-4 h-5 w-20 rounded-full" />
      <Bone className="mx-auto mb-5 h-3 w-1/2" />
      <div className="flex items-center justify-center gap-2">
        <Bone className="size-9 rounded-full" />
        <Bone className="size-9 rounded-full" />
      </div>
    </div>
  );
}
