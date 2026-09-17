"use client";

import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import TeacherForm from '@/components/TeacherForm';
import { TrustSection } from '@/components/TrustSection';
import { WhyChooseUs } from '@/components/WhyChooseUs';
import { ImageShowcase } from '@/components/ImageShowcase';
import { ServicesGrid } from '@/components/ServicesGrid';
import { HowItWorks } from '@/components/HowItWorks';
import { TutorJoin } from '@/components/TutorJoin';
import { Testimonials } from '@/components/Testimonials';
import { FAQ } from '@/components/FAQ';
import { ContactSection } from '@/components/ContactSection';
import { AppDownload } from '@/components/AppDownload';
import { LocationsSection } from '@/components/LocationsSection';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';


export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      

      <Navbar />
      <Hero />
      <TrustSection />
      <WhyChooseUs />
      <ImageShowcase />
      <ServicesGrid />
      <HowItWorks />
      <TutorJoin />
      <Testimonials />
      <FAQ />
      <LocationsSection />
      <ContactSection />
      <AppDownload />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
