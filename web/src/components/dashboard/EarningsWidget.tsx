import React from 'react';
import { IndianRupee, TrendingUp } from 'lucide-react';

interface EarningsWidgetProps {
  netRevenue: number;
  activeMRR: number;
  onClick: () => void;
}

export function EarningsWidget({ netRevenue, activeMRR, onClick }: EarningsWidgetProps) {
  return (
    <div 
      onClick={onClick}
      className="flex-1 bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between group"
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <IndianRupee className="w-4 h-4" />
          </div>
          <span className="text-sm text-slate-500 font-bold tracking-tight">Net Revenue</span>
        </div>
        <span className="text-xs font-bold text-emerald-600 border border-emerald-100 px-3 py-1 rounded-full group-hover:bg-emerald-50 transition-colors">View All</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight truncate">₹{netRevenue.toLocaleString()}</h3>
          <p className="text-xs text-emerald-600 font-bold mt-1">₹{activeMRR.toLocaleString()} Active MRR</p>
        </div>
        <TrendingUp className="w-12 h-12 text-emerald-400 opacity-50" strokeWidth={1.5} />
      </div>
    </div>
  );
}
