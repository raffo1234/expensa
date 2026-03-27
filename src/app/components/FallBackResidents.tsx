export default function FallBackResidents() {
  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
      }}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-[150px] bg-gray-100 animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}
