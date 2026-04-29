export default function FormInnerSection({
  padding = true,
  children,
}: {
  padding?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border bg-white border-purple-100 rounded-xl shadow-xl shadow-purple-50 ${padding ? "p-5" : ""}`}
    >
      {children}
    </div>
  );
}
