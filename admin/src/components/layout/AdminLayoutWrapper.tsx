"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { ShieldAlert, Loader2, LogIn } from "lucide-react";
import Link from "next/link";

const titles: Record<string, string> = {
  "/": "Overview & Operational Metrics",
  "/demos": "Demo Phase Management",
  "/tuitions": "Active Hired Tuitions",
  "/cancellations": "Teacher Removal & Cancellation Requests",
  "/payouts": "Manual Payouts Action Queue",
};

export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, loading } = useAdminAuth();

  // Allow login page without wrapper
  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-sm font-semibold text-slate-600">Verifying administrator credentials...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="w-full max-w-md p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
            <LogIn className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Admin Authentication Required</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Please sign in with an authorized administrator account to access the MiTutora operations portal.
            </p>
          </div>
          <Link
            href="/login"
            className="block w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold transition-all shadow-lg shadow-emerald-600/20 text-center"
          >
            Sign In to Admin Portal
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="w-full max-w-md p-8 bg-white rounded-3xl border border-rose-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Access Restricted</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Account <strong className="text-slate-900">{user.email}</strong> does not have administrator permissions (<code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-rose-600 font-mono">role: admin</code>).
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Contact the engineering team or log in with your super admin credentials.
          </p>
          <Link
            href="/login"
            className="block w-full py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition-colors text-center text-sm"
          >
            Switch Account
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50 lg:pl-72 flex flex-col">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AdminHeader onOpenSidebar={() => setSidebarOpen(true)} />
      <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
