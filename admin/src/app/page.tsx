"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  LayoutDashboard,
  CalendarDays,
  GraduationCap,
  WalletCards,
  UserMinus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Clock,
  ShieldCheck,
  IndianRupee
} from "lucide-react";

export default function AdminOverviewPage() {
  const [activeTuitionsCount, setActiveTuitionsCount] = useState(0);
  const [activeTuitionsVolume, setActiveTuitionsVolume] = useState(0);
  const [demosCount, setDemosCount] = useState(0);
  const [decisionDemosCount, setDecisionDemosCount] = useState(0);
  const [cancellationsCount, setCancellationsCount] = useState(0);
  const [readyPayoutsAmount, setReadyPayoutsAmount] = useState(0);
  const [readyPayoutsCount, setReadyPayoutsCount] = useState(0);
  const [escrowAmount, setEscrowAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Applications listener
    const unsubApps = onSnapshot(collection(db, "applications"), (snap) => {
      let activeT = 0;
      let vol = 0;
      let demos = 0;
      let awaitingDec = 0;
      let cancels = 0;

      snap.forEach((d) => {
        const data = d.data();
        if (data.status === "tuition_started") {
          activeT++;
          vol += data.finalPrice || data.currentOffer || data.budget || 4000;
        }
        if (data.status === "demo_scheduled") {
          demos++;
        }
        if (data.status === "waiting_for_parent_decision") {
          awaitingDec++;
        }
        if (data.cancellationRequested === true) {
          cancels++;
        }
      });

      setActiveTuitionsCount(activeT);
      setActiveTuitionsVolume(vol);
      setDemosCount(demos);
      setDecisionDemosCount(awaitingDec);
      setCancellationsCount(cancels);
    });

    // 2. Tutor Payouts listener
    const unsubPayouts = onSnapshot(collection(db, "tutor_payouts"), (snap) => {
      let readyAmt = 0;
      let readyCnt = 0;
      let escrowAmt = 0;

      snap.forEach((d) => {
        const data = d.data();
        const amt = data.tutorShareAmount || Math.round((data.grossAmount || 4000) * 0.6);
        if (["ready_for_payout", "ready"].includes(data.status)) {
          readyAmt += amt;
          readyCnt++;
        } else if (data.status === "escrow_held") {
          escrowAmt += amt;
        }
      });

      setReadyPayoutsAmount(readyAmt);
      setReadyPayoutsCount(readyCnt);
      setEscrowAmount(escrowAmt);
      setLoading(false);
    });

    return () => {
      unsubApps();
      unsubPayouts();
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#063831] via-[#08483f] to-[#04241f] text-white shadow-xl relative overflow-hidden border border-[#063831]">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Operational Command Center</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            MiTutora Platform Health & Operations
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/70 font-medium leading-relaxed">
            Monitor real-time student trial progression, active tuitions, cancellations, and manual disbursement queues from one unified command dashboard.
          </p>
        </div>
      </div>

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ready to Disburse */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ready to Payout
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <WalletCards className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              ₹{readyPayoutsAmount.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-emerald-700 font-bold mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {readyPayoutsCount} disbursements ready today
            </p>
          </div>
          <Link
            href="/payouts"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 pt-1"
          >
            <span>Open Payout Queue</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 2: Active Tuitions */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Tuitions
            </span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {activeTuitionsCount} Tuitions
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              ₹{activeTuitionsVolume.toLocaleString("en-IN")} monthly run rate
            </p>
          </div>
          <Link
            href="/tuitions"
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 pt-1"
          >
            <span>View Active List</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 3: Demo Pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Demos & Trials
            </span>
            <div className="p-2 rounded-xl bg-[#00a992]/10 text-[#00a992]">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {demosCount} Scheduled
            </p>
            <p className="text-xs text-amber-700 font-bold mt-1">
              {decisionDemosCount} awaiting 48h parent decision
            </p>
          </div>
          <Link
            href="/demos"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#00a992] hover:text-[#008f7b] pt-1"
          >
            <span>Inspect Demos</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 4: Escrow Held */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Escrow Held (Day 30)
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              ₹{escrowAmount.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Maturing into payouts over next 30 days
            </p>
          </div>
          <Link
            href="/payouts"
            className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 pt-1"
          >
            <span>View Escrows</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Operational Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box 1: Payouts Action Item */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <WalletCards className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Manual Payouts Disbursal</h3>
                <p className="text-xs text-slate-500">Day 30 completed escrows ready for transfer</p>
              </div>
            </div>
            {readyPayoutsCount > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                {readyPayoutsCount} Pending
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Automatic bank transfers are turned off. Review eligible teacher shares and student referral bonuses, copy their UPI IDs for GPay/PhonePe, and log UTR numbers directly.
          </p>

          <Link
            href="/payouts"
            className="block w-full py-3 px-4 rounded-xl bg-[#063831] hover:bg-[#04241f] text-white font-bold text-xs text-center transition-colors shadow-xs"
          >
            Open Manual Payouts Queue
          </Link>
        </div>

        {/* Box 2: Removal & Cancellations */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <UserMinus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Teacher Removal Requests</h3>
                <p className="text-xs text-slate-500">Student trial cancellations & prorated dues</p>
              </div>
            </div>
            {cancellationsCount > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                {cancellationsCount} Action Needed
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Students who request teacher removal during their 7-day trial have prorated fees calculated automatically based on days elapsed. Review their requests and contact both parties.
          </p>

          <Link
            href="/cancellations"
            className="block w-full py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs text-center transition-colors"
          >
            Review Removal Requests ({cancellationsCount})
          </Link>
        </div>
      </div>
    </div>
  );
}
