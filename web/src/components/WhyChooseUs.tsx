"use client";

import { motion } from 'motion/react';
import { Shield, Clock, Users, Award, Target, Sparkles, DollarSign } from 'lucide-react';
import Link from 'next/link';


export function WhyChooseUs() {
  const highlights = [
    "Verified Tutors",
    "Flexible Scheduling",
    "Negotiable Pricing",
    "Personalized Learning",
    "Proven Results",
    "Expert Support"
  ];

  const features = [
    { icon: Shield, label: "Verified Tutors" },
    { icon: Clock, label: "Flexible Scheduling" },
    { icon: DollarSign, label: "Negotiable Pricing" },
    { icon: Target, label: "Personalized Learning" },
    { icon: Award, label: "Proven Results" },
    { icon: Sparkles, label: "Affordable Pricing" },
  ];

  return (
    <>
      {/* TICKER (Like AwardsBanner) */}
      <div className="w-full bg-[#04241f] border-y border-white/10 py-4 overflow-hidden flex items-center relative z-20">
        <div className="absolute left-0 w-16 md:w-32 h-full bg-gradient-to-r from-[#04241f] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 w-16 md:w-32 h-full bg-gradient-to-l from-[#04241f] to-transparent z-10 pointer-events-none" />
        
        <motion.div
          className="flex whitespace-nowrap gap-8 md:gap-16 items-center"
          animate={{ x: [0, -1000] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 20,
              ease: "linear",
            },
          }}
        >
          {/* Render thrice for seamless loop */}
          {[...highlights, ...highlights, ...highlights].map((highlight, index) => (
            <div key={index} className="flex items-center gap-3 text-white/70">
              {index % 2 === 0 ? (
                <Award className="w-4 h-4 text-[#00a992]" />
              ) : (
                <Sparkles className="w-4 h-4 text-[#00a992] fill-[#00a992]/20" />
              )}
              <span className="font-semibold text-sm tracking-widest uppercase">{highlight}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* MAIN SECTION (Like NaturalSTPIntro) */}
      <section className="py-16 md:py-24 px-4 sm:px-6 md:px-12 lg:px-20 xl:px-24 2xl:px-32 bg-gradient-to-b from-[#063831] to-[#04241f] text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[#00a992] font-bold uppercase tracking-wider mb-4">India's Trusted Platform</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-6">
              Why Choose MiTutora? Experience the difference in quality education.
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-8">
              We connect students with top-tier, background-verified educators. Whether you need home tuition or interactive online classes, our personalized learning approach ensures 98% of our students achieve their academic goals.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup?role=student"
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#00a992] to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 transition duration-300 text-white font-bold text-center shadow-lg shadow-[#00a992]/20"
              >
                Book Free Demo
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6"
          >
            {features.map((item, index) => (
              <div key={index} className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-5 flex flex-col items-center justify-center text-center hover:bg-white/10 transition duration-300 group">
                <item.icon className="w-8 h-8 text-[#00a992] mb-3 group-hover:scale-110 transition-transform duration-300" />
                <span className="font-semibold text-sm sm:text-base text-gray-200">{item.label}</span>
              </div>
            ))}
          </motion.div>
          
        </div>
      </section>
    </>
  );
}
