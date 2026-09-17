import React from 'react';
import { User } from 'lucide-react';

interface ProfileCompletenessCardProps {
  completeness: number;
  onClick: () => void;
}

export function ProfileCompletenessCard({ completeness, onClick }: ProfileCompletenessCardProps) {
  return (
    <div 
      onClick={onClick}
      className="w-full flex-1 sm:max-w-sm bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between sm:ml-auto"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
          <User className="w-4 h-4" />
        </div>
        <span className="text-sm font-bold text-gray-900 tracking-tight">Strengthen Profile</span>
      </div>
      <div className="flex-1 flex flex-col justify-end">
        <p className="font-bold text-gray-900 text-sm tracking-tight mb-2">You're {completeness}% there!</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-indigo-50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${completeness}%` }}
            ></div>
          </div>
          <span className="text-xs font-bold text-gray-900">{completeness}%</span>
        </div>
      </div>
    </div>
  );
}
