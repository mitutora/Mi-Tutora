"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  WalletCards,
  Copy,
  Check,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  IndianRupee,
  X,
  ExternalLink,
  ShieldCheck,
  Eye,
  Phone,
  Mail,
  MessageCircle,
  User,
  Loader2,
  Building2
} from "lucide-react";
import {
  formatWhatsAppUrl,
  formatTelUrl,
  resolveParentContact,
  resolveTutorContact,
  resolveReferrerContact,
} from "@/lib/contactResolver";

interface PayoutItem {
  id: string;
  sourceCollection: "tutor_payouts" | "referrals";
  beneficiaryName: string;
  beneficiaryRole: "Tutor" | "Student Referrer";
  amount: number;
  upiId: string;
  status: string; // 'ready_for_payout' | 'escrow_held' | 'paid' | 'action_required_missing_upi'
  releaseEligibleAt: number;
  utrNumber?: string;
  paidAt?: any;
  referenceId?: string;
  phone?: string;
  email?: string;
  tutorDocId?: string;
  parentDocId?: string;
  applicationDocId?: string;
  referrerId?: string;
  studentName?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  category?: string;
  subjects?: string[];
  bankDetails?: {
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
  };
}

export default function PayoutsPage() {
  const [tutorPayouts, setTutorPayouts] = useState<any[]>([]);
  const [referralPayouts, setReferralPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ready" | "escrow" | "missing_upi" | "paid">("ready");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // View Details Modal State
  const [viewingPayout, setViewingPayout] = useState<PayoutItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Mark as Paid Modal State
  const [selectedPayout, setSelectedPayout] = useState<PayoutItem | null>(null);
  const [utrInput, setUtrInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // 1. Subscribe to tutor_payouts
    const unsubTutors = onSnapshot(collection(db, "tutor_payouts"), (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setTutorPayouts(items);
    });

    // 2. Subscribe to referrals
    const unsubReferrals = onSnapshot(collection(db, "referrals"), (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setReferralPayouts(items);
      setLoading(false);
    });

    return () => {
      unsubTutors();
      unsubReferrals();
    };
  }, []);

  // Normalize all payouts
  const allPayouts: PayoutItem[] = [
    ...tutorPayouts.map((t) => ({
      id: t.id,
      sourceCollection: "tutor_payouts" as const,
      beneficiaryName: t.tutorName || "Tutor",
      beneficiaryRole: "Tutor" as const,
      amount: t.tutorShareAmount || Math.round((t.grossAmount || 4000) * 0.6),
      upiId: t.payoutVpa || "",
      status: t.status || "escrow_held",
      releaseEligibleAt: t.releaseEligibleAt || 0,
      utrNumber: t.utrNumber,
      paidAt: t.paidAt,
      referenceId: t.applicationDocId || t.id,
      tutorDocId: t.tutorDocId,
      parentDocId: t.parentDocId,
      applicationDocId: t.applicationDocId,
      phone: t.tutorPhone || t.phone || "",
      email: t.tutorEmail || t.email || "",
    })),
    ...referralPayouts
      .filter((r) => r.rewardType === "wallet_cash" && (r.status === "qualified" || r.payoutStatus))
      .map((r) => ({
        id: r.id,
        sourceCollection: "referrals" as const,
        beneficiaryName: r.referrerName || "Student Referrer",
        beneficiaryRole: "Student Referrer" as const,
        amount: r.reward || Math.round((r.grossAmount || 4000) * 0.4 * 0.25),
        upiId: r.payoutVpa || "",
        status: r.payoutStatus || "escrow_held",
        releaseEligibleAt: r.releaseEligibleAt || 0,
        utrNumber: r.utrNumber,
        paidAt: r.paidAt,
        referenceId: r.referredUserId || r.id,
        referrerId: r.referrerId,
        phone: r.phone || "",
        email: r.email || "",
      })),
  ];

  // Filter items
  const filteredItems = allPayouts.filter((item) => {
    // Tab filter
    if (activeTab === "ready") {
      if (!["ready_for_payout", "ready"].includes(item.status)) return false;
    } else if (activeTab === "escrow") {
      if (item.status !== "escrow_held") return false;
    } else if (activeTab === "missing_upi") {
      if (item.status !== "action_required_missing_upi" && !!item.upiId) return false;
    } else if (activeTab === "paid") {
      if (item.status !== "paid") return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.beneficiaryName.toLowerCase().includes(q) ||
        item.upiId.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const handleCopyUpi = (upi: string, id: string) => {
    if (!upi) return;
    navigator.clipboard.writeText(upi);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyText = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleViewPayout = async (item: PayoutItem) => {
    setViewingPayout({ ...item });
    setIsDetailLoading(true);

    let updated = { ...item };
    try {
      if (item.sourceCollection === "tutor_payouts") {
        if (item.applicationDocId) {
          const appSnap = await getDoc(doc(db, "applications", item.applicationDocId));
          if (appSnap.exists()) {
            const appData = appSnap.data();
            updated.studentName = appData.studentName || appData.parentName || "Student";
            updated.parentName = appData.parentName || "";
            updated.parentPhone = appData.parentPhone || "";
            updated.parentEmail = appData.parentEmail || "";
            updated.category = appData.category || "";
            updated.subjects = appData.subjects || appData.combinedSubjects || [];
            if (!updated.phone && appData.tutorPhone) updated.phone = appData.tutorPhone;
            if (!updated.email && appData.tutorEmail) updated.email = appData.tutorEmail;
          }
        }

        // 1. Resolve Parent contact
        if (item.parentDocId) {
          const pContact = await resolveParentContact(item.parentDocId, undefined, {
            name: updated.parentName,
            phone: updated.parentPhone,
            email: updated.parentEmail,
          });
          if (pContact.phone) updated.parentPhone = pContact.phone;
          if (pContact.email) updated.parentEmail = pContact.email;
          if (pContact.name && !updated.parentName) updated.parentName = pContact.name;
        }

        // 2. Resolve Tutor contact & Bank/UPI details
        if (item.tutorDocId) {
          const tContact = await resolveTutorContact(item.tutorDocId, {
            name: updated.beneficiaryName,
            phone: updated.phone,
            email: updated.email,
          });
          if (tContact.phone) updated.phone = tContact.phone;
          if (tContact.email) updated.email = tContact.email;
          if (tContact.upiId && !updated.upiId) updated.upiId = tContact.upiId;
          if (tContact.bankDetails) updated.bankDetails = tContact.bankDetails;
          if (tContact.name && (!updated.beneficiaryName || updated.beneficiaryName === "Tutor")) {
            updated.beneficiaryName = tContact.name;
          }
        }
      } else if (item.sourceCollection === "referrals") {
        if (item.referrerId) {
          const rContact = await resolveReferrerContact(item.referrerId, {
            name: updated.beneficiaryName,
            phone: updated.phone,
            email: updated.email,
            upiId: updated.upiId,
          });
          if (rContact.phone) updated.phone = rContact.phone;
          if (rContact.email) updated.email = rContact.email;
          if (rContact.upiId && !updated.upiId) updated.upiId = rContact.upiId;
          if (rContact.name && (!updated.beneficiaryName || updated.beneficiaryName === "Student Referrer")) {
            updated.beneficiaryName = rContact.name;
          }
        }
      }
    } catch (err) {
      console.error("Error fetching beneficiary details:", err);
    } finally {
      setViewingPayout(updated);
      setIsDetailLoading(false);
    }
  };

  const handleConfirmPaid = async () => {
    if (!selectedPayout) return;
    setIsSubmitting(true);

    try {
      const ref = doc(db, selectedPayout.sourceCollection, selectedPayout.id);
      const updateData: any = {
        paidAt: serverTimestamp(),
        utrNumber: utrInput.trim() || "MANUAL_OFFLINE_PAYMENT",
        updatedAt: serverTimestamp(),
      };

      if (selectedPayout.sourceCollection === "tutor_payouts") {
        updateData.status = "paid";
      } else {
        updateData.payoutStatus = "paid";
      }

      await updateDoc(ref, updateData);
      setSelectedPayout(null);
      setUtrInput("");
    } catch (err) {
      console.error("Failed to mark payout as paid:", err);
      alert("Error updating payout status. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Payout ID",
      "Beneficiary Type",
      "Beneficiary Name",
      "UPI ID",
      "Amount (INR)",
      "Status",
      "Release Eligible Date",
      "UTR Number",
    ];
    const rows = filteredItems.map((item) => {
      const dateStr = item.releaseEligibleAt
        ? new Date(item.releaseEligibleAt).toISOString().split("T")[0]
        : "N/A";
      return [
        `"${item.id}"`,
        `"${item.beneficiaryRole}"`,
        `"${item.beneficiaryName.replace(/"/g, '""')}"`,
        `"${item.upiId}"`,
        item.amount,
        `"${item.status}"`,
        `"${dateStr}"`,
        `"${item.utrNumber || ""}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mitutora_payouts_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const readyItems = allPayouts.filter((i) => ["ready_for_payout", "ready"].includes(i.status));
  const escrowItems = allPayouts.filter((i) => i.status === "escrow_held");
  const readyAmount = readyItems.reduce((acc, i) => acc + i.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Manual Payouts Action Queue
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Disburse teacher 60% tuition shares and student 25% referral rewards manually via UPI/NetBanking and mark records paid.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-200 shadow-2xs text-xs font-bold text-emerald-800">
            Ready to Disburse: <span className="font-black ml-1">₹{readyAmount.toLocaleString("en-IN")}</span> ({readyItems.length})
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab("ready")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "ready"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Ready to Disburse ({readyItems.length})
          </button>
          <button
            onClick={() => setActiveTab("escrow")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "escrow"
                ? "bg-[#00a992] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Escrow Held ({escrowItems.length})
          </button>
          <button
            onClick={() => setActiveTab("missing_upi")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "missing_upi"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Missing UPI
          </button>
          <button
            onClick={() => setActiveTab("paid")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "paid"
                ? "bg-[#063831] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Paid History
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, UPI ID, or ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <p className="text-sm font-semibold text-slate-500">Loading payout records...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
          <WalletCards className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-600">No payout records in this category.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Beneficiary</th>
                  <th className="px-5 py-3.5">Payment Role</th>
                  <th className="px-5 py-3.5">Amount Payable</th>
                  <th className="px-5 py-3.5">Destination UPI (VPA)</th>
                  <th className="px-5 py-3.5">Release Maturity</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredItems.map((item) => {
                  const releaseDateStr = item.releaseEligibleAt
                    ? new Date(item.releaseEligibleAt).toLocaleDateString("en-IN")
                    : "N/A";
                  const isDay30Reached = item.releaseEligibleAt ? Date.now() >= item.releaseEligibleAt : false;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">{item.beneficiaryName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Ref: {item.referenceId?.slice(0, 10)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.beneficiaryRole === "Tutor"
                            ? "bg-teal-50 text-teal-800 border border-teal-200"
                            : "bg-purple-50 text-purple-800 border border-purple-200"
                        }`}>
                          {item.beneficiaryRole}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-black text-sm text-slate-900">
                        ₹{item.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-4">
                        {item.upiId ? (
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 font-mono text-xs">
                            <span>{item.upiId}</span>
                            <button
                              onClick={() => handleCopyUpi(item.upiId, item.id)}
                              title="Copy UPI ID"
                              className="text-slate-500 hover:text-emerald-600 transition-colors"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Missing UPI
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{releaseDateStr}</p>
                        <p className="text-[10px] text-slate-400">
                          {isDay30Reached ? "Maturity Reached" : "Escrow Lock Active"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {item.status === "paid" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid
                          </span>
                        ) : ["ready_for_payout", "ready"].includes(item.status) ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 animate-pulse">
                            Ready to Pay
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-slate-400" /> Escrow Held
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewPayout(item)}
                            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View</span>
                          </button>
                          {item.status !== "paid" ? (
                            <button
                              onClick={() => {
                                setSelectedPayout(item);
                                setUtrInput("");
                              }}
                              className="py-1.5 px-3 rounded-xl bg-[#00a992] hover:bg-[#00937f] text-white font-bold text-xs shadow-xs transition-all active:scale-95"
                            >
                              Mark as Paid
                            </button>
                          ) : (
                            <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                              UTR: {item.utrNumber || "Verified"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Contact & Payout Details Modal */}
      {viewingPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-lg max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#063831] text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                  {viewingPayout.beneficiaryName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      {viewingPayout.beneficiaryName}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      viewingPayout.beneficiaryRole === "Tutor"
                        ? "bg-teal-50 text-teal-800 border border-teal-200"
                        : "bg-purple-50 text-purple-800 border border-purple-200"
                    }`}>
                      {viewingPayout.beneficiaryRole}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">Contact information & payout assurance card</p>
                </div>
              </div>
              <button
                onClick={() => setViewingPayout(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
              {isDetailLoading ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00a992] mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Fetching verified beneficiary details...</p>
                </div>
              ) : (
                <div className="space-y-5 text-xs">
                {/* 1. Direct Contact Action Box */}
                <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                      Verified Contact Information
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">1-Click Calling & Email</span>
                  </div>

                  {/* Phone Number Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Mobile / WhatsApp</p>
                        <p className="font-bold text-slate-900 text-sm font-mono">
                          {viewingPayout.phone || "No phone registered"}
                        </p>
                      </div>
                    </div>
                    {viewingPayout.phone && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={formatTelUrl(viewingPayout.phone)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 transition-colors"
                          title="Call on Phone"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                        <a
                          href={formatWhatsAppUrl(viewingPayout.phone)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center gap-1 transition-colors"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          onClick={() => handleCopyText(viewingPayout.phone || "", "phone")}
                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"
                          title="Copy Phone"
                        >
                          {copiedField === "phone" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Email Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-teal-100/70 text-teal-700 shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-medium">Email Address</p>
                        <p className="font-bold text-slate-900 text-xs truncate">
                          {viewingPayout.email || "No email registered"}
                        </p>
                      </div>
                    </div>
                    {viewingPayout.email && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`mailto:${viewingPayout.email}?subject=Payment%20Disbursement%20Update%20-%20MiTutora&body=Hi%20${encodeURIComponent(viewingPayout.beneficiaryName)},%0A%0AWe%20wanted%20to%20personally%20update%20you%20regarding%20your%20payout%20of%20INR%20${viewingPayout.amount}.`}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 transition-colors"
                          title="Send Email"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Email</span>
                        </a>
                        <button
                          onClick={() => handleCopyText(viewingPayout.email || "", "email")}
                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"
                          title="Copy Email"
                        >
                          {copiedField === "email" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Payout & Financial Details */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                    Disbursement Particulars
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px]">Payable Amount</span>
                      <span className="text-base font-black text-emerald-700">₹{viewingPayout.amount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px]">Current Status</span>
                      <span className="font-bold text-slate-900 capitalize">
                        {viewingPayout.status === "paid" ? "Paid ✓" : viewingPayout.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-slate-200/60">
                    <span className="text-slate-500">Destination UPI ID:</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                      <span>{viewingPayout.upiId || "Not provided"}</span>
                      {viewingPayout.upiId && (
                        <button
                          onClick={() => handleCopyText(viewingPayout.upiId, "upi")}
                          className="text-emerald-600 hover:text-emerald-700 p-1"
                          title="Copy UPI"
                        >
                          {copiedField === "upi" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {viewingPayout.bankDetails && (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 space-y-1">
                      <span className="text-slate-400 text-[10px] block">Bank Account:</span>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-600">A/C: {viewingPayout.bankDetails.accountNumber}</span>
                        <span className="text-slate-600">IFSC: {viewingPayout.bankDetails.ifsc}</span>
                      </div>
                      {viewingPayout.bankDetails.bankName && (
                        <span className="text-[10px] text-slate-500 block">{viewingPayout.bankDetails.bankName}</span>
                      )}
                    </div>
                  )}

                  {viewingPayout.utrNumber && (
                    <div className="flex justify-between items-center p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
                      <span className="font-medium">Transaction Ref / UTR:</span>
                      <span className="font-mono font-bold">{viewingPayout.utrNumber}</span>
                    </div>
                  )}
                </div>

                {/* 3. Associated Student & Tuition Context (if applicable) */}
                {viewingPayout.sourceCollection === "tutor_payouts" && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                      Associated Tuition Information
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Student Name:</span>
                        <span className="font-bold text-slate-900">{viewingPayout.studentName || "N/A"}</span>
                      </div>
                      {viewingPayout.parentPhone && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Parent Phone:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-medium text-slate-800">{viewingPayout.parentPhone}</span>
                            <a
                              href={formatTelUrl(viewingPayout.parentPhone)}
                              className="text-emerald-600 hover:text-emerald-800 p-0.5"
                              title="Call Parent"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                            <a
                              href={formatWhatsAppUrl(viewingPayout.parentPhone)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#25D366] p-0.5"
                              title="WhatsApp Parent"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}
                      {viewingPayout.category && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Grade / Category:</span>
                          <span className="font-medium text-slate-800 capitalize">{viewingPayout.category}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>

            {/* Modal Footer Actions (Sticky at bottom) */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 shrink-0 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setViewingPayout(null)}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-white transition-all text-center shadow-2xs"
              >
                Close
              </button>
              {viewingPayout.status !== "paid" && (
                <button
                  type="button"
                  onClick={() => {
                    const item = viewingPayout;
                    setViewingPayout(null);
                    setSelectedPayout(item);
                    setUtrInput("");
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#00a992] hover:bg-[#00937f] text-white font-bold text-xs shadow-md shadow-[#00a992]/20 transition-all text-center"
                >
                  Proceed to Mark as Paid
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mark As Paid Modal */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Confirm Manual Payout</h3>
                  <p className="text-xs text-slate-500">Record an offline disbursement</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayout(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* Beneficiary & Payment Info */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Beneficiary Name:</span>
                  <span className="font-bold text-slate-900">{selectedPayout.beneficiaryName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Beneficiary Role:</span>
                  <span className="font-bold text-slate-900">{selectedPayout.beneficiaryRole}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payable Amount:</span>
                  <span className="font-black text-sm text-emerald-700">₹{selectedPayout.amount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500">Target UPI ID:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                    <span>{selectedPayout.upiId || "None"}</span>
                    {selectedPayout.upiId && (
                      <button
                        type="button"
                        onClick={() => handleCopyUpi(selectedPayout.upiId, "modal")}
                        className="text-emerald-600 hover:text-emerald-700"
                        title="Copy UPI"
                      >
                        {copiedId === "modal" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* UTR Reference Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Bank UTR / Transaction Reference Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  placeholder="e.g. UPI/429104829101 or Ref ID"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-emerald-500 transition-all font-mono"
                />
                <p className="text-[11px] text-slate-400">
                  Receipt reference from your GPay, PhonePe, or NetBanking transfer.
                </p>
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedPayout(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-white transition-all shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmPaid}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Updating..." : "Confirm Paid"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
