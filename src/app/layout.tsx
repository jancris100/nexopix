import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { I18nProvider } from "../i18n/client";
import { getDictionary, getLocale } from "../i18n/server";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    metadataBase: new URL("https://nexopix.vercel.app"),
    title: "Nexopix",
    description: t.home.description,
    openGraph: { images: ["/banner.png"] },
    other: { google: "notranslate" },
    appleWebApp: { capable: true, title: "Nexopix", statusBarStyle: "default" },
  };
}

/** Reaches the edges of phones with a notch; the screens keep their content inside the safe area. */
export const viewport: Viewport = {
  themeColor: "#F5F6F3",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} translate="no" className={sans.variable}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
