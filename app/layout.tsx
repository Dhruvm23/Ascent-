import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { AccessibilityDock } from "@/components/a11y/accessibility-dock";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ascent — Everyone climbs differently",
  description:
    "An adaptive learning system that maps your evolving knowledge as a route up a mountain, and plots the next best step for you alone.",
  applicationName: "Ascent",
};

export const viewport: Viewport = {
  themeColor: "#eae7de",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} ${spaceMono.variable} h-full antialiased`}
      data-mode="focus"
    >
      <body className="min-h-full">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AppProviders>
          <SmoothScroll />
          {children}
          <AccessibilityDock />
        </AppProviders>
      </body>
    </html>
  );
}
