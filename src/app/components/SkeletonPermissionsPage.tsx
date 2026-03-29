export default function SkeletonPermissionsPage() {
  return (
    <div className="border-x border-b border-gray-200 bg-white rounded-xl">
      {Array.from({ length: 15 }, (_, i) => (
        <div
          key={i}
          className="px-6 py-4 first:rounded-t-xl w-full last:rounded-b-xl border-t border-gray-200 flex items-start gap-4 hover:bg-gray-50 transition-colors duration-200"
        >
          <div className="mt-0.5 w-[34px] h-[34px] p-2 rounded-lg animate-pulse bg-gray-100 flex-shrink-0"></div>
          <div className="w-full">
            <div className="h-5 w-2/3 bg-slate-100 rounded mb-1 animate-pulse"></div>
            <div className="h-5 w-1/2 bg-slate-100 rounded animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
