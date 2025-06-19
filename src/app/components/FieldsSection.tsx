export default function FieldsSection({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex p-4 sm:p-5 md:p-6 flex-col gap-4 border border-gray-200 rounded-xl bg-white">
      {children}
    </div>
  );
}
