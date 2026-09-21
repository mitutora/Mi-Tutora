"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
  doc,
  getDoc,
  DocumentSnapshot,
  QueryDocumentSnapshot
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  Users,
  GraduationCap,
  UserCheck,
  FolderKanban,
  Search,
  Filter,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  X,
  Eye,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Star,
  IndianRupee,
  Calendar,
  Clock,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
  BookOpen,
  Award,
  CreditCard,
  User
} from "lucide-react";
import {
  formatWhatsAppUrl,
  formatTelUrl,
  resolveParentContact,
  resolveTutorContact
} from "@/lib/contactResolver";

const PAGE_SIZE = 20;

// ============================================================================
// DATA MODELS & INTERFACES
// ============================================================================

interface TutorItem {
  id: string;
  authUid?: string;
  tutorId?: string;
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  gender?: string;
  category?: string;
  qualification?: string;
  experience?: string;
  subjects?: string[];
  classes?: string[];
  boards?: string[];
  technologies?: string[];
  languagesTaught?: string[];
  feeRange?: string | number;
  mode?: string;
  preferredLocations?: string;
  travelDistance?: string | number;
  area?: string;
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  occupation?: string;
  teachingApproach?: string;
  weeklyQuota?: {
    tokensUsed?: number;
    weekStartDate?: string;
    lastUpdated?: any;
  };
  bankedTokens?: number;
  subscriptionPlan?: string;
  subscriptionExpiry?: number;
  isSubscribed?: boolean;
  aadharVerified?: boolean;
  maskedAadhar?: string;
  resumeUrl?: string;
  resume?: {
    url?: string;
    fileName?: string;
    uploadedAt?: number;
  };
  verificationDocs?: Record<string, { url: string; fileName: string; uploadedAt: number }>;
  verificationStatus?: string;
  rating?: number;
  reviewCount?: number;
  upiId?: string;
  accountStatus?: string;
  hasProfile?: boolean;
  createdAt?: any;
}

interface StudentChild {
  id: string;
  studentId?: string;
  parentDocId?: string;
  groupDocId?: string;
  name?: string;
  gender?: string;
  classLevel?: string;
  board?: string;
  category?: string;
  studentType?: string;
  subjects?: string[];
  budget?: number;
  learningGoal?: string;
  specialRequirements?: string;
}

interface ParentItem {
  id: string;
  parentDocId?: string;
  authUid?: string;
  parentId?: string;
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  area?: string;
  city?: string;
  pincode?: string;
  dailyUsage?: {
    date?: string;
    count?: number;
    lastUpdated?: any;
  };
  walletBalance?: number;
  walletbalance?: number;
  referralCode?: string;
  referredBy?: string;
  createdAt?: any;
  students?: StudentChild[];
}

