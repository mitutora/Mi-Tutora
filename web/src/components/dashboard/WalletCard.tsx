import React from 'react';
import { Wallet, ArrowRight } from 'lucide-react';

interface WalletCardProps {
  balance: number;
  onWithdrawClick: () => void;
}

export function WalletCard({ balance, onWithdrawClick }: WalletCardProps) {
  return (
    <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between group hover:shadow-2xl transition-all duration-300">
      <div>
        <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 text-teal-600 group-hover:scale-110 group-hover:rotate-3 transition-transform">
          <Wallet className="w-6 h-6" />
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Wallet Balance</p>
        <h4 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight flex items-baseline gap-1">
          <span className="text-2xl text-slate-400">&#8377;</span>{balance}
        </h4>
        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
          Use balance to get discounts on your courses, or withdraw directly to your bank account.
        </p>
      </div>
      <button 
        onClick={onWithdrawClick}
        disabled={balance < 1000}
        className="w-full py-3.5 sm:py-4 px-4 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-gray-900 to-gray-800 hover:from-black hover:to-gray-900 shadow-lg shadow-gray-900/20 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <ArrowRight className="w-4 h-4" /> Withdraw Funds (Min &#8377;1000)
      </button>
    </div>
  );
}
