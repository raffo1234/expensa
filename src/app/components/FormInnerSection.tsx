export default function FormInnerSection({
  padding = true,
  children,
}: {
  padding?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border bg-white border-violet-100 rounded-xl shadow-xl shadow-violet-50 ${padding ? "p-4 sm:p-5" : ""}`}
    >
      {children}
    </div>
  );
}
