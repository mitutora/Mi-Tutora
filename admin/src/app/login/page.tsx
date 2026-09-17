"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { ShieldCheck, Activity, CreditCard, Lock, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const verifyAdminAccess = async (user: any) => {
    const tokenResult = await user.getIdTokenResult(true);
    const isClaimAdmin = tokenResult.claims.admin === true || tokenResult.claims.role === "admin";

    let isDbAdmin = false;
    if (!isClaimAdmin) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const roles: string[] = Array.isArray(data?.roles) ? data.roles : [data?.role];
        isDbAdmin = roles.includes("admin");
      }
    }

    return isClaimAdmin || isDbAdmin;
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const isAdmin = await verifyAdminAccess(user);
      if (!isAdmin) {
        setError(`Access Denied: Account ${user.email} is not registered as an administrator.`);
        await auth.signOut();
        setGoogleLoading(false);
        return;
      }

      router.push("/");
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
        setError(err.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      
      {/* LEFT COLUMN - BRANDING & OPERATIONS OVERVIEW */}
      <div className="flex w-full lg:w-1/2 relative overflow-hidden flex-col justify-between p-6 pt-8 pb-12 lg:p-12 bg-gradient-to-br from-[#063831] to-[#04241f] transition-colors duration-200 min-h-[340px] lg:min-h-screen">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3 bg-[#00a992]/20" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/3 bg-emerald-500/20" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Logo & Admin Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="MiTutora"
              width={160}
              height={50}
              className="h-9 sm:h-10 w-auto object-contain"
              priority
            />
            <span className="text-[#00a992] text-[10px] font-black uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-lg border border-white/15 backdrop-blur-md">
              ADMIN
            </span>
          </div>
        </div>

        {/* Center Hero Content */}
        <div className="relative z-10 max-w-lg mt-8 lg:mt-16 mb-6 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4 lg:mb-6 backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm text-emerald-100 font-semibold uppercase tracking-wider">
              Internal Operations Portal
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black text-white leading-tight mb-3 lg:mb-6 tracking-tight">
            Internal Platform <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              Operations & Health.
            </span>
          </h1>

          <p className="hidden lg:block text-emerald-100/80 text-base lg:text-lg leading-relaxed font-medium mb-10">
            Dedicated administrative gateway for MiTutora staff. Supervise live trial demos, oversee ongoing tuitions, review parent disputes, and disburse tutor earnings securely.
          </p>

          {/* Feature Highlights */}
          <div className="hidden lg:block space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
                <Activity className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Tuition & Demo Oversight</h3>
                <p className="text-emerald-100/60 text-xs">Real-time trial status, scheduling, and tutor matchmaking</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
                <CreditCard className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Milestones & Payouts Queue</h3>
                <p className="text-emerald-100/60 text-xs">30-day escrow tracking, 1-click UPI copy, and UTR recording</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
                <Lock className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Restricted Access Control</h3>
                <p className="text-emerald-100/60 text-xs">Enforced by Firebase Security Rules and administrator role checks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="hidden lg:flex relative z-10 text-emerald-100/60 text-xs font-medium justify-between">
          <span>&copy; {new Date().getFullYear()} MiTutora. Internal Operations.</span>
          <span className="opacity-60">Confidential & Proprietary</span>
        </div>
      </div>

      {/* RIGHT COLUMN - GOOGLE AUTH ONLY */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-start lg:justify-center pt-8 pb-12 px-6 sm:p-10 lg:p-16 relative overflow-hidden bg-white min-h-0 lg:min-h-screen -mt-6 lg:mt-0 rounded-t-2xl lg:rounded-none z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] lg:shadow-none">
        
        {/* Subtle background glow */}
        <div className="lg:hidden absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none -translate-y-1/2 bg-[#00a992]/5" />

        <div className="w-full max-w-md relative z-10">
          
          {/* Header Block */}
          <div className="mb-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Staff & Administrator Access
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-2">
              Admin Sign In
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Sign in with your authorized Google workspace account to access operational tools.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1-Click Google Sign In Button */}
          <div className="my-6">
            <button
              type="button"
              disabled={googleLoading}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-2xl shadow-sm hover:shadow transition-all text-sm font-bold text-gray-700 disabled:opacity-70 cursor-pointer active:scale-[0.99]"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
              )}
              <span>{googleLoading ? "Verifying Admin Privileges..." : "Sign in with Google"}</span>
            </button>
          </div>

          {/* Security Notice */}
          <div className="pt-6 border-t border-gray-100 text-center lg:text-left">
            <div className="flex items-start gap-2.5 text-[11px] text-gray-500 leading-relaxed">
              <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <span>
                Restricted environment. Access is logged and monitored. Only Google accounts assigned with <code className="text-[#063831] font-bold">role: admin</code> can access.
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
