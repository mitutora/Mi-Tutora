"use client";

import { motion } from 'motion/react';
import { Award, Users, TrendingUp, Globe } from 'lucide-react';

export function TrustSection() {
  const stats = [
    {
      icon: Users,
      number: '10,000+',
      label: 'Active Students',
      description: 'Learning across India',
    },
    {
      icon: Award,
      number: '500+',
      label: 'Verified Tutors',
      description: 'Highly qualified educators',
    },
    {
      icon: TrendingUp,
      number: '98%',
      label: 'Success Rate',
      description: 'Students achieving goals',
    },
    {
      icon: Globe,
      number: '50+',
      label: 'Cities',
      description: 'Nationwide coverage',
    },
  ];

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 md:px-12 lg:px-20 xl:px-24 2xl:px-32 bg-white relative overflow-hidden">
      <div className="max-w-5xl mx-auto text-center relative z-10 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mb-6">
            <span className="w-2 h-2 bg-[#00a992] rounded-full animate-pulse"></span>
            <p className="text-xs sm:text-sm text-[#063831] font-bold tracking-wide uppercase">
              Proven Excellence
            </p>
          </div>
          
          {/* Massive Heading */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.05] tracking-tight mb-8">
            Trusted by Thousands. <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#00a992] to-emerald-500 bg-clip-text text-transparent">
              India's fastest-growing platform.
            </span>
          </h2>

          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 leading-relaxed max-w-4xl mx-auto font-medium">
            Join thousands of students who have transformed their academic journey with us. We are committed to providing the highest quality education through our verified, top-tier tutors across the nation.
          </p>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="relative max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="relative group"
            >
              <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100 group-hover:shadow-2xl group-hover:border-[#00a992]/30 transition-all duration-300 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#00a992] transition-all duration-300">
                  <stat.icon className="w-8 h-8 text-[#00a992] group-hover:text-white transition-colors duration-300" />
                </div>
                <div className="text-4xl font-black text-gray-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-lg font-bold text-[#063831] mb-2">
                  {stat.label}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {stat.description}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Subtle Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#00a992]/5 blur-[100px] rounded-full pointer-events-none" />
    </section>
  );
}
