"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  GraduationCap,
  Calendar,
  IndianRupee,
  Phone,
  MessageCircle,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Eye,
  Mail,
  Copy,
  Check,
  X,
  User,
  Loader2
} from "lucide-react";
import {
  formatWhatsAppUrl,
  formatTelUrl,
  resolveParentContact,
  resolveTutorContact,
} from "@/lib/contactResolver";

interface TuitionItem {
  id: string;
  applicationId?: string;
  studentDocId?: string;
  studentName?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentDocId?: string;
  tutorName?: string;
  tutorPhone?: string;
  tutorEmail?: string;
  tutorDocId?: string;
  finalPrice?: number;
  currentOffer?: number;
  budget?: number;
  feePaid?: boolean;
  startDate?: any;
  category?: string;
  subjects?: string[];
  combinedSubjects?: string[];
}

export default function TuitionsPage() {
  const [tuitions, setTuitions] = useState<TuitionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [feeFilter, setFeeFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");

  // View Details Modal State
  const [viewingTuition, setViewingTuition] = useState<TuitionItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "applications"),
      where("status", "==", "tuition_started")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: TuitionItem[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as any) });
        });
        // Sort newest first
        list.sort((a, b) => {
          const timeA = a.startDate?.toMillis ? a.startDate.toMillis() : (a.startDate || 0);
          const timeB = b.startDate?.toMillis ? b.startDate.toMillis() : (b.startDate || 0);
          return timeB - timeA;
        });
        setTuitions(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching tuitions:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getDaysElapsed = (startDate: any) => {
    if (!startDate) return 0;
    const startMs = startDate.toMillis ? startDate.toMillis() : (typeof startDate === "number" ? startDate : Date.now());
    return Math.max(1, Math.ceil((Date.now() - startMs) / (1000 * 60 * 60 * 24)));
  };

  const getFeeStatus = (tuition: TuitionItem) => {
    if (tuition.feePaid) {
      return {
        label: "Fee Paid (Settled)",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
        icon: CheckCircle2,
        type: "paid"
      };
    }
    const days = getDaysElapsed(tuition.startDate);
    if (days <= 7) {
      return {
        label: `Trial (Day ${days}/7 - Due Soon)`,
        badgeClass: "bg-[#00a992]/10 text-[#007f6e] border-[#00a992]/30",
        icon: Clock,
        type: "pending"
      };
    }
    if (days <= 10) {
      return {
        label: `Grace Period (Day ${days} - Overdue)`,
        badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
        icon: AlertTriangle,
        type: "overdue"
      };
    }
    return {
      label: `Account Locked (Day ${days} Unpaid)`,
      badgeClass: "bg-rose-50 text-rose-800 border-rose-300 font-black",
      icon: Lock,
      type: "overdue"
    };
  };

  const filteredTuitions = tuitions.filter((t) => {
    const status = getFeeStatus(t);
    if (feeFilter === "paid" && status.type !== "paid") return false;
    if (feeFilter === "pending" && status.type !== "pending") return false;
    if (feeFilter === "overdue" && status.type !== "overdue") return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const sName = (t.studentName || t.parentName || "").toLowerCase();
      const tName = (t.tutorName || "").toLowerCase();
      const appId = (t.applicationId || t.id || "").toLowerCase();
      return sName.includes(q) || tName.includes(q) || appId.includes(q);
    }

    return true;
  });

  const totalMonthlyVolume = tuitions.reduce(
    (acc, t) => acc + (t.finalPrice || t.currentOffer || t.budget || 4000),
    0
  );

  const handleCopyText = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleViewTuition = async (tuition: TuitionItem) => {
    setViewingTuition({ ...tuition });
    setIsDetailLoading(true);

    let updated = { ...tuition };
    try {
      // 1. Resolve Parent & Student Contact (Phone, WhatsApp, Email, Guardian Name)
      const parentContact = await resolveParentContact(
        updated.parentDocId,
        updated.studentDocId,
        {
          name: updated.parentName || updated.studentName,
          phone: updated.parentPhone,
          email: updated.parentEmail,
        }
      );
      if (parentContact.phone) updated.parentPhone = parentContact.phone;
      if (parentContact.email) updated.parentEmail = parentContact.email;
      if (parentContact.name && !updated.parentName) updated.parentName = parentContact.name;

      // 2. Resolve Educator/Tutor Contact (Phone, WhatsApp, Email, Name)
      const tutorContact = await resolveTutorContact(
        updated.tutorDocId,
        {
          name: updated.tutorName,
          phone: updated.tutorPhone,
          email: updated.tutorEmail,
        }
      );
      if (tutorContact.phone) updated.tutorPhone = tutorContact.phone;
      if (tutorContact.email) updated.tutorEmail = tutorContact.email;
      if (tutorContact.name && !updated.tutorName) updated.tutorName = tutorContact.name;
    } catch (err) {
      console.error("Error loading tuition contact details:", err);
    } finally {
      setViewingTuition(updated);
      setIsDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Active Hired Tuitions</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time directory of students who clicked "Hire Teacher", their Day 7 billing deadlines, and escrow statuses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs font-bold text-slate-700">
            Active Tuitions: <span className="text-[#00a992] font-black ml-1">{tuitions.length}</span>
          </div>
          <div className="px-4 py-2 bg-[#00a992]/10 rounded-xl border border-[#00a992]/25 shadow-2xs text-xs font-bold text-[#007f6e]">
            Monthly GMV: <span className="font-black ml-1">₹{totalMonthlyVolume.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFeeFilter("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              feeFilter === "all" ? "bg-[#063831] text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Tuitions ({tuitions.length})
          </button>
          <button
            onClick={() => setFeeFilter("paid")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              feeFilter === "paid" ? "bg-[#00a992] text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Fee Paid ({tuitions.filter((t) => t.feePaid).length})
          </button>
          <button
            onClick={() => setFeeFilter("pending")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              feeFilter === "pending" ? "bg-[#00a992] text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Trial / Due Soon ({tuitions.filter((t) => !t.feePaid && getDaysElapsed(t.startDate) <= 7).length})
          </button>
          <button
            onClick={() => setFeeFilter("overdue")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              feeFilter === "overdue" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Overdue / Locked ({tuitions.filter((t) => !t.feePaid && getDaysElapsed(t.startDate) > 7).length})
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, teacher, or ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Tuitions Table */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <p className="text-sm font-semibold text-slate-500">Loading active tuitions...</p>
        </div>
      ) : filteredTuitions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
          <GraduationCap className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-600">No tuitions match your current filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Agreement ID</th>
                  <th className="px-5 py-3.5">Student / Parent</th>
                  <th className="px-5 py-3.5">Assigned Tutor</th>
                  <th className="px-5 py-3.5">Start Date & Age</th>
                  <th className="px-5 py-3.5">Monthly Fee</th>
                  <th className="px-5 py-3.5">Fee Status</th>
                  <th className="px-5 py-3.5 text-right">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredTuitions.map((t) => {
                  const status = getFeeStatus(t);
                  const StatusIcon = status.icon;
                  const days = getDaysElapsed(t.startDate);
                  const fee = t.finalPrice || t.currentOffer || t.budget || 4000;
                  const startStr = t.startDate?.toDate
                    ? t.startDate.toDate().toLocaleDateString("en-IN")
                    : "N/A";

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        #{t.applicationId || t.id.slice(0, 8)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">{t.studentName || t.parentName || "Student"}</p>
                        {t.parentPhone && <p className="text-[11px] text-slate-400">{t.parentPhone}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">{t.tutorName || "Tutor"}</p>
                        {t.tutorPhone && <p className="text-[11px] text-slate-400">{t.tutorPhone}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{startStr}</p>
                        <p className="text-[11px] text-slate-400">Day {days} active</p>
                      </td>
                      <td className="px-5 py-4 font-black text-slate-900">
                        ₹{fee.toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${status.badgeClass}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewTuition(t)}
                            className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View</span>
                          </button>
                          {t.parentPhone && (
                            <a
                              href={`tel:${t.parentPhone.replace(/\D/g, "")}`}
                              title="Call Parent"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          {t.parentPhone && (
                            <a
                              href={`https://wa.me/91${t.parentPhone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              title="WhatsApp Parent"
                              className="p-1.5 text-[#25D366] hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
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

      {/* View Tuition & Contact Details Modal */}
      {viewingTuition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-lg max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#063831] text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      Tuition Details
                    </h3>
                    <span className="font-mono text-xs text-slate-400 font-bold shrink-0">
                      #{viewingTuition.applicationId || viewingTuition.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">Contact information & payment status</p>
                </div>
              </div>
              <button
                onClick={() => setViewingTuition(null)}
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
                  <p className="text-xs text-slate-500 font-medium">Fetching verified contact information...</p>
                </div>
              ) : (
                <div className="space-y-5 text-xs">
                {/* 1. Student / Parent Contact Card */}
                <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                      Student & Parent Contact
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Student Party</span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-black text-slate-900 text-sm">
                      {viewingTuition.studentName || "Student"}
                    </p>
                    {viewingTuition.parentName && (
                      <p className="text-slate-600 font-medium">Parent: {viewingTuition.parentName}</p>
                    )}
                    {viewingTuition.category && (
                      <p className="text-slate-500 text-[11px] capitalize">Class / Category: {viewingTuition.category}</p>
                    )}
                  </div>

                  {/* Parent Phone */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Phone Number</p>
                        <p className="font-bold text-slate-900 text-sm font-mono">
                          {viewingTuition.parentPhone || "No phone listed"}
                        </p>
                      </div>
                    </div>
                    {viewingTuition.parentPhone && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={formatTelUrl(viewingTuition.parentPhone)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 transition-colors"
                          title="Call Parent"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                        <a
                          href={formatWhatsAppUrl(viewingTuition.parentPhone)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center gap-1 transition-colors"
                          title="WhatsApp Parent"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          onClick={() => handleCopyText(viewingTuition.parentPhone || "", "parent_phone")}
                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"
                          title="Copy Phone"
                        >
                          {copiedField === "parent_phone" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Parent Email */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-teal-100/70 text-teal-700 shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-medium">Email Address</p>
                        <p className="font-bold text-slate-900 text-xs truncate">
                          {viewingTuition.parentEmail || "No email registered"}
                        </p>
                      </div>
                    </div>
                    {viewingTuition.parentEmail && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`mailto:${viewingTuition.parentEmail}?subject=Tuition%20Update%20-%20MiTutora`}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 transition-colors"
                          title="Send Email"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Email</span>
                        </a>
                        <button
                          onClick={() => handleCopyText(viewingTuition.parentEmail || "", "parent_email")}
                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"
                          title="Copy Email"
                        >
                          {copiedField === "parent_email" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Educator / Tutor Contact Card */}
                <div className="p-4 bg-teal-50/70 rounded-2xl border border-teal-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-950 uppercase tracking-wider text-[11px]">
                      Educator (Tutor) Contact
                    </span>
                    <span className="text-[10px] text-teal-700 font-semibold">Teacher Party</span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-black text-slate-900 text-sm">
                      {viewingTuition.tutorName || "Tutor"}
                    </p>
                    {viewingTuition.subjects && viewingTuition.subjects.length > 0 && (
                      <p className="text-slate-500 text-[11px]">Subjects: {viewingTuition.subjects.join(", ")}</p>
                    )}
                  </div>

                  {/* Tutor Phone */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-teal-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-teal-100/70 text-teal-700">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Mobile / WhatsApp</p>
                        <p className="font-bold text-slate-900 text-sm font-mono">
                          {viewingTuition.tutorPhone || "No phone listed"}
                        </p>
                      </div>
                    </div>
                    {viewingTuition.tutorPhone && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={formatTelUrl(viewingTuition.tutorPhone)}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 transition-colors"
                          title="Call Tutor"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                        <a
                          href={formatWhatsAppUrl(viewingTuition.tutorPhone)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center gap-1 transition-colors"
                          title="WhatsApp Tutor"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          onClick={() => handleCopyText(viewingTuition.tutorPhone || "", "tutor_phone")}
                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"
                          title="Copy Phone"
                        >
                          {copiedField === "tutor_phone" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tutor Email */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-teal-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-teal-100/70 text-teal-700 shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-medium">Email Address</p>
                        <p className="font-bold text-slate-900 text-xs truncate">
                          {viewingTuition.tutorEmail || "No email registered"}
                        </p>
                      </div>
                    </div>
                    {viewingTuition.tutorEmail && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`mailto:${viewingTuition.tutorEmail}?subject=Tuition%20Update%20-%20MiTutora`}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 transition-colors"
                          title="Send Email"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Email</span>
                        </a>
                        <button
                          onClick={() => handleCopyText(viewingTuition.tutorEmail || "", "tutor_email")}
                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"
                          title="Copy Email"
                        >
                          {copiedField === "tutor_email" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Tuition Terms & Financials */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                    Tuition Schedule & Financials
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px]">Monthly Fee</span>
                      <span className="text-base font-black text-slate-900">
                        ₹{(viewingTuition.finalPrice || viewingTuition.currentOffer || viewingTuition.budget || 4000).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px]">Active Duration</span>
                      <span className="font-bold text-slate-900">
                        Day {getDaysElapsed(viewingTuition.startDate)} active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Modal Footer (Sticky at bottom) */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={() => setViewingTuition(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-white transition-all text-center shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
