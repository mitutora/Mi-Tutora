import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#063831" },
    { media: "(prefers-color-scheme: dark)", color: "#04241f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mitutora.in"),
  alternates: {
    canonical: "https://www.mitutora.in",
    languages: {
      "en-IN": "https://www.mitutora.in",
    },
  },
  title: {
    default: "MiTutora | Find Verified Home & Online Tutors in India",
    template: "%s | MiTutora",
  },
  description:
    "Book verified 1-on-1 home and online tutors across India for CBSE, ICSE, State Boards, NEET, JEE, Coding & Languages. 100% background-verified educators.",
  keywords: [
    "home tutors near me",
    "private tutors India",
    "online tuition India",
    "CBSE home tutor",
    "ICSE private tutor",
    "NEET biology coaching",
    "JEE physics tutor",
    "home tuition Bengaluru",
    "home tutors Delhi NCR",
    "home tutors Mumbai",
    "online coding classes for kids",
    "verified tutors India",
    "MiTutora",
  ],
  authors: [{ name: "MiTutora", url: "https://www.mitutora.in" }],
  creator: "MiTutora",
  publisher: "MiTutora",
  category: "education",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "MiTutora | Find Verified Home & Online Tutors in India",
    description:
      "Connect with background-verified tutors for 1-on-1 home tuition and interactive online classes across India.",
    url: "https://www.mitutora.in",
    siteName: "MiTutora",
    images: [
      {
        url: "/imports/logo.png",
        width: 1200,
        height: 630,
        alt: "MiTutora - Home and Online Tutors in India",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MiTutora | Find Verified Home & Online Tutors in India",
    description:
      "Connect with background-verified tutors for 1-on-1 home tuition and interactive online classes across India.",
    images: ["/imports/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
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
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": "https://www.mitutora.in/#organization",
        name: "MiTutora",
        url: "https://www.mitutora.in",
        logo: "https://www.mitutora.in/imports/logo.png",
        description:
          "India's leading platform connecting students with background-verified private and online tutors.",
        address: {
          "@type": "PostalAddress",
          addressCountry: "IN",
        },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+91-7483034168",
          email: "mitutoraeducation@gmail.com",
          contactType: "customer service",
          areaServed: "IN",
          availableLanguage: ["English", "Hindi"],
        },
      },
      {
        "@type": "WebSite",
        "@id": "https://www.mitutora.in/#website",
        url: "https://www.mitutora.in",
        name: "MiTutora",
        publisher: {
          "@id": "https://www.mitutora.in/#organization",
        },
        potentialAction: {
          "@type": "SearchAction",
          target: "https://www.mitutora.in/?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Service",
        "@id": "https://www.mitutora.in/#service",
        name: "Home & Online Private Tutoring Services",
        serviceType: "Private Tutoring",
        provider: {
          "@id": "https://www.mitutora.in/#organization",
        },
        areaServed: {
          "@type": "Country",
          name: "India",
        },
        offers: {
          "@type": "Offer",
          priceCurrency: "INR",
        },
      },
    ],
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
