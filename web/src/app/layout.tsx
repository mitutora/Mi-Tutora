import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/index.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://mitutora.com'),
  title: {
    default: "MiTutora - Transforming Education in India",
    template: "%s | MiTutora",
  },
  description: "India's fastest-growing platform connecting students with highly qualified, background-verified tutors for offline and online classes.",
  keywords: ["online tutoring India", "home tuition", "private tutors", "verified educators", "online classes", "CBSE", "ICSE", "State Board", "NEET", "JEE"],
  authors: [{ name: "MiTutora" }],
  creator: "MiTutora",
  publisher: "MiTutora",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: "MiTutora - Transforming Education in India",
    description: "Connect with highly qualified tutors for offline and online classes.",
    url: "https://mitutora.com",
    siteName: "MiTutora",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "MiTutora Logo",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MiTutora - Transforming Education",
    description: "India's fastest-growing platform connecting students with top tutors.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import { Toaster } from "sonner";
import { Suspense } from "react";
import { ReferralTracker } from "@/components/ReferralTracker";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "MiTutora",
    "url": "https://mitutora.com",
    "logo": "https://mitutora.com/imports/logo.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+91-7483034168",
      "contactType": "customer service",
      "areaServed": "IN",
      "availableLanguage": ["English", "Hindi"]
    }
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white">
        <Suspense fallback={null}>
          <ReferralTracker />
        </Suspense>
        {children}
        <Toaster position="top-right" richColors expand={true} />
      </body>
    </html>
  );
}
