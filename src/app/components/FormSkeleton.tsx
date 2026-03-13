export default function TableSkeleton({ rows = 1, cols = 1 }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="animate-pulse flex gap-1">
        <div className="bg-gray-100 rounded-lg h-10 w-10"></div>
        {[...Array(cols)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg h-10 flex-grow"></div>
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="w-full flex items-center gap-1 pulse">
          <div className="bg-gray-200 rounded-lg h-12 w-10"></div>
          {[...Array(cols)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-200/80 rounded-lg h-12 flex-grow"
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
}
