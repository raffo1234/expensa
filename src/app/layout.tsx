import type { Metadata } from "next";
import "./globals.css";
import GlobalModal from "@/components/GlobalModal";
import { Toaster } from "react-hot-toast";
import { ReactScan } from "@/components/ReactScan";
import Slider from "@/components/Slider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import Providers from "@/components/Providers";
import { Bricolage_Grotesque, Cormorant } from "next/font/google";

const siteName = "Finolis";
const title = "Finolis - Gestión de Gastos Inteligente";
const description =
  "Registra, organiza y analiza tus gastos en un solo lugar. Facturas, adjuntos y reportes en tiempo real.";

const url = "https://expensa-sigma.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title,
  description,
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title,
    description,
    url: url,
    siteName: siteName,
    images: [
      {
        url: "/expensa-hero.png?v=2",
        width: 1200,
        height: 630,
        alt: `${title} - ${description}`,
      },
    ],
    type: "website",
  },
};

interface LayoutProps {
  children: React.ReactNode;
}

const cormorant = Cormorant({
  subsets: ["latin"],
  variable: "--font-title",
  weight: ["300", "400", "500", "600"],
});

// Same family as Fly.io's dashboard ("Fricolage Grotesque" is their build of
// Bricolage Grotesque). Variable weight/width/optical size, so the 325 base
// weight and 98.5% width below render exactly.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-body",
  weight: "variable",
  axes: ["opsz", "wdth"],
});

export default async function Layout({ children }: Readonly<LayoutProps>) {
  const [messages, locale] = await Promise.all([getMessages(), getLocale()]);

  return (
    <html lang={locale} className={`${cormorant.variable} ${bricolage.variable}`}>
      <head>
        <meta property="og:logo" content="https://expensa-sigma.vercel.app/expensa-hero.png" />
      </head>
      <body className="bg-slate-100 font-sans">
        <Toaster toastOptions={{ className: "text-xs" }} />
        {process.env.NODE_ENV === "development" && <ReactScan />}
        <Providers>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
          <GlobalModal />
          <Slider />
        </Providers>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
