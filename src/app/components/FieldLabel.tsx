export default function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="inline-block mb-2 text-sm">
      {children}
    </label>
  );
}
