import type { Metadata } from "next";
import { Noto_Sans_Devanagari, Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import MuiProvider from "@/providers/MuiProvider";

// Same faces as the digital desk. Roboto has no Hindi letters, so Noto Sans Devanagari
// covers those; Roboto Mono is for slugs, FTP paths and times.
const roboto = Roboto({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-roboto" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "600"], display: "swap", variable: "--font-mono" });
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-devanagari" });

export const metadata: Metadata = {
  title: "Samvadia - Assignment Desk",
  description: "Samvadia is the Vartamaan AI assignment desk for 1st India News: WhatsApp and Outlook intake, FTP filing and the RSS feed for Octopus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${roboto.variable} ${robotoMono.variable} ${devanagari.variable}`}>
      <body>
        {/* Collects Emotion's styles into <head> during server rendering, so the HTML matches on hydration */}
        <AppRouterCacheProvider>
          <MuiProvider>{children}</MuiProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
