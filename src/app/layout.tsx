import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SITE } from "@/lib/site";
import { GlobalSiteHead } from "@/components/ads/global-site-ads";
import { GlobalSiteScripts } from "@/components/ads/global-site-scripts";
import "@/styles/tokens.css";
import "./globals.css";

// Variable Schrift: eine Datei für alle Stärken (400–800) statt fünf einzelner Dateien.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
// Nur für Code/Prüfsummen – nicht auf jeder Seite vorladen.
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Premium Gaming Mods Marketplace`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name }],
  keywords: [
    "gaming mods",
    "FiveM mods",
    "Minecraft mods",
    "ETS2 mods",
    "BeamNG mods",
    "Assetto Corsa mods",
    "premium mods",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.description,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/app-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/app-icon.svg" }],
  },
};

// Supabase-Session-Cookie: sb-<projekt>-auth-token (ggf. .0/.1). Nur ein Hinweis fürs Ausblenden, keine Auth.
const SESSION_HINT_SCRIPT =
  String.raw`try{if(/(?:^|;\s*)sb-[^=;]*-auth-token/.test(document.cookie))document.documentElement.classList.add("has-session")}catch(e){}`;

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Vor dem ersten Paint: angemeldet? Dann Werbeflächen bis zur Prüfung ausblenden (AdGate). */}
        <script dangerouslySetInnerHTML={{ __html: SESSION_HINT_SCRIPT }} />
        <GlobalSiteHead />
      </head>
      <body className={`${inter.variable} ${mono.variable} font-sans`}>
        {children}
        <GlobalSiteScripts />
      </body>
    </html>
  );
}
