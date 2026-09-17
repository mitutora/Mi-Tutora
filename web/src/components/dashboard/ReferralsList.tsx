'use client';

import React, { useState } from 'react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Lock, 
  AlertTriangle, 
  Send, 
  Coins, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  IndianRupee, 
  ArrowRight, 
  Calendar 
} from 'lucide-react';

export interface Referral {
  id: string;
  referredUserName?: string;
  referralType?: 'student' | 'teacher';
  status?: string; // 'pending' | 'qualified' | 'rewarded'
  estimatedReward?: number;
  reward?: number;
  rewardType?: 'wallet_cash' | 'banked_token';
  payoutStatus?: 'escrow_held' | 'ready_for_payout' | 'processing' | 'paid' | 'action_required_missing_upi';
  releaseEligibleAt?: number;
  payoutVpa?: string;
  utrNumber?: string;
  razorpayPayoutId?: string;
  createdAt?: number;
  qualifiedAt?: any;
  paidAt?: any;
}

interface ReferralsListProps {
  referrals: Referral[];
  userUpiId?: string;
  onAddUpi?: () => void;
}

export function ReferralsList({ referrals, userUpiId, onAddUpi }: ReferralsListProps) {
  const [expandedRefId, setExpandedRefId] = useState<string | null>(null);

  // Compute Pipeline Metrics
  const totalInvited = referrals?.length || 0;
  const pendingClass = referrals?.filter(r => r.status === 'pending')?.length || 0;
  
  const inEscrowAmount = referrals
    ?.filter(r => r.status === 'qualified' && r.payoutStatus !== 'paid' && r.rewardType !== 'banked_token')
    ?.reduce((sum, r) => sum + (r.reward || r.estimatedReward || 600), 0) || 0;

  const totalPaidAmount = referrals
    ?.filter(r => r.payoutStatus === 'paid')
    ?.reduce((sum, r) => sum + (r.reward || r.estimatedReward || 600), 0) || 0;

  const hasMissingUpiOnQualified = !userUpiId && referrals?.some(
    r => r.status === 'qualified' && r.rewardType !== 'banked_token' && r.payoutStatus !== 'paid'
  );

  return (
    <div className="space-y-6">
      {/* 1. Missing UPI Alert Banner */}
      {hasMissingUpiOnQualified && (
        <div className="bg-amber-50 border-2 border-amber-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-amber-900 text-base tracking-tight">
                  Action Required: Add your UPI ID to receive payouts
                </h4>
                <p className="text-xs sm:text-sm text-amber-700 font-medium mt-0.5 max-w-2xl">
                  You have ₹{inEscrowAmount.toLocaleString()} in referral rewards currently locked in escrow. To ensure funds are automatically deposited into your bank account on Day 30 without interruption, please save your payout UPI ID.
                </p>
              </div>
            </div>
            {onAddUpi && (
              <button
                onClick={onAddUpi}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 shrink-0 flex items-center justify-center gap-1.5"
              >
                <span>Add UPI ID</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Pipeline Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invited */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Friends Invited</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{totalInvited}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Registered with code</p>
        </div>

        {/* Pending First Class */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Awaiting Class</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{pendingClass}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Trial or demo pending</p>
        </div>

        {/* In Escrow */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Day 30 Escrow</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">₹{inEscrowAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Matures on Day 30</p>
        </div>

        {/* Paid to UPI */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Deposited to UPI</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">₹{totalPaidAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Zero threshold paid</p>
        </div>
      </div>

      {/* 3. Main Referrals Section */}
      <div>
        <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" />
          <span>Your Referrals</span>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {referrals?.length || 0}
          </span>
        </h3>

        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {(referrals?.length ?? 0) > 0 ? (
            <ul className="divide-y divide-slate-100">
              {referrals.map((ref) => {
                const isExpanded = expandedRefId === ref.id;
                const isQualified = ref.status === 'qualified' || ref.status === 'rewarded';
                const isTeacherReward = ref.rewardType === 'banked_token';
                const rewardAmount = ref.reward || ref.estimatedReward || 600;
                
                const releaseDate = ref.releaseEligibleAt || (ref.createdAt ? ref.createdAt + 30 * 24 * 60 * 60 * 1000 : Date.now() + 30 * 24 * 60 * 60 * 1000);
                const daysLeft = Math.max(0, Math.ceil((releaseDate - Date.now()) / (1000 * 60 * 60 * 24)));
                
                const effectiveUpi = ref.payoutVpa || userUpiId;
                const isMissingUpi = isQualified && !isTeacherReward && !effectiveUpi && ref.payoutStatus !== 'paid';
                const isPaid = ref.payoutStatus === 'paid';
                const isReady = isQualified && !isTeacherReward && !isPaid && (ref.payoutStatus === 'ready_for_payout' || ref.payoutStatus === 'processing' || daysLeft === 0);

                return (
                  <li key={ref.id} className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center text-slate-700 font-black text-lg shadow-inner">
                          {(ref.referredUserName?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-base sm:text-lg">
                              {ref.referredUserName || 'Referred Friend'}
                            </h4>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full capitalize">
                              {ref.referralType === 'teacher' ? (
                                <GraduationCap className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <BookOpen className="w-3 h-3 text-teal-600" />
                              )}
                              {ref.referralType || 'student'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Registered on {new Date(ref.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right-aligned reward pill and expand toggle */}
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reward</p>
                          <p className="text-base font-black text-gray-900">
                            {isTeacherReward ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <Coins className="w-4 h-4 text-emerald-600" /> +1 Banked Token
                              </span>
                            ) : (
                              <span>₹{rewardAmount.toLocaleString()}</span>
                            )}
                          </p>
                        </div>

                        <button
                          onClick={() => setExpandedRefId(isExpanded ? null : ref.id)}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all"
                          title="View transparency breakdown"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* 5-STAGE VISUAL PROGRESS STEPPER */}
                    <div className="mt-6 pt-5 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Reward Lifecycle Progress
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 relative">
                        {/* STAGE 1: Joined */}
                        <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 flex flex-col justify-between">
                          <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>1. Joined</span>
                          </div>
                          <p className="text-[11px] text-emerald-700 font-medium">Account Created</p>
                        </div>

                        {/* STAGE 2: Class Started */}
                        <div className={`rounded-xl p-3 flex flex-col justify-between border ${
                          isQualified 
                            ? 'bg-emerald-50/70 border-emerald-200/70 text-emerald-800' 
                            : 'bg-amber-50/60 border-amber-200/60 text-amber-800'
                        }`}>
                          <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                            {isQualified ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            )}
                            <span>2. Class Started</span>
                          </div>
                          <p className="text-[11px] font-medium opacity-90">
                            {isQualified ? 'Trial Completed' : 'Demo / Booking'}
                          </p>
                        </div>

                        {/* STAGE 3: Platform Payment */}
                        <div className={`rounded-xl p-3 flex flex-col justify-between border ${
                          isQualified 
                            ? 'bg-emerald-50/70 border-emerald-200/70 text-emerald-800' 
                            : 'bg-slate-50 border-slate-200/70 text-slate-500'
                        }`}>
                          <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                            {isQualified ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span>3. Payment</span>
                          </div>
                          <p className="text-[11px] font-medium opacity-90">
                            {isQualified ? 'Fee Collected' : 'Day 7 Payment'}
                          </p>
                        </div>

                        {/* STAGE 4: 30-Day Escrow Lock */}
                        <div className={`rounded-xl p-3 flex flex-col justify-between border ${
                          isPaid || (isQualified && daysLeft === 0)
                            ? 'bg-emerald-50/70 border-emerald-200/70 text-emerald-800'
                            : isQualified && daysLeft > 0
                            ? 'bg-teal-50/70 border-teal-200/70 text-teal-800'
                            : 'bg-slate-50 border-slate-200/70 text-slate-500'
                        }`}>
                          <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                            {isPaid || (isQualified && daysLeft === 0) ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : isQualified ? (
                              <Lock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span>4. Escrow Lock</span>
                          </div>
                          <p className="text-[11px] font-medium opacity-90">
                            {isPaid || daysLeft === 0 
                              ? 'Escrow Matured' 
                              : isQualified 
                              ? `${daysLeft} Days Left` 
                              : 'Awaiting Fee'}
                          </p>
                        </div>

                        {/* STAGE 5: Direct UPI Disbursement */}
                        <div className={`rounded-xl p-3 flex flex-col justify-between border ${
                          isPaid
                            ? 'bg-emerald-50/70 border-emerald-200/70 text-emerald-800'
                            : isMissingUpi
                            ? 'bg-amber-50/90 border-amber-300 text-amber-900 shadow-sm'
                            : isReady
                            ? 'bg-teal-50/70 border-teal-200/70 text-teal-800'
                            : 'bg-slate-50 border-slate-200/70 text-slate-500'
                        }`}>
                          <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                            {isPaid ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : isTeacherReward ? (
                              <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : isMissingUpi ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            ) : isReady ? (
                              <Send className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span>5. Disbursement</span>
                          </div>
                          <p className="text-[11px] font-medium opacity-90 truncate">
                            {isPaid 
                              ? 'Deposited' 
                              : isTeacherReward 
                              ? 'Token Added' 
                              : isMissingUpi 
                              ? 'UPI Required' 
                              : isReady 
                              ? 'Processing' 
                              : 'Pending Day 30'}
                          </p>
                        </div>
                      </div>

                      {/* STAGE 5 DETAILED CALLOUT / BADGE */}
                      <div className="mt-3">
                        {/* Missing UPI Alert */}
                        {isMissingUpi && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-3 text-xs font-bold text-amber-900">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Action Required: Add UPI ID to receive ₹{rewardAmount.toLocaleString()}</span>
                            </div>
                            {onAddUpi && (
                              <button
                                onClick={onAddUpi}
                                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 self-start sm:self-auto"
                              >
                                Add UPI ID
                              </button>
                            )}
                          </div>
                        )}

                        {/* Paid via Cloud Function / RazorpayX */}
                        {isPaid && (
                          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 rounded-xl px-4 py-2.5 text-xs font-bold text-emerald-900">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Deposited to {ref.payoutVpa || userUpiId || 'UPI'}
                              {ref.utrNumber ? ` • Bank UTR: ${ref.utrNumber}` : ''}
                            </span>
                          </div>
                        )}

                        {/* Teacher Banked Token Reward */}
                        {isTeacherReward && isQualified && (
                          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 rounded-xl px-4 py-2.5 text-xs font-bold text-emerald-900">
                            <Coins className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>1 Banked Token Credited to your proposal bank</span>
                          </div>
                        )}

                        {/* Ready for Payout / In Progress */}
                        {isReady && !isMissingUpi && !isPaid && (
                          <div className="flex items-center gap-2 bg-teal-50 border border-teal-200/80 rounded-xl px-4 py-2.5 text-xs font-bold text-teal-900">
                            <Send className="w-4 h-4 text-teal-600 shrink-0" />
                            <span>Payout in progress to {effectiveUpi}</span>
                          </div>
                        )}

                        {/* In Escrow with Active UPI */}
                        {isQualified && !isTeacherReward && !isPaid && !isMissingUpi && !isReady && (
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-600">
                            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                            <span>
                              Locked in escrow until {new Date(releaseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} ({daysLeft} days left) • Scheduled for deposit to {effectiveUpi}
                            </span>
                          </div>
                        )}

                        {/* Pending Friend Payment */}
                        {!isQualified && (
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 text-xs font-medium text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Reward locks into 30-day escrow only when your friend completes the 7-day trial and settles their tuition fee. No payout will occur if fee is unpaid.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. EXPANDABLE FINANCIAL TRANSPARENCY BREAKDOWN */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-4">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                          Financial Transparency Breakdown
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                            <p className="text-slate-400 font-medium">Estimated Course Value</p>
                            <p className="font-bold text-gray-900 mt-1">
                              ₹{((rewardAmount / 0.10) || 6000).toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                            <p className="text-slate-400 font-medium">Platform Fee (40%)</p>
                            <p className="font-bold text-gray-900 mt-1">
                              ₹{((rewardAmount / 0.25) || 2400).toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                            <p className="text-slate-400 font-medium">Your 25% Share</p>
                            <p className="font-black text-emerald-700 mt-1">
                              {isTeacherReward ? '1 Banked Token' : `₹${rewardAmount.toLocaleString()}`}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                            <p className="text-slate-400 font-medium">Escrow Release Date</p>
                            <p className="font-bold text-gray-900 mt-1">
                              {new Date(releaseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                <Users className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">No referrals yet</h4>
              <p className="text-slate-500 font-medium text-sm max-w-sm">
                Share your unique code above with friends to start earning rewards when they join.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
