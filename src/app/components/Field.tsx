export default function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && (
        <p
          style={{ margin: 0, fontSize: 12, color: "#9ca3af", fontFamily: "'DM Sans', sans-serif" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
