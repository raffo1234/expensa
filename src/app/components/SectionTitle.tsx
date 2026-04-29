export default function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold mb-2">
      {children}
    </h2>
  );
}
