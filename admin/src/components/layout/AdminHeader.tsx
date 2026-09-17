"use client";

import React from "react";
import { Menu, Shield } from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";

interface AdminHeaderProps {
  onOpenSidebar: () => void;
  title?: string;
}

export function AdminHeader({ onOpenSidebar }: AdminHeaderProps) {
  const { user } = useAdminAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 sm:h-20 px-6 sm:px-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSidebar}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 lg:hidden transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00a992]/10 border border-[#00a992]/25">
          <div className="w-2 h-2 rounded-full bg-[#00a992] animate-pulse" />
          <span className="text-xs font-bold text-[#007f6e]">
            Manual Payout Mode Active
          </span>
        </div>
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-[#063831] text-white flex items-center justify-center font-bold text-xs shadow-md">
            {(user?.email || "A").charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
              {user?.email?.split("@")[0] || "Admin"}
            </p>
            <p className="text-[10px] text-emerald-700 font-semibold">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
