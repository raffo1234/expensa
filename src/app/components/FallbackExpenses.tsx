// components/FallbackExpenses.tsx
export default function FallbackExpenses() {
  return (
    <div className="pt-10 pb-6 animate-pulse">
      {/* Header */}
      <div className="h-4 w-24 bg-gray-200 rounded mb-6" />
      <div className="flex items-center justify-between w-full mb-6">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="flex items-center gap-3">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-8 w-20 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Table header */}
      <div className="flex gap-4 px-4 mb-3">
        {[120, 80, 100, 80, 100, 60].map((w, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded" style={{ width: w }} />
        ))}
      </div>

      {/* Table rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-t border-gray-100">
          {[120, 80, 100, 80, 100, 60].map((w, j) => (
            <div key={j} className="h-3 bg-gray-100 rounded" style={{ width: w }} />
          ))}
        </div>
      ))}
    </div>
  );
}
