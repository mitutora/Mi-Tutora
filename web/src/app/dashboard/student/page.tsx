"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ReferralsList } from '@/components/dashboard/ReferralsList';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DeleteAccountModal } from '@/components/dashboard/DeleteAccountModal';
import { TransactionConfirmModal } from '@/components/dashboard/TransactionConfirmModal';
import { ProfileCompletenessCard } from '@/components/dashboard/ProfileCompletenessCard';
import { StudentMotivationBanner } from '@/components/dashboard/StudentMotivationBanner';
import { ParentProfileCard } from '@/components/dashboard/ParentProfileCard';
import { TutorViewModal } from '@/components/dashboard/TutorViewModal';
import { ReviewModal } from '@/components/dashboard/ReviewModal';
import { TuitionGroupCard } from '@/components/dashboard/TuitionGroupCard';

import { motion } from 'motion/react';
import { Home, Search, BookOpen, Clock, Settings, LogOut, ChevronRight, Star, Calendar, MapPin, Navigation, Users, Video, CreditCard, ChevronDown, CheckCircle2, XCircle, FileText, ArrowRight, Activity, Bell, Filter, Edit2, PlayCircle, Plus, Info, Zap, Shield, Lock, Trash2, X, CalendarDays, LayoutDashboard, ShieldCheck, User, Gift, MessageCircle, Menu, Globe, Banknote, Handshake, AlertCircle, AlertTriangle, FileImage, Phone, Mail, GraduationCap, ArrowLeft, Loader2, Copy, Wallet, TrendingUp, Lightbulb, ExternalLink } from 'lucide-react';

import GroupManager from '@/components/GroupManager';
import DemoForm from '@/components/DemoForm';
import LoadingScreen from '@/components/ui/LoadingScreen';
import ActionModal from '@/components/ActionModal';
import MessageModal from '@/components/MessageModal';
import GroupSettingsModal from '@/components/GroupSettingsModal';
import { generateReferralCode } from '@/utils/referral';
import { calculateSuitabilityScore, doesClassMatch, isStrictMatch } from '@/utils/matching';
import { formatTimeTo12Hour } from '@/utils/timeFormat';
import { toast } from 'sonner';
const logo = '/imports/logo.png';

import { useStudentData } from '@/hooks/useDashboardData';
import { executeDeclineOffer, executeAppointTutor } from '@/hooks/useDashboardActions';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { auth, functions } from '@/utils/firebase/client';
import { httpsCallable } from 'firebase/functions';
import { getStudentDemoFee } from '@/utils/pricing';
import { TUITION_TRIAL_DAYS, TUITION_PAYMENT_LOCK_DAYS } from '@/utils/constants';

