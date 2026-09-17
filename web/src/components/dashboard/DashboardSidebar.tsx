import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Lock, X } from 'lucide-react';
import { toast } from 'sonner';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface DashboardSidebarProps {
  role: 'student' | 'teacher';
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setActiveRequestViewId: (id: string | null) => void;
  hasProfile: boolean;
  isAccountLocked?: boolean;
  navItems: NavItem[];
  userName: string;
}

export function DashboardSidebar({
  role,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  activeTab,
  setActiveTab,
  setActiveRequestViewId,
  hasProfile,
  isAccountLocked = false,
  navItems,
  userName
}: DashboardSidebarProps) {
  const subtitle = role === 'student' ? 'Student' : 'Teacher';
  const defaultInitial = role === 'student' ? 'S' : 'T';
  const dashboardPath = role === 'student' ? '/dashboard/student' : '/dashboard/teacher';

  return (
    <>
      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* SIDEBAR (Desktop & Mobile Drawer) */}
      <aside className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition duration-200 ease-in-out w-64 max-w-[80vw] 2xl:w-72 bg-gradient-to-b from-[#063831] to-[#04241f] text-white flex flex-col border-r border-white/5 shadow-2xl md:shadow-xl z-50`}>
        <div className="h-[76px] px-6 border-b border-white/10 flex flex-col justify-center items-start">
          <div className="flex w-full justify-between items-center">
            <div className="flex items-center gap-2.5">
              <Link 
                href={dashboardPath} 
                onClick={() => {
                  setActiveTab('dashboard');
                  setActiveRequestViewId(null);
                  setIsMobileMenuOpen(false);
                }}
                className="hover:opacity-90 transition-opacity"
              >
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
                {subtitle}
              </span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-white/70 hover:text-white bg-white/5 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isLocked = (!hasProfile && item.id !== 'profile') || isAccountLocked;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isLocked) {
                    if (isAccountLocked) {
                      toast.error("Account locked. Please clear pending tuition fees to unlock your dashboard.");
                    } else {
                      toast.error("Please complete your profile first!");
                    }
                    return;
                  }
                  setActiveTab(item.id);
                  setActiveRequestViewId(null);
                  setIsMobileMenuOpen(false);
                }}
                disabled={isLocked}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isLocked ? "opacity-50 cursor-not-allowed text-gray-400" :
                  isActive 
                    ? "bg-[#00a992] text-white shadow-lg shadow-[#00a992]/20" 
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-emerald-400"}`} />
                {item.label}
                {isLocked && <Lock className="w-4 h-4 ml-auto opacity-50" />}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-4 border-t border-white/10 flex items-center gap-3 bg-white/5">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-lg shadow-inner">
            {(userName || defaultInitial).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="font-bold text-sm truncate">{userName || subtitle}</p>
            <p className="text-xs text-emerald-400 font-medium">{subtitle} Account</p>
          </div>
        </div>
      </aside>
    </>
  );
}
