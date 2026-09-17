import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
      <div className="flex flex-col items-center justify-center gap-6">
        
        {/* Animated Staggered Dots */}
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full bg-[#00a992] animate-bounce" 
            style={{ animationDelay: '0ms' }}
          ></div>
          <div 
            className="w-4 h-4 rounded-full bg-emerald-400 animate-bounce" 
            style={{ animationDelay: '150ms' }}
          ></div>
          <div 
            className="w-4 h-4 rounded-full bg-emerald-300 animate-bounce" 
            style={{ animationDelay: '300ms' }}
          ></div>
        </div>

        {/* Text */}
        <p className="text-emerald-800 font-bold tracking-widest uppercase text-sm animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}
