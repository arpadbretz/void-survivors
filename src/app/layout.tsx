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

export const metadata: Metadata = {
  title: "Void Survivors — A Neon Roguelike",
  description:
    "Survive endless waves of geometric enemies in this browser-based action roguelike. No downloads, no installs — just pure neon chaos.",
  keywords: [
    "roguelike",
    "survivors",
    "browser game",
    "neon",
    "action",
    "geometric",
    "free",
  ],
  authors: [{ name: "Prometheus Digital Kft." }],
  openGraph: {
    title: "Void Survivors — A Neon Roguelike",
    description:
      "Survive endless waves of geometric enemies in this browser-based action roguelike.",
    type: "website",
    siteName: "Void Survivors",
  },
  twitter: {
    card: "summary_large_image",
    title: "Void Survivors — A Neon Roguelike",
    description:
      "Survive endless waves of geometric enemies in this browser-based action roguelike.",
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
