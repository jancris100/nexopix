import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://nexopix.vercel.app"),
  title: "Nexopix",
  description: "Middleware de agentes de IA para Instagram y Facebook, conectado por API, con aprobación humana.",
  openGraph: { images: ["/banner.png"] },
  other: { google: "notranslate" },
  appleWebApp: { capable: true, title: "Nexopix", statusBarStyle: "default" },
};

/** Reaches the edges of phones with a notch; the screens keep their content inside the safe area. */
export const viewport: Viewport = {
  themeColor: "#F5F6F3",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" translate="no" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
