"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  GraduationCap,
  UserMinus,
  WalletCards,
  LogOut,
  ShieldCheck,
  X
} from "lucide-react";
import Image from "next/image";
import { useAdminAuth } from "../../context/AdminAuthContext";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Demo Phase", href: "/demos", icon: CalendarDays },
  { label: "Hired Teachers", href: "/tuitions", icon: GraduationCap },
  { label: "Removal Requests", href: "/cancellations", icon: UserMinus },
  { label: "Manual Payouts", href: "/payouts", icon: WalletCards },
];

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-72 bg-gradient-to-b from-[#063831] to-[#04241f] text-white border-r border-white/5 shadow-2xl transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header with Official Logo */}
        <div className="h-[76px] px-6 border-b border-white/10 flex flex-col justify-center items-start shrink-0">
          <div className="flex w-full justify-between items-center">
            <div className="flex items-center gap-2.5">
              <Link href="/" className="hover:opacity-90 transition-opacity">
                <Image
                  src="/logo.png"
                  alt="MiTutora"
                  width={130}
                  height={38}
                  className="h-8 w-auto object-contain"
                  priority
                />
              </Link>
              <span className="text-[#00a992] text-[9px] font-black uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                ADMIN
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white bg-white/5 rounded-lg lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-white/50 font-medium mt-1">Internal Operations Portal</p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2 mt-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            Platform Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm ${
                  isActive
                    ? "bg-[#00a992] text-white shadow-lg shadow-[#00a992]/20 font-bold"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-emerald-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="mt-auto p-4 border-t border-white/10 flex items-center gap-3 bg-white/5 shrink-0">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-lg shadow-inner text-white shrink-0">
            {(user?.email || "A").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="font-bold text-sm text-white truncate">{user?.email || "Admin User"}</p>
            <p className="text-xs text-emerald-400 font-medium">Super Admin</p>
          </div>
          <button
            onClick={() => logout()}
            title="Sign Out"
            className="p-2 text-white/60 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
