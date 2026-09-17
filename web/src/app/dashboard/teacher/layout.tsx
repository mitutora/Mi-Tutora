import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teacher Dashboard",
  description: "Teacher dashboard portal for MiTutora.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
