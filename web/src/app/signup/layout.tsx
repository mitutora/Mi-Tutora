import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up / Register",
  description: "Create your MiTutora account to access top tutors or start teaching across India.",
  alternates: {
    canonical: "https://www.mitutora.in/signup",
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
