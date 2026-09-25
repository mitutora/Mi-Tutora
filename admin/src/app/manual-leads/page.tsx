"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  writeBatch,
  getDocs,
  updateDoc
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  PhoneCall,
  Phone,
  MessageCircle,
  Plus,
  Search,
  Users,
  CheckCircle2,
  Clock,
  X,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  IndianRupee,
  BookOpen,
  GraduationCap,
  Star,
  Eye,
  Check,
  ChevronRight,
  Filter,
  Sparkles,
  UserCheck
} from "lucide-react";
import { formatWhatsAppUrl, formatTelUrl } from "@/lib/contactResolver";

function generateCustomId(prefix: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint32Array(6);
    crypto.getRandomValues(array);
    for (let i = 0; i < 6; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 6; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return `${prefix}${result}`;
}

interface StudentFormItem {
  id?: string;
  studentId?: string;
  name: string;
  gender: "Male" | "Female" | "Other";
  category: "school" | "competitive" | "programming" | "languages";
  classLevel: string;
  board: string;
  subjectsStr: string;
  budget: number;
}

interface GroupLeadItem {
  id: string;
  groupId: string;
  parentDocId: string;
  studentDocIds: string[];
  name: string;
  mode: string;
  area: string;
  city: string;
  daysPerWeek: string;
  specificDays: string[];
  preferredTimeRange: string;
  teacherGenderPreference: string;
  totalBudget: number;
  status: "active" | "closed";
  managedByAdmin: boolean;
  source: string;
  adminNotes?: string;
  adminPhone?: string;
  createdAt: number;
  updatedAt?: number;
  // Hydrated fields
  parent?: {
    id: string;
    parentId: string;
    name: string;
    phone: string;
    whatsapp: string;
    city: string;
    area: string;
  };
  students?: Array<{
    id: string;
    studentId: string;
    name: string;
    gender: string;
    category: string;
    classLevel: string;
    board: string;
    subjects: string[];
    budget: number;
  }>;
}

interface TeacherApplicant {
  id: string;
  groupDocId: string;
  groupId: string;
  tutorDocId: string;
  tutorId: string;
  tutorName: string;
  tutorPhone: string;
  tutorEmail: string;
  tutorRating: number;
  tutorSubjects: string[];
  tutorExperience: string;
  tutorMode: string;
  appliedAt: number;
  status: "pending_review" | "contacted" | "selected" | "closed";
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function ManualLeadsPage() {
  const [groups, setGroups] = useState<GroupLeadItem[]>([]);
  const [applicants, setApplicants] = useState<TeacherApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Slide-over Drawer State
  const [selectedGroupForApplicants, setSelectedGroupForApplicants] = useState<GroupLeadItem | null>(null);

  // Form Fields
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentWhatsapp, setParentWhatsapp] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [city, setCity] = useState("Bengaluru");
  const [area, setArea] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Students list in form
  const [studentsList, setStudentsList] = useState<StudentFormItem[]>([
    {
      name: "",
      gender: "Male",
      category: "school",
      classLevel: "Class 10",
      board: "CBSE",
      subjectsStr: "Mathematics, Science",
      budget: 5000,
    },
  ]);

  // Group Preferences
  const [groupingStrategy, setGroupingStrategy] = useState<"combined" | "separate">("combined");
  const [deliveryMode, setDeliveryMode] = useState<"Offline" | "Online">("Offline");
  const [daysPerWeek, setDaysPerWeek] = useState("5 Days/Week");
  const [specificDays, setSpecificDays] = useState<string[]>([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ]);
  const [preferredTimeRange, setPreferredTimeRange] = useState("Evening (4 PM - 8 PM)");
  const [teacherGenderPreference, setTeacherGenderPreference] = useState("No Preference");
  const [customTotalBudget, setCustomTotalBudget] = useState<number | "">("");

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Real-time Listeners
  useEffect(() => {
    setLoading(true);

    // Listen to admin-managed groups
    const groupsQuery = query(
      collection(db, "groups"),
      where("managedByAdmin", "==", true),
      where("source", "==", "manual_call")
    );

    const unsubscribeGroups = onSnapshot(
      groupsQuery,
      async (snap) => {
        const rawGroups: GroupLeadItem[] = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<GroupLeadItem, "id">),
        }));

        // Fetch parent and students details for each group
        const enrichedGroups = await Promise.all(
          rawGroups.map(async (group) => {
            const enriched = { ...group };

            // Fetch parent if parentDocId exists
            if (group.parentDocId) {
              try {
                const parentSnap = await getDocs(
                  query(collection(db, "parents"), where("parentDocId", "==", group.parentDocId))
                );
                if (!parentSnap.empty) {
                  const pData = parentSnap.docs[0].data();
                  enriched.parent = {
                    id: parentSnap.docs[0].id,
                    parentId: pData.parentId || "",
                    name: pData.name || "",
                    phone: pData.phone || "",
                    whatsapp: pData.whatsapp || pData.phone || "",
                    city: pData.city || "",
                    area: pData.area || "",
                  };
                }
              } catch (e) {
                console.warn("Could not fetch parent for group", group.id, e);
              }
            }

            // Fetch students
            if (group.studentDocIds && group.studentDocIds.length > 0) {
              try {
                const fetchedStudents: any[] = [];
                for (const sId of group.studentDocIds) {
                  const studentSnap = await getDocs(
                    query(collection(db, "students"), where("id", "==", sId))
                  );
                  if (!studentSnap.empty) {
                    fetchedStudents.push(studentSnap.docs[0].data());
                  } else {
                    // Try by document ID
                    const studentById = await getDocs(
                      query(collection(db, "students"), where("__name__", "==", sId))
                    );
                    if (!studentById.empty) {
                      fetchedStudents.push(studentById.docs[0].data());
                    }
                  }
                }
                enriched.students = fetchedStudents;
              } catch (e) {
                console.warn("Could not fetch students for group", group.id, e);
              }
            }

            return enriched;
          })
        );

        setGroups(enrichedGroups);
        setLoading(false);
      },
      (err) => {
        console.error("Error subscribing to manual groups:", err);
        setLoading(false);
      }
    );

    // Listen to admin_lead_requests
    const applicantsQuery = query(collection(db, "admin_lead_requests"));
    const unsubscribeApplicants = onSnapshot(
      applicantsQuery,
      (snap) => {
        const loadedApplicants: TeacherApplicant[] = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<TeacherApplicant, "id">),
        }));
        setApplicants(loadedApplicants);
      },
      (err) => {
        console.warn("Error subscribing to admin_lead_requests:", err);
      }
    );

    return () => {
      unsubscribeGroups();
      unsubscribeApplicants();
    };
  }, []);

  // Map of groupDocId -> TeacherApplicant[]
  const applicantsByGroup = useMemo(() => {
    const map = new Map<string, TeacherApplicant[]>();
    applicants.forEach((app) => {
      const existing = map.get(app.groupDocId) || [];
      existing.push(app);
      map.set(app.groupDocId, existing);
    });
    return map;
  }, [applicants]);

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      // Status filter
      if (statusFilter !== "all" && g.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesParentName = g.parent?.name?.toLowerCase().includes(q);
        const matchesParentPhone = g.parent?.phone?.includes(q);
        const matchesCity = g.city?.toLowerCase().includes(q);
        const matchesArea = g.area?.toLowerCase().includes(q);
        const matchesGroupId = g.groupId?.toLowerCase().includes(q);
        const matchesStudent = g.students?.some(
          (s) =>
            s.name?.toLowerCase().includes(q) ||
            s.subjects?.some((sub) => sub.toLowerCase().includes(q)) ||
            s.classLevel?.toLowerCase().includes(q)
        );

        return (
          matchesParentName ||
          matchesParentPhone ||
          matchesCity ||
          matchesArea ||
          matchesGroupId ||
          matchesStudent
        );
      }

      return true;
    });
  }, [groups, statusFilter, search]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = groups.length;
    const active = groups.filter((g) => g.status === "active").length;
    const closed = groups.filter((g) => g.status === "closed").length;
    const totalApplicants = applicants.length;
    return { total, active, closed, totalApplicants };
  }, [groups, applicants]);

  // Sum of student budgets
  const calculatedTotalBudget = useMemo(() => {
    return studentsList.reduce((acc, curr) => acc + (Number(curr.budget) || 0), 0);
  }, [studentsList]);

  // Open modal for new lead
  const handleOpenNewModal = () => {
    setEditingGroupId(null);
    setParentName("");
    setParentPhone("");
    setParentWhatsapp("");
    setSameAsPhone(true);
    setCity("Bengaluru");
    setArea("");
    setAdminNotes("");
    setStudentsList([
      {
        name: "",
        gender: "Male",
        category: "school",
        classLevel: "Class 10",
        board: "CBSE",
        subjectsStr: "Mathematics, Science",
        budget: 5000,
      },
    ]);
    setGroupingStrategy("combined");
    setDeliveryMode("Offline");
    setDaysPerWeek("5 Days/Week");
    setSpecificDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    setPreferredTimeRange("Evening (4 PM - 8 PM)");
    setTeacherGenderPreference("No Preference");
    setCustomTotalBudget("");
    setFormError("");
    setIsModalOpen(true);
  };

  // Open modal for editing existing lead
  const handleOpenEditModal = (group: GroupLeadItem) => {
    setEditingGroupId(group.id);
    setParentName(group.parent?.name || "");
    setParentPhone(group.parent?.phone || "");
    setParentWhatsapp(group.parent?.whatsapp || group.parent?.phone || "");
    setSameAsPhone(
      !group.parent?.whatsapp || group.parent?.whatsapp === group.parent?.phone
    );
    setCity(group.city || "Bengaluru");
    setArea(group.area || "");
    setAdminNotes(group.adminNotes || "");

    if (group.students && group.students.length > 0) {
      setStudentsList(
        group.students.map((s) => ({
          id: s.id,
          studentId: s.studentId,
          name: s.name,
          gender: (s.gender as any) || "Male",
          category: (s.category as any) || "school",
          classLevel: s.classLevel || "Class 10",
          board: s.board || "CBSE",
          subjectsStr: (s.subjects || []).join(", "),
          budget: s.budget || 5000,
        }))
      );
    } else {
      setStudentsList([
        {
          name: group.name.replace("Group: ", ""),
          gender: "Male",
          category: "school",
          classLevel: "Class 10",
          board: "CBSE",
          subjectsStr: "All Subjects",
          budget: group.totalBudget || 5000,
        },
      ]);
    }

    setGroupingStrategy("combined");
    setDeliveryMode((group.mode as any) || "Offline");
    setDaysPerWeek(group.daysPerWeek || "5 Days/Week");
    setSpecificDays(group.specificDays || ["Monday", "Wednesday", "Friday"]);
    setPreferredTimeRange(group.preferredTimeRange || "Evening (4 PM - 8 PM)");
    setTeacherGenderPreference(group.teacherGenderPreference || "No Preference");
    setCustomTotalBudget(group.totalBudget || "");
    setFormError("");
    setIsModalOpen(true);
  };

  // Dynamic student list actions
  const handleAddStudent = () => {
    setStudentsList((prev) => [
      ...prev,
      {
        name: "",
        gender: "Female",
        category: "school",
        classLevel: "Class 8",
        board: "CBSE",
        subjectsStr: "Mathematics",
        budget: 4000,
      },
    ]);
  };

  const handleRemoveStudent = (index: number) => {
    if (studentsList.length <= 1) return;
    setStudentsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateStudent = (index: number, field: keyof StudentFormItem, val: any) => {
    setStudentsList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const toggleDay = (day: string) => {
    setSpecificDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Submit Handler: Saves to parents, students, groups, and tuition_requests atomically
  const handleSaveInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Validate Parent
    if (!parentName.trim()) {
      setFormError("Parent legal name is required.");
      return;
    }
    const cleanPhone = parentPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setFormError("Please enter a valid 10-digit primary phone number.");
      return;
    }
    if (!area.trim()) {
      setFormError("Locality / neighborhood area is required.");
      return;
    }

    // Validate Students
    for (let i = 0; i < studentsList.length; i++) {
      const s = studentsList[i];
      if (!s.name.trim()) {
        setFormError(`Student #${i + 1} name is required.`);
        return;
      }
      if (!s.subjectsStr.trim()) {
        setFormError(`Subjects for Student #${i + 1} are required.`);
        return;
      }
      if (!s.budget || s.budget <= 0) {
        setFormError(`Please enter a valid monthly budget for Student #${i + 1}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const batch = writeBatch(db);
      const now = Date.now();
      const finalBudget =
        typeof customTotalBudget === "number" && customTotalBudget > 0
          ? customTotalBudget
          : calculatedTotalBudget;

      // 1. Parent Entity
      let parentDocId = "";
      let parentCustomId = "";

      if (editingGroupId) {
        const existingGroup = groups.find((g) => g.id === editingGroupId);
        parentDocId = existingGroup?.parentDocId || doc(collection(db, "parents")).id;
        parentCustomId = existingGroup?.parent?.parentId || generateCustomId("MTP");
      } else {
        const parentRef = doc(collection(db, "parents"));
        parentDocId = parentRef.id;
        parentCustomId = generateCustomId("MTP");
      }

      const parentData = {
        id: parentDocId,
        parentId: parentCustomId,
        parentDocId: parentDocId,
        name: parentName.trim(),
        phone: cleanPhone,
        whatsapp: sameAsPhone ? cleanPhone : parentWhatsapp.replace(/\D/g, "") || cleanPhone,
        city: city.trim(),
        area: area.trim(),
        managedByAdmin: true,
        source: "manual_call",
        createdAt: now,
      };

      batch.set(doc(db, "parents", parentDocId), parentData, { merge: true });

      // 2. Student & Group Creation Logic
      if (studentsList.length > 1 && groupingStrategy === "separate" && !editingGroupId) {
        // Create individual group per student
        for (const s of studentsList) {
          const studentRef = doc(collection(db, "students"));
          const groupRef = doc(collection(db, "groups"));
          const requestRef = doc(collection(db, "tuition_requests"), groupRef.id);

          const studentCustomId = generateCustomId("MTS");
          const groupCustomId = generateCustomId("MTG");
          const requestCustomId = generateCustomId("REQ");

          const parsedSubjects = s.subjectsStr
            .split(",")
            .map((sub) => sub.trim())
            .filter(Boolean);

          const studentData = {
            id: studentRef.id,
            studentId: studentCustomId,
            parentDocId: parentDocId,
            groupDocId: groupRef.id,
            name: s.name.trim(),
            gender: s.gender,
            category: s.category,
            classLevel: s.classLevel.trim(),
            board: s.board.trim(),
            subjects: parsedSubjects,
            budget: Number(s.budget),
            isAvailable: true,
            managedByAdmin: true,
            createdAt: now,
          };

          const groupData = {
            id: groupRef.id,
            groupId: groupCustomId,
            parentDocId: parentDocId,
            studentDocIds: [studentRef.id],
            name: s.name.trim(),
            mode: deliveryMode,
            area: area.trim(),
            city: city.trim(),
            daysPerWeek: daysPerWeek,
            specificDays: specificDays,
            preferredTimeRange: preferredTimeRange,
            teacherGenderPreference: teacherGenderPreference,
            totalBudget: Number(s.budget),
            status: "active",
            managedByAdmin: true,
            source: "manual_call",
            adminNotes: adminNotes.trim(),
            adminPhone: "+917483034168",
            createdAt: now,
            updatedAt: now,
          };

          const requestData = {
            id: groupRef.id,
            requestId: requestCustomId,
            groupDocId: groupRef.id,
            parentDocId: parentDocId,
            studentsDetails: [
              {
                studentId: studentCustomId,
                name: s.name.trim(),
                classLevel: s.classLevel.trim(),
                board: s.board.trim(),
                subjects: parsedSubjects,
                budget: Number(s.budget),
              },
            ],
            combinedSubjects: parsedSubjects,
            combinedBudget: Number(s.budget),
            managedByAdmin: true,
            status: "open",
            createdAt: now,
          };

          batch.set(studentRef, studentData);
          batch.set(groupRef, groupData);
          batch.set(requestRef, requestData);
        }
      } else {
        // Combined Joint Group (or single student)
        let groupDocId = "";
        let groupCustomId = "";

        if (editingGroupId) {
          groupDocId = editingGroupId;
          const existingGroup = groups.find((g) => g.id === editingGroupId);
          groupCustomId = existingGroup?.groupId || generateCustomId("MTG");
        } else {
          const groupRef = doc(collection(db, "groups"));
          groupDocId = groupRef.id;
          groupCustomId = generateCustomId("MTG");
        }

        const studentDocIds: string[] = [];
        const studentsDetailsList: any[] = [];
        const allSubjectsSet = new Set<string>();

        for (const s of studentsList) {
          const sRef = s.id ? doc(db, "students", s.id) : doc(collection(db, "students"));
          const sCustomId = s.studentId || generateCustomId("MTS");
          const parsedSubjects = s.subjectsStr
            .split(",")
            .map((sub) => sub.trim())
            .filter(Boolean);

          parsedSubjects.forEach((sub) => allSubjectsSet.add(sub));
          studentDocIds.push(sRef.id);

          const studentData = {
            id: sRef.id,
            studentId: sCustomId,
            parentDocId: parentDocId,
            groupDocId: groupDocId,
            name: s.name.trim(),
            gender: s.gender,
            category: s.category,
            classLevel: s.classLevel.trim(),
            board: s.board.trim(),
            subjects: parsedSubjects,
            budget: Number(s.budget),
            isAvailable: true,
            managedByAdmin: true,
            createdAt: now,
          };

          studentsDetailsList.push({
            studentId: sCustomId,
            name: s.name.trim(),
            classLevel: s.classLevel.trim(),
            board: s.board.trim(),
            subjects: parsedSubjects,
            budget: Number(s.budget),
          });

          batch.set(sRef, studentData, { merge: true });
        }

        const groupName =
          studentsList.length === 1
            ? studentsList[0].name.trim()
            : `Group: ${studentsList.map((s) => s.name.trim()).join(", ")}`;

        const groupData = {
          id: groupDocId,
          groupId: groupCustomId,
          parentDocId: parentDocId,
          studentDocIds: studentDocIds,
          name: groupName,
          mode: deliveryMode,
          area: area.trim(),
          city: city.trim(),
          daysPerWeek: daysPerWeek,
          specificDays: specificDays,
          preferredTimeRange: preferredTimeRange,
          teacherGenderPreference: teacherGenderPreference,
          totalBudget: finalBudget,
          status: "active",
          managedByAdmin: true,
          source: "manual_call",
          adminNotes: adminNotes.trim(),
          adminPhone: "+917483034168",
          createdAt: now,
          updatedAt: now,
        };

        const requestRef = doc(db, "tuition_requests", groupDocId);
        const requestData = {
          id: groupDocId,
          requestId: generateCustomId("REQ"),
          groupDocId: groupDocId,
          parentDocId: parentDocId,
          studentsDetails: studentsDetailsList,
          combinedSubjects: Array.from(allSubjectsSet),
          combinedBudget: finalBudget,
          managedByAdmin: true,
          status: "open",
          createdAt: now,
        };

        batch.set(doc(db, "groups", groupDocId), groupData, { merge: true });
        batch.set(requestRef, requestData, { merge: true });
      }

      await batch.commit();
      setIsModalOpen(false);
      showToast(
        editingGroupId
          ? "Phone inquiry updated successfully."
          : "Phone inquiry created and published to teachers."
      );
    } catch (err: any) {
      console.error("Error saving manual inquiry:", err);
      setFormError(err.message || "Failed to save inquiry. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Group Status (Active / Closed)
  const handleToggleGroupStatus = async (group: GroupLeadItem) => {
    const nextStatus = group.status === "active" ? "closed" : "active";
    try {
      await updateDoc(doc(db, "groups", group.id), {
        status: nextStatus,
        updatedAt: Date.now(),
      });
      // Also update tuition_requests if exists
      try {
        await updateDoc(doc(db, "tuition_requests", group.id), {
          status: nextStatus === "active" ? "open" : "closed",
        });
      } catch (e) {
        // Ignore if requestDoc has different ID
      }
      showToast(`Inquiry marked as ${nextStatus}.`);
    } catch (err) {
      console.error("Error updating inquiry status:", err);
      alert("Failed to update status.");
    }
  };

  // Update Applicant Status in Drawer
  const handleUpdateApplicantStatus = async (
    applicantId: string,
    newStatus: TeacherApplicant["status"]
  ) => {
    try {
      await updateDoc(doc(db, "admin_lead_requests", applicantId), {
        status: newStatus,
      });
      showToast(`Teacher status marked as ${newStatus.replace("_", " ")}.`);
    } catch (err) {
      console.error("Error updating applicant status:", err);
      alert("Failed to update applicant status.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-700/50 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              Offline Phone Intake
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Manual Phone Inquiries
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create and coordinate custom leads for offline parent inquiries with direct teacher matching.
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Phone Inquiry</span>
        </button>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Inquiries
            </p>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{metrics.total}</p>
          <p className="text-xs text-slate-400 mt-1">Direct call consultations</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Active Open Leads
            </p>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{metrics.active}</p>
          <p className="text-xs text-emerald-600/70 mt-1">Visible to teachers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Closed Leads
            </p>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">{metrics.closed}</p>
          <p className="text-xs text-slate-400 mt-1">Fulfilled or expired</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Teacher Applicants
            </p>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2">{metrics.totalApplicants}</p>
          <p className="text-xs text-indigo-600/70 mt-1">Sent request to admin</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by parent, student, phone, city, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          {(["all", "active", "closed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                statusFilter === tab
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Operations Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-500">Loading manual inquiries...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <PhoneCall className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No manual inquiries found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              {search
                ? "No leads matched your search query. Try clearing the search filter."
                : "No phone consultation leads recorded yet. Click '+ Create Phone Inquiry' to add one."}
            </p>
            {!search && (
              <button
                onClick={handleOpenNewModal}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Inquiry</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Parent / Contact</th>
                  <th className="px-6 py-4">Students & Subjects</th>
                  <th className="px-6 py-4">Preferences & Mode</th>
                  <th className="px-6 py-4">Budget</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Teacher Requests</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGroups.map((group) => {
                  const leadApplicants = applicantsByGroup.get(group.id) || [];
                  const parentPhoneStr = group.parent?.phone || "";
                  const parentWhatsappStr = group.parent?.whatsapp || parentPhoneStr;
                  const waUrl = formatWhatsAppUrl(parentWhatsappStr);
                  const telUrl = formatTelUrl(parentPhoneStr);

                  return (
                    <tr key={group.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Parent Column */}
                      <td className="px-6 py-5 align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-base">
                              {group.parent?.name || "Parent Contact"}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                              {group.parent?.parentId || "MTP"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {group.area ? `${group.area}, ` : ""}
                              {group.city || "Bengaluru"}
                            </span>
                          </div>

                          {parentPhoneStr && (
                            <div className="flex items-center gap-2 pt-1">
                              {telUrl && (
                                <a
                                  href={telUrl}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <span>{parentPhoneStr}</span>
                                </a>
                              )}
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors"
                                  title="Open WhatsApp chat"
                                >
                                  <MessageCircle className="w-3 h-3 text-emerald-600" />
                                  <span>Chat</span>
                                </a>
                              )}
                            </div>
                          )}

                          {group.adminNotes && (
                            <p className="text-[11px] text-slate-500 italic bg-amber-50/80 border border-amber-200/50 rounded-lg p-2 mt-2 leading-relaxed">
                              {group.adminNotes}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Students Column */}
                      <td className="px-6 py-5 align-top">
                        <div className="space-y-2">
                          {group.students && group.students.length > 0 ? (
                            group.students.map((st, idx) => (
                              <div
                                key={st.id || idx}
                                className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-slate-800 text-xs">
                                    {st.name}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200/60">
                                    {st.classLevel} ({st.board})
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 truncate max-w-xs">
                                  <span className="font-medium text-slate-400">Subjects: </span>
                                  {st.subjects?.join(", ") || "General"}
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">{group.name}</span>
                          )}
                        </div>
                      </td>

                      {/* Mode & Timing */}
                      <td className="px-6 py-5 align-top">
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                group.mode === "Online"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {group.mode || "Offline"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{group.daysPerWeek || "5 Days/Week"}</span>
                          </div>

                          <div className="flex items-center gap-1 text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{group.preferredTimeRange || "Evening"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Budget */}
                      <td className="px-6 py-5 align-top">
                        <div className="text-base font-black text-slate-900 flex items-center">
                          <IndianRupee className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{group.totalBudget ? group.totalBudget.toLocaleString() : "0"}</span>
                          <span className="text-[11px] font-semibold text-slate-400 ml-1">/mo</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Fixed budget
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5 align-top">
                        <button
                          onClick={() => handleToggleGroupStatus(group)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                            group.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              group.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span className="capitalize">{group.status}</span>
                        </button>
                      </td>

                      {/* Interested Teachers */}
                      <td className="px-6 py-5 align-top">
                        <button
                          onClick={() => setSelectedGroupForApplicants(group)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            leadApplicants.length > 0
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 shadow-xs"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{leadApplicants.length} Interested</span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(group)}
                            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="Edit Inquiry"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Intake / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Concierge Intake Form
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {editingGroupId ? "Edit Phone Inquiry" : "Create New Phone Inquiry"}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveInquiry} className="space-y-6">
              {/* SECTION 1: Parent & Locality */}
              <div className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                    Parent Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Parent Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Sharma"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number (10 digits) *
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bengaluru"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Locality / Area *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Indiranagar, Stage 2"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                {/* WhatsApp Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="sameAsPhone"
                    checked={sameAsPhone}
                    onChange={(e) => setSameAsPhone(e.target.checked)}
                    className="w-4 h-4 rounded-md text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="sameAsPhone" className="text-xs font-semibold text-slate-600">
                    WhatsApp number is same as primary contact phone
                  </label>
                </div>

                {!sameAsPhone && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Dedicated WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={parentWhatsapp}
                      onChange={(e) => setParentWhatsapp(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Admin Consultation Notes (Internal or Special Parent Requests)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Mother requested female tutor if possible; student has upcoming term exam in 3 weeks."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* SECTION 2: Dynamic Students Builder */}
              <div className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                      Student(s) / Siblings ({studentsList.length})
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddStudent}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Student</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {studentsList.map((student, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                          Student #{idx + 1}
                        </span>
                        {studentsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(idx)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Student Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Aryan Sharma"
                            value={student.name}
                            onChange={(e) => handleUpdateStudent(idx, "name", e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Gender
                          </label>
                          <select
                            value={student.gender}
                            onChange={(e) => handleUpdateStudent(idx, "gender", e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Category
                          </label>
                          <select
                            value={student.category}
                            onChange={(e) => handleUpdateStudent(idx, "category", e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                          >
                            <option value="school">School Tuitions</option>
                            <option value="competitive">Competitive Exams</option>
                            <option value="programming">Programming & Tech</option>
                            <option value="languages">Languages</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Class / Grade *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Class 10"
                            value={student.classLevel}
                            onChange={(e) => handleUpdateStudent(idx, "classLevel", e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Board *
                          </label>
                          <select
                            value={student.board}
                            onChange={(e) => handleUpdateStudent(idx, "board", e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                          >
                            <option value="CBSE">CBSE</option>
                            <option value="ICSE">ICSE</option>
                            <option value="State Board">State Board</option>
                            <option value="IB">IB</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Monthly Budget (INR) *
                          </label>
                          <input
                            type="number"
                            required
                            min={500}
                            placeholder="e.g. 5000"
                            value={student.budget}
                            onChange={(e) =>
                              handleUpdateStudent(idx, "budget", Number(e.target.value))
                            }
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Subjects (comma separated) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Mathematics, Physics, Chemistry"
                          value={student.subjectsStr}
                          onChange={(e) => handleUpdateStudent(idx, "subjectsStr", e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: Grouping & Tuition Preferences */}
              <div className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                    Tuition & Schedule Preferences
                  </h3>
                </div>

                {/* Multi-Student Strategy Toggle */}
                {studentsList.length > 1 && !editingGroupId && (
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Multi-Student Grouping Option:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGroupingStrategy("combined")}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          groupingStrategy === "combined"
                            ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <p className="font-bold text-xs text-slate-900">
                          Combined Tuition Group
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          1 teacher instructs all siblings together in 1 joint batch.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGroupingStrategy("separate")}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          groupingStrategy === "separate"
                            ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <p className="font-bold text-xs text-slate-900">
                          Separate Individual Tuitions
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Creates individual cards for each student to hire different tutors.
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Delivery Mode
                    </label>
                    <select
                      value={deliveryMode}
                      onChange={(e) => setDeliveryMode(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    >
                      <option value="Offline">Offline (Home Tuition)</option>
                      <option value="Online">Online Tuition</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Days per Week
                    </label>
                    <select
                      value={daysPerWeek}
                      onChange={(e) => setDaysPerWeek(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    >
                      <option value="5 Days/Week">5 Days/Week (Mon - Fri)</option>
                      <option value="3 Days/Week">3 Days/Week (Alternate Days)</option>
                      <option value="2 Days/Week">2 Days/Week</option>
                      <option value="Weekends Only">Weekends Only (Sat - Sun)</option>
                      <option value="Custom">Custom Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Preferred Time Slot
                    </label>
                    <select
                      value={preferredTimeRange}
                      onChange={(e) => setPreferredTimeRange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    >
                      <option value="Morning (8 AM - 12 PM)">Morning (8 AM - 12 PM)</option>
                      <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                      <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
                      <option value="Flexible">Flexible / Mutual Agreement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Teacher Gender Preference
                    </label>
                    <select
                      value={teacherGenderPreference}
                      onChange={(e) => setTeacherGenderPreference(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    >
                      <option value="No Preference">No Preference</option>
                      <option value="Female">Female Tutor Preferred</option>
                      <option value="Male">Male Tutor Preferred</option>
                    </select>
                  </div>
                </div>

                {/* Specific Days Chips */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Specific Days Scheduled
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSel = specificDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDay(d)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isSel
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Total Budget Calculator */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Total Monthly Budget
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Auto-summed from student inputs: ₹{calculatedTotalBudget.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-700">₹</span>
                    <input
                      type="number"
                      placeholder={String(calculatedTotalBudget)}
                      value={customTotalBudget}
                      onChange={(e) =>
                        setCustomTotalBudget(e.target.value ? Number(e.target.value) : "")
                      }
                      className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-400">/mo</span>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingGroupId ? "Update Inquiry" : "Publish Inquiry"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interested Teachers Drawer */}
      {selectedGroupForApplicants && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg h-full p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 overflow-hidden">
            <div className="overflow-y-auto space-y-6 flex-1 pr-1">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Teacher Applications
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {selectedGroupForApplicants.groupId}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-1">
                    {selectedGroupForApplicants.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monthly budget: ₹{selectedGroupForApplicants.totalBudget?.toLocaleString()}/mo •{" "}
                    {selectedGroupForApplicants.area}, {selectedGroupForApplicants.city}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedGroupForApplicants(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Applicant list */}
              {(() => {
                const groupApps = applicantsByGroup.get(selectedGroupForApplicants.id) || [];
                if (groupApps.length === 0) {
                  return (
                    <div className="py-16 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 text-sm">
                        No teacher requests yet
                      </p>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                        When interested teachers click "Send Request to Admin" on the portal, their contact profiles will appear here instantly.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {groupApps.map((applicant) => {
                      const waUrl = formatWhatsAppUrl(applicant.tutorPhone);
                      const telUrl = formatTelUrl(applicant.tutorPhone);

                      return (
                        <div
                          key={applicant.id}
                          className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-sm">
                                  {applicant.tutorName}
                                </h4>
                                <span className="text-[10px] font-mono font-bold bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                  {applicant.tutorId || "MTT"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {applicant.tutorExperience || "Experienced Tutor"} • Mode:{" "}
                                {applicant.tutorMode || "Both"}
                              </p>
                            </div>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                applicant.status === "selected"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : applicant.status === "contacted"
                                  ? "bg-blue-100 text-blue-800"
                                  : applicant.status === "closed"
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {applicant.status.replace("_", " ")}
                            </span>
                          </div>

                          {applicant.tutorSubjects && applicant.tutorSubjects.length > 0 && (
                            <div className="text-[11px] text-slate-600">
                              <span className="font-semibold text-slate-500">Subjects: </span>
                              {applicant.tutorSubjects.join(", ")}
                            </div>
                          )}

                          {/* Contact Actions */}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                            {telUrl && (
                              <a
                                href={telUrl}
                                className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Call Teacher</span>
                              </a>
                            )}
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>

                          {/* Status Progression */}
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1">
                            <span>Update status:</span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() =>
                                  handleUpdateApplicantStatus(applicant.id, "contacted")
                                }
                                className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors"
                              >
                                Contacted
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateApplicantStatus(applicant.id, "selected")
                                }
                                className="px-2 py-0.5 rounded bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition-colors"
                              >
                                Selected
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateApplicantStatus(applicant.id, "closed")
                                }
                                className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 hover:text-slate-700 border border-slate-200 transition-colors"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedGroupForApplicants(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
