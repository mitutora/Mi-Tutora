"use client";

// src/app/components/Hero.tsx

import { useState, useEffect } from 'react';
import TeacherForm from './TeacherForm';
import DemoForm from './DemoForm';
import { motion } from 'motion/react';
import { ArrowRight, Download, Users, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
const heroImage = '/imports/hero.jpg';

export function Hero() {
  /* STATES */
  const [showForm, setShowForm] = useState(false);
  const [showDemoForm, setShowDemoForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

  /* NAVBAR OPEN */
  useEffect(() => {
    const handleOpenForm = () => {
      setSelectedCategory('');
      setShowDemoForm(true);
    };

    window.addEventListener('openTeacherForm', handleOpenForm);

    return () => {
      window.removeEventListener('openTeacherForm', handleOpenForm);
    };
  }, []);

  /* SCROLL */
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <>
      {/* HERO SECTION */}
      <section id="hero" className="relative w-full bg-gradient-to-b from-[#063831] to-[#04241f] overflow-hidden flex items-center px-4 sm:px-6 md:px-12 lg:px-16 py-32 md:py-40 min-h-screen">
        
        {/* 🍃 FLOATING BIOPARTICLES */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {[
            { w: 10, h: 10, left: "15%", top: "25%", delay: 0 },
            { w: 14, h: 14, left: "75%", top: "15%", delay: 1.5 },
            { w: 8, h: 8, left: "45%", top: "60%", delay: 3 },
            { w: 12, h: 12, left: "30%", top: "70%", delay: 4.5 },
            { w: 16, h: 16, left: "85%", top: "50%", delay: 2 },
            { w: 6, h: 6, left: "10%", top: "80%", delay: 0.8 },
          ].map((pt, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-[#00a992]/20 blur-[1px]"
              style={{
                width: pt.w,
                height: pt.h,
                left: pt.left,
                top: pt.top,
              }}
              animate={{
                y: [0, -40, 0],
                x: [0, i % 2 === 0 ? 10 : -10, 0],
                opacity: [0.1, 0.5, 0.1],
              }}
              transition={{
                duration: 10 + i * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: pt.delay,
              }}
            />
          ))}
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center w-full max-w-7xl mx-auto z-10">
          
          {/* 🔥 LEFT CONTENT */}
          <div>
            {/* Tag */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6"
            >
              <span className="w-2.5 h-2.5 bg-[#00a992] rounded-full animate-pulse"></span>
              <p className="text-xs sm:text-sm text-gray-200 font-medium tracking-wide">
                India's #1 Education Platform
              </p>
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] as any }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.1] mb-6 tracking-tight"
            >
              Trusted Tutors for <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-[#00a992] to-emerald-300 bg-clip-text text-transparent">
                Every Student
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-gray-300 text-base sm:text-lg md:text-xl mb-8 sm:mb-10 max-w-lg leading-relaxed font-medium"
            >
              Expert Home Tuition, Online Classes, NEET/JEE Coaching & Coding Skills — customized for your academic success.
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                href="/signup?role=student"
                className="group w-full sm:w-auto bg-gradient-to-r from-[#00a992] to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 transition duration-300 px-6 sm:px-8 py-3.5 rounded-full text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#00a992]/20 hover:scale-[1.02]"
              >
                Book Free Demo
                <span className="bg-white text-[#063831] rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold group-hover:translate-x-1 transition duration-300">
                  →
                </span>
              </Link>

              <Link
                href="/signup?role=teacher"
                className="group w-full sm:w-auto border border-white/30 text-white hover:bg-white hover:text-gray-900 transition duration-300 px-6 sm:px-8 py-3.5 rounded-full font-bold flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                Become a Tutor
              </Link>
            </motion.div>
          </div>

          {/* 🔥 RIGHT IMAGE COMPOSITION */}
          <div className="relative mt-12 lg:mt-0 flex justify-center lg:justify-end">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] as any }}
              className="relative w-full max-w-[500px]"
            >
              {/* Ambient Glow */}
              <div className="absolute inset-0 bg-[#00a992]/20 blur-3xl rounded-full scale-90" />
              
              <Image
                src={heroImage}
                alt="Professional tutoring"
                width={500}
                height={500}
                className="rounded-3xl w-full h-[320px] sm:h-[400px] md:h-[500px] object-cover shadow-2xl border border-white/10 relative z-10"
              />


              {/* 🔥 EXPERIENCE BADGE */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className="absolute -bottom-4 sm:-bottom-6 -right-4 sm:-right-8 bg-gradient-to-r from-[#00a992] to-emerald-600 text-white rounded-2xl px-5 py-4 shadow-xl z-20 border border-[#00a992]/30"
              >
                <p className="text-xs sm:text-sm font-semibold tracking-wider text-emerald-100 uppercase mb-1">MiTutora</p>
                <p className="text-lg sm:text-xl font-black leading-none">10,000+ Students</p>
              </motion.div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* CATEGORY SELECTOR */}
      {(showForm || showDemoForm) && !selectedCategory && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl">
            <h2 className="text-3xl font-bold text-center mb-8 text-[#063831]">Select Category</h2>
            <div className="space-y-4">
              {['school', 'programming', 'languages'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="w-full border-2 border-slate-200 hover:border-[#00a992] hover:bg-[#00a992]/5 rounded-2xl py-4 text-lg font-semibold transition-all capitalize text-slate-700"
                >
                  {cat === 'school' ? 'School Tuition' : cat}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                setShowDemoForm(false);
              }}
              className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* FORMS */}
      {showForm && selectedCategory && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white rounded-full px-4 py-2 shadow-lg z-50 text-slate-800 font-bold transition-colors"
            >
              ✕
            </button>
            <TeacherForm category={selectedCategory} />
          </div>
        </div>
      )}

      {showDemoForm && selectedCategory && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
            <button
              onClick={() => setShowDemoForm(false)}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white rounded-full px-4 py-2 shadow-lg z-50 text-slate-800 font-bold transition-colors"
            >
              ✕
            </button>
            <DemoForm category={selectedCategory} />
          </div>
        </div>
      )}
    </>
  );
}
