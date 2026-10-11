import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/components/LocaleProvider";
import { Nav } from "@/components/Nav";
import { getRequestUiLocale } from "@/lib/locale-server";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "GSC · Bing · Yandex Dashboard",
  description: "Self-hosted dashboard for Google Search Console, Bing Webmaster Tools, and Yandex Webmaster",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestUiLocale();

  return (
    <html lang={locale} className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <LocaleProvider locale={locale}>
          <div className="shell">
            <Nav />
            <main className="mt-8">{children}</main>
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
