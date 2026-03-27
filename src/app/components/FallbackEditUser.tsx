export default function FallbackEditUser() {
  return (
    <div className="flex flex-col gap-4">
      <div className="w-full rounded-xl bg-slate-100 animate-pulse h-[98px]"></div>
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="flex flex-col gap-4">
          <div className="w-full rounded-xl bg-slate-100 animate-pulse h-[156px]"></div>
        </div>
      ))}
      <div className="w-full rounded-xl bg-slate-100 animate-pulse h-[164px]"></div>
    </div>
  );
}
