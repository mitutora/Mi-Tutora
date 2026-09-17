"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  UserMinus,
  AlertTriangle,
  Calendar,
  IndianRupee,
  Phone,
  MessageCircle,
  CheckCircle,
  HelpCircle,
  Eye,
  Mail,
  Copy,
  Check,
  X,
  Loader2
} from "lucide-react";
import {
  formatWhatsAppUrl,
  formatTelUrl,
  resolveParentContact,
  resolveTutorContact,
} from "@/lib/contactResolver";

interface CancellationItem {
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
  cancellationRequested?: boolean;
  cancellationRequestedAt?: any;
  cancellationDaysElapsed?: number;
  cancellationProratedFee?: number;
  startDate?: any;
  category?: string;
  subjects?: string[];
}

export default function CancellationsPage() {
  const [requests, setRequests] = useState<CancellationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // View Details Modal State
  const [viewingCancellation, setViewingCancellation] = useState<CancellationItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "applications"),
      where("cancellationRequested", "==", true)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: CancellationItem[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        setRequests(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching cancellations:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleResolve = async (appId: string, action: "approve_decline" | "dismiss") => {
    setResolvingId(appId);
    try {
      if (action === "approve_decline") {
        await updateDoc(doc(db, "applications", appId), {
          status: "declined",
          reason: "cancellation_approved_by_admin",
          cancellationResolvedAt: serverTimestamp(),
          cancellationRequested: false,
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, "applications", appId), {
          cancellationRequested: false,
          cancellationDismissedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Failed to update cancellation:", err);
      alert("Failed to update status. Check permissions.");
    } finally {
      setResolvingId(null);
    }
  };

  const handleCopyText = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleViewCancellation = async (item: CancellationItem) => {
    setViewingCancellation({ ...item });
    setIsDetailLoading(true);

    let updated = { ...item };
    try {
      // 1. Resolve Parent Contact
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

      // 2. Resolve Tutor Contact
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
      console.error("Error loading cancellation contact details:", err);
    } finally {
      setViewingCancellation(updated);
      setIsDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Teacher Removal & Cancellation Requests
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage student requests to discontinue tuition during their 7-day trial or active period, and review prorated dues.
          </p>
        </div>
        <div className="px-4 py-2 bg-rose-50 rounded-xl border border-rose-200 shadow-2xs text-xs font-bold text-rose-800">
          Pending Removal Requests: <span className="font-black ml-1">{requests.length}</span>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">7-Day Free Trial & Prorated Settlement Policy</p>
          <p className="text-amber-800 leading-relaxed">
            If a student requests cancellation within the first 7 days, tuition fee is calculated strictly prorated for days elapsed (<code className="text-amber-900 font-mono font-bold">Prorated = (Monthly Fee / Days in Month) * Days Elapsed</code>). Contact both parties before approving.
          </p>
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <p className="text-sm font-semibold text-slate-500">Checking for cancellation requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
          <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
          <p className="text-sm font-bold text-slate-700">No active cancellation or removal requests.</p>
          <p className="text-xs text-slate-400">All current ongoing tuitions are in good standing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((item) => {
            const dateStr = item.cancellationRequestedAt?.toDate
              ? item.cancellationRequestedAt.toDate().toLocaleDateString("en-IN")
              : "Recently";

            const monthlyFee = item.finalPrice || item.currentOffer || item.budget || 4000;
            const prorated = item.cancellationProratedFee || Math.round((monthlyFee / 30) * (item.cancellationDaysElapsed || 1));

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-rose-200 p-5 shadow-2xs space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        #{item.applicationId || item.id.slice(0, 8)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">Requested: {dateStr}</span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-1">
                      {item.studentName || item.parentName || "Student"}
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                    <AlertTriangle className="w-3 h-3 text-rose-600" /> Removal Requested
                  </span>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Days Attended</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5">
                      {item.cancellationDaysElapsed || 1} Days
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Calculated Prorated Fee</p>
                    <p className="text-sm font-black text-rose-700 mt-0.5">
                      ₹{prorated.toLocaleString("en-IN")} <span className="text-[10px] text-slate-400 font-normal">of ₹{monthlyFee}</span>
                    </p>
                  </div>
                </div>

                {/* Contact Parties */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Student Contact</p>
                    <p className="font-bold text-slate-800 truncate">{item.parentPhone || "N/A"}</p>
                    {item.parentPhone && (
                      <div className="flex gap-2 mt-1">
                        <a href={`tel:${item.parentPhone}`} className="text-slate-600 hover:text-slate-900">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        </a>
                        <a href={`https://wa.me/91${item.parentPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tutor Contact</p>
                    <p className="font-bold text-slate-800 truncate">{item.tutorName || "Tutor"}</p>
                    {item.tutorPhone && (
                      <div className="flex gap-2 mt-1">
                        <a href={`tel:${item.tutorPhone}`} className="text-slate-600 hover:text-slate-900">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        </a>
                        <a href={`https://wa.me/91${item.tutorPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleViewCancellation(item)}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>View</span>
                  </button>
                  <button
                    disabled={resolvingId === item.id}
                    onClick={() => handleResolve(item.id, "approve_decline")}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                  >
                    Approve & End
                  </button>
                  <button
                    disabled={resolvingId === item.id}
                    onClick={() => handleResolve(item.id, "dismiss")}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Cancellation & Contact Details Modal */}
      {viewingCancellation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-lg max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg shadow-md shrink-0 border border-rose-100">
                  <UserMinus className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      Discontinue Tuition Request
                    </h3>
                    <span className="font-mono text-xs text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
                      Day {viewingCancellation.cancellationDaysElapsed || 1}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">Contact information & prorated compensation</p>
                </div>
              </div>
              <button
                onClick={() => setViewingCancellation(null)}
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
                    <span className="text-[10px] text-emerald-700 font-semibold">Requesting Party</span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-black text-slate-900 text-sm">
                      {viewingCancellation.studentName || "Student"}
                    </p>
                    {viewingCancellation.parentName && (
                      <p className="text-slate-600 font-medium">Parent: {viewingCancellation.parentName}</p>
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
                          {viewingCancellation.parentPhone || "No phone listed"}
                        </p>
                      </div>
                    </div>
                    {viewingCancellation.parentPhone && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={formatTelUrl(viewingCancellation.parentPhone)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 transition-colors"
                          title="Call Parent"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                        <a
                          href={formatWhatsAppUrl(viewingCancellation.parentPhone)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center gap-1 transition-colors"
                          title="WhatsApp Parent"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          onClick={() => handleCopyText(viewingCancellation.parentPhone || "", "parent_phone")}
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
                          {viewingCancellation.parentEmail || "No email registered"}
                        </p>
                      </div>
                    </div>
                    {viewingCancellation.parentEmail && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`mailto:${viewingCancellation.parentEmail}?subject=Cancellation%20Update%20-%20MiTutora`}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 transition-colors"
                          title="Send Email"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Email</span>
                        </a>
                        <button
                          onClick={() => handleCopyText(viewingCancellation.parentEmail || "", "parent_email")}
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
                      {viewingCancellation.tutorName || "Tutor"}
                    </p>
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
                          {viewingCancellation.tutorPhone || "No phone listed"}
                        </p>
                      </div>
                    </div>
                    {viewingCancellation.tutorPhone && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={formatTelUrl(viewingCancellation.tutorPhone)}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 transition-colors"
                          title="Call Tutor"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                        <a
                          href={formatWhatsAppUrl(viewingCancellation.tutorPhone)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center gap-1 transition-colors"
                          title="WhatsApp Tutor"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          onClick={() => handleCopyText(viewingCancellation.tutorPhone || "", "tutor_phone")}
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
                          {viewingCancellation.tutorEmail || "No email registered"}
                        </p>
                      </div>
                    </div>
                    {viewingCancellation.tutorEmail && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`mailto:${viewingCancellation.tutorEmail}?subject=Cancellation%20Update%20-%20MiTutora`}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 transition-colors"
                          title="Send Email"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Email</span>
                        </a>
                        <button
                          onClick={() => handleCopyText(viewingCancellation.tutorEmail || "", "tutor_email")}
                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"
                          title="Copy Email"
                        >
                          {copiedField === "tutor_email" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Prorated Fee Breakdown */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                    Prorated Fee Calculation
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px]">Trial Days Elapsed</span>
                      <span className="font-bold text-slate-900">
                        {viewingCancellation.cancellationDaysElapsed || 1} of 7 days
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px]">Prorated Due</span>
                      <span className="text-base font-black text-rose-700">
                        ₹{(viewingCancellation.cancellationProratedFee || 0).toLocaleString("en-IN")}
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
                onClick={() => setViewingCancellation(null)}
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
