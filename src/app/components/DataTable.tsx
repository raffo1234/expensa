"use client";

type Column = { label: string; className?: string };

interface DataTableProps {
  columns: Column[];
  isEmpty?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

export default function DataTable({ columns, isEmpty, isLoading, emptyMessage, children }: DataTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 border-gray-200 text-left text-xs uppercase text-gray-800">
            {columns.map((col, i) => (
              <th key={i} className={`p-6 ${col.className ?? ""}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 10 }, (_, i) => (
              <tr key={i} className="border-b border-gray-50">
                {columns.map((_, j) => (
                  <td key={j} className="p-6">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-10 text-center text-gray-400">
                {emptyMessage ?? "No data found"}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function DataTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${className ?? ""}`}>
      {children}
    </tr>
  );
}
