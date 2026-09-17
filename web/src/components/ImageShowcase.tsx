"use client";

import { motion } from 'motion/react';
import Image from 'next/image';
const homeImage = '/imports/home.jpg';
const onlineImage = '/imports/online.jpg.jpeg';
const bannerImage = '/imports/3rd_photo.jpg.png';

export function ImageShowcase() {
  const topImages = [
    {
      url: homeImage,
      alt: 'Home Tuition',
      label: 'Home Tuition',
    },
    {
      url: onlineImage,
      alt: 'Online Classes',
      label: 'Online Classes',
    },
  ];

  return (
    <section className="relative py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16 md:mb-20"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">
            Learning That Fits Every Student
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-medium">
            Experience education tailored to your unique learning style and goals
          </p>
        </motion.div>

        {/* Top Row - First Two Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
          {topImages.map((image, index) => (
            <motion.div
              key={image.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <Image
                  src={image.url}
                  alt={image.alt}
                  width={800}
                  height={600}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Minimal Text Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/60 to-transparent p-6">
                  <p className="text-white text-lg font-semibold">{image.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Row - Wide Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ y: -8, transition: { duration: 0.3 } }}
          className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"
        >
          <div className="relative aspect-[21/9] overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
            <Image
              src={bannerImage}
              alt="Coding, AI & Future Skills"
              width={1200}
              height={400}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
