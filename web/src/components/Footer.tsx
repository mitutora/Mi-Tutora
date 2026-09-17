'use client';

import { motion } from 'motion/react';
import { Phone, Mail, MapPin } from 'lucide-react';
import Image from 'next/image';
const logo = '/logo.png';

const FooterLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <li>
    <a href={href} className="group relative inline-block hover:text-[#00a992] transition-colors duration-300">
      {children}
      <span className="absolute left-0 bottom-0 w-0 h-px bg-[#00a992] transition-all duration-300 group-hover:w-full"></span>
    </a>
  </li>
);

const FacebookIcon = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

const InstagramIcon = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
);

const LinkedInIcon = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
);

const RedditIcon = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.703zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
);

export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-[#063831] to-[#04241f] border-t border-white/5 text-white px-4 sm:px-6 md:px-12 lg:px-20 xl:px-28 py-16 sm:py-20 relative overflow-hidden w-full">
      {/* Subtle bottom edge spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#00a992]/10 via-transparent pointer-events-none" />

      {/* TOP GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-8 max-w-7xl mx-auto relative z-10">
        {/* LEFT SECTION (Logo & About) */}
        <div className="col-span-2 lg:col-span-2">
          <a href="#hero" className="inline-block mb-4 transition-transform hover:scale-105 duration-300">
            <Image
              src={logo}
              alt="MiTutora"
              width={200}
              height={65}
              className="h-11 sm:h-12 w-auto object-contain -ml-1"
            />
          </a>

          <p className="text-xs sm:text-sm text-gray-300 mb-4 leading-relaxed font-medium">
            Trusted home tuition and online learning platform helping students achieve academic excellence across India.
          </p>

          <div className="space-y-2 text-xs sm:text-sm text-gray-400 mt-6">
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#00a992]" />
              <span className="text-white font-medium">Phone:</span> +91 7483034168
            </p>
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#00a992]" />
              <span className="text-white font-medium">Mail:</span> mitutoraeducation@gmail.com
            </p>
            <p className="flex items-start gap-2 mt-3 leading-relaxed max-w-sm">
              <MapPin className="w-4 h-4 text-[#00a992] mt-0.5" />
              <span>Bengaluru, Karnataka, India</span>
            </p>
          </div>
        </div>

        {/* QUICK LINKS */}
        <div className="col-span-1 lg:col-span-1">
          <h3 className="font-semibold text-white mb-4 text-sm sm:text-base tracking-wide uppercase">
            Quick Links
          </h3>
          <ul className="space-y-3 text-gray-400 text-xs sm:text-sm font-medium">
            <FooterLink href="#hero">Home</FooterLink>
            <FooterLink href="#services">Services</FooterLink>
            <FooterLink href="#how-it-works">How It Works</FooterLink>
            <FooterLink href="#testimonials">Testimonials</FooterLink>
            <FooterLink href="#faq">FAQ</FooterLink>
          </ul>
        </div>

        {/* TOP SERVICES */}
        <div className="col-span-1 lg:col-span-1">
          <h3 className="font-semibold text-white mb-4 text-sm sm:text-base tracking-wide uppercase">
            Top Services
          </h3>
          <ul className="space-y-3 text-gray-400 text-xs sm:text-sm font-medium">
            <FooterLink href="#services">Home Tuition</FooterLink>
            <FooterLink href="#services">Online Classes</FooterLink>
            <FooterLink href="#services">NEET Coaching</FooterLink>
            <FooterLink href="#services">JEE Coaching</FooterLink>
          </ul>
        </div>

        {/* MORE SERVICES */}
        <div className="col-span-1 lg:col-span-1">
          <h3 className="font-semibold text-white mb-4 text-sm sm:text-base tracking-wide uppercase">
            More Services
          </h3>
          <ul className="space-y-3 text-gray-400 text-xs sm:text-sm font-medium">
            <FooterLink href="#services">Coding Classes</FooterLink>
            <FooterLink href="#services">Language Training</FooterLink>
            <FooterLink href="#services">Spoken English</FooterLink>
            <FooterLink href="#services">Exam Prep</FooterLink>
          </ul>
        </div>

        {/* POLICIES */}
        <div className="col-span-1 lg:col-span-1">
          <h3 className="font-semibold text-white mb-4 text-sm sm:text-base tracking-wide uppercase">
            Legal & Policies
          </h3>
          <ul className="space-y-3 text-gray-400 text-xs sm:text-sm font-medium">
            <li>
              <a href="/pdfs/privacy-policy.pdf#toolbar=0" target="_blank" rel="noopener noreferrer" className="hover:text-[#00a992] transition-colors duration-300">Privacy Policy</a>
            </li>
            <li>
              <a href="/pdfs/terms-and-conditions.pdf#toolbar=0" target="_blank" rel="noopener noreferrer" className="hover:text-[#00a992] transition-colors duration-300">Terms of Service</a>
            </li>
            <li>
              <a href="/pdfs/refund-policy.pdf#toolbar=0" target="_blank" rel="noopener noreferrer" className="hover:text-[#00a992] transition-colors duration-300">Refund Policy</a>
            </li>
          </ul>
        </div>
      </div>

      {/* DIVIDER & BOTTOM SECTION */}
      <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto relative z-10">
        <p className="text-xs sm:text-sm text-gray-500 text-center md:text-left font-medium">
          &copy; {new Date().getFullYear()} MiTutora. All rights reserved.
        </p>

        {/* SOCIAL ICONS */}
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <a
            href="https://www.instagram.com/mi_tutora?igsh=MXZ2M3J6YmZsOXVn0Q=="
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="w-10 h-10 border border-white/10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-gradient-to-r hover:from-[#00a992] hover:to-emerald-600 hover:border-transparent text-gray-400 hover:text-white transition-all duration-300 shadow-lg hover:shadow-[#00a992]/30 hover:-translate-y-1"
          >
            <InstagramIcon size={18} />
          </a>
          <a
            href="https://www.facebook.com/share/1CVSDJaYhA/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="w-10 h-10 border border-white/10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-gradient-to-r hover:from-[#00a992] hover:to-emerald-600 hover:border-transparent text-gray-400 hover:text-white transition-all duration-300 shadow-lg hover:shadow-[#00a992]/30 hover:-translate-y-1"
          >
            <FacebookIcon size={18} />
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X (formerly Twitter)"
            className="w-10 h-10 border border-white/10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-gradient-to-r hover:from-[#00a992] hover:to-emerald-600 hover:border-transparent text-gray-400 hover:text-white transition-all duration-300 shadow-lg hover:shadow-[#00a992]/30 hover:-translate-y-1"
          >
            <XIcon size={16} />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="w-10 h-10 border border-white/10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-gradient-to-r hover:from-[#00a992] hover:to-emerald-600 hover:border-transparent text-gray-400 hover:text-white transition-all duration-300 shadow-lg hover:shadow-[#00a992]/30 hover:-translate-y-1"
          >
            <LinkedInIcon size={18} />
          </a>
          <a
            href="https://reddit.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Reddit"
            className="w-10 h-10 border border-white/10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-gradient-to-r hover:from-[#00a992] hover:to-emerald-600 hover:border-transparent text-gray-400 hover:text-white transition-all duration-300 shadow-lg hover:shadow-[#00a992]/30 hover:-translate-y-1"
          >
            <RedditIcon size={18} />
          </a>
        </div>
      </div>
    </footer>
  );
}
