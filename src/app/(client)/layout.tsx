import "../globals.css";
import Header from "@/components/Header";

export default async function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <header className="w-full h-20">
        <Header />
      </header>
      {children}
    </div>
  );
}
