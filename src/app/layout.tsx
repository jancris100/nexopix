import type { Metadata } from "next";
import { Handjet, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const pixel = Handjet({ subsets: ["latin"], variable: "--font-pixel", weight: ["400", "500", "600", "700"] });
const body = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  metadataBase: new URL("https://nexopix.vercel.app"),
  title: "Nexopix",
  description: "Middleware de agentes de IA para Instagram y Facebook, conectado por API, con aprobación humana.",
  openGraph: { images: ["/banner.png"] },
  other: { google: "notranslate" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" translate="no" className={`${pixel.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
