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
  "Play Void Survivors free in your browser — a neon roguelike survivors game with 11 abilities, 6 evolutions, 7 synergies, 8 enemy types, 5 elite variants, 3 bosses, 5 characters, 40 achievements, mini-map, global leaderboard, daily challenges, and meta-progression. No download required.";
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
    "io game",
    "web game",
    "free game",
    "survivors game",
    "play in browser",
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
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-192.png",
  },
  other: {
    "application-name": "Void Survivors",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a12",
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Void Survivors",
    url: SITE_URL,
    image: OG_IMAGE,
    description: DESCRIPTION,
    genre: ["Roguelike", "Action", "Bullet Hell", "Survivors", "io Game"],
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
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is Void Survivors free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Void Survivors is 100% free to play with no ads, no microtransactions, and no account required. Just open the game in your browser and start playing instantly.",
        },
      },
      {
        "@type": "Question",
        name: "Does Void Survivors work on mobile?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! The game features touch controls with a virtual joystick and dash button. Install it as a PWA for the best mobile experience with offline play support.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need to download anything to play Void Survivors?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Void Survivors runs entirely in your browser with no downloads or plugins required. You can optionally install it as a Progressive Web App for offline play.",
        },
      },
      {
        "@type": "Question",
        name: "How many characters are there in Void Survivors?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "There are 5 playable characters, each with unique stats and starting abilities: Void Walker, Phantom, Sentinel, Arcanist, and Chronomancer. Each character offers a different playstyle.",
        },
      },
      {
        "@type": "Question",
        name: "What is the Daily Challenge in Void Survivors?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Every day features a new challenge with unique modifiers that change how the game plays. Compete against yourself for the best daily score!",
        },
      },
      {
        "@type": "Question",
        name: "What are Ability Synergies in Void Survivors?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Certain ability combinations unlock powerful synergy bonuses like extra damage, faster cooldowns, or health regeneration. Look for the golden synergy badge when choosing upgrades to build powerful combos.",
        },
      },
      {
        "@type": "Question",
        name: "Is there a global leaderboard in Void Survivors?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Compete with players worldwide on both all-time and daily leaderboards. Set your player name and your best scores are automatically submitted after each run.",
        },
      },
    ],
  },
];

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
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </body>
    </html>
  );
}
