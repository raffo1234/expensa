export default function FormSection({
  title,
  padding = true,
  children,
}: {
  title?: string;
  padding?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border-violet-200 shadow-violet-100 shadow-lg ${padding ? "p-6" : ""} bg-white border rounded-xl`}
    >
      {title && (
        <h2 className="border-b px-6 pb-6 mb-6 -ml-6 -mr-6 border-gray-200 text-lg font-semibold text-gray-800">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
