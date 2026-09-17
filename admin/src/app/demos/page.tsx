"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  CalendarDays,
  Clock,
  Video,
  User,
  Phone,
  MessageCircle,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
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

interface DemoApplication {
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
  status: string;
  category?: string;
  subjects?: string[];
  combinedSubjects?: string[];
  demoDate?: string;
  demoTime?: string;
  gmeetLink?: string;
  initialBudget?: number;
  finalPrice?: number;
  updatedAt?: any;
  createdAt?: any;
}

export default function DemosPage() {
  const [demos, setDemos] = useState<DemoApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "scheduled" | "decision" | "requested">("all");
  const [search, setSearch] = useState("");

  // View Details Modal State
  const [viewingDemo, setViewingDemo] = useState<DemoApplication | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    // Listen to all demo-related applications
    const q = query(
      collection(db, "applications"),
      where("status", "in", [
        "demo_scheduled",
        "waiting_for_parent_decision",
        "demo_requested_by_student",
        "demo_requested_by_teacher",
        "negotiating"
      ])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: DemoApplication[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as any) });
        });
        // Sort newest first
        list.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt || 0);
          const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt || 0);
          return timeB - timeA;
        });
        setDemos(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching demos:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredDemos = demos.filter((d) => {
    // Filter by tab
    if (filter === "scheduled" && d.status !== "demo_scheduled") return false;
    if (filter === "decision" && d.status !== "waiting_for_parent_decision") return false;
    if (filter === "requested" && !["demo_requested_by_student", "demo_requested_by_teacher", "negotiating"].includes(d.status)) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const sName = (d.studentName || d.parentName || "").toLowerCase();
      const tName = (d.tutorName || "").toLowerCase();
      const appId = (d.applicationId || d.id || "").toLowerCase();
      return sName.includes(q) || tName.includes(q) || appId.includes(q);
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "demo_scheduled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#00a992]/10 text-[#007f6e] border border-[#00a992]/30">
            <CalendarDays className="w-3.5 h-3.5 text-[#00a992]" /> Scheduled
          </span>
        );
      case "waiting_for_parent_decision":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Awaiting Parent (48h Window)
          </span>
        );
      case "demo_requested_by_student":
      case "demo_requested_by_teacher":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <AlertCircle className="w-3.5 h-3.5" /> Demo Requested
          </span>
        );
      case "negotiating":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Negotiating
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  const handleCopyText = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleViewDemo = async (demo: DemoApplication) => {
    setViewingDemo({ ...demo });
    setIsDetailLoading(true);

    let updated = { ...demo };
    try {
      // 1. Resolve Parent & Student Contact
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

      // 2. Resolve Educator / Tutor Contact
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
      console.error("Error loading demo contact details:", err);
    } finally {
      setViewingDemo(updated);
      setIsDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Demo Phase Tracker</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Monitor trials, scheduled slots, Google Meet sessions, and 48-hour hiring decisions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs font-bold text-slate-700">
            Total in Pipeline: <span className="text-[#00a992] font-black ml-1">{demos.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilter("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === "all"
                ? "bg-[#063831] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Demos ({demos.length})
          </button>
          <button
            onClick={() => setFilter("scheduled")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === "scheduled"
                ? "bg-[#00a992] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Scheduled ({demos.filter((d) => d.status === "demo_scheduled").length})
          </button>
          <button
            onClick={() => setFilter("decision")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === "decision"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Awaiting Decision ({demos.filter((d) => d.status === "waiting_for_parent_decision").length})
          </button>
          <button
            onClick={() => setFilter("requested")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === "requested"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Requested / In Proposal
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

      {/* Demos Cards Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <p className="text-sm font-semibold text-slate-500">Loading demo pipeline data...</p>
        </div>
      ) : filteredDemos.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
          <CalendarDays className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-600">No demos found matching current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDemos.map((demo) => (
            <div
              key={demo.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-slate-300 transition-all space-y-4"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      #{demo.applicationId || demo.id.slice(0, 8)}
                    </span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {demo.category || "School"}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    {demo.studentName || demo.parentName || "Student / Parent"}
                  </h3>
                </div>
                {getStatusBadge(demo.status)}
              </div>

              {/* Participants Detail */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Student / Parent</p>
                  <p className="font-bold text-slate-800 truncate mt-0.5">
                    {demo.studentName || demo.parentName || "N/A"}
                  </p>
                  {demo.parentPhone && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <a
                        href={`tel:${demo.parentPhone}`}
                        className="text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" /> {demo.parentPhone}
                      </a>
                      <a
                        href={`https://wa.me/91${demo.parentPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-700"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Tutor</p>
                  <p className="font-bold text-slate-800 truncate mt-0.5">
                    {demo.tutorName || "Pending Assignment"}
                  </p>
                  {demo.tutorPhone && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <a
                        href={`tel:${demo.tutorPhone}`}
                        className="text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" /> {demo.tutorPhone}
                      </a>
                      <a
                        href={`https://wa.me/91${demo.tutorPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-700"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Demo Slot & Meeting Link */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <CalendarDays className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {demo.demoDate ? `${demo.demoDate} at ${demo.demoTime || "Time TBD"}` : "Slot not finalized"}
                  </span>
                </div>

                {demo.gmeetLink && (
                  <a
                    href={demo.gmeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    <Video className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Join Meeting</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Bottom Action Row */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium truncate max-w-[180px]">
                  {demo.subjects?.join(", ") || demo.category || "Trial Class"}
                </span>
                <button
                  onClick={() => handleViewDemo(demo)}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Demo & Contact Details Modal */}
      {viewingDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-lg max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#063831] text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      Trial / Demo Session
                    </h3>
                    <span className="font-mono text-xs text-slate-400 font-bold shrink-0">
                      #{viewingDemo.applicationId || viewingDemo.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">Contact information & meeting details</p>
                </div>
              </div>
              <button
                onClick={() => setViewingDemo(null)}
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
                      {viewingDemo.studentName || "Student"}
                    </p>
                    {viewingDemo.parentName && (
                      <p className="text-slate-600 font-medium">Parent: {viewingDemo.parentName}</p>
                    )}
                    {viewingDemo.category && (
                      <p className="text-slate-500 text-[11px] capitalize">Class / Category: {viewingDemo.category}</p>
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
                          {viewingDemo.parentPhone || "No phone listed"}
                        </p>
                      </div>
                    </div>
                    {viewingDemo.parentPhone && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={formatTelUrl(viewingDemo.parentPhone)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 transition-colors"
                          title="Call Parent"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                        <a
                          href={formatWhatsAppUrl(viewingDemo.parentPhone)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center gap-1 transition-colors"
                          title="WhatsApp Parent"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          onClick={() => handleCopyText(viewingDemo.parentPhone || "", "parent_phone")}
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
                          {viewingDemo.parentEmail || "No email registered"}
                        </p>
                      </div>
                    </div>
                    {viewingDemo.parentEmail && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`mailto:${viewingDemo.parentEmail}?subject=Demo%20Session%20Update%20-%20MiTutora`}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 transition-colors"
                          title="Send Email"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Email</span>
                        </a>
                        <button
                          onClick={() => handleCopyText(viewingDemo.parentEmail || "", "parent_email")}
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
                      {viewingDemo.tutorName || "Pending Tutor Assignment"}
                    </p>
                    {viewingDemo.subjects && viewingDemo.subjects.length > 0 && (
                      <p className="text-slate-500 text-[11px]">Subjects: {viewingDemo.subjects.join(", ")}</p>
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
                          {viewingDemo.tutorPhone || "No phone listed"}
                        </p>
                      </div>
                    </div>
                    {viewingDemo.tutorPhone && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={formatTelUrl(viewingDemo.tutorPhone)}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 transition-colors"
                          title="Call Tutor"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                        <a
                          href={formatWhatsAppUrl(viewingDemo.tutorPhone)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center gap-1 transition-colors"
                          title="WhatsApp Tutor"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          onClick={() => handleCopyText(viewingDemo.tutorPhone || "", "tutor_phone")}
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
                          {viewingDemo.tutorEmail || "No email registered"}
                        </p>
                      </div>
                    </div>
                    {viewingDemo.tutorEmail && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`mailto:${viewingDemo.tutorEmail}?subject=Demo%20Session%20Update%20-%20MiTutora`}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 transition-colors"
                          title="Send Email"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Email</span>
                        </a>
                        <button
                          onClick={() => handleCopyText(viewingDemo.tutorEmail || "", "tutor_email")}
                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"
                          title="Copy Email"
                        >
                          {copiedField === "tutor_email" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Slot Timing & Join Link */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                    Demo Slot & Meeting Details
                  </span>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Slot Time</span>
                      <span className="font-bold text-slate-900">
                        {viewingDemo.demoDate ? `${viewingDemo.demoDate} at ${viewingDemo.demoTime || "Time TBD"}` : "Date/Time not set"}
                      </span>
                    </div>
                    {viewingDemo.gmeetLink && (
                      <a
                        href={viewingDemo.gmeetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Open Meet</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Modal Footer (Sticky at bottom) */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={() => setViewingDemo(null)}
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
