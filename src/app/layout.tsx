import { Analytics } from "@vercel/analytics/next";
import { SiteFooter } from "@/components/site-footer";
import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import { env } from "@/lib/env";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: { default: "VO GOAT", template: "%s · VO GOAT" },
  description:
    "The daily voiceover game. One shared voice recipe a day: record your take, collect the creature, share the card.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-direction="field-guide" className={`${geist.variable} ${instrumentSerif.variable}`}>
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:outline-2 focus:outline-offset-2 focus:outline-current"
        >
          Skip to content
        </a>
        {children}
        <SiteFooter />
        {/* Cookieless pageview counts; sends nothing until Web Analytics is enabled on the project. */}
        <Analytics />
      </body>
    </html>
  );
}
