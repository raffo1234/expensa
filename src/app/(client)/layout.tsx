import Main from "@/components/Main";
import "../globals.css";
import Header from "@/components/Header";

export default async function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className="w-full h-20">
        <Header />
      </header>
      <Main>{children}</Main>
    </>
  );
}
