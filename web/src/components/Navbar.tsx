'use client';

import { useState, useEffect } from 'react';
import { Menu, X, Phone, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';

const logo = '/logo.png';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      setIsMobileMenuOpen(false);
    }
  };

  const openTeacherForm = () => {
    const event = new CustomEvent('openTeacherForm');
    window.dispatchEvent(event);
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    'Services',
    'How It Works',
    'Testimonials',
    'FAQ',
  ];

  return (
    <header className="w-full fixed top-0 left-0 z-50">
      {/* Top Bar (From Ecoparadigm) */}
      <div className="bg-[#04241f] text-white text-xs sm:text-sm px-4 sm:px-6 py-2 flex flex-wrap justify-between items-center gap-2 relative z-50">
        <div className="flex gap-4">
          <p className="flex items-center gap-1.5 opacity-90">
            <Phone className="w-3.5 h-3.5 text-[#00a992]" />
            <span className="font-semibold text-[#00a992]">Enquiry:</span> +91 7483034168
          </p>
          <span className="opacity-30 hidden sm:inline">|</span>
          <p className="hidden sm:flex items-center gap-1.5 opacity-90">
            <Mail className="w-3.5 h-3.5 text-[#00a992]" />
            <span className="font-semibold text-[#00a992]">Mail:</span> mitutoraeducation@gmail.com
          </p>
        </div>
        <p className="text-[11px] sm:text-xs text-gray-300 font-medium tracking-wide">
          Your Trusted Tuition Partner
        </p>
      </div>

      {/* Main Navbar */}
      <div 
        className={`px-4 sm:px-6 md:px-10 py-3 sm:py-1 flex items-center justify-between shadow-sm border-b relative z-40 transition-all duration-300 ${
          isScrolled 
            ? 'bg-[#063831]/80 backdrop-blur-xl border-white/10' 
            : 'bg-[#063831] border-transparent'
        }`}
      >
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center cursor-pointer transition duration-300 py-1"
          onClick={() => scrollToSection('hero')}
        >
          <Image
            src={logo}
            alt="MiTutora"
            width={160}
            height={50}
            className="h-9 sm:h-11 w-auto object-contain"
            priority
          />
        </motion.div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center">
          <nav className="flex items-center gap-8 mr-8 relative">
            {navLinks.map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item.toLowerCase().replace(/\s+/g, '-'))}
                className="group relative py-2 text-white hover:text-[#00a992] transition-colors duration-300 font-semibold text-[15px]"
              >
                {item}
                <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-[#00a992] rounded-full transition-all duration-300 group-hover:w-full"></span>
              </button>
            ))}

            {/* Login Dropdown */}
            <div
              onMouseEnter={() => setLoginDropdownOpen(true)}
              onMouseLeave={() => setLoginDropdownOpen(false)}
              className="relative py-2 group ml-4 pl-8 border-l border-white/20"
            >
              <span className="cursor-pointer text-white group-hover:text-[#00a992] transition-colors duration-300 font-semibold text-[15px] flex items-center gap-1.5">
                Login <span className="text-[10px] opacity-75 group-hover:-rotate-180 transition-transform duration-300">▼</span>
              </span>
              
              <AnimatePresence>
                {loginDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] as any }}
                    className="absolute top-full right-0 w-[200px] bg-white border border-gray-100 rounded-2xl shadow-xl p-3 z-50 mt-1"
                  >
                    <Link href="/login?role=student" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#00a992]/10 transition cursor-pointer group/item">
                      <span className="w-2 h-2 bg-[#00a992] rounded-full group-hover/item:scale-125 transition duration-300"></span>
                      <span className="text-sm font-medium text-gray-700 group-hover/item:text-[#063831] transition">
                        Login as Student
                      </span>
                    </Link>
                    <Link href="/login?role=teacher" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#00a992]/10 transition cursor-pointer group/item">
                      <span className="w-2 h-2 bg-[#00a992] rounded-full group-hover/item:scale-125 transition duration-300"></span>
                      <span className="text-sm font-medium text-gray-700 group-hover/item:text-[#063831] transition">
                        Login as Teacher
                      </span>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href="/signup?role=student"
              className="inline-block bg-gradient-to-r from-[#00a992] to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold px-7 py-2.5 rounded-full transition-all duration-300 shadow-lg shadow-[#00a992]/20 hover:shadow-[#00a992]/40"
            >
              Book Free Demo
            </Link>
          </motion.div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden text-2xl text-white hover:text-[#00a992] transition p-2"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] as any }}
            className="lg:hidden bg-[#063831]/98 backdrop-blur-md px-6 py-6 shadow-2xl space-y-4 flex flex-col absolute top-full left-0 w-full z-30 border-b border-white/10"
          >
            {navLinks.map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item.toLowerCase().replace(/\s+/g, '-'))}
                className="w-full text-left text-white font-bold py-3 border-b border-white/10 hover:text-[#00a992] transition"
              >
                {item}
              </button>
            ))}

            <div className="pt-2">
              <span className="w-full flex items-center justify-between text-white font-bold py-2">
                Login
              </span>
              <div className="mt-2 space-y-1 pl-3">
                <Link href="/login?role=student" className="flex items-center gap-2.5 py-2.5 hover:text-[#00a992] transition text-gray-300">
                  <span className="w-1.5 h-1.5 bg-[#00a992] rounded-full"></span>
                  <span className="text-sm font-medium">As Student</span>
                </Link>
                <Link href="/login?role=teacher" className="flex items-center gap-2.5 py-2.5 hover:text-[#00a992] transition text-gray-300">
                  <span className="w-1.5 h-1.5 bg-[#00a992] rounded-full"></span>
                  <span className="text-sm font-medium">As Teacher</span>
                </Link>
              </div>
            </div>

            <Link
              href="/signup?role=student"
              className="w-full bg-gradient-to-r from-[#00a992] to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3.5 mt-4 flex items-center justify-center rounded-xl transition duration-300 shadow-lg shadow-[#00a992]/20"
            >
              Book Free Demo
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
