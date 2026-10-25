import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://osirisai.live"),
  title: "OSIRIS — Open Source Intelligence Platform | Live Flights, Satellites, CCTV & OSINT Tools",
  description:
    "The open-source Palantir alternative. Track live aircraft, satellites, vessels and worldwide CCTV on a 3D globe. Run DNS, WHOIS, TLS, BGP and port reconnaissance from your browser. 20+ live intelligence feeds.",
  keywords: [
    "OSINT", "open source intelligence", "flight tracker", "satellite tracker", "CCTV", "live cameras",
    "earthquake monitor", "wildfire tracker", "cyber threats", "port scanner", "DNS lookup", "WHOIS",
    "BGP", "threat intelligence", "geospatial intelligence", "Palantir alternative", "OSIRIS",
  ],
  authors: [{ name: "Osiris Project" }],
  creator: "Osiris Project",
  publisher: "Osiris Project",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    title: "OSIRIS — The Open-Source Palantir Alternative",
    description:
      "Track 10K+ aircraft, satellites and worldwide CCTV on a 3D globe. 20+ live intelligence feeds and a full OSINT recon toolkit. Free and open source.",
    url: "/",
    siteName: "OSIRIS",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "OSIRIS — Global Intelligence Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OSIRIS — Open Source Palantir Alternative",
    description: "Live flights, satellites, CCTV, hazards and OSINT tools on a 3D globe.",
    images: ["/og.svg"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/favicon.svg" },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#d4af37",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
