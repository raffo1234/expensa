export default function SkeletonPermissionsPage() {
  return (
    <div className="flex flex-col gap-px">
      {Array.from({ length: 15 }, (_, i) => (
        <div key={i} className="rounded-xl bg-slate-100 w-full h-[80px] animate-pulse"></div>
      ))}
    </div>
  );
}
