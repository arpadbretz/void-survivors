import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://void-survivors.vercel.app";
const TITLE = "Void Survivors — A Neon Roguelike";
const DESCRIPTION =
  "Survive endless waves of geometric enemies in this free browser-based action roguelike. No downloads, no installs — just pure neon chaos. WASD to move, auto-fire abilities, and level up with powerful upgrades.";
const OG_IMAGE = `${SITE_URL}/api/og`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "roguelike",
    "survivors",
    "browser game",
    "neon",
    "action",
    "geometric",
    "free",
    "void survivors",
    "bullet hell",
    "auto-battler",
    "indie game",
    "HTML5 game",
    "no download",
    "online game",
  ],
  authors: [{ name: "Prometheus Digital Kft." }],
  creator: "Prometheus Digital Kft.",
  publisher: "Prometheus Digital Kft.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Void Survivors",
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Void Survivors — Survive endless neon waves in your browser",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  icons: {
    icon: "/favicon.svg",
  },
  other: {
    "application-name": "Void Survivors",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a12",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "Void Survivors",
  url: SITE_URL,
  image: OG_IMAGE,
  description: DESCRIPTION,
  genre: ["Roguelike", "Action", "Bullet Hell", "Survivors"],
  gamePlatform: ["Web Browser"],
  applicationCategory: "Game",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  author: {
    "@type": "Organization",
    name: "Prometheus Digital Kft.",
  },
  publisher: {
    "@type": "Organization",
    name: "Prometheus Digital Kft.",
  },
  playMode: "SinglePlayer",
  numberOfPlayers: {
    "@type": "QuantitativeValue",
    value: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
