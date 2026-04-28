export default function FormSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-violet-200 shadow-violet-100 shadow-lg p-6 bg-white border rounded-xl">
      {children}
    </div>
  );
}
