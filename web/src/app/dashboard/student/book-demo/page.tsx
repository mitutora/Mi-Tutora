"use client";

import { motion } from 'motion/react';
import DemoForm from '@/components/DemoForm';

export default function BookDemoPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-7xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Book Demo Session</h1>
        <p className="text-gray-500 mt-2">Complete your free demo request securely.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <DemoForm isDashboard={true} />
      </div>
    </motion.div>
  );
}
