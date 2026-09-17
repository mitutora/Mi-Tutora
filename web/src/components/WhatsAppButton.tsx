"use client";

import { motion } from 'motion/react';
import { MessageCircle } from 'lucide-react';

export function WhatsAppButton() {
  const handleWhatsAppClick = () => {
    // Using the first phone number for WhatsApp
    const phoneNumber = '917483034168'; // Remove + and spaces
    const message = encodeURIComponent('Hi, I would like to know more about MiTutora services.');
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full shadow-2xl shadow-green-500/50 flex items-center justify-center group hover:shadow-green-500/70 transition-all"
      aria-label="Chat on WhatsApp"
    >
      {/* Pulsing animation */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 bg-green-500 rounded-full"
      />

      {/* WhatsApp Icon */}
      <MessageCircle className="w-8 h-8 text-white relative z-10" />

      {/* Tooltip */}
      <div className="absolute right-full mr-3 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Chat with us on WhatsApp
        <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
      </div>
    </motion.button>
  );
}
