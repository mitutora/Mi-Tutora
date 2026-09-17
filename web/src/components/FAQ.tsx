"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail } from 'lucide-react';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'How do I book a tutor?',
      answer: 'Simply call us at +91 74830 34168, or fill out the contact form on our website. Our team will help you find the perfect tutor based on your requirements within 24 hours.',
    },
    {
      question: 'What are your charges?',
      answer: 'Our fees vary depending on the subject, class, and type of tuition (home or online). Contact us for a customized quote. We offer competitive pricing and flexible payment plans to suit your budget.',
    },
    {
      question: 'Are your tutors verified?',
      answer: 'Yes! All our tutors undergo rigorous background verification, qualification checks, and interviews. We only work with experienced and highly qualified educators to ensure the best learning experience.',
    },
    {
      question: 'Do you offer online classes?',
      answer: 'Absolutely! We offer both online and home tuition services. Our online classes are conducted via video conferencing with interactive whiteboards, recorded sessions, and comprehensive study materials.',
    },
    {
      question: 'Can I change my tutor?',
      answer: 'Yes, if you\'re not satisfied with your current tutor, we\'ll replace them at no extra cost. Your satisfaction and learning outcomes are our top priorities.',
    },
    {
      question: 'What subjects do you cover?',
      answer: 'We cover all subjects from Class 1 to 12, competitive exam preparation (NEET, JEE, SAT, IELTS), coding & programming, languages, music, arts, and more. Check our Services section for the complete list.',
    },
    {
      question: 'How do I become a tutor with MiTutora?',
      answer: 'Call us at +91 74830 34168 or email your resume to mitutoraeducation@gmail.com. We\'ll review your application and schedule an interview. We welcome passionate educators from all backgrounds.',
    },
    {
      question: 'Is there a free demo class?',
      answer: 'Yes! For students, the demo class is completely free to help you experience the teaching methodology before committing. For tutors, a nominal booking fee is required to secure the demo and confirm the lead.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <section id="faq" className="w-full px-4 sm:px-6 md:px-12 lg:px-20 xl:px-24 py-20 md:py-28 bg-gradient-to-b from-[#063831] to-[#04241f] relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* Subtle Background Elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00a992]/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none translate-y-1/2" />

      <div className="max-w-3xl sm:max-w-4xl md:max-w-5xl mx-auto relative z-10">
        {/* 🔥 TOP */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] as any }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-12 sm:mb-16 md:mb-20"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 bg-[#00a992] rounded-full animate-pulse"></span>
            <span className="text-xs sm:text-sm font-extrabold tracking-wider text-emerald-300 uppercase">
              Frequently Asked Questions (FAQ)
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight">
            What You’re Thinking,{" "}
            <span className="bg-gradient-to-r from-[#00a992] to-emerald-300 bg-clip-text text-transparent">
              We’ve Answered.
            </span>
          </h2>
        </motion.div>

        {/* 🔥 FAQ LIST */}
        <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                key={index}
                className={`border rounded-2xl bg-white overflow-hidden transition-all duration-300 ${
                  isOpen 
                    ? "border-[#00a992]/50 shadow-xl shadow-[#00a992]/20 ring-1 ring-[#00a992]/30" 
                    : "border-transparent shadow-md hover:shadow-lg hover:border-[#00a992]/20"
                }`}
              >
                {/* Question */}
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 sm:px-8 py-5 sm:py-6 flex items-center justify-between text-left group"
                >
                  <span className={`text-base sm:text-lg md:text-xl font-bold transition-colors duration-300 ${isOpen ? "text-[#063831]" : "text-gray-900 group-hover:text-[#00a992]"}`}>
                    {faq.question}
                  </span>

                  {/* Animated Icon */}
                  <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${
                      isOpen ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500 group-hover:bg-emerald-50 group-hover:text-emerald-600"
                    }`}
                  >
                    <span className="text-xl sm:text-2xl font-light leading-none">+</span>
                  </motion.div>
                </button>

                {/* Answer */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] as any }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 sm:px-8 pb-6 sm:pb-8 text-base sm:text-lg text-gray-600 leading-relaxed font-medium">
                        <div className="w-12 h-1 bg-[#00a992] rounded-full mb-4 opacity-50"></div>
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* 🔥 CTA CONTACT BUTTON (Styled like ContactHero Form Submit) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 sm:mt-20 flex flex-col items-center justify-center text-center max-w-sm mx-auto"
        >
          <p className="text-gray-300 mb-4 font-medium text-lg">Still have questions?</p>
          <a
            href="tel:+917483034168"
            className="group w-full bg-gradient-to-r from-[#00a992] to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-white py-4 px-8 rounded-2xl text-lg font-bold transition duration-300 shadow-xl shadow-[#00a992]/30 hover:shadow-[#00a992]/50 hover:-translate-y-1 flex items-center justify-center gap-3 cursor-pointer"
          >
            <Mail className="w-5 h-5" />
            Contact Us Now
            <span className="group-hover:translate-x-1 transition duration-300">→</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
