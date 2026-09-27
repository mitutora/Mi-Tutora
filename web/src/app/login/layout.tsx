import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login / Portal Access",
  description: "Login to your MiTutora student or teacher account to manage your classes, schedules, and earnings.",
  alternates: {
    canonical: "https://www.mitutora.in/login",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
