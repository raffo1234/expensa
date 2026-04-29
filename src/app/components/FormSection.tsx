export default function FormSection({
  padding = true,
  children,
}: {
  padding?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border-violet-200 shadow-violet-100 shadow-lg ${padding ? "p-6" : ""} bg-white border rounded-xl`}
    >
      {children}
    </div>
  );
}
