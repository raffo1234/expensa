export default function MySettingsPageFallBack() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 1 }, (_, i) => (
        <div key={i} className="h-[8] w-full bg-gray-100 animate-pulse rounded" />
      ))}
    </div>
  );
}
