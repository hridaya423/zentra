import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zentra - AI-Powered Travel Planning",
  description: "Create perfect travel itineraries with AI. Plan multi-destination trips, find accommodations, and discover unique experiences tailored to your preferences.",
  keywords: ["travel planning", "AI travel", "itinerary planner", "vacation planning", "trip planner"],
  authors: [{ name: "Zentra" }],
  openGraph: {
    title: "Zentra - Your Journey Starts Here",
    description: "AI-powered travel planning that creates personalized itineraries for your perfect trip.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zentra - AI-Powered Travel Planning",
    description: "Create perfect travel itineraries with AI-powered personalization.",
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${inter.variable} font-body antialiased bg-white text-gray-900`}
      >
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-teal-50 bg-pattern">
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