interface GroupItem {
  id: string;
  groupDocId?: string;
  groupId?: string;
  parentDocId?: string;
  parentId?: string;
  studentDocIds?: string[];
  studentIds?: string[];
  mode?: string;
  area?: string;
  city?: string;
  addressStreet?: string;
  addressFlat?: string;
  addressPincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  daysPerWeek?: string;
  specificDays?: string[];
  preferredTimeRange?: string;
  teacherGenderPreference?: string;
  totalBudget?: number;
  isGroup?: boolean;
  status?: string;
  createdAt?: any;
  updatedAt?: any;
  // Resolved info for display
  parentName?: string;
  parentPhone?: string;
  studentNames?: string[];
  subjects?: string[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UserDirectoryPage() {
  const [activeTab, setActiveTab] = useState<"teachers" | "parents" | "groups">("teachers");
  const [search, setSearch] = useState("");

  // Subtab 1: Teachers State
  const [teachers, setTeachers] = useState<TutorItem[]>([]);
  const [teacherLastDoc, setTeacherLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [teacherHasMore, setTeacherHasMore] = useState(true);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherLoadingMore, setTeacherLoadingMore] = useState(false);
  const [teacherCategoryFilter, setTeacherCategoryFilter] = useState("all");
  const [teacherModeFilter, setTeacherModeFilter] = useState("all");
  const [teacherPlanFilter, setTeacherPlanFilter] = useState("all");
  const [teacherKycFilter, setTeacherKycFilter] = useState("all");

  // Subtab 2: Parents & Students State
  const [parents, setParents] = useState<ParentItem[]>([]);
  const [parentLastDoc, setParentLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [parentHasMore, setParentHasMore] = useState(true);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentLoadingMore, setParentLoadingMore] = useState(false);
  const [parentCityFilter, setParentCityFilter] = useState("all");

  // Subtab 3: Groups State
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [groupLastDoc, setGroupLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [groupHasMore, setGroupHasMore] = useState(true);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupLoadingMore, setGroupLoadingMore] = useState(false);
  const [groupTypeFilter, setGroupTypeFilter] = useState("all");
  const [groupModeFilter, setGroupModeFilter] = useState("all");

  // Detail Modals State
  const [viewingTeacher, setViewingTeacher] = useState<TutorItem | null>(null);
  const [viewingParent, setViewingParent] = useState<ParentItem | null>(null);
  const [viewingGroup, setViewingGroup] = useState<GroupItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Helper: Copy to clipboard
  const handleCopyText = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ==========================================================================
  // FETCHERS: TEACHERS
  // ==========================================================================
  const loadTeachers = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setTeacherLoading(true);
    } else {
      setTeacherLoadingMore(true);
    }

    try {
      let q = query(
        collection(db, "tutors"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );

      if (!isInitial && teacherLastDoc) {
        q = query(
          collection(db, "tutors"),
          orderBy("createdAt", "desc"),
          startAfter(teacherLastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      const items: TutorItem[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as any) });
      });

      if (isInitial) {
        setTeachers(items);
      } else {
        setTeachers((prev) => [...prev, ...items]);
      }

      const lastVisible = snap.docs[snap.docs.length - 1] || null;
      setTeacherLastDoc(lastVisible);
      setTeacherHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Error loading teachers:", err);
    } finally {
      setTeacherLoading(false);
      setTeacherLoadingMore(false);
    }
  }, [teacherLastDoc]);

  // ==========================================================================
  // FETCHERS: PARENTS & STUDENTS
  // ==========================================================================
  const loadParents = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setParentLoading(true);
    } else {
      setParentLoadingMore(true);
    }

    try {
      let q = query(
        collection(db, "parents"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );

      if (!isInitial && parentLastDoc) {
        q = query(
          collection(db, "parents"),
          orderBy("createdAt", "desc"),
          startAfter(parentLastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      const parentList: ParentItem[] = [];
      const parentUids: string[] = [];

      snap.forEach((d) => {
        const pData = d.data();
        const pUid = pData.authUid || pData.parentDocId || d.id;
        parentUids.push(pUid);
        parentList.push({ id: d.id, ...(pData as any), students: [] });
      });

      // Join students belonging to these parents
      if (parentUids.length > 0) {
        try {
          // Firestore 'in' query supports up to 30 items
          const studentsQuery = query(
            collection(db, "students"),
            where("parentDocId", "in", parentUids.slice(0, 30))
          );
          const studentSnap = await getDocs(studentsQuery);
          const studentMap: Record<string, StudentChild[]> = {};

          studentSnap.forEach((sDoc) => {
            const sData = sDoc.data() as any;
            const pId = sData.parentDocId || "";
            if (!studentMap[pId]) studentMap[pId] = [];
            studentMap[pId].push({ ...sData, id: sDoc.id });
          });

          // Attach children to parent items
          parentList.forEach((p) => {
            const pUid = p.authUid || p.parentDocId || p.id;
            p.students = studentMap[pUid] || [];
          });
        } catch (studentErr) {
          console.warn("Could not batch-join students:", studentErr);
        }
      }

      if (isInitial) {
        setParents(parentList);
      } else {
        setParents((prev) => [...prev, ...parentList]);
      }

      const lastVisible = snap.docs[snap.docs.length - 1] || null;
      setParentLastDoc(lastVisible);
      setParentHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Error loading parents:", err);
    } finally {
      setParentLoading(false);
      setParentLoadingMore(false);
    }
  }, [parentLastDoc]);

  // ==========================================================================
  // FETCHERS: GROUPS
  // ==========================================================================
  const loadGroups = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setGroupLoading(true);
    } else {
      setGroupLoadingMore(true);
    }

    try {
      let q = query(
        collection(db, "groups"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );

      if (!isInitial && groupLastDoc) {
        q = query(
          collection(db, "groups"),
          orderBy("createdAt", "desc"),
          startAfter(groupLastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      const groupList: GroupItem[] = [];
      const parentUidsToFetch = new Set<string>();

      snap.forEach((d) => {
        const gData = d.data();
        const pId = gData.parentDocId || gData.parentId || "";
        if (pId) parentUidsToFetch.add(pId);
        groupList.push({ id: d.id, ...(gData as any) });
      });

      // Fetch parent names/phones for these groups
      if (parentUidsToFetch.size > 0) {
        const uidsArray = Array.from(parentUidsToFetch).slice(0, 30);
        try {
          const parentsQuery = query(
            collection(db, "parents"),
            where("parentDocId", "in", uidsArray)
          );
          const parentsSnap = await getDocs(parentsQuery);
          const parentInfoMap: Record<string, { name?: string; phone?: string }> = {};

          parentsSnap.forEach((pDoc) => {
            const pData = pDoc.data();
            const uid = pData.parentDocId || pData.authUid || pDoc.id;
            parentInfoMap[uid] = { name: pData.name, phone: pData.phone || pData.whatsapp };
          });

          groupList.forEach((g) => {
            const pId = g.parentDocId || g.parentId || "";
            if (parentInfoMap[pId]) {
              g.parentName = parentInfoMap[pId].name;
              g.parentPhone = parentInfoMap[pId].phone;
            }
          });
        } catch (pErr) {
          console.warn("Could not batch-resolve group parents:", pErr);
        }
      }

      if (isInitial) {
        setGroups(groupList);
      } else {
        setGroups((prev) => [...prev, ...groupList]);
      }

      const lastVisible = snap.docs[snap.docs.length - 1] || null;
      setGroupLastDoc(lastVisible);
      setGroupHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Error loading groups:", err);
    } finally {
      setGroupLoading(false);
      setGroupLoadingMore(false);
    }
  }, [groupLastDoc]);

  // Initial load on mount / tab change
  useEffect(() => {
    if (activeTab === "teachers" && teachers.length === 0) {
      loadTeachers(true);
    } else if (activeTab === "parents" && parents.length === 0) {
      loadParents(true);
    } else if (activeTab === "groups" && groups.length === 0) {
      loadGroups(true);
    }
  }, [activeTab, teachers.length, parents.length, groups.length, loadTeachers, loadParents, loadGroups]);

  // ==========================================================================
  // FILTERING LOGIC
  // ==========================================================================

  // Filtered Teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      // Category filter
      if (teacherCategoryFilter !== "all" && t.category !== teacherCategoryFilter) return false;
      // Mode filter
      if (teacherModeFilter !== "all" && t.mode?.toLowerCase() !== teacherModeFilter.toLowerCase()) return false;
      // Plan filter
      if (teacherPlanFilter === "pro" && t.subscriptionPlan !== "pro") return false;
      if (teacherPlanFilter === "free" && t.subscriptionPlan === "pro") return false;
      // KYC filter
      if (teacherKycFilter === "verified" && !t.aadharVerified) return false;
      if (teacherKycFilter === "unverified" && t.aadharVerified) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = (t.name || "").toLowerCase();
        const tutorId = (t.tutorId || t.id || "").toLowerCase();
        const email = (t.email || "").toLowerCase();
        const phone = (t.phone || t.whatsapp || "").toLowerCase();
        const city = (t.city || t.area || "").toLowerCase();
        const subjects = (t.subjects || []).join(" ").toLowerCase();

        return (
          name.includes(q) ||
          tutorId.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          city.includes(q) ||
          subjects.includes(q)
        );
      }
      return true;
    });
  }, [teachers, teacherCategoryFilter, teacherModeFilter, teacherPlanFilter, teacherKycFilter, search]);

  // Filtered Parents
  const filteredParents = useMemo(() => {
    return parents.filter((p) => {
      // City filter
      if (parentCityFilter !== "all" && (p.city || "").toLowerCase() !== parentCityFilter.toLowerCase()) {
        return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = (p.name || "").toLowerCase();
        const parentId = (p.parentId || p.id || "").toLowerCase();
        const email = (p.email || "").toLowerCase();
        const phone = (p.phone || p.whatsapp || "").toLowerCase();
        const city = (p.city || p.area || "").toLowerCase();
        const childrenNames = (p.students || []).map((s) => s.name || "").join(" ").toLowerCase();
        const studentIds = (p.students || []).map((s) => s.studentId || "").join(" ").toLowerCase();

        return (
          name.includes(q) ||
          parentId.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          city.includes(q) ||
          childrenNames.includes(q) ||
          studentIds.includes(q)
        );
      }
      return true;
    });
  }, [parents, parentCityFilter, search]);

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      // Type filter
      if (groupTypeFilter === "solo" && g.isGroup === true) return false;
      if (groupTypeFilter === "group" && g.isGroup !== true) return false;
      // Mode filter
      if (groupModeFilter !== "all" && g.mode?.toLowerCase() !== groupModeFilter.toLowerCase()) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const groupId = (g.groupId || g.id || "").toLowerCase();
        const parentName = (g.parentName || "").toLowerCase();
        const city = (g.city || g.area || "").toLowerCase();
        const subjects = (g.subjects || []).join(" ").toLowerCase();
        const studentNames = (g.studentNames || []).join(" ").toLowerCase();

        return (
          groupId.includes(q) ||
          parentName.includes(q) ||
          city.includes(q) ||
          subjects.includes(q) ||
          studentNames.includes(q)
        );
      }
      return true;
    });
  }, [groups, groupTypeFilter, groupModeFilter, search]);

  // Available Cities for Parents Filter
  const availableParentCities = useMemo(() => {
    const set = new Set<string>();
    parents.forEach((p) => {
      if (p.city && p.city.trim()) set.add(p.city.trim());
    });
    return Array.from(set);
  }, [parents]);

  // ==========================================================================
  // DETAIL MODAL HANDLERS
  // ==========================================================================
  const handleViewTeacher = async (teacher: TutorItem) => {
    setViewingTeacher({ ...teacher });
    setIsDetailLoading(true);

    try {
      const contact = await resolveTutorContact(teacher.authUid || teacher.id, {
        name: teacher.name,
        phone: teacher.phone || teacher.whatsapp,
        email: teacher.email
      });

      setViewingTeacher((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          phone: contact.phone || prev.phone,
          whatsapp: contact.whatsapp || prev.whatsapp,
          email: contact.email || prev.email,
          upiId: contact.upiId || prev.upiId
        };
      });
    } catch (err) {
      console.error("Error loading teacher details:", err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleViewParent = async (parent: ParentItem) => {
    setViewingParent({ ...parent });
    setIsDetailLoading(true);

    try {
      const pUid = parent.authUid || parent.parentDocId || parent.id;
      const contact = await resolveParentContact(pUid, undefined, {
        name: parent.name,
        phone: parent.phone || parent.whatsapp,
        email: parent.email
      });

      // Also ensure children list is fetched if not present
      let children = parent.students || [];
      if (children.length === 0) {
        const sQuery = query(collection(db, "students"), where("parentDocId", "==", pUid));
        const sSnap = await getDocs(sQuery);
        const fetched: StudentChild[] = [];
        sSnap.forEach((sd) => fetched.push({ id: sd.id, ...(sd.data() as any) }));
        children = fetched;
      }

      setViewingParent((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          phone: contact.phone || prev.phone,
          whatsapp: contact.whatsapp || prev.whatsapp,
          email: contact.email || prev.email,
          students: children
        };
      });
    } catch (err) {
      console.error("Error loading parent details:", err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleViewGroup = async (group: GroupItem) => {
    setViewingGroup({ ...group });
    setIsDetailLoading(true);

    try {
      const pUid = group.parentDocId || group.parentId;
      let pContactName = group.parentName;
      let pContactPhone = group.parentPhone;

      if (pUid && (!pContactName || !pContactPhone)) {
        const contact = await resolveParentContact(pUid);
        pContactName = contact.name || pContactName;
        pContactPhone = contact.phone || pContactPhone;
      }

      // Resolve student names from studentDocIds
      const studentIds = group.studentDocIds || group.studentIds || [];
      let resolvedStudentNames: string[] = [];

      if (studentIds.length > 0) {
        const sSnap = await getDocs(
          query(collection(db, "students"), where("__name__", "in", studentIds.slice(0, 30)))
        );
        sSnap.forEach((sd) => {
          const sData = sd.data();
          if (sData.name) resolvedStudentNames.push(sData.name);
        });
      }

      setViewingGroup((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          parentName: pContactName || prev.parentName,
          parentPhone: pContactPhone || prev.parentPhone,
          studentNames: resolvedStudentNames.length > 0 ? resolvedStudentNames : prev.studentNames
        };
      });
    } catch (err) {
      console.error("Error loading group details:", err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & METRIC SUMMARY                                       */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#00a992]" />
            <span>User Directory & Management</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Comprehensive directory of registered Teachers, Parents, Learners, and Learning Groups across the platform.
          </p>
        </div>

        {/* Global Metric Badges */}
        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs font-bold text-slate-700 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-teal-600" />
            <span>Teachers: <strong className="text-slate-900">{teachers.length}</strong></span>
          </div>
          <div className="px-3.5 py-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs font-bold text-slate-700 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Parents: <strong className="text-slate-900">{parents.length}</strong></span>
          </div>
          <div className="px-3.5 py-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs font-bold text-slate-700 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-purple-600" />
            <span>Groups: <strong className="text-slate-900">{groups.length}</strong></span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SUBTAB SWITCHER                                                    */}
      {/* ===================================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("teachers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "teachers"
              ? "bg-[#063831] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Teachers ({teachers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("parents")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "parents"
              ? "bg-[#063831] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Parents & Students ({parents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("groups")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "groups"
              ? "bg-[#063831] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Student Groups ({groups.length})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 3. SEARCH & SUBTAB-SPECIFIC FILTERS                                   */}
      {/* ===================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === "teachers"
                ? "Search by Name, MTT ID, Phone, Email, Subject, City..."
                : activeTab === "parents"
                ? "Search by Parent Name, Child Name, MTP/MTS ID, Phone, City..."
                : "Search by Group ID (MTG...), Student, Parent, Subject..."
            }
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Dynamic Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* TEACHERS FILTERS */}
          {activeTab === "teachers" && (
            <>
              <select
                value={teacherCategoryFilter}
                onChange={(e) => setTeacherCategoryFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Categories</option>
                <option value="school">School</option>
                <option value="competitive">Competitive</option>
                <option value="programming">Programming</option>
                <option value="languages">Languages</option>
              </select>

              <select
                value={teacherModeFilter}
                onChange={(e) => setTeacherModeFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Modes</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>

              <select
                value={teacherPlanFilter}
                onChange={(e) => setTeacherPlanFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Plans</option>
                <option value="pro">Pro Plan</option>
                <option value="free">Free Plan</option>
              </select>

              <select
                value={teacherKycFilter}
                onChange={(e) => setTeacherKycFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All KYC</option>
                <option value="verified">KYC Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </>
          )}

          {/* PARENTS FILTERS */}
          {activeTab === "parents" && (
            <>
              {availableParentCities.length > 0 && (
                <select
                  value={parentCityFilter}
                  onChange={(e) => setParentCityFilter(e.target.value)}
                  className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">All Cities</option>
                  {availableParentCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {/* GROUPS FILTERS */}
          {activeTab === "groups" && (
            <>
              <select
                value={groupTypeFilter}
                onChange={(e) => setGroupTypeFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Group Types</option>
                <option value="solo">Solo Learner</option>
                <option value="group">Multi-Student Batch</option>
              </select>

              <select
                value={groupModeFilter}
                onChange={(e) => setGroupModeFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Modes</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. SUBTAB 1: TEACHERS OPERATIONS TABLE                                */}
      {/* ===================================================================== */}
      {activeTab === "teachers" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {teacherLoading ? (
            <div className="p-12 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#00a992] mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading educators directory...</p>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <GraduationCap className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No teachers found matching criteria.</p>
              <p className="text-xs text-slate-400">Try adjusting your search query or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Teacher Identity</th>
                    <th className="px-5 py-3.5">Direct Contact</th>
                    <th className="px-5 py-3.5">Domain & Subjects</th>
                    <th className="px-5 py-3.5">Mode & City</th>
                    <th className="px-5 py-3.5">Trust & Verification</th>
                    <th className="px-5 py-3.5">Plan & Quota</th>
                    <th className="px-5 py-3.5">Rate & Score</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredTeachers.map((t) => {
                    const phone = t.phone || t.whatsapp || "";
                    const isPro = t.subscriptionPlan === "pro";
                    const isKyc = t.aadharVerified === true;
                    const tokensUsed = t.weeklyQuota?.tokensUsed || 0;
                    const quotaLimit = isPro ? 15 : 5;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* ID & Name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#063831] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {(t.name || "T").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate max-w-[140px]">
                                {t.name || "Unnamed Tutor"}
                              </p>
                              <span className="font-mono text-[10px] text-slate-400 font-bold block">
                                #{t.tutorId || t.id.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            {phone ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={formatTelUrl(phone)}
                                  className="text-slate-700 hover:text-slate-900 font-mono text-xs flex items-center gap-1 font-bold"
                                  title="Call Tutor"
                                >
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>{phone}</span>
                                </a>
                                <a
                                  href={formatWhatsAppUrl(phone)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#25D366] hover:opacity-80 transition-opacity"
                                  title="WhatsApp Chat"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">No phone</span>
                            )}
                            {t.email && (
                              <p className="text-[11px] text-slate-400 truncate max-w-[150px] font-mono">
                                {t.email}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Domain & Subjects */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-50 text-teal-800 border border-teal-200">
                              {t.category || "School"}
                            </span>
                            <p className="text-[11px] text-slate-600 truncate max-w-[160px]">
                              {t.subjects && t.subjects.length > 0
                                ? t.subjects.join(", ")
                                : "No subjects listed"}
                            </p>
                          </div>
                        </td>

                        {/* Mode & City */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.mode?.toLowerCase() === "online"
                                  ? "bg-blue-50 text-blue-800 border border-blue-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {t.mode || "Online"}
                            </span>
                            <p className="text-[11px] text-slate-500 truncate max-w-[120px]">
                              {t.city || t.area || "City TBD"}
                            </p>
                          </div>
                        </td>

                        {/* Trust & Verification */}
                        <td className="px-5 py-4">
                          <div className="space-y-1.5">
                            {isKyc ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" /> KYC Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                <ShieldAlert className="w-3 h-3 text-slate-400" /> Unverified
                              </span>
                            )}
                            {t.resumeUrl && (
                              <a
                                href={t.resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Resume</span>
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Plan & Quota */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                isPro
                                  ? "bg-purple-50 text-purple-800 border border-purple-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {isPro ? "Pro Plan" : "Free Plan"}
                            </span>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {tokensUsed}/{quotaLimit} tokens used
                            </p>
                          </div>
                        </td>

                        {/* Rate & Rating */}
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-bold text-slate-900 flex items-center">
                              <IndianRupee className="w-3 h-3 text-slate-500" />
                              <span>{t.feeRange ? `${t.feeRange}/mo` : "Fee TBD"}</span>
                            </p>
                            {t.rating ? (
                              <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1 mt-0.5">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span>{t.rating.toFixed(1)}</span>
                                <span className="text-slate-400">({t.reviewCount || 0})</span>
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400">No reviews</p>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleViewTeacher(t)}
                            className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Lazy Load Controls */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <strong>{filteredTeachers.length}</strong> loaded educators
                </span>
                {teacherHasMore && (
                  <button
                    disabled={teacherLoadingMore}
                    onClick={() => loadTeachers(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {teacherLoadingMore ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00a992]" />
                        <span>Loading more...</span>
                      </>
                    ) : (
                      <span>Load More (20 records)</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. SUBTAB 2: PARENTS & STUDENTS OPERATIONS TABLE                     */}
      {/* ===================================================================== */}
      {activeTab === "parents" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {parentLoading ? (
            <div className="p-12 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#00a992] mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading parent accounts...</p>
            </div>
          ) : filteredParents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <UserCheck className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No parent accounts found matching criteria.</p>
              <p className="text-xs text-slate-400">Try adjusting your search query or city filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Parent Identity</th>
                    <th className="px-5 py-3.5">Direct Contact</th>
                    <th className="px-5 py-3.5">Location</th>
                    <th className="px-5 py-3.5">Linked Learners (Students)</th>
                    <th className="px-5 py-3.5">Daily Usage & Wallet</th>
                    <th className="px-5 py-3.5">Referrals</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredParents.map((p) => {
                    const phone = p.phone || p.whatsapp || "";
                    const childrenCount = (p.students || []).length;
                    const wallet = p.walletBalance ?? p.walletbalance ?? 0;
                    const dailyCount = p.dailyUsage?.count || 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Parent Identity */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {(p.name || "P").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate max-w-[140px]">
                                {p.name || "Parent Account"}
                              </p>
                              <span className="font-mono text-[10px] text-slate-400 font-bold block">
                                #{p.parentId || p.id.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            {phone ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={formatTelUrl(phone)}
                                  className="text-slate-700 hover:text-slate-900 font-mono text-xs flex items-center gap-1 font-bold"
                                  title="Call Parent"
                                >
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>{phone}</span>
                                </a>
                                <a
                                  href={formatWhatsAppUrl(phone)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#25D366] hover:opacity-80 transition-opacity"
                                  title="WhatsApp Chat"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">No phone</span>
                            )}
                            {p.email && (
                              <p className="text-[11px] text-slate-400 truncate max-w-[150px] font-mono">
                                {p.email}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-5 py-4">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800">{p.city || "City N/A"}</p>
                            {p.area && <p className="text-[11px] text-slate-400 truncate max-w-[120px]">{p.area}</p>}
                          </div>
                        </td>

                        {/* Linked Students */}
                        <td className="px-5 py-4">
                          {childrenCount === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">No learners added</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                              {p.students?.map((child) => (
                                <span
                                  key={child.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200"
                                >
                                  <span>{child.name || "Learner"}</span>
                                  {child.classLevel && (
                                    <span className="text-slate-400 font-normal">({child.classLevel})</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Usage & Wallet */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <p className="text-[11px] font-mono font-bold text-slate-800">
                              Requests: {dailyCount}/5 today
                            </p>
                            <p className="text-[11px] text-emerald-700 font-bold flex items-center">
                              <IndianRupee className="w-3 h-3" />
                              <span>{wallet.toLocaleString("en-IN")} credit</span>
                            </p>
                          </div>
                        </td>

                        {/* Referral Code */}
                        <td className="px-5 py-4">
                          <div className="space-y-0.5 font-mono text-[10px]">
                            {p.referralCode ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                                {p.referralCode}
                              </span>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                            {p.referredBy && (
                              <p className="text-slate-400">Ref: {p.referredBy}</p>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleViewParent(p)}
                            className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Lazy Load Controls */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <strong>{filteredParents.length}</strong> loaded parent accounts
                </span>
                {parentHasMore && (
                  <button
                    disabled={parentLoadingMore}
                    onClick={() => loadParents(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {parentLoadingMore ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00a992]" />
                        <span>Loading more...</span>
                      </>
                    ) : (
                      <span>Load More (20 records)</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. SUBTAB 3: STUDENT GROUPS OPERATIONS TABLE                         */}
      {/* ===================================================================== */}
      {activeTab === "groups" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {groupLoading ? (
            <div className="p-12 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#00a992] mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading learning groups...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <FolderKanban className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No learning groups found matching criteria.</p>
              <p className="text-xs text-slate-400">Try adjusting your search query or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Group ID</th>
                    <th className="px-5 py-3.5">Group Type</th>
                    <th className="px-5 py-3.5">Parent Contact</th>
                    <th className="px-5 py-3.5">Delivery Mode & City</th>
                    <th className="px-5 py-3.5">Schedule & Days</th>
                    <th className="px-5 py-3.5">Joint Budget</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredGroups.map((g) => {
                    const isMulti = g.isGroup === true;
                    const mode = g.mode || "Online";
                    const budget = g.totalBudget || 0;

                    return (
                      <tr key={g.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Group ID */}
                        <td className="px-5 py-4 font-mono font-bold text-slate-900">
                          #{g.groupId || g.id.slice(0, 8)}
                        </td>

                        {/* Type */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              isMulti
                                ? "bg-purple-50 text-purple-800 border border-purple-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {isMulti ? "Multi-Student Batch" : "Solo Learner"}
                          </span>
                        </td>

                        {/* Parent Contact */}
                        <td className="px-5 py-4">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800">{g.parentName || "Parent"}</p>
                            {g.parentPhone ? (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <a
                                  href={formatTelUrl(g.parentPhone)}
                                  className="text-slate-600 hover:text-slate-900 font-mono"
                                >
                                  {g.parentPhone}
                                </a>
                                <a
                                  href={formatWhatsAppUrl(g.parentPhone)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#25D366]"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px]">No phone</span>
                            )}
                          </div>
                        </td>

                        {/* Mode & City */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                mode.toLowerCase() === "online"
                                  ? "bg-blue-50 text-blue-800 border border-blue-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {mode}
                            </span>
                            <p className="text-[11px] text-slate-500 truncate max-w-[120px]">
                              {g.city || g.area || "City N/A"}
                            </p>
                          </div>
                        </td>

                        {/* Schedule & Days */}
                        <td className="px-5 py-4">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800">{g.daysPerWeek || "Schedule Flexible"}</p>
                            {g.preferredTimeRange && (
                              <p className="text-[11px] text-slate-400">{g.preferredTimeRange}</p>
                            )}
                          </div>
                        </td>

                        {/* Budget */}
                        <td className="px-5 py-4 font-black text-slate-900">
                          ₹{budget.toLocaleString("en-IN")}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              g.status === "closed"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {g.status === "closed" ? "Closed" : "Active"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleViewGroup(g)}
                            className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Lazy Load Controls */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <strong>{filteredGroups.length}</strong> loaded student groups
                </span>
                {groupHasMore && (
                  <button
                    disabled={groupLoadingMore}
                    onClick={() => loadGroups(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {groupLoadingMore ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00a992]" />
                        <span>Loading more...</span>
                      </>
                    ) : (
                      <span>Load More (20 records)</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. MODAL: TEACHER FULL DETAILS                                        */}
      {/* ===================================================================== */}
      {viewingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#063831] text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      {viewingTeacher.name || "Teacher Profile"}
                    </h3>
                    <span className="font-mono text-xs text-slate-400 font-bold shrink-0">
                      #{viewingTeacher.tutorId || viewingTeacher.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {viewingTeacher.qualification || "Educator"} • {viewingTeacher.experience || "Experience N/A"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingTeacher(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {isDetailLoading ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00a992] mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Fetching verified contact information...</p>
                </div>
              ) : (
                <>
                  {/* Direct Contact Card */}
                  <div className="p-4 bg-teal-50/70 rounded-2xl border border-teal-200/80 space-y-3">
                    <span className="font-bold text-teal-950 uppercase tracking-wider text-[11px] block">
                      Direct Communication & UPI
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Phone */}
                      <div className="p-3 bg-white rounded-xl border border-teal-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-teal-700" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium">Mobile</p>
                            <p className="font-bold text-slate-900 font-mono">
                              {viewingTeacher.phone || viewingTeacher.whatsapp || "N/A"}
                            </p>
                          </div>
                        </div>
                        {(viewingTeacher.phone || viewingTeacher.whatsapp) && (
                          <div className="flex items-center gap-1">
                            <a
                              href={formatTelUrl(viewingTeacher.phone || viewingTeacher.whatsapp)}
                              className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg"
                              title="Call"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={formatWhatsAppUrl(viewingTeacher.phone || viewingTeacher.whatsapp)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-[#25D366] hover:bg-teal-50 rounded-lg"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() =>
                                handleCopyText(viewingTeacher.phone || viewingTeacher.whatsapp || "", "t_phone")
                              }
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                            >
                              {copiedField === "t_phone" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Email */}
                      <div className="p-3 bg-white rounded-xl border border-teal-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-4 h-4 text-teal-700 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-medium">Email</p>
                            <p className="font-bold text-slate-900 truncate font-mono text-[11px]">
                              {viewingTeacher.email || "N/A"}
                            </p>
                          </div>
                        </div>
                        {viewingTeacher.email && (
                          <button
                            onClick={() => handleCopyText(viewingTeacher.email || "", "t_email")}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                          >
                            {copiedField === "t_email" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* UPI ID */}
                    {viewingTeacher.upiId && (
                      <div className="p-3 bg-white rounded-xl border border-teal-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-teal-700" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium">Disbursement UPI ID</p>
                            <p className="font-bold text-slate-900 font-mono text-xs">{viewingTeacher.upiId}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopyText(viewingTeacher.upiId || "", "t_upi")}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                        >
                          {copiedField === "t_upi" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Academic Credentials */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                      Academic & Teaching Profile
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Teaching Category</p>
                        <p className="font-bold text-slate-800 capitalize mt-0.5">
                          {viewingTeacher.category || "School"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Delivery Mode</p>
                        <p className="font-bold text-slate-800 mt-0.5">{viewingTeacher.mode || "Online"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Classes Taught</p>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {viewingTeacher.classes?.join(", ") || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Educational Boards</p>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {viewingTeacher.boards?.join(", ") || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Subjects Offered</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {viewingTeacher.subjects?.map((sub, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-white rounded border border-slate-200 text-slate-700 font-medium text-[11px]"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>

                    {viewingTeacher.preferredLocations && (
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Preferred Offline Localities</p>
                        <p className="text-slate-700 mt-0.5">{viewingTeacher.preferredLocations}</p>
                      </div>
                    )}
                  </div>

                  {/* Trust, KYC & Documents */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                      Trust, Verification & Resume
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Aadhaar KYC</p>
                        {viewingTeacher.aadharVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-0.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verified ({viewingTeacher.maskedAadhar || "Masked"})</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 mt-0.5 block">Not Verified</span>
                        )}
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Compulsory Resume</p>
                        {viewingTeacher.resumeUrl ? (
                          <a
                            href={viewingTeacher.resumeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-teal-700 hover:text-teal-800 font-bold inline-flex items-center gap-1 mt-0.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Uploaded Resume</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 mt-0.5 block">No resume on file</span>
                        )}
                      </div>
                    </div>

                    {/* Educational Certificates */}
                    {viewingTeacher.verificationDocs && (
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1.5">
                          Uploaded Educational Marksheets
                        </p>
                        <div className="space-y-1">
                          {Object.entries(viewingTeacher.verificationDocs).map(([key, docItem]) => (
                            <div key={key} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                              <span className="font-medium text-slate-700 truncate max-w-[240px]">{docItem.fileName || key}</span>
                              <a
                                href={docItem.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-teal-600 hover:text-teal-800 font-bold flex items-center gap-1 text-[11px]"
                              >
                                <span>Download PDF</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={() => setViewingTeacher(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-white transition-all text-center shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 8. MODAL: PARENT & LINKED STUDENTS FULL DETAILS                      */}
      {/* ===================================================================== */}
      {viewingParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      {viewingParent.name || "Parent Account"}
                    </h3>
                    <span className="font-mono text-xs text-slate-400 font-bold shrink-0">
                      #{viewingParent.parentId || viewingParent.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {viewingParent.city || "City N/A"} • {(viewingParent.students || []).length} Registered Children
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingParent(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {isDetailLoading ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00a992] mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Fetching verified parent information...</p>
                </div>
              ) : (
                <>
                  {/* Contact Details Card */}
                  <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-3">
                    <span className="font-bold text-emerald-950 uppercase tracking-wider text-[11px] block">
                      Parent Contact Channels
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-3 bg-white rounded-xl border border-emerald-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-emerald-700" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium">Phone</p>
                            <p className="font-bold text-slate-900 font-mono">
                              {viewingParent.phone || viewingParent.whatsapp || "N/A"}
                            </p>
                          </div>
                        </div>
                        {(viewingParent.phone || viewingParent.whatsapp) && (
                          <div className="flex items-center gap-1">
                            <a
                              href={formatTelUrl(viewingParent.phone || viewingParent.whatsapp)}
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                              title="Call"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={formatWhatsAppUrl(viewingParent.phone || viewingParent.whatsapp)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-[#25D366] hover:bg-emerald-50 rounded-lg"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-emerald-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-4 h-4 text-emerald-700 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-medium">Email</p>
                            <p className="font-bold text-slate-900 truncate font-mono text-[11px]">
                              {viewingParent.email || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Registered Children (Students) List */}
                  <div className="space-y-3">
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                      Registered Learners / Children ({(viewingParent.students || []).length})
                    </span>

                    {(viewingParent.students || []).length === 0 ? (
                      <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-400">
                        No student profiles registered under this parent yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {viewingParent.students?.map((child) => (
                          <div
                            key={child.id}
                            className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-black text-slate-900 text-sm">{child.name || "Student"}</h4>
                                <span className="font-mono text-[10px] text-slate-400 font-bold block">
                                  #{child.studentId || child.id.slice(0, 8)}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-800 border border-slate-200">
                                {child.classLevel || "Grade N/A"} • {child.board || "Board N/A"}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-slate-400 font-medium">Category:</span>{" "}
                                <span className="font-bold text-slate-700 capitalize">{child.category || "School"}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">Budget:</span>{" "}
                                <span className="font-bold text-slate-900">
                                  {child.budget ? `₹${child.budget.toLocaleString("en-IN")}` : "N/A"}
                                </span>
                              </div>
                            </div>

                            {child.subjects && child.subjects.length > 0 && (
                              <div>
                                <span className="text-slate-400 font-medium block text-[10px] uppercase">Subjects Needed:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {child.subjects.map((sub, sIdx) => (
                                    <span key={sIdx} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[10px]">
                                      {sub}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {child.learningGoal && (
                              <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                                <strong className="text-slate-800">Learning Goal:</strong> {child.learningGoal}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={() => setViewingParent(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-white transition-all text-center shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 9. MODAL: GROUP FULL DETAILS                                         */}
      {/* ===================================================================== */}
      {viewingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-purple-800 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      Learning Group #{viewingGroup.groupId || viewingGroup.id.slice(0, 8)}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        viewingGroup.isGroup
                          ? "bg-purple-50 text-purple-800 border border-purple-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {viewingGroup.isGroup ? "Batch Tuition" : "Solo Learner"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {viewingGroup.mode || "Online"} • Combined Budget: ₹
                    {(viewingGroup.totalBudget || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingGroup(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {isDetailLoading ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00a992] mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Fetching group details...</p>
                </div>
              ) : (
                <>
                  {/* Parent Information */}
                  <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200/80 space-y-2">
                    <span className="font-bold text-purple-950 uppercase tracking-wider text-[11px] block">
                      Creator / Parent Information
                    </span>
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-purple-100">
                      <div>
                        <p className="font-bold text-slate-900">{viewingGroup.parentName || "Parent Account"}</p>
                        <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                          {viewingGroup.parentPhone || "No phone listed"}
                        </p>
                      </div>
                      {viewingGroup.parentPhone && (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={formatTelUrl(viewingGroup.parentPhone)}
                            className="p-1.5 text-purple-700 hover:bg-purple-50 rounded-lg"
                            title="Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={formatWhatsAppUrl(viewingGroup.parentPhone)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-[#25D366] hover:bg-purple-50 rounded-lg"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enrolled Students */}
                  {viewingGroup.studentNames && viewingGroup.studentNames.length > 0 && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                        Students in Batch ({viewingGroup.studentNames.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {viewingGroup.studentNames.map((name, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-800 font-bold text-xs"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Requirements & Schedule */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                      Class Schedule & Preferences
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Delivery Mode</p>
                        <p className="font-bold text-slate-800 mt-0.5">{viewingGroup.mode || "Online"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Teacher Gender Preference</p>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {viewingGroup.teacherGenderPreference || "No Preference"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Days per Week</p>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {viewingGroup.daysPerWeek || "Schedule Flexible"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Preferred Timing</p>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {viewingGroup.preferredTimeRange || "Flexible"}
                        </p>
                      </div>
                    </div>

                    {/* Physical Address if Offline */}
                    {viewingGroup.mode?.toLowerCase() === "offline" && (
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                          Offline Tuition Location
                        </p>
                        <p className="text-slate-700">
                          {[viewingGroup.addressFlat, viewingGroup.addressStreet, viewingGroup.area, viewingGroup.city]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        {viewingGroup.latitude && viewingGroup.longitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${viewingGroup.latitude},${viewingGroup.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 mt-1 text-[11px]"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>View on Google Maps</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={() => setViewingGroup(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-white transition-all text-center shadow-2xs cursor-pointer"
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
