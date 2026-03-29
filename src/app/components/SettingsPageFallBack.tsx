export default function SettingsPageFallBack() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 1 }, (_, i) => (
        <div key={i} className="h-[156px] w-full bg-slate-100 animate-pulse rounded-xl" />
      ))}
    </div>
  );
}
