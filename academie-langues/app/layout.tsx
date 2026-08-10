import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import ClientLayout from "./components/ClientLayout";
import AppBootGate from "./components/AppBootGate";
import OfflineBanner from "./components/OfflineBanner";
import { I18nProvider } from "./i18n/I18nProvider";
import { ActionFeedbackProvider } from "./components/ActionFeedback";

const inter = Inter({ subsets: ["latin"] });

// 🐚 PATTERN CAURI (Doux, couleur orange NEXA)
const cowriePattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='80' height='80' opacity='0.04' fill='%23ea580c'%3E%3Cpath d='M50 10 C30 10 20 30 20 50 C20 75 35 90 50 90 C65 90 80 75 80 50 C80 30 70 10 50 10 Z M50 80 C40 80 35 65 35 50 C35 35 45 20 50 20 C55 20 65 35 65 50 C65 65 60 80 50 80 Z'/%3E%3Cpath d='M50 25 C48 35 52 45 48 55 C52 65 48 75 50 75' stroke='%23ea580c' stroke-width='4' fill='none' stroke-linecap='round'/%3E%3Cpath d='M44 35 L48 37 M44 45 L49 45 M44 55 L48 53 M56 35 L52 37 M56 45 L51 45 M56 55 L52 53' stroke='%23ea580c' stroke-width='3' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`;

export const metadata: Metadata = {
  title: "NEXA",
  description: "L'école de l'élite",
  manifest: "/manifest.json",
  icons: {
    // 🍎 Apple (iPhone / iPad)
    apple: [
      { url: "/apple-touch-icon.png",     sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-152.png", sizes: "152x152", type: "image/png" },
    ],
    // 🖥️ PC & Mac (onglet navigateur)
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16",  type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32",  type: "image/png" },
      { url: "/icon-192.png",      sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png",      sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon-32x32.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#11224E",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="scroll-smooth" data-scroll-behavior="smooth">
      <body
        className={`${inter.className} bg-neutral-50 w-full text-neutral-900`}
        style={{ minHeight: "100dvh" }}
      >
        {/* 🖼️ L'EFFET "CADRE PHOTO" (VIGNETTE)
          Le z-0 le met derrière la sidebar/navbar.
          Le mask-image rend le centre totalement transparent.
        */}
        <div 
          className="fixed inset-0 pointer-events-none z-0" 
          style={{ 
            backgroundImage: cowriePattern,
            backgroundRepeat: "repeat",
            WebkitMaskImage: "radial-gradient(ellipse at center, transparent 50%, black 100%)",
            maskImage: "radial-gradient(ellipse at center, transparent 50%, black 100%)"
          }} 
        />

        {/* Le contenu de l'application passe au premier plan (z-10) */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <I18nProvider>
            <ActionFeedbackProvider>
              <OfflineBanner />
              <AppBootGate>
                <ClientLayout>{children}</ClientLayout>
              </AppBootGate>
            </ActionFeedbackProvider>
          </I18nProvider>
        </div>
      </body>
    </html>
  );
}
