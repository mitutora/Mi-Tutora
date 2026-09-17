import React from 'react';
import { Star, Award } from 'lucide-react';

interface StudentMotivationBannerProps {
  studentName: string;
  onClick: () => void;
}

export function StudentMotivationBanner({ studentName, onClick }: StudentMotivationBannerProps) {
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100/60 rounded-3xl p-4 sm:p-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 relative flex-shrink-0 hidden sm:block">
          <div className="absolute inset-0 bg-emerald-200 rounded-full animate-pulse blur-xl opacity-50"></div>
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-emerald-100 shadow-sm relative z-10 text-2xl">
            <Award className="w-8 h-8 text-amber-500" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-black text-emerald-900 mb-1">Great work, {studentName}!</h3>
          <p className="text-sm font-medium text-emerald-700 max-w-md">You're doing amazing! Keep up the excellent learning and inspiring your tutors.</p>
        </div>
      </div>
      <div 
        className="hidden md:flex w-12 h-12 bg-emerald-600 rounded-full text-white items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer flex-shrink-0" 
        onClick={onClick}
      >
        <Star className="w-6 h-6" />
      </div>
    </div>
  );
}
