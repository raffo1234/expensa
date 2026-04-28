export default function FormInnerSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-purple-200 rounded-xl p-5 shadow-xl shadow-purple-100">
      {children}
    </div>
  );
}