export default function StudentDashboard() {
  const [activeTab, setActiveTabState] = useState('dashboard');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) {
        setActiveTabState(tab);
      }
    }
  }, []);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({}, '', url);
    }
  };

  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [showProfileReminder, setShowProfileReminder] = useState(false);
  const [hasDismissedReminder, setHasDismissedReminder] = useState(false);
  const [hasDismissedGraceReminder, setHasDismissedGraceReminder] = useState(false);
  const [selectedViewUser, setSelectedViewUser] = useState<any>(null);
  const [selectedViewApp, setSelectedViewApp] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [negotiationOffer, setNegotiationOffer] = useState<{ [key: string]: string }>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  const [activeRequestViewId, setActiveRequestViewId] = useState<string | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [payingClass, setPayingClass] = useState<any>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState<string>('');
  const [activeGroupId, setActiveGroupId] = useState<string>('');
  const [editingStudentId, setEditingStudentId] = useState<string>('');
  const [tuitionSubTab, setTuitionSubTab] = useState<'all'|'recommendation'>('all');
  const [visibleTutorsCount, setVisibleTutorsCount] = useState<number>(20);
  const [isLoadingMoreTutors, setIsLoadingMoreTutors] = useState<boolean>(false);
  const [isSwitchingTab, setIsSwitchingTab] = useState(false);
  const [referralUpi, setReferralUpi] = useState('');
  const [isEditingReferralUpi, setIsEditingReferralUpi] = useState(false);
  const [savingReferralUpi, setSavingReferralUpi] = useState(false);
  const [deletingReferralUpi, setDeletingReferralUpi] = useState(false);
  const [showDeleteReferralUpiModal, setShowDeleteReferralUpiModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, type: 'price'|'timing'|'demo_booking', title: string, description: string, placeholder: string, initialValue: string, initialDate?: string, initialTime?: string, min?: number, max?: number, isOnline?: boolean, onSubmit: (val: string, date?: string, time?: string) => void }>({ isOpen: false, type: 'price', title: '', description: '', placeholder: '', initialValue: '', onSubmit: () => {} });
  const [messageModalConfig, setMessageModalConfig] = useState({ isOpen: false, title: '', message: '' });
  const [reviewModalConfig, setReviewModalConfig] = useState({ isOpen: false, applicationId: '', tutorName: '', parentDocId: '' });
  const [isEditingParentProfile, setIsEditingParentProfile] = useState(false);
  const [parentFormData, setParentFormData] = useState({ name: '', email: '', phone: '', whatsapp: '', address: '' });
  const [parentSameAsPhone, setParentSameAsPhone] = useState(false);
  const [parentSaveLoading, setParentSaveLoading] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<any>(null);
  const [isRemovingStudent, setIsRemovingStudent] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [modifiedGroupQueue, setModifiedGroupQueue] = useState<string[]>([]);
  const [showPreferencesPrompt, setShowPreferencesPrompt] = useState(false);
  const [pendingGroupSaveData, setPendingGroupSaveData] = useState<any[]>([]);
  const [isSavingGroups, setIsSavingGroups] = useState(false);
  const [viewingGroupDetails, setViewingGroupDetails] = useState<any>(null);
  
  const [groupSettingsModalOpen, setGroupSettingsModalOpen] = useState(false);
  const [selectedGroupForSettings, setSelectedGroupForSettings] = useState<any>(null);
  const [newlyCreatedGroupId, setNewlyCreatedGroupId] = useState<string | null>(null);
  const [actionLoadingAppId, setActionLoadingAppId] = useState<string | null>(null);
  const [actionConfirmModal, setActionConfirmModal] = useState<{isOpen: boolean, type: 'hire'|'reject'|'remove', appId: string, teacherName: string} | null>(null);
  const [retrievingGmeetAppId, setRetrievingGmeetAppId] = useState<string | null>(null);
  const [hasDismissedCancellationReminder, setHasDismissedCancellationReminder] = useState(false);
  const [isWithdrawingCancellation, setIsWithdrawingCancellation] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState(Date.now());
  
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRequestCancellation = async (cls: any) => {
    try {
      const vToken = await auth.currentUser?.getIdToken();
      if (!vToken) return null;
      
      const res = await fetch('/api/transactions/cancel-tuition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vToken}`
        },
        body: JSON.stringify({
          applicationId: cls.id,
          action: 'request'
        })
      });
      const dataRes = await res.json();
      if (res.ok && dataRes.success) {
        mutate();
      }
      return dataRes;
    } catch (err) {
      console.error("Cancellation record error:", err);
      return null;
    }
  };

  const handleWithdrawCancellation = async (appId: string) => {
    try {
      setIsWithdrawingCancellation(appId);
      const vToken = await auth.currentUser?.getIdToken();
      if (!vToken) throw new Error("Authentication required");

      const res = await fetch('/api/transactions/cancel-tuition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vToken}`
        },
        body: JSON.stringify({
          applicationId: appId,
          action: 'withdraw'
        })
      });
      const dataRes = await res.json();
      if (!res.ok || !dataRes.success) {
        throw new Error(dataRes.error || "Failed to withdraw cancellation");
      }
      toast.success("Cancellation request withdrawn. Your tuition continues as normal.");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to withdraw cancellation");
    } finally {
      setIsWithdrawingCancellation(null);
    }
  };

  useEffect(() => {
    setVisibleTutorsCount(20);
  }, [tuitionSubTab, selectedCategory, activeGroupId]);

  const mainContentRef = useRef<HTMLElement>(null);
  const studentFormSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [
    activeTab,
    tuitionSubTab,
    selectedCategory,
    activeGroupId,
    activeRequestViewId,
    viewingGroupDetails
  ]);

  useEffect(() => {
    if (activeStudentId || editingStudentId) {
      setTimeout(() => {
        studentFormSectionRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      }, 0);
    }
  }, [activeStudentId, editingStudentId]);

  const router = useRouter();

  const { data, error: swrError, isLoading: loading, mutate } = useStudentData();

  // Find the most recent trusted server timestamp from their database documents
  const latestServerTime = data?.applications?.reduce((max: number, app: any) => {
    const appTime = app.updatedAt ? (typeof app.updatedAt === 'number' ? app.updatedAt : new Date(app.updatedAt).getTime()) : 0;
    return Math.max(max, appTime || 0);
  }, 0) || 0;

  // Force the clock forward if they tried to rewind their device time
  const trustedNow = Math.max(nowTime, latestServerTime);

  useEffect(() => {
    if (data?.userData?.upiId && !isEditingReferralUpi) {
      setReferralUpi(data.userData.upiId);
    }
  }, [data?.userData?.upiId, isEditingReferralUpi]);

  const handleSaveReferralUpi = async () => {
    const cleanUpi = referralUpi.trim();
    if (!cleanUpi) {
      toast.error('Please enter a UPI ID');
      return;
    }
    if (!/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(cleanUpi)) {
      toast.error('Invalid UPI format (e.g. yourname@okhdfcbank)');
      return;
    }
    setSavingReferralUpi(true);
    try {
      const { db } = await import('@/utils/firebase/client');
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', data?.user?.uid as string), {
        upiId: cleanUpi
      });
      toast.success('Referral Payout UPI updated successfully!');
      setIsEditingReferralUpi(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update UPI');
    } finally {
      setSavingReferralUpi(false);
    }
  };

  const handleDeleteReferralUpi = async () => {
    setDeletingReferralUpi(true);
    try {
      const { db } = await import('@/utils/firebase/client');
      const { doc, updateDoc, deleteField } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', data?.user?.uid as string), {
        upiId: deleteField()
      });
      setReferralUpi('');
      setIsEditingReferralUpi(false);
      setShowDeleteReferralUpiModal(false);
      toast.success('Referral UPI removed successfully');
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove UPI');
    } finally {
      setDeletingReferralUpi(false);
    }
  };

  const allStudents = useMemo(() => {
    const rawList = data?.students || (data?.myStudent ? [data.myStudent] : []);
    const seen = new Set();
    return rawList.filter((s: any) => {
      if (!s || !s.id) return false;
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [data?.students, data?.myStudent]);
  
  const hasProfile = allStudents.length > 0;

  useEffect(() => {
    if (data && !loading) {
      setTuitionSubTab(hasProfile ? 'recommendation' : 'all');
    }
  }, [data, loading, hasProfile]);

  const hasPendingDues = useMemo(() => {
    if (!data?.upcomingClasses) return false;
    return data.upcomingClasses.some((cls: any) => {
      if (cls.status !== 'tuition_started') return false;
      if (cls.feePaid === true) return false;
      const daysElapsed = Math.max(1, Math.ceil((Date.now() - (cls.startDate || Date.now())) / (1000 * 60 * 60 * 24)));
      return daysElapsed >= TUITION_PAYMENT_LOCK_DAYS;
    });
  }, [data?.upcomingClasses]);

  const pendingCancellationApp = useMemo(() => {
    return data?.applications?.find((app: any) => {
      return app.status === 'tuition_started' && app.cancellationRequested === true && !app.feePaid;
    });
  }, [data?.applications]);
  
  const studentGroups = useMemo(() => {
    const acc: any = {};
    const seenStudentIds = new Set();
    allStudents.forEach((student: any) => {
      if (!student?.id || seenStudentIds.has(student.id)) return;
      seenStudentIds.add(student.id);
      const gId = student.groupDocId || `indv_${student.id}`;
      if (!acc[gId]) acc[gId] = { id: gId, students: [], totalBudget: 0, categories: [] };
      acc[gId].students.push(student);
      acc[gId].totalBudget += (parseInt(student.budget) || 0);
      if (student.category) acc[gId].categories.push(student.category);
    });
    return Object.values(acc)
      .filter((g: any) => g.id !== 'unassigned')
      .sort((a: any, b: any) => {
        const aTime = Math.min(...a.students.map((s:any) => s.createdAt || 0));
        const bTime = Math.min(...b.students.map((s:any) => s.createdAt || 0));
        return aTime - bTime;
      })
      .map((g: any) => ({
        ...g,
        name: g.students.length === 1 ? g.students[0].name : `Group: ${g.students.map((s:any)=>s.name).join(', ')}`,
        category: g.categories[0]
      }));
  }, [allStudents]);

  const executeGroupSave = async (saveData: any[], openModalAfter: boolean) => {
    setIsSavingGroups(true);
    try {
      const { db } = await import('@/utils/firebase/client');
      const { doc, getDoc, updateDoc, collection, setDoc, getDocs, query, where, deleteDoc } = await import('firebase/firestore');
      const { syncTuitionRequestForGroup } = await import('@/utils/groupUtils');
      const { generateCustomId } = await import('@/utils/idGenerator');
      
      const newGroupIds = new Set<string>();

      for (const student of saveData) {
        await updateDoc(doc(db, 'students', student.id), {
          groupDocId: student.groupDocId
        });
        if (student.groupDocId) {
          newGroupIds.add(student.groupDocId);
        }
      }
      
      for (const groupId of Array.from(newGroupIds)) {
          const groupRef = doc(db, 'groups', groupId);
          const groupSnap = await getDoc(groupRef);
          
          if (!groupSnap.exists()) {
            const sampleStudent = saveData.find(s => s.groupDocId === groupId);
            const oldStudentData = allStudents.find((s:any) => s.id === sampleStudent?.id);
            let oldGroupData: any = {};
            if (oldStudentData && oldStudentData.groupDocId) {
              const oldGroupSnap = await getDoc(doc(db, 'groups', oldStudentData.groupDocId));
              if (oldGroupSnap.exists()) oldGroupData = oldGroupSnap.data();
            }
            
            await setDoc(groupRef, {
                id: groupId,
                groupDocId: groupId,
                groupId: generateCustomId('MTG'),
                parentDocId: data?.user?.uid,
                mode: oldGroupData.mode || '',
                area: oldGroupData.area || '',
                city: oldGroupData.city || '',
                latitude: oldGroupData.latitude || null,
                longitude: oldGroupData.longitude || null,
                teacherGenderPreference: oldGroupData.teacherGenderPreference || 'No Preference',
                preferredTimeRange: oldGroupData.preferredTimeRange || '',
                daysPerWeek: oldGroupData.daysPerWeek || '',
                specificDays: oldGroupData.specificDays || [],
                createdAt: Date.now(),
                status: 'active'
            });
            setNewlyCreatedGroupId(groupId);
          }
          
          const groupStudents = saveData.filter(s => s.groupDocId === groupId).map(s => s.id);
          await updateDoc(groupRef, { studentDocIds: groupStudents });
          await syncTuitionRequestForGroup(db, groupId, (data?.user?.uid || '') as string);
      }

      const allGroupsQuery = query(collection(db, 'groups'), where('parentDocId', '==', data?.user?.uid));
      const allGroupsSnap = await getDocs(allGroupsQuery);
      for (const groupDoc of allGroupsSnap.docs) {
          if (!newGroupIds.has(groupDoc.id)) {
            await deleteDoc(doc(db, 'groups', groupDoc.id));
            const requestQuery = query(collection(db, 'tuition_requests'), where('groupDocId', '==', groupDoc.id));
            const requestSnap = await getDocs(requestQuery);
            for(const r of requestSnap.docs) await deleteDoc(r.ref);
          }
      }

      toast.success("Groups updated successfully!");
      mutate();
      
      if (openModalAfter && modifiedGroupQueue.length > 0) {
        const nextGroupId = modifiedGroupQueue[0];
        const nextGroup = studentGroups.find((g:any) => g.id === nextGroupId) || { id: nextGroupId, name: `Group` };
        const requestDoc = data?.groups?.find((g: any) => g.id === nextGroupId) || data?.tuitionRequests?.find((req: any) => req.groupDocId === nextGroupId) || data?.myRequest;
        setSelectedGroupForSettings({ ...nextGroup, requestDoc });
        setGroupSettingsModalOpen(true);
      } else {
        setModifiedGroupQueue([]);
        setActiveTab('profile');
      }
    } catch (error) {
      console.error("Error saving groups:", error);
      toast.error("Failed to save group changes.");
    } finally {
      setIsSavingGroups(false);
    }
  };


  useEffect(() => {
    if (newlyCreatedGroupId && studentGroups && studentGroups.length > 0) {
      const newGroup = studentGroups.find((g: any) => g.id === newlyCreatedGroupId);
      if (newGroup) {
        // We find the request doc for the new group from data (it may be stale, but the modal fetches/relies on group settings)
        setSelectedGroupForSettings({ ...newGroup, requestDoc: { groupDocId: newlyCreatedGroupId } });
        setGroupSettingsModalOpen(true);
        setNewlyCreatedGroupId(null);
      }
    }
  }, [studentGroups, newlyCreatedGroupId]);

  const activeGroup = studentGroups.find(g => g.id === activeGroupId) || studentGroups[0] || null;
  const activeStudent = allStudents.find((s:any) => s.id === activeStudentId) || data?.myStudent || allStudents[0] || null;
  
  const activeGroupDoc = data?.groups?.find((g: any) => g.id === activeGroup?.id) || data?.tuitionRequests?.find((req: any) => req.groupDocId === activeGroup?.id);
  const scoringContext = {
    ...(activeGroupDoc || {}),          // Group prefs as base (teacherGenderPreference, mode etc.)
    ...(activeGroup || activeStudent),  // Student data wins on conflict
    requestDoc: activeGroupDoc          // Keep for legacy fallback
  };

  const allTutorsWithScores = (data?.allTutors || []).filter((tutor: any) => {
      if (tutor.id === data?.userData?.id || (tutor.email && tutor.email === data?.userData?.email)) return false; // Prevent self-hiring
      const matchGroup = (app: any) => {
        return app.groupDocId === activeGroup?.id || app.studentDocId === activeGroup?.id;
      };
      const app = data?.applications?.find((app: any) => app.tutorDocId === tutor.id && matchGroup(app));
      if (app && app.status === 'tuition_started') return false;
      return true;
  }).map((tutor: any) => {
    const getDetail = (obj: any, field: string) => obj?.[field] || (obj?.students && obj.students[0] ? obj.students[0][field] : '') || '';
    const studentBudget = parseFloat(scoringContext?.budget || scoringContext?.totalBudget || scoringContext?.combinedBudget || getDetail(scoringContext, 'budget') || 0);
    const teacherFee = parseFloat(tutor.feeRange || tutor.minFee || 0);
    const strictMatch = isStrictMatch(scoringContext, tutor);
    return {
      ...tutor,
      strictMatch,
      suitabilityScore: strictMatch ? calculateSuitabilityScore(scoringContext, tutor) : 0,
      budgetDifference: Math.abs(studentBudget - teacherFee)
    };
  }).sort((a: any, b: any) => {
      const getStatus = (tutorId: string) => {
          const matchGroup = (app: any) => {
            return app.groupDocId === activeGroup?.id || app.studentDocId === activeGroup?.id;
          };
          const app = data?.applications?.find((app: any) => app.tutorDocId === tutorId && matchGroup(app));
          if (!app) return '';
          if (app.status === 'locked' || (app.status === 'declined' && app.declinedAt && (Date.now() - app.declinedAt < 7 * 24 * 60 * 60 * 1000))) {
              return 'locked';
          }
          return app.status;
      };
      const getScore = (status: string) => {
          if (status === 'locked' || status === 'declined') return -1000;
          if (['pending', 'negotiating', 'reviewing', 'offer_sent', 'demo_requested_by_student', 'demo_requested_by_teacher', 'demo_pending_payment'].includes(status)) return 1000;
          return 0;
      };
      const statusDiff = getScore(getStatus(b.id)) - getScore(getStatus(a.id));
      if (statusDiff !== 0) return statusDiff;
      
      if (b.suitabilityScore !== a.suitabilityScore) {
          return b.suitabilityScore - a.suitabilityScore;
      }
      
      return a.budgetDifference - b.budgetDifference;
  }).map((tutor: any, index: number) => ({
      ...tutor,
      rank: index + 1
  }));

  const computedRecommendedTutors = allTutorsWithScores.filter((tutor: any) => {
      if (tutor.suitabilityScore <= 0 || !tutor.strictMatch) return false;
      return true;
  });

  const computedRecommendedNegotiations = data?.allNegotiations?.filter((app:any) => computedRecommendedTutors.some((t:any) => t.id === app.tutorDocId)) || [];

  const initialRedirectDone = useRef(false);

  useEffect(() => {
    if (data && !hasProfile && !initialRedirectDone.current) {
      initialRedirectDone.current = true;
      setActiveTab('new_tuition');
      const storedCat = localStorage.getItem('selectedCategory');
      if (!storedCat) {
        setShowCategoryPopup(true);
      } else {
        setSelectedCategory(storedCat);
      }
    }
  }, [data, hasProfile]);

  const handleCategorySelect = (cat: string) => {
    localStorage.setItem('selectedCategory', cat);
    setSelectedCategory(cat);
    setShowCategoryPopup(false);
  };

  const [isGeneratingRef, setIsGeneratingRef] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (data && !hasProfile && !showCategoryPopup && !hasDismissedReminder && activeTab === 'new_tuition') {
      const timer = setTimeout(() => {
        setShowProfileReminder(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [data, hasProfile, showCategoryPopup, hasDismissedReminder, activeTab]);

  useEffect(() => {
    const existingCode = data?.userData?.referralCode || data?.userData?.referralcode;
    if (data && hasProfile && !existingCode && !isGeneratingRef && data.user) {
      const generateCode = async () => {
        setIsGeneratingRef(true);
        try {
          const { db } = await import('@/utils/firebase/client');
          const { doc, updateDoc, collection, query, where, getDocs } = await import('firebase/firestore');
          const baseName = data?.myStudent?.name || data?.user?.displayName || 'USER';
          
          let uniqueCode = '';
          let isUnique = false;
          let attempts = 0;
          
          while (!isUnique && attempts < 5) {
            const entropy = attempts === 0 ? '' : Math.random().toString(36).substring(2, 5);
            const tempCode = generateReferralCode(baseName, data.user.uid + entropy);
            const q = query(collection(db, 'users'), where('referralCode', '==', tempCode));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
              uniqueCode = tempCode;
              isUnique = true;
            }
            attempts++;
          }
          
          if (!uniqueCode) throw new Error("Could not generate a unique referral code");
          
          mutate({ ...data, userData: { ...data.userData, referralCode: uniqueCode, referralcode: uniqueCode } }, false);

          const userDocRef = doc(db, 'users', data.user.uid);
          await updateDoc(userDocRef, { referralCode: uniqueCode });
          
          toast.success("Generated referral code: " + uniqueCode);
          mutate();
        } catch (e: any) {
          toast.error("Failed to generate referral code: " + e.message);
        } finally {
          setIsGeneratingRef(false);
        }
      };
      generateCode();
    }
  }, [data?.userData?.referralCode, data?.userData?.referralcode, data?.user, data?.myStudent?.name, mutate, data, isGeneratingRef, hasProfile]);



  // Removed snapshot listeners, now handled in useStudentData

  const handleLogout = async () => {
    const { auth } = await import('@/utils/firebase/client');
    await auth.signOut();
    localStorage.removeItem('user');
    sessionStorage.clear();
    toast.success("Logged out successfully!");
    window.location.href = '/login';
  };

  const getTutorBasePrice = (tutor: any) => {
    if (tutor.price && tutor.price > 0) return tutor.price;
    if (tutor.feeRange) {
      const match = String(tutor.feeRange).match(/\d+/);
      if (match) return parseInt(match[0]);
    }
    return 0;
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dailyRequestsCount = data?.applications?.filter((app: any) => app.initiator === 'student' && app.createdAt >= todayStart.getTime()).length || 0;
  const todayKey = new Date().toISOString().split('T')[0];
  const dailyUsage = data?.profile?.dailyUsage;
  const requestsUsedToday = dailyUsage?.date === todayKey ? (dailyUsage.count || 0) : 0;
  const requestsLimit = 5;
  const requestsRemaining = Math.max(0, requestsLimit - requestsUsedToday);
  const groupQueueStatuses = studentGroups.map((group: any) => {
    const activeStatuses = ['negotiating', 'pending', 'reviewing', 'offer_sent', 'demo_requested_by_student', 'demo_requested_by_teacher', 'demo_pending_payment', 'demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision'];
    const activeCount = data?.applications?.filter((app: any) => app.groupDocId === group.id && activeStatuses.includes(app.status)).length || 0;
    return {
      id: group.id,
      name: String(group.name || 'Group').replace(/^Group:\s*/i, ''),
      activeCount,
    };
  });
  const handleReviewSubmit = async (rating: number, comment: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/submit-review', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          applicationId: reviewModalConfig.applicationId,
          parentDocId: reviewModalConfig.parentDocId,
          rating,
          comment
        })
      });
      const result = await response.json();
      if (!result.success) {
        toast.error(result.error || 'Failed to submit review');
        return;
      }
      toast.success('Review submitted successfully!');
    } catch (err) {
      toast.error('An error occurred. Please try again.');
    }
  };

  const handleRequestTutor = async (tutor: any) => {
    const matchGroup = (app: any) => {
      return app.groupDocId === activeGroup?.id || app.studentDocId === activeGroup?.id;
    };

    const pendingStatuses = ['negotiating', 'pending', 'reviewing', 'offer_sent', 'demo_requested_by_student', 'demo_requested_by_teacher', 'demo_pending_payment', 'demo_booked'];
    const studentPendingCount = data?.applications?.filter((app: any) => matchGroup(app) && pendingStatuses.includes(app.status)).length || 0;
    if (studentPendingCount >= 5) {
      setMessageModalConfig({ isOpen: true, title: 'Queue Full', message: 'You already have 5 pending requests. Please wait for a response or cancel an existing request before sending a new one.' });
      return;
    }
    
    if (isSubmittingRef.current) return false;
    isSubmittingRef.current = true;
    if (requestLoading) { isSubmittingRef.current = false; return false; }
    
    // Rogue 1-request blocker removed to allow Layer 2 (5-queue) and Layer 3 (2-demo) to function normally.
    const offerPrice = parseInt(negotiationOffer[tutor.id]);
    if (!offerPrice || offerPrice <= 0) {
      toast.error("Please enter a valid budget offer.");
      isSubmittingRef.current = false;
      return;
    }
    
    const tutorPrice = getTutorBasePrice(tutor);
    if (tutorPrice > 0 && offerPrice > tutorPrice) {
      setMessageModalConfig({ isOpen: true, title: 'Invalid Offer', message: `The maximum you can offer is Rs. ${tutorPrice} (100% of the teacher's base fee). Please adjust your offer.` });
      isSubmittingRef.current = false;
      return;
    }
    if (tutorPrice > 0 && offerPrice < tutorPrice * 0.6) {
      setMessageModalConfig({ isOpen: true, title: 'Invalid Offer', message: `The minimum you can offer is Rs. ${Math.ceil(tutorPrice * 0.6)} (60% of the teacher's base fee). Please adjust your offer.` });
      isSubmittingRef.current = false;
      return;
    }
    
    if (!hasProfile) {
      toast.error("Please complete your profile first.");
      setActiveTab('profile');
      isSubmittingRef.current = false;
      return;
    }

    try {
      setRequestLoading(true);
      const { db, auth } = await import('@/utils/firebase/client');
      const { collection, doc, arrayUnion, arrayRemove, runTransaction, serverTimestamp } = await import('firebase/firestore');
      const { generateCustomId } = await import('@/utils/idGenerator');
      const user = auth.currentUser;
      
      const groupToUse = activeGroup;
      if (!groupToUse) {
        toast.error("Please add a student profile first.");
        isSubmittingRef.current = false;
        setRequestLoading(false);
        return false;
      }

      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/transactions/request', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: 'student',
          userId: data?.user?.uid,
          tutor: { id: tutor.id, name: tutor.name, category: tutor.category, mode: tutor.mode },
          groupToUse: { id: groupToUse.id, name: groupToUse.name, category: groupToUse.category, students: groupToUse.students },
          tutorPrice,
          offerPrice,
          preferredTimeRange: data?.myRequest?.preferredTimeRange,
          actionType: 'make_offer'
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to make offer");
      }

      toast.success("Tutor request & offer sent successfully!");
      mutate();
      return true;
    } catch (e: any) {
      if (e.message === "DAILY_LIMIT_EXCEEDED") {
         toast.error("You have reached your daily limit of 5 requests.");
      } else if (e.message === "TEACHER_QUEUE_FULL") {
         toast.error("This teacher's queue is currently full. Please try again later.");
      } else {
         toast.error("Error sending request: " + e.message);
      }
      isSubmittingRef.current = false;
      setRequestLoading(false);
    }
  };

  const handleDirectRequestDemo = async (tutor: any) => {
    const matchGroup = (app: any) => {
      return app.groupDocId === activeGroup?.id || app.studentDocId === activeGroup?.id;
    };

    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const recentDemosCount = data?.applications?.filter((app: any) => 
      matchGroup(app) &&
      ['demo_requested_by_student', 'demo_pending_payment', 'demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision'].includes(app.status) &&
      (Date.now() - (app.updatedAt || app.createdAt || 0) < SEVEN_DAYS)
    ).length || 0;

    if (recentDemosCount >= 2) {
      toast.error("You can only have up to 2 active demos in a 7-day period. Please complete or cancel your current demos first.");
      return;
    }
    const pendingStatuses = ['negotiating', 'pending', 'reviewing', 'offer_sent', 'demo_requested_by_student', 'demo_requested_by_teacher', 'demo_pending_payment', 'demo_booked'];
    const studentPendingCount = data?.applications?.filter((app: any) => matchGroup(app) && pendingStatuses.includes(app.status)).length || 0;
    if (studentPendingCount >= 5) {
      setMessageModalConfig({ isOpen: true, title: 'Queue Full', message: 'You already have 5 pending requests. Please wait for a response or cancel an existing request before sending a new one.' });
      return;
    }
    
    if (requestLoading) return;
    
    // Rogue 1-request blocker removed to allow Layer 2 (5-queue) and Layer 3 (2-demo) to function normally.
    try {
      setRequestLoading(true);
      const { db, auth } = await import('@/utils/firebase/client');
      const { collection, doc, arrayUnion, arrayRemove, runTransaction, serverTimestamp } = await import('firebase/firestore');
      const { generateCustomId } = await import('@/utils/idGenerator');
      const user = auth.currentUser;
      
      const groupToUse = activeGroup;
      if (!groupToUse) {
        toast.error("Please add a student profile first.");
        isSubmittingRef.current = false;
        setRequestLoading(false);
        return false;
      }

      const tutorPrice = getTutorBasePrice(tutor);

      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/transactions/request', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: 'student',
          userId: data?.user?.uid,
          tutor: { id: tutor.id, name: tutor.name, category: tutor.category, mode: tutor.mode },
          groupToUse: { id: groupToUse.id, name: groupToUse.name, category: groupToUse.category, students: groupToUse.students },
          tutorPrice,
          preferredTimeRange: data?.myRequest?.preferredTimeRange
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to request demo");
      }

      toast.success("Demo requested successfully!");
      mutate();
      return true;
    } catch (e: any) {
      if (e.message === "DAILY_LIMIT_EXCEEDED") {
         toast.error("You have reached your daily limit of 5 requests.");
      } else if (e.message === "TEACHER_QUEUE_FULL") {
         toast.error("This teacher's queue is currently full. Please try again later.");
      } else {
         toast.error("Error requesting demo: " + e.message);
      }
    } finally {
      isSubmittingRef.current = false;
      setRequestLoading(false);
    }
  };

  const handleNegotiationAction = async (appId: string, action: string, newOffer?: number, neg?: any) => {
    if (isSubmittingRef.current) return false;
    isSubmittingRef.current = true;
    setActionLoadingAppId(appId);
    if (['request_demo', 'accept_demo'].includes(action)) {
      const currentApp = data?.applications?.find((a: any) => a.id === appId);
      const targetGroupId = currentApp?.groupDocId || activeGroup?.id;
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      const recentDemosCount = data?.applications?.filter((app: any) => 
        app.groupDocId === targetGroupId &&
        ['demo_requested_by_student', 'demo_pending_payment', 'demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision'].includes(app.status) &&
        (Date.now() - (app.updatedAt || app.createdAt || 0) < SEVEN_DAYS)
      ).length || 0;

      if (recentDemosCount >= 2) {
        toast.error("You can only have up to 2 active demos in a 7-day period. Please complete or cancel your current demos first.");
        isSubmittingRef.current = false;
        setActionLoadingAppId(null);
        return false;
      }
    }

    if (action === 'decline') {
      try {
        await executeDeclineOffer(appId, 'student', data);
        toast.success("Offer declined successfully.");
        mutate();
        return true;
      } catch (err: any) {
        toast.error("Failed to decline: " + err.message);
        return false;
      } finally {
        isSubmittingRef.current = false;
        setActionLoadingAppId(null);
      }
    }

    if (action === 'counter_price' && newOffer && neg) {
      const maxAllowed = neg.absoluteMax || (neg.initialBudget || 0);
      const minAllowed = neg.absoluteMin || Math.ceil((neg.initialBudget || 0) * 0.6);
      if (newOffer > maxAllowed) {
        setMessageModalConfig({ isOpen: true, title: 'Invalid Offer', message: `The absolute maximum you can offer is Rs. ${maxAllowed}. Please adjust your offer.` });
        isSubmittingRef.current = false;
        setActionLoadingAppId(null);
        return false;
      }
      if (newOffer < minAllowed) {
        setMessageModalConfig({ isOpen: true, title: 'Invalid Offer', message: `The absolute minimum you can offer is Rs. ${minAllowed}. Please adjust your offer.` });
        isSubmittingRef.current = false;
        setActionLoadingAppId(null);
        return false;
      }
    }
    
    try {
      const { db } = await import('@/utils/firebase/client');
      const { doc, arrayRemove, runTransaction, serverTimestamp } = await import('firebase/firestore');
      
      await runTransaction(db, async (transaction) => {
        const appRef = doc(db, 'applications', appId);
        const appSnap = await transaction.get(appRef);
        
        if (!appSnap.exists()) {
          throw new Error("Application not found.");
        }
        
        const appData = appSnap.data();
        
        if (appData.status === 'declined') {
          throw new Error("This request has already been declined or canceled by the other party.");
        }
        if (action === 'accept_price' && appData.lastUpdatedBy === 'student') {
           throw new Error("This offer has already been accepted or modified.");
        }
        
        const updateData: any = {};
        let isFinalState = false;
        
        if (action === 'accept_price' || action === 'request_demo') {
          updateData.status = 'demo_requested_by_student';
          if (newOffer) updateData.finalPrice = newOffer;
          updateData.lastUpdatedBy = 'student';
        } else if (action === 'accept_demo') {
          updateData.status = 'demo_pending_payment';
          updateData.lastUpdatedBy = 'student';
        } else if (action === 'propose_demo_date') {
          updateData.proposedDate = neg?.proposedDate;
          updateData.proposedTime = neg?.proposedTime;
          updateData.lastUpdatedBy = 'student';
        } else if (action === 'accept_demo_date') {
          updateData.status = 'demo_scheduled';
          updateData.demoDate = neg?.proposedDate || appData.proposedDate;
          updateData.demoTime = neg?.proposedTime || appData.proposedTime;
          updateData.lastUpdatedBy = 'student';
        } else if (action === 'counter_price') {
          updateData.currentOffer = newOffer;
          updateData.lastUpdatedBy = 'student';
        }
        updateData.updatedAt = serverTimestamp();
        
        transaction.update(appRef, updateData);
        
        // Legacy pendingRequests removal removed
      });
      const appDataSync = data?.applications?.find((a: any) => a.id === appId);
      if (appDataSync) {
        const { syncStudentAvailability } = await import('@/utils/studentAvailability');
        await syncStudentAvailability(db, appDataSync.studentDocIds || [appDataSync.studentDocId]).catch(console.error);
      }
      let successMessage = "Action completed successfully!";
      if (action === 'decline') successMessage = "Offer declined.";
      else if (action === 'request_demo' || action === 'accept_price') successMessage = "Demo requested successfully!";
      else if (action === 'accept_demo') successMessage = "Demo accepted successfully!";
      else if (action === 'counter_price') successMessage = "Counter offer sent successfully!";
      else if (action === 'propose_demo_date') successMessage = "Demo date proposed successfully!";
      else if (action === 'accept_demo_date') successMessage = "Demo date accepted successfully!";
      toast.success(successMessage);
      mutate();
    } catch (e: any) {
      toast.error("Error: " + e.message);
      return false;
    } finally {
      isSubmittingRef.current = false;
      setActionLoadingAppId(null);
    }
  };

  const handleDismissNotification = async (notifId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const { db } = await import('@/utils/firebase/client');
      const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');
      if (data?.user?.uid) {
        await updateDoc(doc(db, 'users', data.user.uid), {
          dismissedNotifications: arrayUnion(notifId)
        });
        mutate();
      }
    } catch (err: any) {
      toast.error('Failed to dismiss notification');
    }
  };
  
  const handleClearAllNotifications = async () => {
    try {
      const { db } = await import('@/utils/firebase/client');
      const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');
      if (data?.allNotifications?.length && data?.user?.uid) {
        const ids = data.allNotifications.map((n:any) => n.id);
        await updateDoc(doc(db, 'users', data.user.uid), {
          dismissedNotifications: arrayUnion(...ids)
        });
        mutate();
        toast.success('All notifications cleared');
      }
    } catch (err: any) {
      toast.error('Failed to clear notifications');
    }
  };

  const handleJoinDemoRoom = async (appId: string) => {
    if (retrievingGmeetAppId) return;
    setRetrievingGmeetAppId(appId);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/get-demo-link', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          applicationId: appId
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to retrieve link');
      
      if (resData.link) {
        window.open(resData.link, '_blank');
      } else {
        toast.error('The tutor has not added a link yet.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to retrieve link');
    } finally {
      setRetrievingGmeetAppId(null);
    }
  };

  const handleAppointTutor = async (appId: string) => {
    if (isSubmittingRef.current) return false;
    isSubmittingRef.current = true;
    try {
      await executeAppointTutor(appId, data);
      
      toast.success('Successfully hired tutor!');
      mutate();
      return true;
    } catch (err: any) {
      toast.error('Failed to process the hiring action.');
      console.error(err);
      return false;
    } finally {
      isSubmittingRef.current = false;
    }
  };
  const handlePaymentSubmit = async () => {
    setPaymentLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      // 1. Fetch Order from our secure backend
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          applicationId: payingClass.id,
          role: 'student',
          useWallet,
          isRemoval: payingClass.isRemoval || false
        })
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error || 'Failed to create order');

      if (order.walletCovered) {
        const vToken = await auth.currentUser?.getIdToken();
        const verifyRes = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${vToken}`
          },
          body: JSON.stringify({
            razorpay_order_id: order.id,
            razorpay_payment_id: order.mockPaymentId,
            razorpay_signature: order.mockSignature,
            applicationId: payingClass.id,
            role: 'student',
            isRemoval: !!payingClass.isRemoval,
            useWallet
          })
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          toast.error(verifyData.error || 'Payment verification failed');
        } else {
          const { db } = await import('@/utils/firebase/client');
          const { syncStudentAvailability } = await import('@/utils/studentAvailability');
          await syncStudentAvailability(db, payingClass.studentDocIds || [payingClass.studentDocId]).catch(console.error);
          
          toast.success("Payment completed successfully via wallet!");
          setPayingClass(null);
          setUseWallet(false);
          mutate();
        }
        setPaymentLoading(false);
        return;
      }

      // 2. Load Razorpay SDK
      const loadRazorpay = () => new Promise(resolve => {
         if ((window as any).Razorpay) return resolve(true);
         const script = document.createElement('script');
         script.src = 'https://checkout.razorpay.com/v1/checkout.js';
         script.onload = () => resolve(true);
         script.onerror = () => resolve(false);
         document.body.appendChild(script);
      });
      
      const isLoaded = await loadRazorpay();
      if (!isLoaded) throw new Error('Razorpay SDK failed to load');

      // 3. Setup Razorpay Options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'mock_key', // Required field, backend handles real verification
        amount: order.amount,
        currency: order.currency,
        name: 'MiTutora',
        description: payingClass.isRemoval ? 'Tuition Fee Payment (Removal)' : 'Tuition Fee Payment',
        order_id: order.id,
        handler: async function (response: any) {
           // 4. Verify Payment securely on the backend
           const vToken = await auth.currentUser?.getIdToken();
           const verifyRes = await fetch('/api/verify-payment', {
             method: 'POST',
             headers: { 
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${vToken}`
             },
             body: JSON.stringify({
               razorpay_order_id: response.razorpay_order_id || order.id,
               razorpay_payment_id: response.razorpay_payment_id || 'mock_payment_id',
               razorpay_signature: response.razorpay_signature || 'mock_signature',
               applicationId: payingClass.id,
               role: 'student',
               isRemoval: !!payingClass.isRemoval,
               useWallet
             })
           });
           
           const verifyData = await verifyRes.json();
           if (!verifyRes.ok) {
              toast.error(verifyData.error || 'Payment verification failed');
           } else {
              // 5. Success! Sync Availability and update UI
              const { db } = await import('@/utils/firebase/client');
              const { syncStudentAvailability } = await import('@/utils/studentAvailability');
              await syncStudentAvailability(db, payingClass.studentDocIds || [payingClass.studentDocId]).catch(console.error);
              
              toast.success("Payment completed successfully!");
              setPayingClass(null);
              setUseWallet(false);
              mutate();
           }
        },
        prefill: {
           name: data?.userData?.name || '',
           email: data?.userData?.email || '',
           contact: data?.userData?.phone || ''
        },
        theme: {
           color: '#4F46E5'
        }
      };



      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
         toast.error(response.error.description || 'Payment Failed');
      });
      rzp.open();

    } catch (e: any) {
      toast.error(e.message || "Payment failed");
    } finally {
      setPaymentLoading(false);
    }
  };

  const lockedApplication = useMemo(() => {
    return data?.applications?.find((app: any) => {
      if (app.status === 'tuition_started' && !app.feePaid) {
        const appStart = app.startDate || Date.now();
        const daysElapsed = Math.max(1, Math.ceil((Date.now() - appStart) / (1000 * 60 * 60 * 24)));
        return daysElapsed >= TUITION_PAYMENT_LOCK_DAYS;
      }
      return false;
    });
  }, [data?.applications]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new_tuition', label: 'New Tuition', icon: Globe },
    { id: 'requests', label: 'Requests & Offers', icon: Handshake },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'my_teachers', label: 'My Teachers', icon: BookOpen },
    { id: 'referrals', label: 'Referrals', icon: Gift },
  ];

  if (loading && !data) {
    return <LoadingScreen />;
  }

  if (!data && swrError) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500 font-bold">Error loading dashboard: {swrError.message}</div>;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-gradient-to-r from-[#063831] to-[#04241f] text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Image
              src="/logo.png"
              alt="MiTutora"
              width={120}
              height={36}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>
          <span className="text-[#00a992] text-[9px] font-black uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
            Student
          </span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -mr-2 text-white hover:bg-white/10 rounded-lg">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <DashboardSidebar 
        role="student"
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setActiveRequestViewId={setActiveRequestViewId}
        hasProfile={hasProfile}
        isAccountLocked={Boolean(lockedApplication)}
        navItems={navItems}
        userName={data?.profile?.name || data?.user?.displayName || ''}
      />

      {/* Days 7-19 Grace Period Reminder Modal (Dismissible, allows navigation) */}
      {(() => {
        const graceApp = data?.applications?.find((app: any) => {
          if (app.status === 'tuition_started' && !app.feePaid && !app.cancellationRequested) {
            const appStart = app.startDate || Date.now();
            const daysElapsed = Math.max(1, Math.ceil((Date.now() - appStart) / (1000 * 60 * 60 * 24)));
            return daysElapsed >= TUITION_TRIAL_DAYS && daysElapsed < TUITION_PAYMENT_LOCK_DAYS;
          }
          return false;
        });

        if (!graceApp || hasDismissedGraceReminder) return null;

        const appStart = graceApp.startDate || Date.now();
        const daysElapsed = Math.max(1, Math.ceil((Date.now() - appStart) / (1000 * 60 * 60 * 24)));
        const monthlyFee = graceApp.finalPrice || graceApp.currentOffer || 0;
        const displayNames = graceApp.studentName || (graceApp.studentDocIds?.length > 1 ? 'Group' : 'Student');
        const teacherName = graceApp.tutorName || graceApp.teacher || 'your tutor';

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-2xl max-w-lg w-full text-center relative overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="absolute top-0 left-0 right-0 h-3 bg-amber-400"></div>
              <button 
                onClick={() => setHasDismissedGraceReminder(true)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors z-10"
                title="Dismiss reminder"
              >
                ✕
              </button>
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200/80 text-amber-600">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Monthly Tuition Fee Due</h2>
              <p className="text-slate-600 font-medium text-sm mb-6 leading-relaxed">
                Your 7-day free trial with <strong className="text-slate-900">{teacherName}</strong> has completed. You have an active grace period ({Math.max(1, TUITION_PAYMENT_LOCK_DAYS - daysElapsed)} {TUITION_PAYMENT_LOCK_DAYS - daysElapsed === 1 ? 'day' : 'days'} remaining) to pay your monthly fees and continue classes without interruption.
              </p>
              
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 text-left">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-bold">Total Monthly Fee</span>
                  <span className="text-lg font-black text-slate-900">₹{monthlyFee.toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">For {displayNames}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setHasDismissedGraceReminder(true)}
                  className="flex-1 py-3.5 px-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
                >
                  Remind Me Later
                </button>
                <button 
                  onClick={() => {
                    setHasDismissedGraceReminder(true);
                    setPayingClass({ 
                      id: graceApp.id, 
                      studentName: displayNames, 
                      finalPrice: monthlyFee, 
                      isProrated: false, 
                      isRemoval: false, 
                      studentsList: graceApp.studentsList || (graceApp.studentDetails ? [graceApp.studentDetails] : []), 
                      tutorName: teacherName 
                    });
                  }}
                  className="flex-1 bg-gradient-to-r from-[#00a992] to-teal-500 hover:from-[#009b86] hover:to-teal-600 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md shadow-emerald-500/25 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Pay Monthly Fees
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Early Cancellation Reminder Modal (Dismissible) */}
      {(() => {
        if (!pendingCancellationApp || hasDismissedCancellationReminder) return null;

        const monthlyFee = pendingCancellationApp.finalPrice || pendingCancellationApp.currentOffer || pendingCancellationApp.budget || 4000;
        const appStart = pendingCancellationApp.startDate || Date.now();
        const daysElapsed = Math.max(1, Math.ceil((Date.now() - appStart) / (1000 * 60 * 60 * 24)));
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const proratedFee = pendingCancellationApp.cancellationProratedFee || Math.max(1, Math.round((monthlyFee / daysInMonth) * daysElapsed));
        const teacherName = pendingCancellationApp.tutorName || pendingCancellationApp.teacher || 'your tutor';
        const displayNames = pendingCancellationApp.studentName || (pendingCancellationApp.studentDocIds?.length > 1 ? 'Group' : 'Student');

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-2xl max-w-lg w-full text-center relative overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="absolute top-0 left-0 right-0 h-3 bg-amber-500"></div>
              <button 
                onClick={() => setHasDismissedCancellationReminder(true)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors z-10"
                title="Dismiss reminder"
              >
                ✕
              </button>
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200/80 text-amber-600">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Complete Teacher Removal</h2>
              <p className="text-slate-600 font-medium text-sm mb-6 leading-relaxed">
                You initiated cancellation for <strong className="text-slate-900">{teacherName}</strong>. Please pay your prorated fee of <strong className="text-slate-900">₹{proratedFee.toLocaleString()}</strong> for the {daysElapsed} trial {daysElapsed === 1 ? 'day' : 'days'} attended to finalize removal.
              </p>
              
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 text-left">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-bold">Prorated Cancellation Fee</span>
                  <span className="text-lg font-black text-slate-900">₹{proratedFee.toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">Attended {daysElapsed} of 7 trial days for {displayNames}</p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setHasDismissedCancellationReminder(true);
                    setPayingClass({ 
                      id: pendingCancellationApp.id, 
                      studentName: displayNames, 
                      finalPrice: proratedFee, 
                      isProrated: true, 
                      isRemoval: true, 
                      studentsList: pendingCancellationApp.studentsList || (pendingCancellationApp.studentDetails ? [pendingCancellationApp.studentDetails] : []), 
                      tutorName: teacherName 
                    });
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md shadow-amber-600/25 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Pay Prorated Fee (₹{proratedFee.toLocaleString()})
                </button>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setHasDismissedCancellationReminder(true)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-xs"
                  >
                    Remind Me Later
                  </button>
                  <button
                    onClick={() => {
                      setHasDismissedCancellationReminder(true);
                      handleWithdrawCancellation(pendingCancellationApp.id);
                    }}
                    disabled={isWithdrawingCancellation === pendingCancellationApp.id}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors text-xs disabled:opacity-50"
                  >
                    {isWithdrawingCancellation === pendingCancellationApp.id ? 'Resuming...' : 'Keep Teacher & Resume'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MAIN CONTENT */}
      {(() => {
        if (lockedApplication) {
          const monthlyFee = lockedApplication.finalPrice || lockedApplication.currentOffer || 0;
          const displayNames = lockedApplication.studentName || (lockedApplication.studentDocIds?.length > 1 ? 'Group' : 'Student');
          const teacherName = lockedApplication.tutorName || lockedApplication.teacher || 'your tutor';
          
          return (
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-red-50/50 backdrop-blur-sm z-50">
              <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-lg w-full text-center shadow-2xl border border-red-100 relative overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="absolute top-0 left-0 right-0 h-2 bg-red-500"></div>
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Account Locked</h2>
                <p className="text-slate-600 font-medium mb-8 text-lg leading-relaxed">
                  Your payment grace period has expired (Day 20). Please clear your pending tuition fees to unlock your dashboard and continue using MiTutora.
                </p>
                <button 
                  onClick={() => {
                    setPayingClass({ 
                      id: lockedApplication.id, 
                      studentName: displayNames, 
                      finalPrice: monthlyFee, 
                      isProrated: false, 
                      isRemoval: false, 
                      studentDocIds: lockedApplication.studentDocIds || (lockedApplication.studentDocId ? [lockedApplication.studentDocId] : []),
                      studentDocId: lockedApplication.studentDocId,
                      studentsList: lockedApplication.studentsList || (lockedApplication.studentDetails ? [lockedApplication.studentDetails] : []), 
                      tutorName: teacherName 
                    });
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-red-600/20 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <CheckCircle2 className="w-6 h-6" /> Pay Monthly Fees Securely
                </button>
              </div>
            </div>
          );
        }
        return null;
      })() ?? (
        <>
          {showCategoryPopup && !hasProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-5 md:p-10 shadow-2xl max-w-lg w-full text-center">
            <h2 className="text-3xl font-black text-slate-900 mb-4">What are you looking for?</h2>
            <p className="text-slate-500 mb-8">Select a category to discover the best matches for your needs.</p>
            <div className="space-y-4">
              <button onClick={() => handleCategorySelect('school')} className="w-full py-4 px-6 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-lg transition-colors border border-emerald-200">School / Academics</button>
              <button onClick={() => handleCategorySelect('programming')} className="w-full py-4 px-6 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-lg transition-colors border border-purple-200">Programming / IT</button>
              <button onClick={() => handleCategorySelect('languages')} className="w-full py-4 px-6 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-lg transition-colors border border-blue-200">Languages</button>
            </div>
          </div>
        </div>
      )}
      {/* Profile Completion Reminder Modal */}
      {showProfileReminder && !hasProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-5 md:p-10 shadow-2xl max-w-md w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-32 bg-[#00a992] -z-10"></div>
            <button 
              onClick={() => { setShowProfileReminder(false); setHasDismissedReminder(true); }}
              className="absolute top-4 right-4 text-white hover:text-gray-200 bg-black/10 hover:bg-black/20 p-2 rounded-full transition-colors z-10"
            >
              ✕
            </button>
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg mt-4 ring-4 ring-[#00a992]/20">
              <User className="w-10 h-10 text-[#00a992]" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3">Complete Your Profile</h2>
            <p className="text-gray-500 mb-8 font-medium">To unlock the ability to send requests and fully explore our platform, please complete your profile settings first.</p>
            <button 
              onClick={() => {
                setShowProfileReminder(false);
                setHasDismissedReminder(true);
                setActiveTab('profile');
              }}
              className="w-full bg-[#00a992] text-white hover:bg-[#008f7b] font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              Go to Profile Settings
            </button>
          </div>
        </div>
      )}
      <main ref={mainContentRef} className="flex-1 overflow-x-hidden overflow-y-auto flex flex-col relative">
        {/* TOP NAVIGATION BAR */}
        <DashboardHeader 
          role="student"
          data={data}
          allStudents={allStudents}
          setActiveTab={setActiveTab}
          setActiveRequestViewId={setActiveRequestViewId}
          handleLogout={handleLogout}
          handleDismissNotification={handleDismissNotification}
          notificationsRef={notificationsRef}
          profileRef={profileRef}
          isNotificationsDropdownOpen={isNotificationsDropdownOpen}
          setIsNotificationsDropdownOpen={setIsNotificationsDropdownOpen}
          isProfileDropdownOpen={isProfileDropdownOpen}
          setIsProfileDropdownOpen={setIsProfileDropdownOpen}
        />

        <ActionModal {...modalConfig} onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} />
        <MessageModal {...messageModalConfig} onClose={() => setMessageModalConfig(prev => ({ ...prev, isOpen: false }))} />
        
        <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-3.5 sm:px-4 md:px-8 lg:px-12 2xl:px-16 pt-4 pb-10 md:pt-6 lg:pt-8 w-full flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (() => {
              const profileCompleteness = (() => {
                if (!hasProfile) return 10;
                const fields = [
                  activeStudent?.name,
                  activeStudent?.gender,
                  activeStudent?.phoneNumber || activeStudent?.whatsappNumber,
                  data?.profile?.name,
                  activeStudent?.preferredMode === 'Online' ? true : activeStudent?.address,
                  activeStudent?.classLevel || activeStudent?.technologies?.length > 0 || activeStudent?.languages?.length > 0 ? true : false,
                  activeStudent?.category === 'programming' || activeStudent?.category === 'languages' ? true : activeStudent?.board,
                  activeStudent?.category,
                  activeStudent?.budget,
                  activeStudent?.category === 'programming' || activeStudent?.category === 'languages' ? true : (activeStudent?.subjects?.length > 0 ? true : false),
                  activeStudent?.learningGoal
                ];
                const filled = fields.filter(f => f && String(f).trim() !== '' && f !== false).length;
                return Math.max(10, Math.round((filled / fields.length) * 100));
              })();
              
              const myActiveTeachers = data?.upcomingClasses || [];

              return (
                <div className="flex flex-col gap-8 h-full pb-10">
                  {pendingCancellationApp && (() => {
                    const monthlyFee = pendingCancellationApp.finalPrice || pendingCancellationApp.currentOffer || pendingCancellationApp.budget || 4000;
                    const appStart = pendingCancellationApp.startDate || Date.now();
                    const daysElapsed = Math.max(1, Math.ceil((Date.now() - appStart) / (1000 * 60 * 60 * 24)));
                    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
                    const proratedFee = pendingCancellationApp.cancellationProratedFee || Math.max(1, Math.round((monthlyFee / daysInMonth) * daysElapsed));
                    const teacherName = pendingCancellationApp.tutorName || pendingCancellationApp.teacher || 'your tutor';
                    const displayNames = pendingCancellationApp.studentName || (pendingCancellationApp.studentDocIds?.length > 1 ? 'Group' : 'Student');

                    return (
                      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-amber-900 text-sm">Action Required: Prorated Cancellation Fee Due</h3>
                            <p className="text-amber-800 text-xs font-medium mt-0.5">
                              You requested to remove <strong className="text-slate-900">{teacherName}</strong>. Please pay ₹{proratedFee.toLocaleString()} ({daysElapsed} trial {daysElapsed === 1 ? 'day' : 'days'} attended) to complete teacher removal.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => handleWithdrawCancellation(pendingCancellationApp.id)}
                            disabled={isWithdrawingCancellation === pendingCancellationApp.id}
                            className="flex-1 sm:flex-initial bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap disabled:opacity-50"
                          >
                            {isWithdrawingCancellation === pendingCancellationApp.id ? 'Resuming...' : 'Keep Teacher'}
                          </button>
                          <button
                            onClick={() => setPayingClass({
                              id: pendingCancellationApp.id,
                              studentName: displayNames,
                              finalPrice: proratedFee,
                              isProrated: true,
                              isRemoval: true,
                              studentsList: pendingCancellationApp.studentsList || (pendingCancellationApp.studentDetails ? [pendingCancellationApp.studentDetails] : []),
                              tutorName: teacherName
                            })}
                            className="flex-1 sm:flex-initial bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
                          >
                            Pay ₹{proratedFee.toLocaleString()} Now
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                  {hasPendingDues && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-red-900 text-sm">Action Required: Pending Dues</h3>
                          <p className="text-red-700 text-xs font-medium mt-0.5">You have pending monthly fees. Please clear your dues in "My Teachers" to unlock booking features.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('my_teachers')}
                        className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
                      >
                        Go to My Teachers
                      </button>
                    </div>
                  )}
                  {/* Hero Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-center">
                      <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight flex items-center gap-3 mb-2">
                        Hello {(data?.profile?.name || data?.userData?.name || data?.user?.displayName || 'Parent').trim().split(' ')[0]}!
                      </h1>
                      <p className="text-slate-500 text-lg md:text-xl leading-relaxed">Nice to have you back, what an exciting day! Get ready to continue your learning journey.</p>
                    </div>

                    <div className="lg:col-span-6 xl:col-span-5 flex flex-col sm:flex-row gap-4 justify-end">
                      <div className="w-full flex-1 sm:max-w-sm bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Activity className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-gray-900 tracking-tight">Request Activity</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm tracking-tight mb-2">Requests today: {requestsUsedToday} / {requestsLimit}</p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 bg-emerald-50 rounded-full overflow-hidden">
                              <div className="h-full bg-[#00a992] rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min((requestsUsedToday / requestsLimit) * 100, 100)}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-gray-900">{requestsRemaining} left</span>
                          </div>
                          {groupQueueStatuses.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-100">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Group Queue</p>
                              <div className="space-y-1.5">
                                {groupQueueStatuses.slice(0, 2).map((group: any) => (
                                  <div key={group.id} className="flex items-center justify-between gap-3 text-xs font-bold">
                                    <span className="text-slate-600 truncate">{group.name}</span>
                                    <span className={group.activeCount >= 5 ? 'text-red-500' : 'text-emerald-600'}>{group.activeCount}/5</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Profile Completeness Card */}
                      <ProfileCompletenessCard 
                        completeness={profileCompleteness}
                        onClick={() => setActiveTab('profile')}
                      />
                    </div>
                  </div>

                  {/* Split Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column */}
                    <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-8">
                      {/* My Teachers */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-end px-2">
                          <h2 className="text-xl font-bold text-gray-900 tracking-tight">My Teachers</h2>
                          <button onClick={() => setActiveTab('my_teachers')} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">View All</button>
                        </div>
                        
                        {myActiveTeachers.length === 0 ? (
                          <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-10 flex flex-col items-center justify-center text-center shadow-sm min-h-[250px]">
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-emerald-100/50">
                              <BookOpen className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">No teachers chosen yet</h3>
                            <p className="text-slate-500 max-w-sm mb-6 font-medium text-sm">Explore our catalog of verified tutors and find the perfect match to start your learning journey.</p>
                            <button 
                              onClick={() => setActiveTab('new_tuition')}
                              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 px-6 py-2.5 rounded-full font-bold transition-all text-sm"
                            >
                              Explore Teachers
                            </button>
                          </div>
                        ) : (
                          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                            {myActiveTeachers.slice(0, 3).map((cls: any, idx: number) => (
                              <div key={cls.id}>
                                <div className="flex items-center justify-between group py-2">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                                      <BookOpen className="w-6 h-6" />
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-gray-900 text-base">{cls.teacher}</h4>
                                      <p className="text-sm text-slate-500">{cls.subject}</p>
                                    </div>
                                  </div>
                                  <button onClick={() => { 
                                    const fullTutor = cls.tutorDetails || data?.allTutors?.find((t: any) => t.id === cls.app?.tutorDocId);
                                    if(fullTutor) { setSelectedViewUser(fullTutor); setSelectedViewApp(cls.app); } else setActiveTab('my_teachers'); 
                                  }} className="text-emerald-700 font-bold text-sm bg-emerald-50/50 border border-emerald-100 px-6 py-2 rounded-full hover:bg-emerald-100 transition-colors">
                                    View
                                  </button>
                                </div>
                                {idx < Math.min(myActiveTeachers.length, 3) - 1 && <div className="h-px bg-gray-50 my-2"></div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>



                      {/* Motivation Banner */}
                      <StudentMotivationBanner 
                        studentName={activeStudent?.name?.split(' ')[0] || data?.user?.displayName?.split(' ')[0] || 'Student'}
                        onClick={() => setActiveTab('my_teachers')}
                      />
                    </div>

                    {/* Right Column: Recommended Teachers */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                      <div className="flex justify-between items-end px-2">
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Recommended Teachers</h2>
                        <button onClick={() => { setActiveTab('new_tuition'); setTuitionSubTab(hasProfile ? 'recommendation' : 'all'); }} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">View All</button>
                      </div>
                      
                      {studentGroups.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 px-2">
                          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Finding tutors for:</label>
                          <select 
                            className="w-32 sm:w-48 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-[#00a992] focus:outline-none focus:ring-1 focus:ring-[#00a992] truncate transition-colors hover:bg-slate-100 cursor-pointer"
                            value={activeGroupId || activeGroup?.id || ''}
                            onChange={(e) => setActiveGroupId(e.target.value)}
                          >
                            {studentGroups.map((g:any) => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                        {computedRecommendedTutors.length === 0 ? (
                          <div className="text-center py-10">
                            <p className="text-slate-500 text-sm font-medium">No recommendations yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {computedRecommendedTutors.filter((tutor: any) => {
                               const matchGroup = (app: any) => {
                                 return app.groupDocId === activeGroup?.id || app.studentDocId === activeGroup?.id;
                               };
                               const isLocked = !!data?.applications?.find((app: any) => app.tutorDocId === tutor.id && matchGroup(app) && (app.status === 'locked' || (app.status === 'declined' && app.declinedAt && (Date.now() - app.declinedAt < 7 * 24 * 60 * 60 * 1000))));
                               return !isLocked;
                            }).slice(0, 4).map((tutor: any, index: number) => {
                              const matchGroup = (app: any) => {
                                 return app.groupDocId === activeGroup?.id || app.studentDocId === activeGroup?.id;
                               };
                              const activeAppForGroup = data?.applications?.find((app: any) => matchGroup(app) && ['negotiating', 'pending', 'reviewing', 'offer_sent', 'demo_requested_by_student', 'demo_requested_by_teacher', 'demo_pending_payment', 'demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision', 'demo_booked', 'accepted', 'tuition_started'].includes(app.status));
                              const hiredAppForGroup = data?.applications?.find((app: any) => matchGroup(app) && app.status === 'tuition_started');
                              const offerApp = activeAppForGroup?.tutorDocId === tutor.id ? activeAppForGroup : undefined;
                              
                              const isLocked = !!activeAppForGroup || !!hiredAppForGroup; 
                              const isRed = (isLocked && !offerApp); 
                              const isDemoPhase = offerApp && ['demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision'].includes(offerApp.status);
                              
                              let labelText = '';
                              if (hiredAppForGroup) labelText = 'Teacher Assigned';
                              else if (offerApp) labelText = isDemoPhase ? 'Demo Phase' : (['tutor', 'teacher'].includes(offerApp.lastUpdatedBy) ? 'Offer Received' : 'Offer Sent');
                              else if (activeAppForGroup) labelText = 'Busy with Another Demo';
                              
                              return (
                                <div key={tutor.id} className="flex items-center gap-4 relative group">
                                  {isLocked && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-end pr-4 rounded-xl pointer-events-none">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${isRed ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                            {labelText}
                                        </span>
                                    </div>
                                  )}
                                  <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center font-bold text-orange-500 text-xs flex-shrink-0">
                                    #{index + 1}
                                  </div>
                                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center font-bold text-emerald-600 text-sm flex-shrink-0">
                                    {tutor.name?.charAt(0) || 'T'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 text-sm truncate tracking-tight">{tutor.name || 'Tutor'}</h4>
                                    <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">{tutor.subjects ? tutor.subjects.join(', ') : tutor.category}</p>
                                  </div>
                                  <button onClick={() => setSelectedViewUser(tutor)} className="text-emerald-700 font-bold text-xs bg-emerald-50/50 border border-emerald-100 px-4 py-2 rounded-full hover:bg-emerald-100 z-0 flex-shrink-0 transition-colors">
                                    View
                                  </button>
                                </div>
                              );
                            })}
                            <div className="pt-4 mt-2 border-t border-gray-50 flex justify-between items-center">
                              <span className="text-xs text-slate-500 font-medium">Find more great tutors</span>
                              <button onClick={() => { setActiveTab('new_tuition'); setTuitionSubTab(hasProfile ? 'recommendation' : 'all'); }} className="text-slate-400 hover:text-emerald-600 transition-colors">
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB: NEW TUITION */}
            {activeTab === 'new_tuition' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight">
                      {hasProfile ? 'Recommended Tutors' : 'All Tutors'}
                    </h2>
                    <p className="text-slate-500 mt-1 mb-4">Find great tutors who are ready to teach you.</p>
                    {studentGroups.length > 0 && (
                      <div className="mt-2 flex items-center gap-3">
                        <label className="text-sm font-bold text-gray-600">Finding tutors for:</label>
                        <select 
                          className="w-48 sm:w-64 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold text-[#00a992] focus:outline-none focus:ring-2 focus:ring-[#00a992]/50 truncate"
                          value={activeGroupId || activeGroup?.id || ''}
                          onChange={(e) => setActiveGroupId(e.target.value)}
                        >
                          {studentGroups.map((g:any) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {isSwitchingTab ? (
                  <div className="flex flex-col items-center justify-center py-32 animate-in fade-in duration-300">
                    <Loader2 className="w-12 h-12 text-[#00a992] animate-spin mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">Finding the perfect match...</h3>
                    <p className="text-sm text-gray-500 mt-1">Loading {tuitionSubTab === 'all' ? 'all' : 'recommended'} tutors for you.</p>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-500">
                {tuitionSubTab === 'recommendation' ? (
                  <div className="mb-8 bg-emerald-50 rounded-2xl p-3 sm:p-4 flex items-center justify-between relative overflow-hidden border border-emerald-100 shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-4 z-10">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#00a992] shadow-sm flex-shrink-0">
                         <Lightbulb className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">Smart Recommendations</h4>
                        <p className="text-xs text-gray-600 mt-0.5">These tutors match your learning preferences and subject requirements.</p>
                      </div>
                    </div>
                    <div className="hidden sm:block z-10 mr-6">
                       <Image src="/book.png" alt="Books" width={256} height={256} className="h-20 w-auto object-contain hover:scale-105 transition-transform duration-500 drop-shadow-md" />
                    </div>
                    <div className="absolute right-0 top-0 w-64 h-64 bg-[#00a992] rounded-full blur-3xl opacity-10 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                  </div>
                ) : (
                  <div className="mb-8 bg-blue-50 rounded-2xl p-3 sm:p-4 flex items-center justify-between relative overflow-hidden border border-blue-100 shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-4 z-10">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
                         <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">Explore All Tutors</h4>
                        <p className="text-xs text-gray-600 mt-0.5">Browse through our complete list of qualified tutors.</p>
                      </div>
                    </div>
                    <div className="hidden sm:block z-10 mr-6">
                       <Image src="/book.png" alt="Books" width={256} height={256} className="h-20 w-auto object-contain hover:scale-105 transition-transform duration-500 drop-shadow-md" />
                    </div>
                    <div className="absolute right-0 top-0 w-64 h-64 bg-blue-400 rounded-full blur-3xl opacity-10 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                  </div>
                )}

                {(() => {
                  const allFilteredTutors = (tuitionSubTab === 'all' ? allTutorsWithScores : computedRecommendedTutors)?.filter((t: any) => !selectedCategory || (t.category && t.category.includes(selectedCategory))) || [];
                  const displayedTutors = allFilteredTutors.slice(0, visibleTutorsCount);

                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                        {displayedTutors.map((teacher: any) => {
                      const matchGroup = (app: any) => {
                        return app.groupDocId === activeGroup?.id || app.studentDocId === activeGroup?.id;
                      };
                      const lockedApp = data?.applications?.find((app: any) => app.tutorDocId === teacher.id && matchGroup(app) && (app.status === 'locked' || (app.status === 'declined' && app.declinedAt && (Date.now() - app.declinedAt < 7 * 24 * 60 * 60 * 1000))));
                      const activeAppForGroup = data?.applications?.find((app: any) => matchGroup(app) && ['negotiating', 'pending', 'reviewing', 'offer_sent', 'demo_requested_by_student', 'demo_requested_by_teacher', 'demo_pending_payment', 'demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision', 'demo_booked', 'accepted', 'tuition_started'].includes(app.status));
                      const hiredAppForGroup = data?.applications?.find((app: any) => matchGroup(app) && app.status === 'tuition_started');
                      const offerApp = activeAppForGroup?.tutorDocId === teacher.id ? activeAppForGroup : undefined;
                      
                      const isPending = offerApp && ['demo_requested_by_student', 'demo_requested_by_teacher', 'demo_pending_payment', 'demo_booked', 'pending', 'accepted'].includes(offerApp.status);
                      const isHired = offerApp && ['tuition_started'].includes(offerApp.status);
                      
                      const isLocked = !!lockedApp || (!!hiredAppForGroup && !isHired);
                      const isRed = !!lockedApp || (!!activeAppForGroup && !offerApp);
                      const isDemoPhase = offerApp && ['demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision'].includes(offerApp.status);
                      
                      let labelText = '';
                      if (lockedApp) labelText = lockedApp.declinedAt ? `LOCKED (${Math.max(1, Math.ceil((lockedApp.declinedAt + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)))} DAYS)` : 'LOCKED';
                      else if (hiredAppForGroup) labelText = 'Teacher Assigned';
                      else if (offerApp) labelText = isDemoPhase ? 'Demo Phase' : (['tutor', 'teacher'].includes(offerApp.lastUpdatedBy) ? 'Offer Received' : 'Offer Sent');
                      else if (activeAppForGroup) labelText = 'Busy with Another Demo';
                      
                      let subText = '';
                      if (lockedApp) subText = lockedApp.declinedAt ? `Available in ${Math.ceil((lockedApp.declinedAt + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000))} days` : 'Currently unavailable';
                      else if (hiredAppForGroup) subText = 'This group already has a teacher';
                      else if (offerApp) subText = isDemoPhase ? 'Demo in progress...' : (['tutor', 'teacher'].includes(offerApp.lastUpdatedBy) ? 'Waiting to analyze...' : 'Waiting for response...');
                      else if (activeAppForGroup) subText = 'Active demo with another tutor';
                      
                      const isStrictlyOffline = (teacher.mode || '').toLowerCase().trim() === 'offline';
                      const mapsUrl = (() => {
                        if (!isStrictlyOffline) return null;
                        const lat = teacher.latitude;
                        const lng = teacher.longitude;
                        if (lat && lng && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                          return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                        }
                        const addressText = [teacher.area, teacher.city].filter(Boolean).join(', ');
                        if (addressText) {
                          return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;
                        }
                        return null;
                      })();

                      return (
                        <div key={teacher.id} className="bg-white rounded-3xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 flex flex-col h-full relative overflow-hidden group">
                          {/* Header */}
                          <div className="bg-[#00a992] p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                              {teacher.rank && (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md flex-shrink-0 ${teacher.rank === 1 ? 'bg-yellow-400 text-yellow-900' : teacher.rank === 2 ? 'bg-gray-200 text-gray-800' : teacher.rank === 3 ? 'bg-orange-500 text-white' : 'bg-white/20 text-white backdrop-blur-sm'}`}>
                                  #{teacher.rank}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 truncate">
                                <h3 className="text-lg font-bold text-white tracking-tight truncate">{teacher.name}</h3>
                                {teacher.aadharVerified && (
                                  <ShieldCheck className="w-5 h-5 text-white/90 drop-shadow-sm flex-shrink-0" />
                                )}
                              </div>
                            </div>
                            {labelText ? (
                              <span className={`px-3 py-1 text-[10px] font-black rounded-full border shadow-sm uppercase tracking-wider whitespace-nowrap flex-shrink-0 ${isRed ? 'bg-white/95 text-red-600 border-red-100' : 'bg-white/95 text-teal-700 border-teal-100'}`}>
                                {labelText}
                              </span>
                            ) : (
                              <span className="px-3 py-1 border border-white/40 text-white text-[10px] font-bold rounded-full uppercase tracking-wider flex-shrink-0">
                                {teacher.mode || 'Online'}
                              </span>
                            )}
                          </div>
                          
                          <div className="p-5 flex flex-col flex-grow">
                            {/* Group Name (Teacher) */}
                            <div className="flex items-center gap-2 mb-4 text-gray-900">
                              <User className="w-5 h-5 text-[#00a992]" />
                              <h4 className="font-bold text-base">Tutor Profile</h4>
                            </div>

                            {/* Details Box */}
                            <div className="bg-emerald-50/50 rounded-2xl p-4 space-y-3 mb-6 flex-grow">
                              {teacher.category === 'programming' && (teacher.technologies?.length ?? 0) > 0 && (
                                <div className="flex items-center gap-2 text-sm">
                                  <BookOpen className="w-4 h-4 text-[#00a992]" />
                                  <span className="text-slate-600 font-bold">Tech:</span>
                                  <span className="text-slate-500 truncate">{teacher.technologies.join(', ')}</span>
                                </div>
                              )}
                              {teacher.category === 'languages' && (teacher.languagesTaught?.length ?? 0) > 0 && (
                                <div className="flex items-center gap-2 text-sm">
                                  <BookOpen className="w-4 h-4 text-[#00a992]" />
                                  <span className="text-slate-600 font-bold">Lang:</span>
                                  <span className="text-slate-500 truncate">{teacher.languagesTaught.join(', ')}</span>
                                </div>
                              )}
                              {(!teacher.category || teacher.category === 'school') && (teacher.subjects?.length ?? 0) > 0 && (
                                <div className="flex items-center gap-2 text-sm">
                                  <BookOpen className="w-4 h-4 text-[#00a992]" />
                                  <span className="text-slate-600 font-bold">Sub:</span>
                                  <span className="text-slate-500 truncate">{teacher.subjects.join(', ')}</span>
                                </div>
                              )}
                              {teacher.rating ? (
                                <div className="flex items-center gap-2 text-sm">
                                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                  <span className="text-slate-600 font-bold">Rating:</span>
                                  <span className="text-amber-600 font-bold">{teacher.rating.toFixed(1)}</span>
                                  <span className="text-slate-400 text-xs">({teacher.reviewCount || 0} reviews)</span>
                                </div>
                              ) : null}
                              {teacher.experience && (
                                <div className="flex items-center gap-2 text-sm">
                                  <LayoutDashboard className="w-4 h-4 text-[#00a992]" />
                                  <span className="text-slate-600 font-bold">Exp:</span>
                                  <span className="text-slate-500">{teacher.experience}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm">
                                <Wallet className="w-4 h-4 text-[#00a992]" />
                                <span className="text-slate-600 font-bold">Fee:</span>
                                <span className="text-[#00a992] font-bold">{teacher.feeRange || 'Negotiable'}</span>
                              </div>
                              {(teacher.mode || '').toLowerCase().trim() !== 'online' && (
                                <>
                                  {(teacher.preferredLocations || teacher.locations) && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <MapPin className="w-4 h-4 text-[#00a992] flex-shrink-0" />
                                      <span className="text-slate-600 font-bold">Locations:</span>
                                      <span className="text-slate-500 truncate" title={teacher.preferredLocations || teacher.locations}>{teacher.preferredLocations || teacher.locations}</span>
                                    </div>
                                  )}
                                  {(teacher.travelDistance || teacher.travelKm) && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Navigation className="w-4 h-4 text-[#00a992] flex-shrink-0" />
                                      <span className="text-slate-600 font-bold">Travel:</span>
                                      <span className="text-slate-500">Within {String(teacher.travelDistance || teacher.travelKm).replace(/[^0-9.]/g, '')} km</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          
                            {/* Actions Area */}
                            <div className="mt-auto">
                              {!hasProfile ? (
                                <button 
                                  onClick={() => setActiveTab('profile')}
                                  className="w-full bg-[#00a992] text-white font-bold py-3.5 rounded-full transition-all shadow-md hover:bg-[#00927d] flex items-center justify-center gap-2 text-sm"
                                >
                                  <User className="w-4 h-4" /> View Teacher
                                </button>
                              ) : (
                                <>
                                  <div className="mb-4">
                                    <p className="text-[10px] text-gray-500 leading-tight mb-3">Type a value below to negotiate, or leave empty to request a demo at the original price.</p>
                                    <input 
                                      type="number"
                                      disabled={isLocked}
                                      min={getTutorBasePrice(teacher) ? Math.ceil(getTutorBasePrice(teacher) * 0.6) : 0}
                                      max={getTutorBasePrice(teacher) || undefined}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-full text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                      placeholder={getTutorBasePrice(teacher) ? `e.g. ${getTutorBasePrice(teacher)}` : "Your Offer (₹/mo)"}
                                      value={negotiationOffer[teacher.id] || ''}
                                      onChange={(e) => setNegotiationOffer({...negotiationOffer, [teacher.id]: e.target.value})}
                                    />
                                    {getTutorBasePrice(teacher) > 0 && negotiationOffer[teacher.id] && parseInt(negotiationOffer[teacher.id]) >= getTutorBasePrice(teacher) * 0.6 && parseInt(negotiationOffer[teacher.id]) <= getTutorBasePrice(teacher) * 0.7 && (
                                        <p className="text-xs text-yellow-600 font-medium mt-1">Note: Your offer is quite low. The teacher is highly likely to reject it.</p>
                                    )}
                                  </div>
                                  
                                  {isHired ? (
                                    <button disabled className="w-full bg-emerald-50 text-emerald-700 font-bold py-3.5 rounded-full shadow-none text-sm flex items-center justify-center gap-2 cursor-not-allowed border border-emerald-200">
                                      <CheckCircle2 className="w-4 h-4" /> Already Hired
                                    </button>
                                  ) : (
                                    <>
                                      {isStrictlyOffline && mapsUrl && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(mapsUrl, '_blank', 'noopener,noreferrer');
                                          }}
                                          className="w-full mb-3 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-sm"
                                        >
                                          <MapPin className="w-3.5 h-3.5 text-[#00a992]" />
                                          <span>View on Google Maps</span>
                                          <ExternalLink className="w-3 h-3 text-emerald-600 opacity-80" />
                                        </button>
                                      )}
                                       <div className="flex gap-2">
                                        <button 
                                          onClick={() => setSelectedViewUser(teacher)}
                                          className="flex-1 py-2 sm:py-2.5 text-[#00a992] font-bold text-xs sm:text-sm bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-all active:scale-95 truncate px-2 sm:px-4"
                                        >
                                          View
                                        </button>
                                        {negotiationOffer[teacher.id] ? (
                                          <button
                                            disabled={requestLoading || !!offerApp || (dailyRequestsCount >= 5) || hasPendingDues || isLocked}
                                            onClick={() => { 
                                              if (hasPendingDues) { toast.error("Please clear your pending dues first."); return; }
                                              if (!!offerApp) {
                                                toast.error("You already have an active request or offer with this teacher.");
                                                return;
                                              }
                                              handleRequestTutor(teacher);
                                            }}
                                            className={`flex-[2] py-2 sm:py-2.5 font-bold text-xs sm:text-sm rounded-full flex items-center justify-center gap-1.5 sm:gap-2 transition-all px-2 sm:px-4 truncate ${!!offerApp || hasPendingDues || isLocked ? 'bg-gray-200 text-gray-500 shadow-none cursor-not-allowed' : (dailyRequestsCount >= 5 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#00a992] text-white hover:bg-[#00927d] active:scale-95')}`}
                                          >
                                            <span className="truncate">{isLocked ? (hiredAppForGroup ? 'Teacher Assigned' : 'Locked') : (hasPendingDues ? 'Clear Dues First' : (dailyRequestsCount >= 5 ? 'Daily Limit' : 'Make Offer'))}</span> <ArrowRight className="w-4 h-4 shrink-0" />
                                          </button>
                                        ) : (
                                          <button
                                            disabled={(requestLoading && !offerApp) || hasPendingDues || isLocked}
                                            onClick={() => { 
                                              if (hasPendingDues) { toast.error("Please clear your pending dues first."); return; }
                                              if (!!offerApp) {
                                                toast.error("You already have an active request or offer with this teacher.");
                                                return;
                                              }
                                              handleDirectRequestDemo(teacher); 
                                            }}
                                            className={`flex-[2] py-2 sm:py-2.5 font-bold text-xs sm:text-sm rounded-full flex items-center justify-center gap-1.5 sm:gap-2 transition-all px-2 sm:px-4 truncate ${!!offerApp || hasPendingDues || isLocked ? 'bg-gray-200 text-gray-500 shadow-none cursor-not-allowed' : (dailyRequestsCount >= 5 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#00a992] text-white hover:bg-[#00927d] active:scale-95')}`}
                                          >
                                            <span className="truncate">{isLocked ? (hiredAppForGroup ? 'Teacher Assigned' : 'Locked') : (hasPendingDues ? 'Clear Dues First' : (dailyRequestsCount >= 5 ? 'Daily Limit' : 'Request Demo'))}</span> <ArrowRight className="w-4 h-4 shrink-0" />
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {allFilteredTutors.length === 0 && (
                      <div className="col-span-full p-10 bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center">
                        <Users className="w-12 h-12 text-gray-300 mb-3" />
                        <h3 className="text-lg font-bold text-gray-900">No tutors found</h3>
                        <p className="text-gray-500 max-w-sm mt-2">We couldn't find tutors matching your exact requirements right now.</p>
                      </div>
                    )}
                  </div>

                  {/* 20-Card Lazy Loading / Load More Controls */}
                  {allFilteredTutors.length > visibleTutorsCount && (
                    <div className="flex flex-col items-center justify-center pt-8 pb-4">
                      <button
                        onClick={async () => {
                          setIsLoadingMoreTutors(true);
                          try {
                            const nextPage = Math.floor(visibleTutorsCount / 20) + 1;
                            const getTutorsFn = httpsCallable(functions, 'getRankedTutors');
                            await getTutorsFn({
                              tab: tuitionSubTab,
                              page: nextPage,
                              limit: 20,
                              category: selectedCategory,
                              activeGroupId: activeGroup?.id,
                              scoringContext
                            }).catch(console.error);
                          } catch (err) {
                            console.error('Error fetching ranked tutors:', err);
                          } finally {
                            setVisibleTutorsCount((prev) => prev + 20);
                            setIsLoadingMoreTutors(false);
                          }
                        }}
                        disabled={isLoadingMoreTutors}
                        className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-75 cursor-pointer"
                      >
                        {isLoadingMoreTutors ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Loading Next 20 Tutors...</span>
                          </>
                        ) : (
                          <>
                            <span>Load More Tutors ({allFilteredTutors.length - visibleTutorsCount} remaining)</span>
                            <ChevronDown className="w-5 h-5" />
                          </>
                        )}
                      </button>
                      <p className="text-xs text-gray-500 mt-2 font-medium">
                        Showing {Math.min(visibleTutorsCount, allFilteredTutors.length)} of {allFilteredTutors.length} ranked tutors
                      </p>
                    </div>
                  )}
                  {allFilteredTutors.length > 20 && visibleTutorsCount >= allFilteredTutors.length && (
                    <div className="text-center py-6 text-sm text-gray-500 font-medium flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>You've viewed all {allFilteredTutors.length} matching tutors.</span>
                    </div>
                  )}
                </>
              );
            })()}
                  </div>
                )}
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">All Notifications</h2>
                  {((data?.allNotifications)?.length ?? 0) > 0 && (
                    <button onClick={handleClearAllNotifications} className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold rounded-xl text-sm transition-colors self-start sm:self-auto">
                      Clear All
                    </button>
                  )}
                </div>
                {((data?.allNotifications)?.length ?? 0) > 0 ? (
                  <div className="space-y-4">
                    {data?.allNotifications?.map((neg: any) => {
                      const studentForApp = allStudents.find((s:any) => s.id === neg.studentDocId) || { name: neg.studentName || 'Student' };
                      return (
                        <div key={neg.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
                          <div className="flex-1 cursor-pointer" onClick={() => { setActiveRequestViewId(neg.id); setActiveTab('requests'); }}>
                            <p className="text-gray-900 font-medium">
                              {neg.status === 'declined' ? (
                                <span>Request declined for <span className="font-bold">{studentForApp.name}</span> with tutor <span className="font-bold">{neg.tutorName}</span></span>
                              ) : neg.status === 'tuition_started' ? (
                                <span>Fees paid for <span className="font-bold">{studentForApp.name}</span> with tutor <span className="font-bold">{neg.tutorName}</span></span>
                              ) : (
                                <span>New update on request with <span className="font-bold">{neg.tutorName}</span> for <span className="font-bold">{studentForApp.name}</span></span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(neg.updatedAt || neg.createdAt || Date.now()).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={(e) => handleDismissNotification(neg.id, e)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors" title="Dismiss">
                              <X className="w-5 h-5" />
                            </button>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-10 bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center">
                    <Bell className="w-12 h-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-bold text-gray-900">No notifications</h3>
                    <p className="text-gray-500 mt-2">You don't have any notifications right now.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: MANAGE GROUPS */}
            {activeTab === 'manage_groups' && (
              <div className="space-y-8 animate-in fade-in duration-300 h-full">
                <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/40 border border-slate-100 min-h-[600px] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full blur-3xl opacity-60 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
                  
                  <div className="mb-8 flex items-center gap-4 relative z-10">
                    <button 
                      onClick={() => setActiveTab('profile')}
                      className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95 shadow-sm"
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Manage Groups</h2>
                      <p className="text-slate-500 font-medium mt-1">Organize your students into logical groups</p>
                    </div>
                  </div>
                  
                  <GroupManager 
                    students={allStudents}
                    title=""
                    subtitle="Drag and drop students to change their group assignments. Click save when you are done."
                    onSave={(groupedStudents) => {
                        const modifiedGroupIds = new Set<string>();
                        for (const student of groupedStudents) {
                          const oldStudent = allStudents.find((s:any) => s.id === student.id);
                          if (oldStudent?.groupDocId !== student.groupDocId) {
                            if (student.groupDocId) modifiedGroupIds.add(student.groupDocId);
                          }
                        }

                        if (modifiedGroupIds.size > 0) {
                          setPendingGroupSaveData(groupedStudents);
                          setModifiedGroupQueue(Array.from(modifiedGroupIds));
                          setShowPreferencesPrompt(true);
                        } else {
                          executeGroupSave(groupedStudents, false);
                        }
                    }}
                    onCancel={() => setActiveTab('profile')}
                  />
                </div>
              </div>
            )}

            {/* TAB: REQUESTS */}
            {activeTab === 'requests' && (() => {
              const displayRequests = activeRequestViewId 
                ? data?.allNotifications?.filter((n: any) => n.id === activeRequestViewId) 
                : data?.allNegotiations;
              
              return (
              <div>
                <div className="flex items-center gap-4 mb-8">
                  {activeRequestViewId && (
                    <button 
                      onClick={() => { setActiveRequestViewId(null); setActiveTab('notifications'); }}
                      className="p-2 bg-white hover:bg-gray-50 text-gray-600 rounded-full shadow-sm border border-gray-200 transition-colors"
                    >
                      <ArrowRight className="w-5 h-5 rotate-180" />
                    </button>
                  )}
                  <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Requests & Offers</h2>
                </div>
                {(displayRequests?.length ?? 0) > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                    {displayRequests?.map((neg: any) => {
                      const studentForApp = allStudents.find((s:any) => s.id === neg.studentDocId) || { name: neg.studentName || 'Student' };
                      return (
                      <div key={neg.id} className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-3xl border border-gray-100 shadow-lg shadow-slate-200/50 flex flex-col h-full hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300">
                            
                            {/* Card Header */}
                            <div className="mb-4">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-lg text-slate-900 tracking-tight leading-tight break-words">Tutor: {neg.tutorName}</h4>
                                  {neg.applicationId && <p className="text-xs text-slate-500 font-mono font-bold mt-1 uppercase tracking-wider">ID: {neg.applicationId}</p>}
                                </div>
                                <span 
                                  className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-md border border-emerald-100/50 uppercase tracking-wider truncate max-w-[50%] flex-shrink-0"
                                  title={`For: ${studentForApp.name}`}
                                >
                                  For: {studentForApp.name.replace(/^Group:\s*/i, 'Group ')}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{neg.category}</p>
                              <div className="space-y-1">
                                {neg.category === 'programming' && neg.technologies && neg.technologies.length > 0 && <p className="text-sm font-semibold text-slate-600"><span className="text-slate-400 font-medium">Tech:</span> {neg.technologies.join(', ')}</p>}
                                {neg.category === 'languages' && neg.languagesTaught && neg.languagesTaught.length > 0 && <p className="text-sm font-semibold text-slate-600"><span className="text-slate-400 font-medium">Lang:</span> {neg.languagesTaught.join(', ')}</p>}
                                {(!neg.category || neg.category === 'school') && neg.subjects && neg.subjects.length > 0 && <p className="text-sm font-semibold text-slate-600"><span className="text-slate-400 font-medium">Subj:</span> {neg.subjects.join(', ')}</p>}
                              </div>
                            </div>

                            <div className="h-px w-full bg-slate-100 my-4"></div>

                            {/* Status Section */}
                            <div className="flex-1 flex flex-col mb-5">
                                {neg.status === 'demo_booking_phase' && neg.proposedDate ? (
                                  <div className="w-full bg-slate-100/70 p-3.5 rounded-2xl border border-slate-200/50 mb-auto">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Proposed Schedule</p>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Calendar className="w-4 h-4 text-emerald-600" />
                                      <span className="text-sm font-bold text-slate-800">{new Date(neg.proposedDate).toLocaleDateString()} at {formatTimeTo12Hour(neg.proposedTime)}</span>
                                    </div>
                                    </div>
                                ) : (
                                  <div className="text-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-auto">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{neg.status === 'demo_pending_payment' ? 'Agreed Price' : 'Current Offer'}</p>
                                    <p className="text-2xl font-black text-emerald-600 tracking-tight">₹{neg.currentOffer}</p>
                                  </div>
                                )}                  
                            </div>
                              
                              {/* Request Specific Status UI (Buttons/Labels) */}
                              <div className="mt-auto space-y-2">
                                <button
                                  onClick={() => {
                                    const teacherUser = data?.allTutors?.find((t:any) => t.id === neg.tutorDocId) 
                                      || neg.tutorDetails
                                      || {
                                        id: neg.tutorDocId,
                                        name: neg.tutorName || 'Teacher',
                                        category: neg.category,
                                        mode: neg.mode,
                                      };
                                    setSelectedViewUser(teacherUser);
                                    setSelectedViewApp(neg);
                                  }}
                                  className="w-full bg-white border-2 border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 px-5 py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-2"
                                >
                                  View Profile
                                </button>
                                {(() => {
                                  const leadId = neg.groupDocId || neg.studentDocId;
                                  const activeLockApp = data?.applications?.find((app: any) => 
                                    (app.groupDocId || app.studentDocId) === leadId && 
                                    ['demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision'].includes(app.status)
                                  );
                                  const isLockedByOtherTutor = activeLockApp && activeLockApp.id !== neg.id;
                                  
                                  if (neg.status !== 'declined' && neg.status !== 'tuition_started' && isLockedByOtherTutor) {
                                    return (
                                      <button 
                                        disabled
                                        className="w-full bg-gray-200 text-gray-500 px-5 py-3.5 rounded-xl font-bold text-sm cursor-not-allowed flex flex-col items-center justify-center gap-1"
                                      >
                                        <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Demo in Progress</span>
                                        <span className="text-[10px] font-normal leading-tight px-2 text-center">Demo in progress with another teacher</span>
                                      </button>
                                    );
                                  }

                                  return (
                                    <>
                                      {neg.status === 'declined' ? (
                                    <div className="w-full bg-red-50/50 px-4 py-3 rounded-2xl border border-red-100 text-center">
                                      <p className="text-sm font-black text-red-600 uppercase tracking-widest">Declined</p>
                                    </div>
                                ) : neg.status === 'tuition_started' ? (
                                    <div className="w-full bg-emerald-50 px-4 py-3 rounded-2xl border border-emerald-100 text-center shadow-sm">
                                      <p className="text-sm font-black text-emerald-600 uppercase tracking-widest">Fees Paid</p>
                                    </div>
                                ) : neg.status === 'negotiating' && (
                                  ['tutor', 'teacher'].includes(neg.lastUpdatedBy) ? (
                                    <>
                                      <button 
                                        onClick={() => {
                                          handleNegotiationAction(neg.id, 'request_demo', neg.currentOffer);
                                        }}
                                        disabled={actionLoadingAppId === neg.id}
                                        className={`w-full bg-gradient-to-r from-[#00a992] to-teal-500 hover:from-[#009b86] hover:to-teal-600 text-white px-5 py-3.5 rounded-xl font-bold text-sm shadow-md shadow-emerald-500/25 transform hover:scale-[1.02] active:scale-[0.98] transition-all ${actionLoadingAppId === neg.id ? 'opacity-50 cursor-wait' : ''}`}
                                      >
                                        {actionLoadingAppId === neg.id ? 'Processing...' : 'Accept & Request Demo'}
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setModalConfig({
                                            isOpen: true,
                                            type: 'price',
                                            title: 'Counter Offer',
                                            description: 'Propose a new monthly fee for this tutor.',
                                            placeholder: 'e.g. 500',
                                            initialValue: neg.currentOffer?.toString() || '',
                                            min: neg.absoluteMin || Math.ceil((neg.initialBudget || 0) * 0.6),
                                            max: neg.absoluteMax || (neg.initialBudget || 0),
                                            onSubmit: (val: string) => {
                                              setModalConfig(prev => ({ ...prev, isOpen: false }));
                                            handleNegotiationAction(neg.id, 'counter_price', parseInt(val), neg);
                                            }
                                          });
                                        }}
                                        className="w-full bg-white border-2 border-slate-200 hover:border-[#00a992] hover:bg-emerald-50/50 text-slate-700 px-5 py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all"
                                      >
                                        Counter Offer
                                      </button>
                                      <button 
                                        onClick={() => setActionConfirmModal({ isOpen: true, type: 'reject', appId: neg.id, teacherName: neg.tutorName || 'the teacher' })}
                                        disabled={actionLoadingAppId === neg.id}
                                        className={`w-full bg-red-50/50 text-red-600 border border-transparent hover:border-red-100 hover:bg-red-50 px-5 py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all ${actionLoadingAppId === neg.id ? 'opacity-50 cursor-wait' : ''}`}
                                      >
                                        {actionLoadingAppId === neg.id ? 'Processing...' : 'Decline'}
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <div className="w-full bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 text-center mb-2">
                                        <p className="text-sm font-semibold text-slate-500">Waiting for tutor response...</p>
                                      </div>
                                      <button 
                                        onClick={() => setActionConfirmModal({ isOpen: true, type: 'reject', appId: neg.id, teacherName: neg.tutorName || 'the teacher' })}
                                        className="w-full bg-red-50/50 text-red-600 border border-transparent hover:border-red-100 hover:bg-red-50 px-5 py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all"
                                      >
                                        Withdraw Request
                                      </button>
                                    </>
                                  )
                                )}

                                {/* Direct Payment / Demo Statuses */}
                                {neg.status === 'demo_requested_by_teacher' && (
                                  <>
                                    <button 
                                      onClick={() => handleNegotiationAction(neg.id, 'accept_demo')}
                                      disabled={actionLoadingAppId === neg.id}
                                      className={`w-full bg-gradient-to-r from-[#00a992] to-teal-500 hover:from-[#009b86] hover:to-teal-600 text-white px-5 py-3.5 rounded-xl font-black text-sm shadow-md shadow-emerald-500/25 transform hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest flex items-center justify-center gap-2 ${actionLoadingAppId === neg.id ? 'opacity-50 cursor-wait' : ''}`}
                                    >
                                      <CheckCircle2 className="w-4 h-4" /> {actionLoadingAppId === neg.id ? 'Processing...' : 'Accept Demo'}
                                    </button>
                                    <button 
                                      onClick={() => setActionConfirmModal({ isOpen: true, type: 'reject', appId: neg.id, teacherName: neg.tutorName || 'the teacher' })}
                                      className="w-full bg-red-50/50 text-red-600 border border-transparent hover:border-red-100 hover:bg-red-50 px-5 py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all"
                                    >
                                      Decline
                                    </button>
                                  </>
                                )}
                                {neg.status === 'demo_requested_by_student' && (
                                  <>
                                    <div className="w-full bg-blue-50/50 px-4 py-3 rounded-2xl border border-blue-100 text-center mb-2">
                                      <p className="text-sm font-semibold text-blue-600">Waiting for Teacher to Accept</p>
                                    </div>
                                    <button 
                                      onClick={() => setActionConfirmModal({ isOpen: true, type: 'reject', appId: neg.id, teacherName: neg.tutorName || 'the teacher' })}
                                      className="w-full bg-red-50/50 text-red-600 border border-transparent hover:border-red-100 hover:bg-red-50 px-5 py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all"
                                    >
                                      Withdraw Request
                                    </button>
                                  </>
                                )}
                                {neg.status === 'demo_pending_payment' && (
                                  <>
                                    <div className="w-full bg-orange-50 px-4 py-3 rounded-2xl border border-orange-100 text-center mb-2 shadow-sm">
                                      <p className="text-sm font-semibold text-orange-600">Waiting for Teacher to Pay Fee</p>
                                    </div>
                                    <button 
                                      onClick={() => setActionConfirmModal({ isOpen: true, type: 'reject', appId: neg.id, teacherName: neg.tutorName || 'the teacher' })}
                                      className="w-full bg-red-50/50 text-red-600 border border-transparent hover:border-red-100 hover:bg-red-50 px-5 py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all"
                                    >
                                      Withdraw Request
                                    </button>
                                  </>
                                )}
                                {neg.status === 'demo_booking_phase' && (
                                  <>
                                    {neg.proposedDate && ['tutor', 'teacher'].includes(neg.lastUpdatedBy) ? (
                                      <>
                                        <button 
                                          onClick={() => handleNegotiationAction(neg.id, 'accept_demo_date')}
                                          disabled={actionLoadingAppId === neg.id}
                                          className={`w-full bg-gradient-to-r from-[#00a992] to-teal-500 hover:from-[#009b86] hover:to-teal-600 text-white px-5 py-3.5 rounded-xl font-bold text-sm shadow-md shadow-emerald-500/25 transform hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${actionLoadingAppId === neg.id ? 'opacity-50 cursor-wait' : ''}`}
                                        >
                                          <CheckCircle2 className="w-4 h-4" /> {actionLoadingAppId === neg.id ? 'Processing...' : 'Accept Proposed Date'}
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setModalConfig({
                                              isOpen: true,
                                              type: 'demo_booking',
                                              title: 'Counter-Offer Date',
                                              description: 'Suggest a different date and time for the demo class.',
                                              placeholder: '',
                                              initialValue: '',
                                              initialDate: neg.proposedDate || '',
                                              initialTime: neg.proposedTime?.split('||')[0] || '',
                                              isOnline: (neg.mode || 'Online').toLowerCase() === 'online',
                                              onSubmit: (val: string, date?: string, time?: string) => {
                                                setModalConfig(prev => ({ ...prev, isOpen: false }));
                                                handleNegotiationAction(neg.id, 'propose_demo_date', 0, { ...neg, proposedDate: date, proposedTime: time });
                                              }
                                            });
                                          }}
                                          className="w-full bg-white border-2 border-slate-200 hover:border-[#00a992] hover:bg-emerald-50/50 text-slate-700 px-5 py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                        >
                                          <Calendar className="w-4 h-4" /> Change requested Date/Time
                                        </button>
                                      </>
                                    ) : (
                                      <div className="w-full bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 text-center mb-2">
                                        <p className="text-sm font-semibold text-slate-500">Waiting for Teacher to propose date...</p>
                                      </div>
                                    )}
                                    <button 
                                      onClick={() => setActionConfirmModal({ isOpen: true, type: 'reject', appId: neg.id, teacherName: neg.tutorName || 'the teacher' })}
                                      className="w-full bg-red-50/50 text-red-600 border border-transparent hover:border-red-100 hover:bg-red-50 px-5 py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all"
                                    >
                                      Cancel Demo
                                    </button>
                                  </>
                                )}
                                {neg.status === 'demo_scheduled' && (
                                  <>
                                    <div className="w-full bg-blue-50/50 px-4 py-3 rounded-2xl border border-blue-100 text-center mb-3">
                                      <p className="text-sm font-semibold text-blue-600">Demo Scheduled! Wait for it to complete.</p>
                                    </div>
                                    {(neg.mode || 'Online').toLowerCase() === 'online' && neg.demoDate && neg.demoTime && (() => {
                                      const demoDateTime = new Date(`${neg.demoDate}T${neg.demoTime}:00`).getTime();
                                      const timeDiff = demoDateTime - trustedNow;
                                      const isLocked = timeDiff > 5 * 60 * 1000;
                                      
                                      const formatTimeDiff = (ms: number) => {
                                        if (ms <= 0) return 'Ready to Join';
                                        const hours = Math.floor(ms / (1000 * 60 * 60));
                                        const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                                        const secs = Math.floor((ms % (1000 * 60)) / 1000);
                                        return `${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs}s`;
                                      };

                                      return (
                                        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
                                          <div className="flex justify-between items-center mb-1">
                                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Demo Room</p>
                                            {isLocked && <span className="text-xs font-mono font-bold text-[#00a992] bg-emerald-50 px-2 py-0.5 rounded">{formatTimeDiff(timeDiff - 5 * 60 * 1000)}</span>}
                                          </div>
                                          
                                          <button 
                                            onClick={() => handleJoinDemoRoom(neg.id)}
                                            disabled={isLocked || retrievingGmeetAppId === neg.id}
                                            className={`w-full py-3 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-2 ${
                                              isLocked 
                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed blur-[1px]' 
                                                : retrievingGmeetAppId === neg.id
                                                  ? 'bg-[#00a992]/50 text-white cursor-wait'
                                                  : 'bg-[#00a992] text-white hover:bg-[#008f7b] shadow-md hover:shadow-lg hover:-translate-y-0.5'
                                            }`}
                                          >
                                            {isLocked ? (
                                              <><Lock className="w-4 h-4" /> Locked until 5 mins before</>
                                            ) : retrievingGmeetAppId === neg.id ? (
                                              'Retrieving Link...'
                                            ) : (
                                              <><Video className="w-4 h-4" /> Join Demo Class</>
                                            )}
                                          </button>
                                        </div>
                                      );
                                    })()}
                                  </>
                                )}
                                {neg.status === 'waiting_for_parent_decision' && (
                                  <>
                                    <button 
                                      onClick={() => setActionConfirmModal({ isOpen: true, type: 'hire', appId: neg.id, teacherName: neg.tutorName || 'the teacher' })}
                                      className="w-full bg-gradient-to-r from-[#00a992] to-teal-500 hover:from-[#009b86] hover:to-teal-600 text-white px-5 py-3.5 rounded-xl font-black text-sm shadow-md shadow-emerald-500/25 transform hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                      <CheckCircle2 className="w-4 h-4" /> Hire Teacher
                                    </button>
                                    <button 
                                      onClick={() => setActionConfirmModal({ isOpen: true, type: 'reject', appId: neg.id, teacherName: neg.tutorName || 'the teacher' })}
                                      className="w-full bg-red-50/50 text-red-600 border border-transparent hover:border-red-100 hover:bg-red-50 px-5 py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                    </>
                                  );
                                })()}
                              </div>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-10 bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center mt-4">
                        <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
                        <h3 className="text-lg font-bold text-gray-900">No active negotiations</h3>
                        <p className="text-gray-500 max-w-sm mt-2">You don't have any ongoing proposals or requests here.</p>
                      </div>
                    )}
                  </div>
              );
            })()}

            {/* TAB: MY TEACHERS */}
            {activeTab === 'my_teachers' && (
              <div className="space-y-12">
                {/* Demo Teachers Section */}
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-8">Demo Teachers</h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                    {data?.demoClasses?.map((cls: any) => {
                      const phone = cls.tutorDetails?.phone || cls.tutorDetails?.whatsapp;
                      const email = cls.tutorDetails?.email;
                      return (
                      <li 
                        key={cls.id} 
                        className="relative bg-gradient-to-br from-white to-slate-50 rounded-3xl p-6 shadow-lg shadow-slate-200/50 border border-gray-100 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300 group overflow-hidden flex flex-col"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
                        
                        <div className="flex flex-col h-full gap-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/30 flex-shrink-0">
                                {cls.teacher?.charAt(0) || 'T'}
                              </div>
                              <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight truncate max-w-[120px] sm:max-w-[150px]">{cls.teacher}</h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-md border border-blue-100/50 uppercase tracking-wider">Demo Phase</span>
                                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 truncate max-w-[100px]">For {allStudents.find((s:any) => s.id === cls.studentDocId)?.name?.split(' ')[0] || cls.studentName?.split(' ')[0] || 'Student'}</span>
                                </div>
                              </div>
                            </div>
                            
                            <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm whitespace-nowrap bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-700 border-blue-200/50">
                              {cls.status.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent my-1" />

                          <div className="grid grid-cols-1 gap-y-4 text-sm flex-grow">
                            {cls.app?.demoDate && cls.app?.demoTime && (
                              <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                  <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Demo Schedule</p>
                                  <p className="font-bold text-slate-800">{new Date(cls.app.demoDate).toLocaleDateString()} at {formatTimeTo12Hour(cls.app.demoTime)}</p>
                                </div>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              {phone && (
                                <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0"><Phone className="w-3.5 h-3.5" /></div>
                                  <div className="overflow-hidden">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                                    <p className="font-semibold text-slate-700 text-xs truncate">{phone}</p>
                                  </div>
                                </a>
                              )}
                              {email && (
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0"><Mail className="w-3.5 h-3.5" /></div>
                                  <div className="overflow-hidden">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                                    <p className="font-semibold text-slate-700 text-xs truncate" title={email}>{email}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {cls.status === 'demo_scheduled' && (cls.app?.mode || 'Online').toLowerCase() === 'online' && cls.app?.demoDate && cls.app?.demoTime && (() => {
                            const demoDateTime = new Date(`${cls.app.demoDate}T${cls.app.demoTime}:00`).getTime();
                            const timeDiff = demoDateTime - trustedNow;
                            const isLocked = timeDiff > 5 * 60 * 1000;
                            
                            const formatTimeDiff = (ms: number) => {
                              if (ms <= 0) return 'Ready to Join';
                              const hours = Math.floor(ms / (1000 * 60 * 60));
                              const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                              const secs = Math.floor((ms % (1000 * 60)) / 1000);
                              return `${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs}s`;
                            };

                            return (
                              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2 mt-3 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-0.5">
                                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Demo Room</p>
                                  {isLocked && <span className="text-[10px] font-mono font-bold text-[#00a992] bg-emerald-50 px-1.5 py-0.5 rounded">{formatTimeDiff(timeDiff - 5 * 60 * 1000)}</span>}
                                </div>
                                
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleJoinDemoRoom(cls.id); }}
                                  disabled={isLocked || retrievingGmeetAppId === cls.id}
                                  className={`w-full py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                    isLocked 
                                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed blur-[1px]' 
                                      : retrievingGmeetAppId === cls.id
                                        ? 'bg-[#00a992]/50 text-white cursor-wait'
                                        : 'bg-[#00a992] text-white hover:bg-[#008f7b] shadow-md hover:shadow-lg hover:-translate-y-0.5'
                                  }`}
                                >
                                  {isLocked ? (
                                    <><Lock className="w-3.5 h-3.5" /> Locked</>
                                  ) : retrievingGmeetAppId === cls.id ? (
                                    'Retrieving...'
                                  ) : (
                                    <><Video className="w-3.5 h-3.5" /> Join Live Class</>
                                  )}
                                </button>
                              </div>
                            );
                          })()}

                          <div className="mt-4 flex gap-2">
                            <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const viewUser = cls.tutorDetails 
                                    || data?.allTutors?.find((t: any) => t.id === cls.app?.tutorDocId)
                                    || {
                                      id: cls.app?.tutorDocId,
                                      name: cls.teacher || 'Tutor',
                                      feeRange: cls.app?.finalPrice || cls.app?.currentOffer || 0,
                                      mode: cls.app?.mode,
                                    };
                                  setSelectedViewUser(viewUser);
                                  setSelectedViewApp(cls.app);
                                }}
                                className="w-full bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-slate-700 hover:text-blue-700 px-4 py-3 rounded-xl font-bold text-sm transition-all"
                            >
                                View Details
                            </button>
                          </div>
                        </div>
                      </li>
                    );})}
                    {(!data?.demoClasses || data?.demoClasses?.length === 0) && (
                      <li className="col-span-full p-12 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                          <Calendar className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No active demos</h3>
                        <p className="text-slate-500 text-sm max-w-sm">Wait for a teacher to accept and schedule a demo class.</p>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Active Teachers Section */}
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-8">Active Teachers</h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                    {data?.upcomingClasses?.map((cls: any) => (
                      <li 
                        key={cls.id} 
                        className="relative bg-gradient-to-br from-white to-slate-50 rounded-3xl p-6 shadow-lg shadow-slate-200/50 border border-gray-100 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300 group overflow-hidden flex flex-col cursor-pointer"
                        onClick={() => {
                          if (cls.tutorDetails) {
                            setSelectedViewUser(cls.tutorDetails);
                            setSelectedViewApp(cls.app);
                          }
                        }}
                      >
                        
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-50 to-emerald-100/30 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
                        
                        <div className="flex flex-col h-full gap-5">
                          {/* Header section */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00a992] to-teal-500 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-emerald-500/30 flex-shrink-0">
                                {cls.teacher?.charAt(0) || 'T'}
                              </div>
                              <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight truncate max-w-[120px] sm:max-w-[150px]">{cls.teacher}</h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-md border border-emerald-100/50 uppercase tracking-wider">{cls.subject}</span>
                                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 truncate max-w-[100px]">For {allStudents.find((s:any) => s.id === cls.studentDocId)?.name?.split(' ')[0] || cls.studentName?.split(' ')[0] || 'Student'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Status Badge */}
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm whitespace-nowrap ${
                              cls.status === 'confirmed' || cls.status === 'tuition_started'
                                ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-200/50' 
                                : 'bg-gradient-to-r from-orange-50 to-orange-100/50 text-orange-700 border-orange-200/50'
                            }`}>
                              {cls.status === 'tuition_started' ? 'Active' : cls.status.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Divider */}
                          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent my-1" />

                          {/* Details section */}
                          {['demo_scheduled', 'waiting_for_parent_decision', 'demo_booked', 'tuition_started', 'confirmed', 'accepted'].includes(cls.status) && cls.tutorDetails ? (
                            <div className="grid grid-cols-2 gap-y-4 gap-x-3 text-sm flex-grow">
                              {cls.tutorDetails.phone && (
                                <a href={`tel:${cls.tutorDetails.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0"><Phone className="w-3.5 h-3.5" /></div>
                                  <div className="overflow-hidden">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                                    <p className="font-semibold text-slate-700 text-xs truncate">{cls.tutorDetails.phone}</p>
                                  </div>
                                </a>
                              )}
                              {cls.tutorDetails.email && (
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0"><Mail className="w-3.5 h-3.5" /></div>
                                  <div className="overflow-hidden">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                                    <p className="font-semibold text-slate-700 text-xs truncate" title={cls.tutorDetails.email}>{cls.tutorDetails.email}</p>
                                  </div>
                                </div>
                              )}
                              {cls.tutorDetails.qualification && (
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0"><GraduationCap className="w-3.5 h-3.5" /></div>
                                  <div className="overflow-hidden">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Degree</p>
                                    <p className="font-semibold text-slate-700 text-xs truncate">{cls.tutorDetails.qualification}</p>
                                  </div>
                                </div>
                              )}
                              {cls.tutorDetails.experience && (
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0"><Star className="w-3.5 h-3.5" /></div>
                                  <div className="overflow-hidden">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exp.</p>
                                    <p className="font-semibold text-slate-700 text-xs truncate">{cls.tutorDetails.experience}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex-grow flex items-center justify-center p-4 bg-slate-50/70 rounded-2xl border border-slate-200 border-dashed">
                              <p className="text-sm font-medium text-slate-500 text-center">Contact details will be revealed once the demo is scheduled.</p>
                            </div>
                          )}

                          <div className="mt-4 flex gap-2">
                            <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const viewUser = cls.tutorDetails 
                                    || data?.allTutors?.find((t: any) => t.id === cls.app?.tutorDocId)
                                    || {
                                      id: cls.app?.tutorDocId,
                                      name: cls.teacher || 'Tutor',
                                      feeRange: cls.app?.finalPrice || cls.app?.currentOffer || 0,
                                      mode: cls.app?.mode,
                                    };
                                  setSelectedViewUser(viewUser);
                                  setSelectedViewApp(cls.app);
                                }}
                                className="w-full bg-white border-2 border-slate-200 hover:border-[#00a992] hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-700 px-4 py-3 rounded-xl font-bold text-sm transition-all"
                            >
                                View Details
                            </button>
                            {cls.status === 'tuition_started' && (
                              <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReviewModalConfig({
                                      isOpen: true,
                                      applicationId: cls.app?.id,
                                      tutorName: cls.teacher,
                                      parentDocId: cls.app?.parentDocId || data?.userData?.id
                                    });
                                  }}
                                  className="w-full bg-amber-50 border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-100 text-amber-700 px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1"
                              >
                                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                                  Review
                              </button>
                            )}
                          </div>

                          {/* Action Button */}
                          {cls.status === 'demo_requested_by_teacher' && (
                            <div className="mt-2 flex flex-col gap-2">
                              <button onClick={(e) => { e.stopPropagation(); handleNegotiationAction(cls.id, 'accept_demo'); }} disabled={actionLoadingAppId === cls.id} className={`w-full bg-gradient-to-r from-[#00a992] to-teal-500 hover:from-[#009b86] hover:to-teal-600 text-white py-3.5 rounded-xl font-bold shadow-md shadow-emerald-500/25 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 ${actionLoadingAppId === cls.id ? 'opacity-50 cursor-wait' : ''}`}>
                                {actionLoadingAppId === cls.id ? 'Processing...' : 'Accept Demo'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setActionConfirmModal({ isOpen: true, type: 'reject', appId: cls.id, teacherName: cls.tutorName || 'the teacher' }); }} disabled={actionLoadingAppId === cls.id} className={`w-full bg-red-50/50 text-red-600 border border-transparent hover:border-red-100 hover:bg-red-50 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${actionLoadingAppId === cls.id ? 'opacity-50 cursor-wait' : ''}`}>
                                {actionLoadingAppId === cls.id ? 'Processing...' : 'Decline'}
                              </button>
                            </div>
                          )}
                          {cls.status === 'demo_requested_by_student' && (
                            <div className="mt-2 w-full bg-blue-50 text-blue-600 py-3.5 rounded-xl font-bold text-center border border-blue-100">
                              Waiting for Teacher to Accept
                            </div>
                          )}
                          {cls.status === 'tuition_started' && (() => {
                            const appStartDate = cls.startDate || cls.app?.startDate || Date.now();
                            const daysElapsed = Math.max(1, Math.ceil((Date.now() - appStartDate) / (1000 * 60 * 60 * 24)));
                            const monthlyFee = cls.finalPrice || cls.currentOffer || 0;
                            const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
                            const proratedFee = cls.cancellationProratedFee || cls.app?.cancellationProratedFee || Math.max(1, Math.round((monthlyFee / daysInMonth) * daysElapsed));
                            const isPaid = (cls.feePaid === true) || (cls.app?.feePaid === true);
                            const isCancellationRequested = Boolean(cls.cancellationRequested || cls.app?.cancellationRequested);
                            const displayNames = cls.studentName || (cls.studentDocIds?.length > 1 ? 'Group' : 'Student');

                            if (isCancellationRequested && !isPaid) {
                              return (
                                <div className="mt-2 flex flex-col gap-2">
                                  <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm p-3 rounded-xl font-bold flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                                    <span>Cancellation Initiated: Please pay ₹{proratedFee.toLocaleString()} ({daysElapsed} trial {daysElapsed === 1 ? 'day' : 'days'} attended) to finalize removal.</span>
                                  </div>
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setPayingClass({ id: cls.id, studentName: displayNames, finalPrice: proratedFee, isProrated: true, isRemoval: true, studentsList: cls.studentsList || (cls.studentDetails ? [cls.studentDetails] : []), tutorName: cls.tutorName || cls.teacher });
                                    }} 
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3.5 rounded-xl font-bold shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                  >
                                    <CheckCircle2 className="w-4 h-4" /> Pay Prorated Fee (₹{proratedFee.toLocaleString()})
                                  </button>
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      handleWithdrawCancellation(cls.id);
                                    }}
                                    disabled={isWithdrawingCancellation === cls.id}
                                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                                  >
                                    {isWithdrawingCancellation === cls.id ? 'Resuming...' : 'Undo Cancellation & Keep Teacher'}
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div className="mt-2 flex flex-col gap-2">
                                {!isPaid && daysElapsed >= 7 && (
                                  <div className="flex flex-col gap-2">
                                    {daysElapsed < TUITION_PAYMENT_LOCK_DAYS && (
                                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs sm:text-sm p-3 rounded-xl font-bold flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span>Your 7-day trial has ended. You have an active grace period ({Math.max(1, TUITION_PAYMENT_LOCK_DAYS - daysElapsed)} {TUITION_PAYMENT_LOCK_DAYS - daysElapsed === 1 ? 'day' : 'days'} remaining) to pay your monthly fees to continue classes.</span>
                                      </div>
                                    )}
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setPayingClass({ id: cls.id, studentName: displayNames, finalPrice: monthlyFee, isProrated: false, isRemoval: false, studentsList: cls.studentsList || (cls.studentDetails ? [cls.studentDetails] : []), tutorName: cls.tutorName || cls.teacher });
                                      }} 
                                      className="w-full bg-gradient-to-r from-[#00a992] to-teal-500 text-white py-3.5 rounded-xl font-bold shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                    >
                                      <CheckCircle2 className="w-4 h-4" /> Pay Monthly Fees
                                    </button>
                                  </div>
                                )}
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (isPaid) {
                                      setActionConfirmModal({ isOpen: true, type: 'remove', appId: cls.id, teacherName: cls.tutorName || cls.teacher });
                                    } else {
                                      if (daysElapsed < 7) {
                                        handleRequestCancellation(cls);
                                        setPayingClass({ id: cls.id, studentName: displayNames, finalPrice: proratedFee, isProrated: true, isRemoval: true, studentsList: cls.studentsList || (cls.studentDetails ? [cls.studentDetails] : []), tutorName: cls.tutorName || cls.teacher });
                                      } else {
                                        setPayingClass({ id: cls.id, studentName: displayNames, finalPrice: monthlyFee, isProrated: false, isRemoval: true, studentsList: cls.studentsList || (cls.studentDetails ? [cls.studentDetails] : []), tutorName: cls.tutorName || cls.teacher });
                                      }
                                    }
                                  }} 
                                  className="w-full bg-red-50/50 text-red-600 border border-transparent hover:border-red-100 hover:bg-red-50 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                >
                                  Remove Teacher
                                </button>
                              </div>
                            );
                          })()}
                          {cls.status === 'demo_pending_payment' && (
                            <div className="mt-2 w-full bg-orange-50 text-orange-600 py-3.5 rounded-xl font-bold text-center border border-orange-100">
                              Waiting for Teacher to Pay
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                    {(!data?.upcomingClasses || data?.upcomingClasses?.length === 0) && (
                      <li className="col-span-full p-12 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                          <BookOpen className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No active classes</h3>
                        <p className="text-slate-500 max-w-sm">You haven't hired any teachers yet. Explore our recommended tutors to get started!</p>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}



            {/* TAB: REFERRALS */}
            {activeTab === 'referrals' && (
              <div>
                {/* "Invited By" Banner */}
                {(data?.userData?.referrerName || data?.userData?.referredBy) && (
                  <div className="mb-8 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 text-emerald-600">
                      <Handshake className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-emerald-900 font-bold">Welcome to the community!</h4>
                      <p className="text-emerald-700 text-sm font-medium">
                        You joined MiTutora via{' '}
                        <span className="font-bold">
                          {data?.userData?.referrerName ? `${data.userData.referrerName}'s` : `code ${data?.userData?.referredBy}`}
                        </span>{' '}
                        invite link.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col mb-10">
                  <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Refer & Earn</h2>
                  <p className="text-slate-500 font-medium mt-2">Invite your friends and earn rewards when they join.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                  {/* Glassmorphic Hero Card */}
                  <div className="lg:col-span-2 bg-gradient-to-br from-[#00a992] via-[#009682] to-[#008270] rounded-3xl p-8 sm:p-10 text-white shadow-2xl shadow-teal-950/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:opacity-15 transition-all duration-700">
                      <Gift className="w-64 h-64 -rotate-12 translate-x-12 -translate-y-12 text-white" />
                    </div>
                    {/* Glowing Orbs */}
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-teal-300/20 rounded-full blur-[80px]" />
                    <div className="absolute bottom-0 right-10 w-48 h-48 bg-emerald-400/20 rounded-full blur-[60px]" />
                    
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div className="max-w-md mb-8">
                        <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-6 border border-white/30 backdrop-blur-md">
                          <Gift className="w-3.5 h-3.5" /> REWARD PROGRAM
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight leading-tight">Invite friends.<br/><span className="text-white drop-shadow-sm">Earn together.</span></h3>
                        <p className="text-teal-50/90 text-base sm:text-lg font-medium leading-relaxed">
                          Share your unique referral code. Earn 25% of the initial company margin (approx. 10% of total course value) when your friend books their first class!
                        </p>
                      </div>
                      
                      <div className="bg-black/20 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl flex flex-col gap-4 transform transition-all hover:bg-black/25">
                        <div>
                          <p className="text-xs font-bold text-teal-100 uppercase tracking-widest mb-2">Your Unique Code</p>
                          <span className="text-3xl sm:text-4xl font-black tracking-widest text-white drop-shadow-md">{data?.userData?.referralCode || data?.userData?.referralcode || 'GENERATING...'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button onClick={() => {
                            navigator.clipboard.writeText(data?.userData?.referralCode || data?.userData?.referralcode || '');
                            toast.success("Code copied to clipboard!");
                          }} className="flex-1 bg-white/20 text-white px-4 py-3.5 rounded-xl font-bold text-sm shadow-sm hover:bg-white/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                            <Copy className="w-4 h-4" /> Copy Code
                          </button>
                          <button onClick={() => {
                            const code = data?.userData?.referralCode || data?.userData?.referralcode || '';
                            const link = `${window.location.origin}/signup?ref=${code}`;
                            navigator.clipboard.writeText(link);
                            toast.success("Invite Link copied to clipboard!");
                          }} className="flex-1 bg-white hover:bg-teal-50 text-[#00a992] px-4 py-3.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                            <Copy className="w-4 h-4" /> Copy Invite Link
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Direct Referral Payout UPI Card */}
                  <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between group hover:shadow-2xl transition-all duration-300">
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                          <CreditCard className="w-6 h-6" />
                        </div>
                        {data?.userData?.upiId ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Missing UPI
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Direct Referral Payout UPI</p>
                      <h4 className="text-xl font-black text-gray-900 mb-2 tracking-tight">
                        Automatic Day 30 Deposits
                      </h4>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                        No minimum threshold! Your 25% company margin cash reward (₹600) is deposited directly to this UPI address on Day 30 when your referred friend completes their 1st month.
                      </p>

                      {!isEditingReferralUpi && (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Saved UPI ID</p>
                            <p className="font-mono text-sm font-bold text-gray-800 mt-0.5 break-all">
                              {data?.userData?.upiId || 'No UPI ID saved'}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setReferralUpi(data?.userData?.upiId || '');
                              setIsEditingReferralUpi(true);
                            }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 self-end sm:self-auto"
                          >
                            {data?.userData?.upiId ? 'Edit' : 'Add UPI'}
                          </button>
                        </div>
                      )}

                      {isEditingReferralUpi && (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 mb-2">
                          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Enter your UPI ID</label>
                          <input
                            type="text"
                            value={referralUpi}
                            onChange={(e) => setReferralUpi(e.target.value)}
                            placeholder="e.g. yourname@okhdfcbank"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              disabled={savingReferralUpi}
                              onClick={handleSaveReferralUpi}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 justify-center"
                            >
                              {savingReferralUpi && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              Save UPI
                            </button>
                            <button
                              disabled={savingReferralUpi}
                              onClick={() => setIsEditingReferralUpi(false)}
                              className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                            >
                              Cancel
                            </button>
                            {data?.userData?.upiId && (
                              <button
                                type="button"
                                disabled={savingReferralUpi || deletingReferralUpi}
                                onClick={() => setShowDeleteReferralUpiModal(true)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0"
                                title="Delete UPI ID"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Referrals List */}
                <div>
                  <ReferralsList 
                    referrals={data?.referrals || []} 
                    userUpiId={data?.userData?.upiId}
                    onAddUpi={() => setIsEditingReferralUpi(true)}
                  />
                </div>
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {hasProfile && (
                  <>
                    <ParentProfileCard 
                      data={data}
                      isEditing={isEditingParentProfile}
                      setIsEditing={setIsEditingParentProfile}
                      onSuccess={() => {
                        mutate();
                        setIsEditingParentProfile(false);
                      }}
                    />
                  </>
                )}

                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-gray-900">Registered Students</h2>
                  {hasProfile && (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setActiveTab('manage_groups')}
                        className="bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <Users className="w-4 h-4" /> Manage Groups
                      </button>
                      <button 
                        onClick={() => {
                          setActiveStudentId('new');
                        }}
                        className="bg-gradient-to-r from-[#00a992] to-teal-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-teal-500/25 hover:from-[#009b86] hover:to-teal-600 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add Student
                      </button>
                    </div>
                  )}
                </div>

                {!hasProfile || activeStudentId === 'new' || editingStudentId ? (
                  <div id="student-form-section" ref={studentFormSectionRef} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
                    {!hasProfile && (
                      <div className="bg-orange-50 border-b border-orange-100 p-4 text-orange-800 flex items-center justify-center gap-2 font-medium text-sm text-center">
                        <Lock className="w-4 h-4" /> Please submit a demo request profile to unlock the rest of your dashboard!
                      </div>
                    )}
                    {(activeStudentId === 'new' || editingStudentId) && hasProfile && (
                      <div className="bg-emerald-50 border-b border-emerald-100 p-4 text-emerald-800 flex justify-between items-center font-medium text-sm">
                        <span>{editingStudentId ? 'Editing student profile' : 'Adding a new student profile'}</span>
                        <button onClick={() => { setActiveStudentId(''); setEditingStudentId(''); }} className="font-bold underline">Cancel</button>
                      </div>
                    )}
                    <DemoForm 
                      key={(editingStudentId || activeStudentId) || 'default'}
                      isDashboard={true} 
                      hasProfile={hasProfile} 
                      category={selectedCategory} 
                      activeStudentId={editingStudentId || activeStudentId} 
                      defaultIsEditing={!!editingStudentId}
                      existingGroups={studentGroups}
                      initialData={(() => {
                        const activeId = editingStudentId || activeStudentId;
                        if (activeId !== 'new' && activeId !== '') {
                          const s = allStudents.find((st: any) => st.id === activeId);
                          if (!s) return null;
                          const groupPref = (data?.groups || []).find((g: any) => g.id === s.groupDocId || g.groupDocId === s.groupDocId || g.id === s.groupId);
                          return { ...s, groupPref };
                        } else {
                          return null;
                        }
                      })()}
                      onSuccess={async () => {
                        if(activeStudentId === 'new') setActiveStudentId('');
                        if(editingStudentId) setEditingStudentId('');
                        await mutate();
                      }} 
                      onCancel={() => {
                        if(activeStudentId === 'new') setActiveStudentId('');
                        if(editingStudentId) setEditingStudentId('');
                      }}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                    {studentGroups.map((group: any, idx: number) => {
                      const requestDoc = data?.groups?.find((g: any) => g.id === group.id) || data?.tuitionRequests?.find((req: any) => req.groupDocId === group.id) || data?.myRequest; // Fallback
                      
                      return (
                        <TuitionGroupCard
                          key={group.id}
                          group={group}
                          idx={idx}
                          requestDoc={requestDoc}
                          setEditingStudentId={setEditingStudentId}
                          setStudentToRemove={setStudentToRemove}
                          setViewingGroupDetails={setViewingGroupDetails}
                          setSelectedGroupForSettings={setSelectedGroupForSettings}
                          setGroupSettingsModalOpen={setGroupSettingsModalOpen}
                        />
                      );
                    })}
                  </div>
                )}

                {data?.userData?.roles?.includes('teacher') && (
                  <div className="mt-12 pt-8 border-t border-slate-100">
                    <div className="bg-gradient-to-br from-[#00a992] to-teal-600 rounded-3xl p-8 sm:p-10 shadow-xl shadow-teal-900/10 border border-[#00a992]/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-700" />
                      <div className="relative z-10">
                        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Teacher Portal</h3>
                        <p className="text-emerald-50 font-medium mb-6 max-w-lg">
                          You have a verified Teacher Profile. Switch to your Teacher dashboard to manage tuitions, students, and requests.
                        </p>
                        <button
                          onClick={() => {
                            const userString = localStorage.getItem('user');
                            if (userString) {
                              const userObj = JSON.parse(userString);
                              userObj.role = 'teacher';
                              localStorage.setItem('user', JSON.stringify(userObj));
                            }
                            router.push('/dashboard/teacher');
                          }}
                          className="bg-white text-emerald-700 px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-teal-900/20 hover:shadow-xl hover:bg-emerald-50 hover:-translate-y-1 active:scale-95 transition-all inline-flex items-center gap-2"
                        >
                          <GraduationCap className="w-4 h-4" />
                          Switch to Teacher Portal
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-12 pt-8 border-t border-red-50">
                  <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-3xl p-8 border border-red-100 shadow-lg shadow-red-900/5 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-red-100/50 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
                    <div className="relative z-10">
                      <h3 className="text-xl font-black text-red-700 mb-2 tracking-tight flex items-center gap-2"><Lock className="w-5 h-5" /> Danger Zone</h3>
                      <p className="text-sm text-red-600/80 font-medium mb-6 max-w-lg">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <button 
                        onClick={() => {
                          const hasPendingFees = data?.applications?.some((app: any) => app.status === 'tuition_started' && app.feePaid === false);
                          if (hasPendingFees) {
                            toast.error("You cannot delete your account while you have pending tuition fees. Please clear your dues first.");
                            return;
                          }
                          setShowDeleteAccountModal(true);
                        }}
                        className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md shadow-red-600/20 hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-100 text-center pb-8 flex flex-col items-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Legal & Policies</p>
                  <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 bg-slate-50/80 backdrop-blur-sm px-8 py-4 rounded-full border border-slate-200/60 shadow-sm w-max max-w-full">
                    <Link href="/legal/privacy-policy" target="_blank" className="text-sm font-bold text-slate-600 hover:text-[#00a992] transition-colors">Privacy Policy</Link>
                    <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300"></span>
                    <Link href="/legal/terms-and-conditions" target="_blank" className="text-sm font-bold text-slate-600 hover:text-[#00a992] transition-colors">Terms & Conditions</Link>
                    <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300"></span>
                    <Link href="/legal/refund-policy" target="_blank" className="text-sm font-bold text-slate-600 hover:text-[#00a992] transition-colors">Refund Policy</Link>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

      {/* Modals and Overlays */}
      {/* View Teacher Profile Modal */}
      {/* View Tutor Profile Modal */}      <ReviewModal
        isOpen={reviewModalConfig.isOpen}
        onClose={() => setReviewModalConfig(prev => ({ ...prev, isOpen: false }))}
        onSubmit={handleReviewSubmit}
        tutorName={reviewModalConfig.tutorName}
      />
      <TutorViewModal
        selectedViewUser={selectedViewUser}
        selectedViewApp={selectedViewApp}
        setSelectedViewUser={setSelectedViewUser}
        setSelectedViewApp={setSelectedViewApp}
        data={data}
        activeGroup={activeGroup}
        negotiationOffer={negotiationOffer}
        setNegotiationOffer={setNegotiationOffer}
        handleRequestTutor={handleRequestTutor}
        handleDirectRequestDemo={handleDirectRequestDemo}
        dailyRequestsCount={dailyRequestsCount}
        setActionConfirmModal={setActionConfirmModal}
        onPayFee={(app) => {
          setSelectedViewUser(null);
          setSelectedViewApp(null);
          setPayingClass({
            id: app.id,
            studentName: app.studentName || 'Student',
            finalPrice: app.finalPrice || 0,
            isProrated: false,
            isRemoval: false,
            studentsList: app.studentsList || (app.studentDetails ? [app.studentDetails] : []),
            tutorName: app.tutorName || selectedViewUser?.name || 'Tutor'
          });
        }}
      />

      {/* Remove Student Confirmation Modal */}
      {studentToRemove && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-8">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Remove Student?</h3>
            <p className="text-gray-500 font-medium mb-6">Are you sure you want to remove <strong className="text-gray-900">{studentToRemove.name}</strong>? All their tuition requests will also be deleted. This cannot be undone.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setStudentToRemove(null)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                disabled={isRemovingStudent}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setIsRemovingStudent(true);
                  try {
                    const { db } = await import('@/utils/firebase/client');
                    const { doc, query, collection, where, getDocs, getDoc, writeBatch, arrayRemove } = await import('firebase/firestore');
                    
                    const batch = writeBatch(db);
                    const groupId = studentToRemove.groupDocId;
                    
                    // 1. Gather Evidence: Find applications connected to this student
                    const appQ = query(collection(db, 'applications'), where('studentDocIds', 'array-contains', studentToRemove.id));
                    const appSnap = await getDocs(appQ);
                    
                    // 2. Prepare queue cleanups and application deletions
                    for (const appDoc of appSnap.docs) {
                      const appData = appDoc.data();
                      
                      // Legacy pendingRequests removal removed
                      
                      // Queue application deletion
                      batch.delete(doc(db, 'applications', appDoc.id));
                    }
                    
                    // 3. Prepare group update
                    let groupToSync = false;
                    let groupDeleted = false;
                    if (groupId) {
                        const groupRef = doc(db, 'groups', groupId);
                        const groupSnap = await getDoc(groupRef);
                        if (groupSnap.exists()) {
                            const groupData = groupSnap.data();
                            const newStudentIds = (groupData.studentDocIds || []).filter((id: string) => id !== studentToRemove.id);
                            if (newStudentIds.length === 0) {
                                batch.delete(groupRef);
                                const reqQ = query(collection(db, 'tuition_requests'), where('groupDocId', '==', groupId));
                                const reqSnap = await getDocs(reqQ);
                                for (const reqDoc of reqSnap.docs) {
                                    batch.delete(reqDoc.ref);
                                }
                                groupDeleted = true;
                            } else {
                                batch.update(groupRef, { studentDocIds: newStudentIds });
                                groupToSync = true;
                            }
                        }
                    }
                    
                    // 4. Finally, queue student deletion
                    batch.delete(doc(db, 'students', studentToRemove.id));
                    
                    // 5. Commit everything atomically
                    await batch.commit();
                    
                    // 6. Post-commit: Sync the tuition request document
                    if (groupToSync && groupId && !groupDeleted) {
                        const { syncTuitionRequestForGroup } = await import('@/utils/groupUtils');
                        await syncTuitionRequestForGroup(db, groupId, (data?.user?.uid || '') as string);
                    }

                    if (groupDeleted) {
                        setViewingGroupDetails((curr: any) => curr?.id === groupId ? null : curr);
                        setSelectedGroupForSettings((curr: any) => curr?.id === groupId ? null : curr);
                    }
                    
                    toast.success('Student removed successfully');
                    mutate();
                    setStudentToRemove(null);
                  } catch (err: any) {
                    toast.error(err.message);
                  } finally {
                    setIsRemovingStudent(false);
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-all flex items-center justify-center"
                disabled={isRemovingStudent}
              >
                {isRemovingStudent ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirm Modal */}
      <TransactionConfirmModal
        isOpen={!!actionConfirmModal?.isOpen}
        type={actionConfirmModal?.type === 'hire' ? 'success' : 'warning'}
        title={actionConfirmModal?.type === 'hire' ? 'Confirm Hiring' : (actionConfirmModal?.type === 'remove' ? 'Remove Teacher' : 'Confirm Rejection')}
        description={actionConfirmModal?.type === 'hire' 
          ? `Are you sure you want to hire ${actionConfirmModal.teacherName}? Your 1-week trial will begin today.`
          : (actionConfirmModal?.type === 'remove' ? `Are you sure you want to instantly remove ${actionConfirmModal.teacherName}? This will stop future classes.` : `Are you sure you want to decline or withdraw your request with ${actionConfirmModal?.teacherName}?`)}
        onCancel={() => setActionConfirmModal(null)}
        onConfirm={async () => {
          let success: boolean | void = true;
          if (actionConfirmModal?.type === 'hire') {
            success = await handleAppointTutor(actionConfirmModal.appId);
          } else if (actionConfirmModal) {
            success = await handleNegotiationAction(actionConfirmModal.appId, 'decline');
          }
          if (success !== false) {
            setActionConfirmModal(null);
          }
        }}
      />

      {/* Delete Referral UPI Confirm Modal */}
      <TransactionConfirmModal
        isOpen={showDeleteReferralUpiModal}
        type="warning"
        title="Remove Referral UPI ID?"
        description="Are you sure you want to remove your referral payout UPI ID? Automatic Day 30 disbursements will be paused until a new UPI ID is provided."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteReferralUpi}
        onCancel={() => setShowDeleteReferralUpiModal(false)}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        isDeleting={isDeletingAccount}
        onConfirm={async () => {
          setIsDeletingAccount(true);
          try {
            const { auth } = await import('@/utils/firebase/client');
            if (!auth.currentUser) throw new Error('Not logged in');

            const lastSignIn = new Date(auth.currentUser.metadata.lastSignInTime || 0).getTime();
            if (Date.now() - lastSignIn > 5 * 60 * 1000) {
              toast.error("For security reasons, you must have logged in recently to delete your account. Please sign out, sign back in, and try again.");
              setIsDeletingAccount(false);
              return;
            }

            const { functions } = await import('@/utils/firebase/client');
            const { httpsCallable } = await import('firebase/functions');
            const deleteAccount = httpsCallable(functions, 'deleteUserAccount');
            const res = await deleteAccount({ role: 'student' });
            const result = res.data as { success: boolean; isFullyDeleted: boolean; remainingRoles?: string[] };
            if (!result.success) {
              throw new Error('Failed to delete account');
            }

            if (!result.isFullyDeleted) {
              const remainingRoles = result.remainingRoles || ['teacher'];
              const updatedUser = {
                ...JSON.parse(localStorage.getItem('user') || '{}'),
                role: remainingRoles[0] || 'teacher',
                roles: remainingRoles,
              };
              localStorage.setItem('user', JSON.stringify(updatedUser));
              toast.success('Student profile deleted successfully');
              window.location.href = '/dashboard/teacher';
            } else {
              localStorage.removeItem('user');
              toast.success('Account deleted successfully');
              await auth.signOut();
              window.location.href = '/';
            }
          } catch (err: any) {
            toast.error(err.message || 'Failed to delete account');
            setIsDeletingAccount(false);
          }
        }}
      />

      </main>
      
      {showPreferencesPrompt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-5">
               <Settings className="w-6 h-6 text-teal-600" />
             </div>
             <h3 className="text-xl font-bold text-slate-900 mb-2">Update Group Preferences?</h3>
             <p className="text-slate-600 mb-8 font-medium">You have modified the students in {modifiedGroupQueue.length} group(s). Would you like to review and update their group preferences (e.g., preferred timings, teacher gender) now?</p>
             <div className="flex gap-4">
               <button 
                 onClick={() => { 
                   setShowPreferencesPrompt(false); 
                   executeGroupSave(pendingGroupSaveData, false);
                 }} 
                 disabled={isSavingGroups}
                 className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50"
               >
                 No, Skip
               </button>
               <button 
                 onClick={() => { 
                    setShowPreferencesPrompt(false);
                    executeGroupSave(pendingGroupSaveData, true);
                 }} 
                 disabled={isSavingGroups}
                 className="flex-1 px-4 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 active:scale-95 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50"
               >
                 Yes, Update
               </button>
             </div>
          </div>
        </div>
      )}

      <GroupSettingsModal 
        isOpen={groupSettingsModalOpen}
        onClose={() => {
          setGroupSettingsModalOpen(false);
          setSelectedGroupForSettings(null);
          
          if (modifiedGroupQueue.length > 0) {
             const nextQueue = modifiedGroupQueue.slice(1);
             if (nextQueue.length > 0) {
                setTimeout(() => {
                   const nextId = nextQueue[0];
                   const nextGroup = studentGroups.find((g:any) => g.id === nextId) || { id: nextId, name: `Group` };
                   const requestDoc = data?.groups?.find((g: any) => g.id === nextId) || data?.tuitionRequests?.find((req: any) => req.groupDocId === nextId) || data?.myRequest;
                   setSelectedGroupForSettings({ ...nextGroup, requestDoc });
                   setGroupSettingsModalOpen(true);
                   setModifiedGroupQueue(nextQueue);
                }, 300);
             } else {
                setModifiedGroupQueue([]);
                setActiveTab('profile');
             }
          }
        }}
        groupId={selectedGroupForSettings?.id}
        category={selectedGroupForSettings?.category}
        parentId={(data?.user?.uid || '') as string}
        initialData={selectedGroupForSettings?.requestDoc}
        onSave={() => mutate()}
        studentNames={(() => {
          if (!selectedGroupForSettings?.id) return [];
          const source = pendingGroupSaveData.length > 0 ? pendingGroupSaveData : allStudents;
          return source.filter((s: any) => s.groupDocId === selectedGroupForSettings.id).map((s: any) => s.name);
        })()}
      />
      
      {isSavingGroups && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <Loader2 className="w-12 h-12 text-teal-400 animate-spin mb-4" />
          <h3 className="text-xl font-bold text-white">Setting up your groups...</h3>
          <p className="text-teal-100/70 font-medium mt-2">Please wait a moment.</p>
        </div>
      )}

      {viewingGroupDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-8 max-w-4xl w-[calc(100%-2rem)] shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                {(() => {
                  const groupDoc = data?.groups?.find((g: any) => g.id === viewingGroupDetails.id);
                  const groupDisplayName = String(viewingGroupDetails.name || '').replace(/^Group:\s*/i, '');
                  return (
                    <>
                      <h3 className="text-2xl font-black text-slate-900">Group {viewingGroupDetails.index}: {groupDisplayName}</h3>
                      {groupDoc?.groupId && <p className="text-slate-500 font-medium">ID: {groupDoc.groupId}</p>}
                    </>
                  );
                })()}
              </div>
              <button onClick={() => setViewingGroupDetails(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-grow pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {viewingGroupDetails.students.map((s: any) => (
                  <div key={s.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
                    <div className="flex justify-between items-start mb-1">
                      <h5 className="text-lg font-bold text-slate-800 tracking-tight">{s.name}</h5>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">₹{s.budget}/mo</span>
                    </div>
                    {s.studentId && <p className="text-xs text-slate-500 font-mono font-medium mb-3">ID: {s.studentId}</p>}
                    <div className="space-y-2 text-sm text-slate-600">
                      {s.classLevel && <p><strong className="text-slate-900">Class:</strong> {s.classLevel}</p>}
                      {s.board && <p><strong className="text-slate-900">Board:</strong> {s.board}</p>}
                      {s.subjects && s.subjects.length > 0 && <p><strong className="text-slate-900">Subjects:</strong> {s.subjects.join(', ')}</p>}
                      {s.technologies && s.technologies.length > 0 && <p><strong className="text-slate-900">Tech:</strong> {s.technologies.join(', ')}</p>}
                      {s.languages && s.languages.length > 0 && <p><strong className="text-slate-900">Lang:</strong> {s.languages.join(', ')}</p>}
                    </div>
                  </div>
                ))}
                

              </div>
            </div>
          </div>
        </div>
      )}

      <WhatsAppButton />
        </>
      )}

      {/* PAYMENT MODAL (Root Level for instant accessibility from any state including hard lock) */}
      {payingClass && (() => {
        const coursePrice = payingClass.finalPrice || payingClass.currentOffer || payingClass.budget || 4000;
        const totalToPay = coursePrice;
        
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#00a992]/5 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
              <h3 className="text-2xl font-black text-gray-900 mb-2 relative z-10">Complete Payment</h3>
              <p className="text-gray-500 mb-6 font-medium relative z-10">
                You are paying tuition fee for <span className="font-bold text-gray-900">{payingClass.tutorName || payingClass.teacher}</span>.
              </p>
              
              <div className="bg-gray-50 rounded-2xl p-6 mb-6 border border-gray-100 relative z-10">
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                    <div className="flex flex-col">
                      <span className="text-gray-900">Tuition Fee {payingClass.finalPrice ? '(Negotiated)' : '(Original)'}</span>
                      <span className="text-xs font-medium">Agreed monthly fee</span>
                    </div>
                    <span className="text-gray-900">₹{coursePrice.toLocaleString()}</span>
                  </div>
                </div>
                
                {(data?.userData?.walletBalance || 0) > 0 && (
                  <div className="flex items-start gap-3 mb-4 pt-4 border-t border-gray-200">
                    <input
                      type="checkbox"
                      id="useWallet"
                      checked={useWallet}
                      onChange={(e) => setUseWallet(e.target.checked)}
                      className="mt-1 w-4 h-4 text-[#00a992] rounded border-gray-300 focus:ring-[#00a992]"
                    />
                    <div className="flex-1">
                      <label htmlFor="useWallet" className="text-sm font-bold text-gray-900 cursor-pointer block">
                        Apply Wallet Balance
                      </label>
                      <p className="text-xs text-gray-500 font-medium">Available: ₹{data?.userData?.walletBalance}</p>
                    </div>
                    <span className="text-emerald-600 font-bold text-sm">
                      -₹{useWallet ? Math.min(totalToPay, data?.userData?.walletBalance) : 0}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 text-lg font-black text-gray-900">
                  <span>Total to Pay</span>
                  <span className="text-[#00a992]">
                    ₹{useWallet ? Math.max(0, totalToPay - (data?.userData?.walletBalance || 0)).toLocaleString() : totalToPay.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-4 relative z-10">
                <button
                  onClick={() => { setPayingClass(null); setUseWallet(false); }}
                  className="flex-1 py-3.5 px-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  disabled={paymentLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentSubmit}
                  disabled={paymentLoading}
                  className="flex-1 py-3.5 px-4 rounded-xl font-bold text-white bg-[#063831] hover:bg-[#04241f] shadow-lg shadow-[#063831]/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {paymentLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Pay Securely'
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
