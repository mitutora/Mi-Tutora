"use client";

import { motion } from 'motion/react';
import { MapPin, Globe2 } from 'lucide-react';

const staggerContainer: any = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15 },
  },
};

const itemStagger: any = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 1, 0.5, 1] as any } },
};

export function LocationsSection() {
  const indianCities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
    'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kochi', 'Chandigarh',
    'Indore', 'Bhopal', 'Nagpur', 'Vadodara', 'Surat', 'Coimbatore',
  ];

  const internationalLocations = [
    'USA', 'UK', 'Canada', 'Australia', 'UAE', 'Singapore',
  ];

  return (
    <section className="px-4 sm:px-6 md:px-12 lg:px-20 xl:px-24 2xl:px-32 py-20 md:py-28 bg-white relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00a992]/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none translate-y-1/2" />

      {/* 🔥 HEADING */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] as any }}
        viewport={{ once: true, margin: "-50px" }}
        className="max-w-4xl mb-12 sm:mb-16 md:mb-20 relative z-10"
      >
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <span className="w-2.5 h-2.5 bg-[#00a992] rounded-full animate-pulse"></span>
          <span className="text-xs sm:text-sm font-extrabold tracking-wider text-[#063831] uppercase">
            Global Reach
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-gray-900">
          Accessible from anywhere: <br className="hidden lg:block" />
          <span className="bg-gradient-to-r from-[#00a992] to-emerald-500 bg-clip-text text-transparent">India & Abroad</span>{" "}
          coverage
        </h2>
        <p className="text-lg text-gray-600 mt-6 max-w-2xl font-medium">
          Quality education has no borders. Whether you are in a major Indian city or living abroad, our expert tutors are ready to help you succeed.
        </p>
      </motion.div>

      {/* 🔥 CONTAINER */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 lg:gap-12"
      >
        {/* 🔹 LEFT - INDIA */}
        <motion.div
          variants={itemStagger}
          className="p-8 sm:p-10 lg:p-12 bg-white border border-gray-100 rounded-3xl shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:border-[#00a992]/30 transition-all duration-500 group relative overflow-hidden flex flex-col"
        >
          {/* Subtle neon edge */}
          <div className="absolute top-0 left-0 w-[4px] h-full bg-gradient-to-b from-[#00a992] to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <h3 className="text-2xl sm:text-3xl font-black mb-4 sm:mb-6 text-gray-900 flex items-center gap-3">
            <span className="text-[#00a992] flex items-center justify-center bg-emerald-50 w-12 h-12 rounded-xl">
              <MapPin className="w-6 h-6" />
            </span>
            India
          </h3>

          <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 font-medium">
            We provide exceptional home and online tuition across major metropolitan areas and tier-2 cities in India. Our tutors are local experts who understand the regional curriculum and student needs.
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-auto">
            {indianCities.map((city, index) => (
              <span
                key={index}
                className="bg-gray-50 border border-gray-200 text-gray-700 font-medium text-xs sm:text-sm px-4 py-2 rounded-xl hover:bg-emerald-50 hover:border-[#00a992]/30 hover:text-[#063831] transition-colors cursor-default"
              >
                {city}
              </span>
            ))}
            <span className="bg-[#063831]/5 border border-[#063831]/10 text-[#063831] font-bold text-xs sm:text-sm px-4 py-2 rounded-xl cursor-default">
              + Many More Cities!
            </span>
          </div>
        </motion.div>

        {/* 🔹 RIGHT - INTERNATIONAL */}
        <motion.div
          variants={itemStagger}
          className="p-8 sm:p-10 lg:p-12 bg-white border border-gray-100 rounded-3xl shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:border-[#00a992]/30 transition-all duration-500 group relative overflow-hidden flex flex-col"
        >
          {/* Subtle neon edge */}
          <div className="absolute top-0 left-0 w-[4px] h-full bg-gradient-to-b from-[#00a992] to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <h3 className="text-2xl sm:text-3xl font-black mb-4 sm:mb-6 text-gray-900 flex items-center gap-3">
            <span className="text-[#00a992] flex items-center justify-center bg-emerald-50 w-12 h-12 rounded-xl">
              <Globe2 className="w-6 h-6" />
            </span>
            Abroad
          </h3>

          <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 font-medium">
            Our interactive online classes cross borders. We offer time-zone friendly scheduling and specialized coaching for international curriculums and competitive exams for students worldwide.
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-8">
            {internationalLocations.map((location, index) => (
              <span
                key={index}
                className="bg-gray-50 border border-gray-200 text-gray-700 font-medium text-xs sm:text-sm px-4 py-2 rounded-xl hover:bg-emerald-50 hover:border-[#00a992]/30 hover:text-[#063831] transition-colors cursor-default"
              >
                {location}
              </span>
            ))}
          </div>

          {/* Info Box */}
          <div className="bg-emerald-50/50 border border-[#00a992]/20 p-5 sm:p-6 rounded-2xl relative mt-auto">
            <h4 className="text-[#063831] font-bold text-lg mb-2">Worldwide Online Classes</h4>
            <p className="text-gray-700 text-sm sm:text-base leading-relaxed font-medium">
              Access quality education from anywhere in the world with our interactive online classes featuring whiteboards and recorded sessions.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
