"use client";

import { motion } from 'motion/react';
import { Home, Video, Code, Brain, Sparkles } from 'lucide-react';

export function ServicesGrid() {
  const services = [
    {
      icon: Home,
      title: 'Offline Home Tuitions',
      description: 'Personalized one-to-one tutoring at home with expert, background-verified tutors tailored to your learning pace.',
    },
    {
      icon: Video,
      title: 'One-to-One Online Tuitions',
      description: 'Live interactive online classes with dedicated personal attention, digital whiteboards, and recorded sessions.',
    },
    {
      icon: Code,
      title: 'Programming Languages',
      description: 'Learn Java, C++, Python, and other programming languages from basics to advanced, taught by industry experts.',
    },
    {
      icon: Brain,
      title: 'AI & Machine Learning',
      description: 'Master artificial intelligence and machine learning with hands-on, real-world projects and comprehensive guidance.',
    },
    {
      icon: Sparkles,
      title: 'Generative AI',
      description: 'Learn generative AI, ChatGPT, prompt engineering, and modern AI tools to stay ahead in the tech landscape.',
    },
  ];

  return (
    <section id="services" className="py-20 md:py-28 px-4 sm:px-6 md:px-12 lg:px-20 xl:px-24 2xl:px-32 bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">
            Our Services
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-medium">
            Comprehensive learning solutions for every subject and skill level. Whether you're preparing for school exams or mastering cutting-edge tech, we have the perfect tutor for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 hover:border-[#00a992]/30 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100">
                <service.icon className="w-7 h-7 text-[#00a992]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{service.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed font-medium">{service.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
