import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getFontVariables } from "@/lib/fonts";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { publicEnv } from "@/lib/env/public";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.appUrl),
  title: {
    default: "Pick Up — Everything You Need, Delivered Fast",
    template: "%s | Pick Up",
  },
  description:
    "Pick Up is Khagrachari Sadar's marketplace for groceries, everyday essentials, and restaurant food — ordered online and delivered fast.",
  openGraph: {
    siteName: "Pick Up",
    type: "website",
    locale: "en_BD",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#1b5e20",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, dict } = await getDictionary();

  return (
    <html lang={locale} className={`${getFontVariables(locale)} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white text-brand-dark">
        <LocaleProvider locale={locale} dict={dict}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
