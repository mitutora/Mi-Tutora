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
  CalendarDays,
  MapPin,
  IndianRupee,
  BookOpen,
  GraduationCap,
  Building,
  Award,
  Laptop,
  Languages,
  Mail,
  Globe,
  Star,
  Eye,
  Check,
  ChevronRight,
  Filter,
  Sparkles,
  UserCheck
} from "lucide-react";
import { formatWhatsAppUrl, formatTelUrl } from "@/lib/contactResolver";
import GroupManager from "@/components/GroupManager";
import { getSubjectsForStudent, isSeniorSecondary } from "@/utils/subjects";

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
  gender: "Female" | "Male" | "Other";
  category: "school" | "programming" | "languages";
  budget: number;
  studentType?: "School Student" | "College Student";
  classLevel: string;
  board: string;
  stream?: string;
  subjects: string[];
  technologies?: string[];
  languages?: string[];
  groupDocId?: string;
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
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentWhatsapp, setParentWhatsapp] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [city, setCity] = useState("Bengaluru");
  const [area, setArea] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Number of Students selector (1 to 5)
  const [numberOfStudents, setNumberOfStudents] = useState<number>(1);
  const [isGroupsSaved, setIsGroupsSaved] = useState<boolean>(true);

  // Students list in form
  const [studentsList, setStudentsList] = useState<StudentFormItem[]>([
    {
      id: `new_${Date.now()}`,
      name: "",
      gender: "Male",
      category: "school",
      studentType: "School Student",
      classLevel: "",
      board: "CBSE",
      subjects: [],
      technologies: [],
      languages: [],
      budget: 5000,
      groupDocId: "unassigned",
    },
  ]);

  // Group Preferences Map (Per-group)
  const [groupPreferences, setGroupPreferences] = useState<Record<string, any>>({});
  
  // Strategy step
  const [groupingStrategy, setGroupingStrategy] = useState<"combined" | "separate" | "custom">("custom");
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
    return studentsList.reduce((acc: number, curr: any) => acc + (Number(curr.budget) || 0), 0);
  }, [studentsList]);

  // Open modal for new lead
  const handleOpenNewModal = () => {
    setEditingGroupId(null);
    setParentName("");
    setParentEmail("");
    setParentPhone("");
    setParentWhatsapp("");
    setSameAsPhone(true);
    setCity("Bengaluru");
    setArea("");
    setAdminNotes("");
    setNumberOfStudents(1);
    setIsGroupsSaved(true);
    setStudentsList([
      {
        id: `new_${Date.now()}`,
        name: "",
        gender: "Male",
        category: "school",
        studentType: "School Student",
        classLevel: "10th Standard",
        board: "CBSE",
        subjects: [],
        technologies: [],
        languages: [],
        budget: 5000,
        groupDocId: "unassigned",
      },
    ]);
    setGroupPreferences({});
    setGroupingStrategy("custom");
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
    setParentEmail((group.parent as any)?.email || "");
    setParentPhone(group.parent?.phone || "");
    setParentWhatsapp(group.parent?.whatsapp || group.parent?.phone || "");
    setSameAsPhone(
      !group.parent?.whatsapp || group.parent?.whatsapp === group.parent?.phone
    );
    setCity(group.city || "Bengaluru");
    setArea(group.area || "");
    setAdminNotes(group.adminNotes || "");

    const studentCount = group.students && group.students.length > 0 ? group.students.length : 1;
    setNumberOfStudents(studentCount);
    setIsGroupsSaved(true);

    if (group.students && group.students.length > 0) {
      setStudentsList(
        group.students.map((s) => ({
          id: s.id,
          studentId: s.studentId,
          name: s.name,
          gender: (s.gender as any) || "Male",
          category: (s.category as any) || "school",
          studentType: (s as any).studentType || "School Student",
          classLevel: s.classLevel || "",
          board: s.board || "CBSE",
          subjects: s.subjects || [],
          technologies: (s as any).technologies || (s.category === "programming" ? s.subjects : []),
          languages: (s as any).languages || (s.category === "languages" ? s.subjects : []),
          stream: (s as any).stream || "",
          budget: s.budget || 5000,
          groupDocId: group.id,
        }))
      );
    } else {
      setStudentsList([
        {
          id: `new_${Date.now()}`,
          name: group.name.replace("Group: ", ""),
          gender: "Male",
          category: "school",
          studentType: "School Student",
          classLevel: "",
          board: "CBSE",
          subjects: [],
          technologies: [],
          languages: [],
          budget: group.totalBudget || 5000,
          groupDocId: group.id,
        },
      ]);
    }

    setGroupPreferences({
      [group.id]: {
        mode: (group.mode as any) || "Offline",
        daysPerWeek: group.daysPerWeek || "5 Days/Week",
        specificDays: group.specificDays || ["Monday", "Wednesday", "Friday"],
        preferredTimeRange: group.preferredTimeRange || "Evening (4 PM - 8 PM)",
        teacherGenderPreference: group.teacherGenderPreference || "No Preference",
        addressFlat: (group as any).addressFlat || "",
        addressStreet: (group as any).addressStreet || group.area || "",
        city: group.city || "Bengaluru",
        addressPincode: (group as any).addressPincode || "",
      }
    });

    setGroupingStrategy("custom");
    setDeliveryMode((group.mode as any) || "Offline");
    setDaysPerWeek(group.daysPerWeek || "5 Days/Week");
    setSpecificDays(group.specificDays || ["Monday", "Wednesday", "Friday"]);
    setPreferredTimeRange(group.preferredTimeRange || "Evening (4 PM - 8 PM)");
    setTeacherGenderPreference(group.teacherGenderPreference || "No Preference");
    setCustomTotalBudget(group.totalBudget || "");
    setFormError("");
    setIsModalOpen(true);
  };

  // Changing number of students via dropdown
  const handleNumberOfStudentsChange = (count: number) => {
    setNumberOfStudents(count);
    setIsGroupsSaved(count === 1);
    setStudentsList((prev) => {
      if (count > prev.length) {
        const added: StudentFormItem[] = [];
        for (let i = prev.length; i < count; i++) {
          added.push({
            id: `new_${Date.now()}_${i}`,
            name: "",
            gender: "Female",
            category: "school",
            studentType: "School Student",
            classLevel: "10th Standard",
            board: "CBSE",
            subjects: [],
            technologies: [],
            languages: [],
            budget: 5000,
            groupDocId: "unassigned",
          });
        }
        return [...prev, ...added];
      } else if (count < prev.length) {
        return prev.slice(0, count);
      }
      return prev;
    });
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

    // Validate Students
    for (let i = 0; i < studentsList.length; i++) {
      const s = studentsList[i];
      if (!s.name.trim()) {
        setFormError(`Student #${i + 1} name is required.`);
        return;
      }
      if (s.category === "school" && (!s.subjects || s.subjects.length === 0)) {
        setFormError(`Please select at least one subject for Student #${i + 1}.`);
        return;
      }
      if (s.category === "programming" && (!s.technologies || s.technologies.length === 0)) {
        setFormError(`Please select at least one technology for Student #${i + 1}.`);
        return;
      }
      if (s.category === "languages" && (!s.languages || s.languages.length === 0)) {
        setFormError(`Please select at least one language for Student #${i + 1}.`);
        return;
      }
      if (!s.budget || s.budget <= 0) {
        setFormError(`Please enter a valid monthly budget for Student #${i + 1}.`);
        return;
      }
    }

    if (studentsList.length > 1 && !isGroupsSaved && !editingGroupId) {
      setFormError("Please organize your students into groups and click 'Save Groups' before publishing.");
      return;
    }

    setSaving(true);
    try {
      const batch = writeBatch(db);
      const now = Date.now();

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
        email: parentEmail.trim(),
        phone: cleanPhone,
        whatsapp: sameAsPhone ? cleanPhone : parentWhatsapp.replace(/\D/g, "") || cleanPhone,
        managedByAdmin: true,
        source: "manual_call",
        createdAt: now,
      };

      batch.set(doc(db, "parents", parentDocId), parentData, { merge: true });

      // 2. Student & Group Creation Logic
      if (studentsList.length > 1 && groupingStrategy === "custom" && !editingGroupId) {
        // Create custom groups based on GroupManager
        const groupedStudents = new Map<string, StudentFormItem[]>();
        studentsList.forEach((s) => {
          const gid = s.groupDocId || "unassigned";
          const list = groupedStudents.get(gid) || [];
          list.push(s);
          groupedStudents.set(gid, list);
        });

        for (const [gid, groupStudents] of Array.from(groupedStudents.entries())) {
          const groupRef = doc(collection(db, "groups"));
          const requestRef = doc(collection(db, "tuition_requests"), groupRef.id);
          const groupCustomId = generateCustomId("MTG");
          const requestCustomId = generateCustomId("REQ");

          const studentDocIds: string[] = [];
          const studentsDetailsList: any[] = [];
          const allSubjectsSet = new Set<string>();
          
          const pref = groupPreferences[gid] || {
             mode: "Offline",
             daysPerWeek: "5 Days/Week",
             specificDays: ["Monday", "Wednesday", "Friday"],
             preferredTimeRange: "Evening (4 PM - 8 PM)",
             teacherGenderPreference: "No Preference",
             addressFlat: "",
             addressStreet: "",
             addressPincode: "",
             city: "Bengaluru",
          };
          
          const groupBudget = groupStudents.reduce((acc: number, curr: any) => acc + (Number(curr.budget) || 0), 0);
          const groupHasProgramming = groupStudents.some(s => s.category === "programming");
          const finalMode = groupHasProgramming ? "Online" : (pref.mode || "Offline");
          const isOffline = finalMode === "Offline";
          const groupArea = isOffline ? (pref.addressStreet || "") : "";
          const groupCity = isOffline ? (pref.city || "Bengaluru") : "";

          for (const s of groupStudents) {
            const studentRef = doc(collection(db, "students"));
            const studentCustomId = generateCustomId("MTS");
            const parsedSubjects = s.category === "programming"
              ? (s.technologies || [])
              : s.category === "languages"
              ? (s.languages || [])
              : (s.subjects || []);

            parsedSubjects.forEach((sub: string) => allSubjectsSet.add(sub));
            studentDocIds.push(studentRef.id);

            const studentData = {
              id: studentRef.id,
              studentId: studentCustomId,
              parentDocId: parentDocId,
              groupDocId: groupRef.id,
              name: s.name.trim(),
              gender: s.gender,
              category: s.category,
              studentType: s.studentType || "School Student",
              classLevel: (s.classLevel || "").trim(),
              board: (s.board || "").trim(),
              stream: s.stream || "",
              subjects: parsedSubjects,
              technologies: s.technologies || [],
              languages: s.languages || [],
              budget: Number(s.budget),
              isAvailable: true,
              managedByAdmin: true,
              createdAt: now,
            };

            studentsDetailsList.push({
              studentId: studentCustomId,
              name: s.name.trim(),
              classLevel: s.classLevel.trim(),
              board: s.board.trim(),
              subjects: parsedSubjects,
              budget: Number(s.budget),
            });

            batch.set(studentRef, studentData);
          }

          const groupName =
            groupStudents.length === 1
              ? groupStudents[0].name.trim()
              : `Group: ${groupStudents.map((s: any) => s.name.trim()).join(", ")}`;

          const groupData = {
            id: groupRef.id,
            groupId: groupCustomId,
            parentDocId: parentDocId,
            studentDocIds: studentDocIds,
            name: groupName,
            category: groupStudents[0]?.category || "school",
            mode: finalMode,
            area: groupArea,
            city: groupCity,
            addressFlat: isOffline ? (pref.addressFlat || "") : "",
            addressStreet: isOffline ? (pref.addressStreet || "") : "",
            addressPincode: isOffline ? (pref.addressPincode || "") : "",
            daysPerWeek: pref.daysPerWeek,
            specificDays: pref.specificDays,
            preferredTimeRange: pref.preferredTimeRange,
            teacherGenderPreference: pref.teacherGenderPreference,
            totalBudget: groupBudget,
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
            category: groupStudents[0]?.category || "school",
            studentsDetails: studentsDetailsList,
            combinedSubjects: Array.from(allSubjectsSet),
            combinedBudget: groupBudget,
            mode: finalMode,
            area: groupArea,
            city: groupCity,
            managedByAdmin: true,
            status: "open",
            createdAt: now,
          };

          batch.set(groupRef, groupData);
          batch.set(requestRef, requestData);
        }
      } else {
        // Combined Joint Group (or single student, or editing existing)
        let groupDocId = "";
        let groupCustomId = "";
        
        const gid = editingGroupId || "all";
        const pref = groupPreferences[gid] || {
           mode: deliveryMode,
           daysPerWeek: daysPerWeek,
           specificDays: specificDays,
           preferredTimeRange: preferredTimeRange,
           teacherGenderPreference: teacherGenderPreference,
           addressFlat: "",
           addressStreet: "",
           addressPincode: "",
           city: "Bengaluru",
        };

        if (editingGroupId) {
          groupDocId = editingGroupId;
          const existingGroup = groups.find((g: any) => g.id === editingGroupId);
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
          const sRef = (s.id && !s.id.startsWith("new_")) ? doc(db, "students", s.id) : doc(collection(db, "students"));
          const sCustomId = s.studentId || generateCustomId("MTS");
          const parsedSubjects = s.category === "programming"
            ? (s.technologies || [])
            : s.category === "languages"
            ? (s.languages || [])
            : (s.subjects || []);

          parsedSubjects.forEach((sub: string) => allSubjectsSet.add(sub));
          studentDocIds.push(sRef.id);

          const studentData = {
            id: sRef.id,
            studentId: sCustomId,
            parentDocId: parentDocId,
            groupDocId: groupDocId,
            name: s.name.trim(),
            gender: s.gender,
            category: s.category,
            studentType: s.studentType || "School Student",
            classLevel: (s.classLevel || "").trim(),
            board: (s.board || "").trim(),
            stream: s.stream || "",
            subjects: parsedSubjects,
            technologies: s.technologies || [],
            languages: s.languages || [],
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

        if (editingGroupId) {
          const existingGroup = groups.find((g: any) => g.id === editingGroupId);
          if (existingGroup && existingGroup.studentDocIds) {
            const newIds = new Set(studentDocIds);
            for (const oldId of existingGroup.studentDocIds) {
              if (!newIds.has(oldId)) {
                batch.delete(doc(db, "students", oldId));
              }
            }
          }
        }

        const groupName =
          studentsList.length === 1
            ? studentsList[0].name.trim()
            : `Group: ${studentsList.map((s) => s.name.trim()).join(", ")}`;

        const finalBudget = studentsList.reduce((acc, curr) => acc + (Number(curr.budget) || 0), 0);
        const groupHasProgramming = studentsList.some(s => s.category === "programming");
        const finalMode = groupHasProgramming ? "Online" : (pref.mode || "Offline");
        const isOffline = finalMode === "Offline";
        const groupArea = isOffline ? (pref.addressStreet || "") : "";
        const groupCity = isOffline ? (pref.city || "Bengaluru") : "";

        const groupData = {
          id: groupDocId,
          groupId: groupCustomId,
          parentDocId: parentDocId,
          studentDocIds: studentDocIds,
          name: groupName,
          category: studentsList[0]?.category || "school",
          mode: finalMode,
          area: groupArea,
          city: groupCity,
          addressFlat: isOffline ? (pref.addressFlat || "") : "",
          addressStreet: isOffline ? (pref.addressStreet || "") : "",
          addressPincode: isOffline ? (pref.addressPincode || "") : "",
          daysPerWeek: pref.daysPerWeek,
          specificDays: pref.specificDays,
          preferredTimeRange: pref.preferredTimeRange,
          teacherGenderPreference: pref.teacherGenderPreference,
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
          category: studentsList[0]?.category || "school",
          studentsDetails: studentsDetailsList,
          combinedSubjects: Array.from(allSubjectsSet),
          combinedBudget: finalBudget,
          mode: finalMode,
          area: groupArea,
          city: groupCity,
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

  // Delete Lead (Full DB Cleanup)
  const handleDeleteLead = async (group: GroupLeadItem) => {
    if (!window.confirm(`Are you sure you want to completely delete "${group.name}"? This action cannot be undone and will remove the group, students, and any teacher requests.`)) {
      return;
    }

    try {
      setLoading(true);
      const batch = writeBatch(db);

      // 1. Delete Group
      batch.delete(doc(db, "groups", group.id));

      // 2. Delete Tuition Request
      batch.delete(doc(db, "tuition_requests", group.id));

      // 3. Delete Students
      if (group.studentDocIds && group.studentDocIds.length > 0) {
        group.studentDocIds.forEach(sId => {
          batch.delete(doc(db, "students", sId));
        });
      }

      // 4. Delete Admin Lead Requests
      const apps = applicantsByGroup.get(group.id) || [];
      apps.forEach(app => {
        batch.delete(doc(db, "admin_lead_requests", app.id));
      });

      // 5. Check and Delete Parent if no other groups
      if (group.parentDocId) {
        const parentGroupsSnap = await getDocs(query(collection(db, "groups"), where("parentDocId", "==", group.parentDocId)));
        if (parentGroupsSnap.size <= 1) {
          batch.delete(doc(db, "parents", group.parentDocId));
        }
      }

      await batch.commit();
      showToast("Inquiry and all related records completely deleted.");
    } catch (err) {
      console.error("Error deleting inquiry:", err);
      alert("Failed to delete inquiry.");
    } finally {
      setLoading(false);
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
                              {group.mode === "Online"
                                ? "Online Tuition"
                                : `${group.area ? `${group.area}, ` : ""}${group.city || "Bengaluru"}`}
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
                          <button
                            onClick={() => handleDeleteLead(group)}
                            className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete Inquiry"
                          >
                            <Trash2 className="w-4 h-4" />
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
                      Parent / Guardian Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Sharma"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:text-black focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. parent@example.com"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:text-black focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number (10 digits) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">+91</span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={parentPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setParentPhone(val);
                          if (sameAsPhone) setParentWhatsapp(val);
                        }}
                        className="w-full pl-11 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:text-black focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        WhatsApp Number *
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 cursor-pointer bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={sameAsPhone}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSameAsPhone(checked);
                            if (checked) setParentWhatsapp(parentPhone);
                          }}
                          className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Same as Phone</span>
                      </label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        disabled={sameAsPhone}
                        placeholder="9876543210"
                        value={sameAsPhone ? parentPhone : parentWhatsapp}
                        onChange={(e) => setParentWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className={`w-full pl-11 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:text-black focus:border-emerald-600 ${
                          sameAsPhone ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Admin Consultation Notes (Internal or Special Parent Requests)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Mother requested female tutor if possible; student has upcoming term exam in 3 weeks."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:text-black focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* SECTION 2: Number of Students & Profiles */}
              <div className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                      Student Details
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                      Number of Students:
                    </label>
                    <select
                      value={numberOfStudents}
                      onChange={(e) => handleNumberOfStudentsChange(parseInt(e.target.value))}
                      disabled={!!editingGroupId}
                      className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer disabled:opacity-60"
                    >
                      {[1, 2, 3, 4, 5].map((num) => (
                        <option key={num} value={num}>
                          {num} {num > 1 ? "Students" : "Student"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  {studentsList.map((student, idx) => (
                    <div
                      key={student.id || idx}
                      className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 relative"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          Student #{idx + 1} {numberOfStudents > 1 ? `of ${numberOfStudents}` : ""}
                        </span>
                      </div>

                      {/* 1. Category */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Category *</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[
                            { id: "school", label: "School / Academics" },
                            { id: "programming", label: "Programming / IT" },
                            { id: "languages", label: "Languages" },
                          ].map((cat) => {
                            const isSelected = student.category === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  handleUpdateStudent(idx, "category", cat.id);
                                  handleUpdateStudent(idx, "subjects", []);
                                  handleUpdateStudent(idx, "technologies", []);
                                  handleUpdateStudent(idx, "languages", []);
                                }}
                                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                                  isSelected
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                {cat.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Core Info: Name & Gender */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Student Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter student full name"
                            value={student.name}
                            onChange={(e) => handleUpdateStudent(idx, "name", e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:text-black focus:border-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Gender *
                          </label>
                          <div className="flex gap-4 pt-2">
                            {["Female", "Male", "Other"].map((item) => (
                              <label key={item} className="flex items-center gap-1.5 font-semibold text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`gender_${idx}`}
                                  value={item}
                                  checked={student.gender === item}
                                  onChange={() => handleUpdateStudent(idx, "gender", item as any)}
                                  className="accent-emerald-600 w-4 h-4"
                                />
                                <span>{item}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 3. Budget Range Slider */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Expected Budget / Monthly Fee *</span>
                          </span>
                          <span className="text-emerald-700 font-bold text-sm">₹{student.budget || 5000}</span>
                        </div>
                        <input
                          type="range"
                          min={1000}
                          max={20000}
                          step={500}
                          value={student.budget || 5000}
                          onChange={(e) => handleUpdateStudent(idx, "budget", Number(e.target.value))}
                          className="w-full accent-emerald-600 cursor-pointer"
                        />
                        <div className="flex justify-between text-[11px] text-slate-400 font-medium mt-1">
                          <span>₹1,000</span>
                          <span>₹20,000</span>
                        </div>
                      </div>

                      {/* 4. Category-Specific Fields: School */}
                      {student.category === "school" && (
                        <div className="space-y-4 pt-2 border-t border-slate-100">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Student Type *</span>
                              </label>
                              <select
                                value={student.studentType || "School Student"}
                                onChange={(e) => {
                                  handleUpdateStudent(idx, "studentType", e.target.value);
                                  handleUpdateStudent(idx, "classLevel", "");
                                  handleUpdateStudent(idx, "subjects", []);
                                }}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:text-black focus:border-emerald-600"
                              >
                                <option value="School Student">School Student</option>
                                <option value="College Student">College Student</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Class / Grade *</span>
                              </label>
                              <select
                                required
                                value={student.classLevel}
                                onChange={(e) => {
                                  handleUpdateStudent(idx, "classLevel", e.target.value);
                                  handleUpdateStudent(idx, "subjects", []);
                                }}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:text-black focus:border-emerald-600"
                              >
                                <option value="">Select class</option>
                                {student.studentType === "College Student" ? (
                                  <>
                                    <option value="1st PU">1st PU</option>
                                    <option value="2nd PU">2nd PU</option>
                                    <option value="Degree">Degree</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Medical">Medical</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="LKG">LKG</option>
                                    <option value="UKG">UKG</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                                      <option key={num} value={`${num}th Standard`}>{num}th Standard</option>
                                    ))}
                                  </>
                                )}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Board *</span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {["CBSE", "ICSE", "State Board", "IB / IGCSE"].map((item) => (
                                <label
                                  key={item}
                                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                    student.board === item
                                      ? "bg-emerald-50 border-emerald-600 text-emerald-800 font-bold"
                                      : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`board_${idx}`}
                                    value={item}
                                    checked={student.board === item}
                                    onChange={() => {
                                      handleUpdateStudent(idx, "board", item);
                                      handleUpdateStudent(idx, "subjects", []);
                                    }}
                                    className="accent-emerald-600"
                                  />
                                  <span className="text-xs">{item}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Subjects *</span>
                              </label>

                              {isSeniorSecondary(student.classLevel) && (
                                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
                                  <span className="text-slate-500 px-1 text-[11px]">Stream:</span>
                                  {(["All", "Science", "Commerce", "Arts / Humanities"] as const).map((st) => {
                                    const active = (student.stream || "All") === st;
                                    return (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={() => {
                                          handleUpdateStudent(idx, "stream", st === "All" ? "" : st);
                                          handleUpdateStudent(idx, "subjects", []);
                                        }}
                                        className={`px-2 py-0.5 rounded-md text-xs transition-colors ${
                                          active 
                                            ? "bg-white text-emerald-700 shadow-xs font-bold" 
                                            : "text-slate-600 hover:bg-slate-200"
                                        }`}
                                      >
                                        {st}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {getSubjectsForStudent(student.board, student.classLevel, student.stream).map((sub) => {
                                const isSelected = student.subjects.includes(sub);
                                return (
                                  <button
                                    key={sub}
                                    type="button"
                                    onClick={() => {
                                      const newSubjects = isSelected
                                        ? student.subjects.filter((s) => s !== sub)
                                        : [...student.subjects, sub];
                                      handleUpdateStudent(idx, "subjects", newSubjects);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                                      isSelected
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50"
                                    }`}
                                  >
                                    {sub}
                                  </button>
                                );
                              })}
                            </div>
                            {student.subjects.length === 0 && (
                              <p className="text-[11px] text-amber-600 mt-1 font-semibold">Please select at least one subject.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 5. Category-Specific Fields: Programming */}
                      {student.category === "programming" && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Laptop className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Technologies & Frameworks *</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {["Python", "Java", "AI & ML", "HTML & CSS", "Data Analytics", "Gen AI", "Agentic AI"].map((item) => {
                              const isSelected = (student.technologies || []).includes(item);
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => {
                                    const current = student.technologies || [];
                                    const next = isSelected ? current.filter((t) => t !== item) : [...current, item];
                                    handleUpdateStudent(idx, "technologies", next);
                                  }}
                                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                                    isSelected
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                      : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50"
                                  }`}
                                >
                                  {item}
                                </button>
                              );
                            })}
                          </div>
                          {(student.technologies || []).length === 0 && (
                            <p className="text-[11px] text-amber-600 mt-1 font-semibold">Please select at least one technology.</p>
                          )}
                        </div>
                      )}

                      {/* 6. Category-Specific Fields: Languages */}
                      {student.category === "languages" && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Languages className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Languages to Learn *</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {["English", "Arabic", "German", "Japanese", "French", "Spanish"].map((item) => {
                              const isSelected = (student.languages || []).includes(item);
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => {
                                    const current = student.languages || [];
                                    const next = isSelected ? current.filter((l) => l !== item) : [...current, item];
                                    handleUpdateStudent(idx, "languages", next);
                                  }}
                                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                                    isSelected
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                      : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50"
                                  }`}
                                >
                                  {item}
                                </button>
                              );
                            })}
                          </div>
                          {(student.languages || []).length === 0 && (
                            <p className="text-[11px] text-amber-600 mt-1 font-semibold">Please select at least one language.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: Grouping & Tuition Preferences */}
              <div className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                    {studentsList.length > 1 ? "Student Groups & Schedule Preferences" : "Tuition & Schedule Preferences"}
                  </h3>
                </div>

                {/* Drag and Drop Grouping Canvas */}
                {studentsList.length > 1 && !editingGroupId && (
                  <div className="space-y-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <GroupManager 
                        students={studentsList as any}
                        onSave={(updated) => {
                          setStudentsList(updated as any);
                          setIsGroupsSaved(true);
                          setGroupingStrategy('custom');
                          setTimeout(() => {
                            const prefEl = document.getElementById('group-preferences-section');
                            if (prefEl) {
                              prefEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }, 150);
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* If multiple students and groups NOT saved yet: Show lock indicator */}
                {studentsList.length > 1 && !isGroupsSaved && !editingGroupId ? (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-800 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Please organize your students into groups above and click &quot;Save Groups&quot; to configure tuition &amp; schedule preferences below.</span>
                  </div>
                ) : (
                  /* Form continues downward with preferences for each saved group */
                  (() => {
                    const groupsMap = new Map();
                    if (studentsList.length > 1 && groupingStrategy === 'custom') {
                      studentsList.forEach(s => {
                        const gid = s.groupDocId || 'unassigned';
                        const list = groupsMap.get(gid) || [];
                        list.push(s);
                        groupsMap.set(gid, list);
                      });
                    } else {
                       groupsMap.set("all", studentsList);
                    }
                    
                    return Array.from(groupsMap.entries()).map(([gid, groupStudents], groupIdx) => {
                      const pref = groupPreferences[gid] || {
                        mode: 'Offline',
                        daysPerWeek: '5 Days/Week',
                        specificDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                        preferredTimeRange: 'Evening (4 PM - 8 PM)',
                        teacherGenderPreference: 'No Preference',
                        addressFlat: '',
                        addressStreet: '',
                        addressPincode: '',
                        city: 'Bengaluru',
                      };
                      
                      const hasProgramming = groupStudents.some((s: any) => s.category === "programming");

                      const updatePref = (field: string, val: any) => {
                        setGroupPreferences(prev => ({
                          ...prev,
                          [gid]: { ...pref, [field]: val }
                        }));
                      };

                      return (
                        <div 
                          key={gid} 
                          id={groupIdx === 0 ? "group-preferences-section" : undefined}
                          className="space-y-4 bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs mt-4"
                        >
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                            <BookOpen className="w-4 h-4 text-[#00a992]" />
                            <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
                              {gid === 'all' 
                                ? 'Tuition & Schedule Preferences' 
                                : `Group ${groupIdx + 1} Preferences: ${groupStudents.map((s: any) => s.name || 'Student').join(', ')}`}
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Mode *</label>
                              {hasProgramming ? (
                                <div className="w-full px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                                  <Laptop className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Online Only (For Programming)</span>
                                </div>
                              ) : (
                                <select 
                                  value={pref.mode} 
                                  onChange={e => updatePref('mode', e.target.value)} 
                                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                                >
                                  <option value="Offline">Offline (Home Tuition)</option>
                                  <option value="Online">Online Tuition</option>
                                </select>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Teacher Gender *</label>
                              <select 
                                value={pref.teacherGenderPreference} 
                                onChange={e => updatePref('teacherGenderPreference', e.target.value)} 
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                              >
                                <option value="No Preference">No Preference</option>
                                <option value="Female">Female Tutor Preferred</option>
                                <option value="Male">Male Tutor Preferred</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Time Slot *</label>
                              <select 
                                value={pref.preferredTimeRange} 
                                onChange={e => updatePref('preferredTimeRange', e.target.value)} 
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                              >
                                <option value="Flexible / Any Time">Flexible / Any Time</option>
                                <option value="Morning (8 AM - 12 PM)">Morning (8 AM - 12 PM)</option>
                                <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                                <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
                                <option value="Night (After 8 PM)">Night (After 8 PM)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Days per Week *</label>
                              <select 
                                value={pref.daysPerWeek} 
                                onChange={e => updatePref('daysPerWeek', e.target.value)} 
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                              >
                                <option value="1 Day/Week">1 Day / Week</option>
                                <option value="2 Days/Week">2 Days / Week</option>
                                <option value="3 Days/Week">3 Days / Week</option>
                                <option value="4 Days/Week">4 Days / Week</option>
                                <option value="5 Days/Week">5 Days / Week</option>
                                <option value="6 Days/Week">6 Days / Week</option>
                                <option value="Daily">Daily</option>
                              </select>
                            </div>
                          </div>

                          {/* Offline Address Fields if mode is Offline */}
                          {pref.mode === 'Offline' && !hasProgramming && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Group Address (Offline Home Tuition)</span>
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                <input
                                  type="text"
                                  placeholder="Flat / House No. & Building"
                                  value={pref.addressFlat || ''}
                                  onChange={e => updatePref('addressFlat', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400"
                                />
                                <input
                                  type="text"
                                  placeholder="Street & Locality / Area"
                                  value={pref.addressStreet || ''}
                                  onChange={e => updatePref('addressStreet', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400"
                                />
                                <input
                                  type="text"
                                  placeholder="City (e.g. Bengaluru)"
                                  value={pref.city || 'Bengaluru'}
                                  onChange={e => updatePref('city', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400"
                                />
                                <input
                                  type="text"
                                  placeholder="Pincode"
                                  value={pref.addressPincode || ''}
                                  onChange={e => updatePref('addressPincode', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400"
                                />
                              </div>
                            </div>
                          )}

                          {/* Specific Days */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Specific Days Scheduled (Optional)</label>
                            <div className="flex flex-wrap gap-1.5">
                              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => {
                                const isSel = (pref.specificDays || []).includes(d);
                                return (
                                  <button 
                                    key={d} 
                                    type="button" 
                                    onClick={() => {
                                      const current = pref.specificDays || [];
                                      const newDays = isSel ? current.filter((day: string) => day !== d) : [...current, d];
                                      updatePref('specificDays', newDays);
                                    }} 
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                      isSel 
                                        ? 'bg-emerald-600 text-white' 
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    {d}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Auto-Calculated Group Monthly Budget */}
                          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <IndianRupee className="w-4 h-4 text-emerald-600 shrink-0" />
                                <p className="text-xs font-black text-emerald-950 uppercase tracking-wider">Group Monthly Budget</p>
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300/60">
                                  Auto-calculated
                                </span>
                              </div>
                              <p className="text-xs text-emerald-700/90 mt-1 font-medium">
                                Sum of {groupStudents.length} student budget{groupStudents.length > 1 ? "s" : ""}: {groupStudents.map((s: any) => `${s.name || 'Student'} (₹${Number(s.budget || 0).toLocaleString()})`).join(", ")}
                              </p>
                            </div>
                            <div className="text-left sm:text-right shrink-0">
                              <div className="text-xl font-black text-emerald-800 flex items-center sm:justify-end">
                                <span>₹{groupStudents.reduce((acc: number, curr: any) => acc + (Number(curr.budget) || 0), 0).toLocaleString()}</span>
                                <span className="text-xs font-bold text-emerald-600/70 ml-1">/mo</span>
                              </div>
                              <span className="text-[10px] font-semibold text-emerald-600 block">Combined monthly fees</span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}

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
