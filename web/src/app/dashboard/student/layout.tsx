import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Dashboard",
  description: "Student dashboard portal for MiTutora.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
