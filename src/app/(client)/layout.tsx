import "../globals.css";
import Header from "@/components/Header";

export default async function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className="w-full">
        <Header />
      </header>
      {children}
    </>
  );
}
