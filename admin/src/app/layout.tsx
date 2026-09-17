import type { Metadata } from "next";
import "./globals.css";
import { AdminAuthProvider } from "../context/AdminAuthContext";
import { AdminLayoutWrapper } from "../components/layout/AdminLayoutWrapper";

export const metadata: Metadata = {
  title: "MiTutora Operations | Admin Dashboard",
  description: "Internal operations, demo tracking, active tuitions, and manual payout fulfillment portal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans text-slate-900 bg-slate-50 min-h-screen">
        <AdminAuthProvider>
          <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
