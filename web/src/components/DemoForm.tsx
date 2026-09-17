
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateReferralCode } from '@/utils/referral';
import { 
  User, 
  MapPin, 
  GraduationCap, 
  BookOpen, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  Plus,
  Trash2,
  Users,
  Briefcase,
  Handshake,
  Settings,
  Building,
  IndianRupee,
  Edit2,
  Target,
  Globe,
  Clock,
  Calendar,
  CalendarDays,
  Award,
  Laptop,
  Languages,
  Check,
  UserCheck,
  UserPlus,
  Phone,
  MessageCircle,
  Mail
} from 'lucide-react';
import { generateCustomId } from '@/utils/idGenerator';
import { toast } from 'sonner';
import GroupManager from '@/components/GroupManager';

interface Props {
  category?: string;
  isDashboard?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  activeStudentId?: string;
  initialData?: any;
  existingGroups?: any[];
  parentOnly?: boolean;
  defaultIsEditing?: boolean;
  hasProfile?: boolean;
}

import { getSubjectsForStudent, isSeniorSecondary, ICSE_7_TO_10 } from '@/utils/subjects';

export const ICSE_SUBJECTS = Array.from(ICSE_7_TO_10);

export default function DemoForm({
  category,
  isDashboard = false,
  hasProfile = false,
  onSuccess,
  onCancel,
  activeStudentId,
  initialData,
  existingGroups = [],
  parentOnly = false,
  defaultIsEditing = false,
}: Props) {

  const getInitialFormData = () => {
    if (initialData) {
      const resolvedGroupDocId = initialData.groupDocId || initialData.groupId || `indv_${initialData.id || 'new'}`;
      const groupPrefData = initialData.groupPref || {};
      let cleanMode = groupPrefData.mode || initialData.mode || initialData.preferredMode;
      if (cleanMode === 'Offline (Home Tuition)') cleanMode = 'Offline';
      if (!cleanMode) cleanMode = 'Online';

      const initialGroupPreferences: any = {
        [resolvedGroupDocId]: {
          mode: cleanMode,
          specificDays: groupPrefData.specificDays || groupPrefData.preferredDays || initialData.specificDays || initialData.preferredDays || [],
          hours: groupPrefData.hours || groupPrefData.preferredTimeRange || groupPrefData.hoursPerDay || initialData.hours || initialData.preferredTimeRange || initialData.hoursPerDay || '',
          days: groupPrefData.days || groupPrefData.daysPerWeek || initialData.days || initialData.daysPerWeek || '',
          teacherGenderPreference: groupPrefData.teacherGenderPreference || groupPrefData.genderPreference || initialData.teacherGenderPreference || initialData.genderPreference || 'No Preference',
          addressFlat: groupPrefData.addressFlat || initialData.addressFlat || initialData.address?.split(', ')[0] || '',
          addressStreet: groupPrefData.addressStreet || initialData.addressStreet || initialData.address?.split(', ')[1] || '',
          addressPincode: groupPrefData.addressPincode || initialData.addressPincode || initialData.address?.split(', ')[2] || '',
          area: groupPrefData.area || initialData.area || '',
          city: groupPrefData.city || initialData.city || '',
          latitude: groupPrefData.latitude || initialData.latitude || null,
          longitude: groupPrefData.longitude || initialData.longitude || null,
        }
      };

      return {
        step: (hasProfile && !parentOnly) ? 2 : 1,
        numberOfStudents: 1,
        parentName: initialData.guardianName || initialData.parentName || '',
        phone: initialData.phoneNumber || '',
        whatsapp: initialData.whatsappNumber || '',
        email: initialData.email || '',
        addressFlat: initialData.address?.split(', ')[0] || '',
        addressStreet: initialData.address?.split(', ')[1] || initialData.address || '',
        addressPincode: initialData.address?.split(', ')[2] || '',
        goal: initialData.learningGoal || '',
        requirements: initialData.specialRequirements || '',
        groupPreferences: initialGroupPreferences,
        students: [
          {
            id: initialData.id || 'new',
            fullName: initialData.name || '',
            gender: initialData.gender || '',
            category: initialData.category || category || '',
            studentType: initialData.studentType || '',
            classGrade: initialData.classLevel || '',
            board: initialData.board || '',
            stream: initialData.stream || '',
            subjects: initialData.subjects || [],
            technologies: initialData.technologies || [],
            languages: initialData.languages || [],
            budget: initialData.budget?.toString() || '4000',
            groupId: resolvedGroupDocId,
          }
        ]
      };
    }
    return {
      step: (hasProfile && !parentOnly) ? 2 : 1,
      numberOfStudents: 1,
      parentName: initialData?.guardianName || initialData?.parentName || '',
      phone: '',
      whatsapp: '',
      email: '',
      addressFlat: '',
      addressStreet: '',
      addressPincode: '',
      goal: '',
      requirements: '',
      groupPreferences: {} as any,
      students: [
        {
          id: `new_${Date.now()}`,
          fullName: '',
          gender: '',
          category: category || '',
          studentType: '',
          classGrade: '',
          board: '',
          stream: '',
          subjects: [] as string[],
          technologies: [] as string[],
          languages: [] as string[],
          budget: '4000',
          groupId: 'unassigned',
        }
      ]
    };
  };

  const [isEditing, setIsEditing] = useState(defaultIsEditing || !hasProfile || !initialData || activeStudentId === 'new');
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [formData, setFormData] = useState(getInitialFormData());
  const [shouldSubmitGroup, setShouldSubmitGroup] = useState(false);
  const [showStudentNumberPopup, setShowStudentNumberPopup] = useState(hasProfile && !parentOnly && (!activeStudentId || activeStudentId === 'new'));
  const [tempStudentCount, setTempStudentCount] = useState(1);
  const [selectedExistingGroup, setSelectedExistingGroup] = useState('');
  const [showModifyPrompt, setShowModifyPrompt] = useState(false);

  useEffect(() => {
    if (isDashboard && !initialData) {
      const fetchProfile = async () => {
        try {
          const { auth, db } = await import('@/utils/firebase/client');
          const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');
          await new Promise(resolve => auth.onAuthStateChanged(resolve));
          const user = auth.currentUser;
          if (user) {
            if (hasProfile) {
              const parentDocRef = doc(db, 'parents', user.uid);
              const parentSnap = await getDoc(parentDocRef);
              const parentData = parentSnap.exists() ? parentSnap.data() : null;

              let studentData = null;
              if (activeStudentId && activeStudentId !== 'new') {
                const studentSnap = await getDoc(doc(db, 'students', activeStudentId));
                studentData = studentSnap.exists() ? studentSnap.data() : null;
              } else if (!activeStudentId) {
                const studentQuery = query(collection(db, 'students'), where('parentDocId', '==', user.uid));
                const studentSnap = await getDocs(studentQuery);
                studentData = !studentSnap.empty ? studentSnap.docs[0].data() : null;
              }

              let requestData: any = {};
              if (activeStudentId && activeStudentId !== 'new') {
                const requestQuery = query(collection(db, 'tuition_requests'), where('studentDocId', '==', activeStudentId));
                const requestSnap = await getDocs(requestQuery);
                const requestDocs = requestSnap.docs.map(d => d.data());
                requestDocs.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
                requestData = requestDocs[0] || {};
              } else if (!activeStudentId) {
                const requestQuery = query(collection(db, 'tuition_requests'), where('parentDocId', '==', user.uid));
                const requestSnap = await getDocs(requestQuery);
                const requestDocs = requestSnap.docs.map(d => d.data());
                requestDocs.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
                requestData = requestDocs[0] || {};
              }

              if (studentData) {
                setIsEditing(false);
                setFormData(prev => {
                  const groupId = studentData.groupDocId || `indv_${studentData.id}`;
                  const groupPrefs = { ...prev.groupPreferences };
                  if (!groupPrefs[groupId]) {
                    groupPrefs[groupId] = {
                      teacherGenderPreference: requestData.teacherGenderPreference || studentData.teacherGenderPreference || 'No Preference',
                      mode: studentData.preferredMode || '',
                      hours: studentData.hoursPerDay || requestData.preferredTimeRange || '',
                      days: studentData.daysPerWeek || '',
                      specificDays: studentData.specificDays || [],
                      addressFlat: studentData.address?.split(', ')[0] || '',
                      addressStreet: studentData.address?.split(', ')[1] || studentData.address || '',
                      addressPincode: studentData.address?.split(', ')[2] || '',
                      latitude: requestData.latitude || null,
                      longitude: requestData.longitude || null,
                    };
                  }
                  
                  return {
                    ...prev,
                    parentName: parentData ? parentData.name : (studentData.parentName || ''),
                    phone: studentData.phoneNumber || '',
                    whatsapp: studentData.whatsappNumber || '',
                    email: studentData.email || '',
                    addressFlat: parentData?.address?.split(', ')[0] || '',
                    addressStreet: parentData?.address?.split(', ')[1] || parentData?.address || '',
                    addressPincode: parentData?.address?.split(', ')[2] || '',
                    goal: studentData.learningGoal || '',
                    requirements: studentData.specialRequirements || '',
                    groupPreferences: groupPrefs,
                    numberOfStudents: 1,
                    students: [{
                      id: studentData.id,
                      fullName: studentData.name || '',
                      gender: studentData.gender || '',
                      category: studentData.category || '',
                      studentType: studentData.studentType || '',
                      classGrade: studentData.classLevel || '',
                      board: studentData.board || '',
                      stream: studentData.stream || '',
                      subjects: studentData.subjects || [],
                      technologies: studentData.technologies || [],
                      languages: studentData.languages || [],
                      budget: studentData.budget?.toString() || '4000',
                      groupId: groupId,
                    }]
                  };
                });
              } else {
                setIsEditing(true);
                setFormData(prev => ({
                  ...prev,
                  parentName: parentData ? parentData.name : (user.displayName || ''),
                  email: user.email || prev.email,
                  phone: parentData ? parentData.phone : prev.phone,
                  whatsapp: parentData ? parentData.whatsapp : prev.whatsapp,
                }));
              }
            } else {
              setFormData(prev => ({
                ...prev,
                parentName: user.displayName || prev.parentName,
                email: user.email || prev.email
              }));
            }
          }
        } catch (e) {
          console.error('Failed to load profile', e);
        }
      };
      fetchProfile();
    }
  }, [isDashboard, hasProfile, activeStudentId, initialData]);

  useEffect(() => {
    const studentFormSection = document.getElementById('student-form-section');
    if (studentFormSection) {
      studentFormSection.scrollIntoView({ behavior: 'instant', block: 'start' });
    } else {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: 'instant' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  }, [formData.step]);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationPermissionTargetGroupId, setLocationPermissionTargetGroupId] = useState<string | null>(null);
  const router = useRouter();

  const handleDetectLocation = (groupId: string) => {
    setLocationPermissionTargetGroupId(groupId);
  };

  const executeDetectLocation = (groupId: string) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const { latitude, longitude } = position.coords;
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        
        const street = data.locality || '';
        const city = data.city || '';
        const pincode = data.postcode || '';
        
        setFormData((prev: any) => ({
          ...prev,
          groupPreferences: {
            ...prev.groupPreferences,
            [groupId]: {
              ...prev.groupPreferences[groupId],
              addressStreet: `${street}${street && city ? ', ' : ''}${city}` || prev.groupPreferences[groupId]?.addressStreet,
              addressPincode: pincode || prev.groupPreferences[groupId]?.addressPincode,
              latitude,
              longitude
            }
          }
        }));
        toast.success('Location detected and address updated successfully!');
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.error('Geocoding request timed out');
        } else {
          console.error('Error fetching location details:', err);
        }
        toast.error('Failed to automatically detect your address. Please enter it manually.');
      } finally {
        setLocationLoading(false);
      }
    }, (error) => {
      console.warn('Geolocation error:', error.message);
      toast.error('Failed to get location. Please ensure location permissions are granted.');
      setLocationLoading(false);
    }, { timeout: 10000, maximumAge: 0, enableHighAccuracy: true });
  };

  const handleCommonChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.value;
    const name = e.target.name;
    
    setFormData((prev: any) => {
      const next = { ...prev, [name]: val };
      if (name === 'phone' && sameAsPhone) {
        next.whatsapp = val;
      }
      if (name === 'days') {
        const maxDays = val === 'Daily' ? 7 : parseInt(val.charAt(0)) || 0;
        if (maxDays > 0 && next.specificDays && next.specificDays.length > maxDays) {
          next.specificDays = next.specificDays.slice(0, maxDays);
        }
      }
      return next;
    });
  };

  const handleStudentChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.value;
    const name = e.target.name;
    
    setFormData((prev: any) => {
      const newStudents = [...prev.students];
      newStudents[index] = { ...newStudents[index], [name]: val };
      return { ...prev, students: newStudents };
    });
  };

  const handleStudentCheckbox = (index: number, field: string, value: string) => {
    setFormData((prev: any) => {
      const newStudents = [...prev.students];
      const array = newStudents[index][field] || [];
      const newArray = array.includes(value)
        ? array.filter((item: string) => item !== value)
        : [...array, value];
      newStudents[index] = { ...newStudents[index], [field]: newArray };
      return { ...prev, students: newStudents };
    });
  };
  


  const handleSpecificDayCheckbox = (day: string) => {
    setFormData((prev: any) => {
      const array = prev.specificDays || [];
      if (array.includes(day)) {
        return { ...prev, specificDays: array.filter((d: string) => d !== day) };
      } else {
        const maxDays = prev.days === 'Daily' ? 7 : parseInt(prev.days?.charAt(0)) || 0;
        if (maxDays > 0 && array.length >= maxDays) {
          return prev;
        }
        return { ...prev, specificDays: [...array, day] };
      }
    });
  };

  const updateNumberOfStudents = (num: number) => {
    setFormData((prev: any) => {
      const currentStudents = [...prev.students];
      const targetLen = Math.max(1, num);
      if (targetLen > currentStudents.length) {
        for (let i = currentStudents.length; i < targetLen; i++) {
          currentStudents.push({
            id: `new_${Date.now()}_${i}`,
            fullName: '',
            category: '',
            gender: '',
            studentType: '',
            classGrade: '',
            board: '',
            stream: '',
            subjects: [],
            technologies: [],
            languages: [],
            budget: '4000',
            groupId: 'unassigned'
          });
        }
      } else if (targetLen < currentStudents.length) {
        currentStudents.length = targetLen;
      }
      return { ...prev, numberOfStudents: num, students: currentStudents };
    });
  };

  const handleSameAsPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSameAsPhone(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, whatsapp: prev.phone }));
    }
  };

  const handleSubmit = async (e?: React.FormEvent, skipGroupingCheck = false) => {
    if (e) e.preventDefault();
    
    if (!formData.numberOfStudents || formData.numberOfStudents < 1) {
      alert("Please enter a valid number of students (e.g. 1)");
      return;
    }
    
    if (!parentOnly && !skipGroupingCheck) {
      if (formData.step < formData.numberOfStudents + 1) {
        setFormData(prev => ({ ...prev, step: prev.step + 1 }));
        return;
      }
      if (formData.step === formData.numberOfStudents + 1) {
        if (activeStudentId && activeStudentId !== 'new') {
           setFormData(prev => ({ ...prev, step: prev.step + 2 }));
           return;
        }
        if (formData.numberOfStudents === 1 && existingGroups.length === 0) {
           setFormData(prev => {
             const newStudents = [...prev.students];
             newStudents[0].groupId = (newStudents[0].groupId && newStudents[0].groupId !== 'unassigned')
               ? newStudents[0].groupId
               : `indv_${newStudents[0].id || Date.now()}`;
             return { ...prev, students: newStudents, step: prev.step + 2 };
           });
           return;
        }
        setFormData(prev => ({ ...prev, step: prev.step + 1 })); // Move to grouping step
        return;
      }
    }
    
    setLoading(true);
    setSuccessMsg('');


    
    if (!isDashboard) {
      const { auth } = await import('@/utils/firebase/client');
      if (auth.currentUser) {
        await auth.signOut();
      }
      sessionStorage.setItem('demoFormData', JSON.stringify({ ...formData }));
      router.push('/signup?role=student&next=/dashboard/student');
      return;
    }

    try {
      const { auth, db } = await import('@/utils/firebase/client');
      const { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc } = await import('firebase/firestore');
      
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");

      if (!hasProfile) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        const newCode = (userDocSnap.exists() && userDocSnap.data().referralCode) || generateReferralCode(formData.parentName, user.uid);
        await setDoc(userDocRef, { hasProfile: true, referralCode: newCode, name: formData.parentName }, { merge: true });

        // Retroactively update pending referral tickets with formal name via secure server route
        const token = await user.getIdToken();
        await fetch('/api/referrals/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'sync_name',
            refereeUid: user.uid,
            refereeName: formData.parentName
          })
        }).catch(console.error);
      }

      let customParentId = user.uid;
      const pQuery = query(collection(db, 'parents'), where('authUid', '==', user.uid));
      const pSnap = await getDocs(pQuery);
      if (!pSnap.empty) {
        customParentId = pSnap.docs[0].data().parentId || generateCustomId('MTP');
      } else {
        customParentId = generateCustomId('MTP');
      }

      const parentDocRef = doc(db, 'parents', user.uid);
      await setDoc(parentDocRef, { 
        parentId: customParentId,
        parentDocId: user.uid, 
        authUid: user.uid,
        name: formData.parentName,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        email: formData.email
      }, { merge: true });

      if (parentOnly) {
        setSuccessMsg('Parent profile updated successfully!');
        toast.success("Profile saved successfully!", { description: "Your parent profile has been updated." });
        sessionStorage.removeItem('demoFormData');
        if (onSuccess) await onSuccess();
        return;
      }

      if (activeStudentId && activeStudentId !== 'new') {
        const s = formData.students[0];
        const groupId = (s as any).groupDocId || (s as any).groupId || (initialData?.groupDocId) || (initialData?.groupId) || `indv_${activeStudentId}`;
        const groupPref = formData.groupPreferences?.[groupId] || formData.groupPreferences?.[(s as any).groupId] || {};
        
        let targetMode = groupPref.mode;
        if (targetMode === 'Offline (Home Tuition)') targetMode = 'Offline';
        if (!targetMode) targetMode = 'Online';

        const combinedAddress = targetMode === 'Online' ? '' : [groupPref.addressFlat, groupPref.addressStreet, groupPref.addressPincode].filter(Boolean).join(', ');

        let finalLat = targetMode === 'Online' ? null : (groupPref.latitude || null);
        let finalLng = targetMode === 'Online' ? null : (groupPref.longitude || null);

        if (targetMode === 'Offline' && (!finalLat || !finalLng) && combinedAddress) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(combinedAddress)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
              finalLat = parseFloat(data[0].lat);
              finalLng = parseFloat(data[0].lon);
            }
          } catch (err) {
            console.error("Geocoding failed during save:", err);
          }
        }

        const studentData: any = {
          id: activeStudentId,
          guardianName: formData.parentName,
          category: s.category || '',
          name: s.fullName,
          gender: s.gender,
          phoneNumber: formData.phone,
          whatsappNumber: formData.whatsapp,
          email: formData.email,
          studentType: s.studentType,
          classLevel: s.classGrade,
          board: s.board,
          subjects: s.subjects || [],
          technologies: s.technologies || [],
          languages: s.languages || [],
          budget: parseInt(s.budget) || 0,
          groupDocId: groupId,
        };
        if (initialData?.groupId && !initialData.groupId.startsWith('indv_')) {
          studentData.groupId = initialData.groupId;
        }

        const studentRef = doc(db, 'students', activeStudentId);
        await updateDoc(studentRef, studentData);

        // Update Groups Doc
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);
        const existingGroupData = groupSnap.exists() ? groupSnap.data() : null;
        const currentStudentDocIds = existingGroupData?.studentDocIds || [];
        const mergedStudentDocIds = Array.from(new Set([...currentStudentDocIds, activeStudentId]));

        await setDoc(groupRef, {
           groupDocId: groupId,
           parentDocId: user.uid,
           studentDocIds: mergedStudentDocIds,
           mode: targetMode,
           area: combinedAddress,
           city: targetMode === 'Online' ? '' : (groupPref.addressPincode || combinedAddress.split(',').pop()?.trim() || ''),
           latitude: finalLat,
           longitude: finalLng,
           teacherGenderPreference: groupPref.teacherGenderPreference || 'No Preference',
           preferredTimeRange: groupPref.hours || '',
           daysPerWeek: groupPref.days || '',
           specificDays: groupPref.specificDays || [],
           updatedAt: Date.now()
        }, { merge: true });

        // Update Aggregate Tuition Request
        const { syncTuitionRequestForGroup } = await import('@/utils/groupUtils');
        await syncTuitionRequestForGroup(db, groupId, user.uid);

        setSuccessMsg('Profile updated successfully!');
        toast.success("Profile saved successfully!", { description: "Student profile has been updated." });
      } else {
        const studentDocs = [];
        for (let i = 0; i < formData.numberOfStudents; i++) {
           const s = formData.students[i];
           const newStudentId = generateCustomId('MTS');
           const newStudentRef = doc(collection(db, 'students'));
           let tempGroupId = (s as any).groupId || 'unassigned';
           if (tempGroupId === 'unassigned') {
              tempGroupId = generateCustomId('MTG');
           }
           studentDocs.push({
             ref: newStudentRef,
             data: {
               studentId: newStudentId,
               id: newStudentRef.id,
               guardianName: formData.parentName,
               dob: '',
               parentDocId: user.uid,
               category: s.category || '',
               name: s.fullName,
               gender: s.gender,
               phoneNumber: formData.phone,
               whatsappNumber: formData.whatsapp,
               email: formData.email,
               studentType: s.studentType,
               classLevel: s.classGrade,
               board: s.board,
               subjects: s.subjects || [],
               budget: parseInt(s.budget) || 0,
               technologies: s.technologies || [],
               languages: s.languages || [],
               groupDocId: tempGroupId,
               isAvailable: true,
               createdAt: Date.now()
             },
             frontendStudent: s
           });
        }
        
        for (const sDoc of studentDocs) {
           await setDoc(sDoc.ref, sDoc.data);
        }

        const uniqueGroups = Array.from(new Set(studentDocs.map(s => s.data.groupDocId)));
        for (const gId of uniqueGroups) {
           const groupStudents = studentDocs.filter(s => s.data.groupDocId === gId);
           const studentIds = groupStudents.map(s => s.data.id);
           const lookupId = groupStudents[0].frontendStudent.groupId || 'unassigned';
           const groupPref = formData.groupPreferences?.[lookupId] || formData.groupPreferences?.[gId] || {};
           const combinedAddress = groupPref.mode === 'Online' ? '' : [groupPref.addressFlat, groupPref.addressStreet, groupPref.addressPincode].filter(Boolean).join(', ');
           
           let finalLat = groupPref.latitude || null;
           let finalLng = groupPref.longitude || null;

           if (groupPref.mode === 'Offline' && (!finalLat || !finalLng) && combinedAddress) {
             try {
               const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(combinedAddress)}&limit=1`);
               const data = await res.json();
               if (data && data.length > 0) {
                 finalLat = parseFloat(data[0].lat);
                 finalLng = parseFloat(data[0].lon);
               }
             } catch (err) {
               console.error("Geocoding failed during save:", err);
             }
           }
           
           // Check if gId is an existing group in Firestore
           const existingGroupRef = doc(db, 'groups', gId);
           const existingGroupSnap = await getDoc(existingGroupRef);

           if (existingGroupSnap.exists()) {
             // 1. Existing group: Append new student IDs to the existing group
             const existingData = existingGroupSnap.data();
             const currentStudentIds = existingData?.studentDocIds || [];
             const mergedStudentIds = Array.from(new Set([...currentStudentIds, ...studentIds]));

             const groupUpdatePayload: any = {
               studentDocIds: mergedStudentIds,
               updatedAt: Date.now()
             };

             const hasCustomGroupPref = Object.keys(groupPref).length > 0 && (groupPref.mode || groupPref.hours || groupPref.days);
             if (hasCustomGroupPref) {
               if (groupPref.mode) groupUpdatePayload.mode = groupPref.mode;
               if (groupPref.mode === 'Offline') {
                 if (combinedAddress) groupUpdatePayload.area = combinedAddress;
                 groupUpdatePayload.city = groupPref.addressPincode || combinedAddress.split(',').pop()?.trim() || '';
                 if (finalLat) groupUpdatePayload.latitude = finalLat;
                 if (finalLng) groupUpdatePayload.longitude = finalLng;
               } else if (groupPref.mode === 'Online') {
                 groupUpdatePayload.area = '';
                 groupUpdatePayload.city = '';
                 groupUpdatePayload.latitude = null;
                 groupUpdatePayload.longitude = null;
               }
               if (groupPref.teacherGenderPreference) groupUpdatePayload.teacherGenderPreference = groupPref.teacherGenderPreference;
               if (groupPref.hours) groupUpdatePayload.preferredTimeRange = groupPref.hours;
               if (groupPref.days) groupUpdatePayload.daysPerWeek = groupPref.days;
               if (groupPref.specificDays) groupUpdatePayload.specificDays = groupPref.specificDays;
             }

             await updateDoc(existingGroupRef, groupUpdatePayload);

             for (const sDoc of groupStudents) {
               await updateDoc(sDoc.ref, { groupDocId: gId });
             }

             // 2. Sync the existing aggregate tuition request document
             const { syncTuitionRequestForGroup } = await import('@/utils/groupUtils');
             await syncTuitionRequestForGroup(db, gId, user.uid);
           } else {
             // Brand new group: create new group doc and new tuition_requests doc
             const groupRef = doc(collection(db, 'groups'));
             const groupDocId = groupRef.id;

             for (const sDoc of groupStudents) {
                 await updateDoc(sDoc.ref, { groupDocId: groupDocId });
             }

             await setDoc(groupRef, {
                groupId: generateCustomId('MTG'),
                groupDocId: groupDocId,
                parentDocId: user.uid,
                studentDocIds: studentIds,
                mode: groupPref.mode || '',
                area: combinedAddress,
                city: groupPref.mode === 'Online' ? '' : (groupPref.addressPincode || combinedAddress.split(',').pop()?.trim() || ''),
                latitude: groupPref.mode === 'Online' ? null : finalLat,
                longitude: groupPref.mode === 'Online' ? null : finalLng,
                teacherGenderPreference: groupPref.teacherGenderPreference || 'No Preference',
                preferredTimeRange: groupPref.hours || '',
                daysPerWeek: groupPref.days || '',
                specificDays: groupPref.specificDays || [],
                status: 'active',
                createdAt: Date.now()
             });
             
             const combinedSubjects = Array.from(new Set(groupStudents.flatMap(s => s.data.subjects)));
             const combinedTechnologies = Array.from(new Set(groupStudents.flatMap(s => s.data.technologies)));
             const combinedLanguages = Array.from(new Set(groupStudents.flatMap(s => s.data.languages)));
             const combinedBudget = groupStudents.reduce((acc, s) => acc + s.data.budget, 0);
             const studentsDetails = groupStudents.map(s => ({
                id: s.data.id,
                name: s.data.name,
                classLevel: s.data.classLevel,
                board: s.data.board,
                subjects: s.data.subjects,
                technologies: s.data.technologies,
                languages: s.data.languages,
                budget: s.data.budget,
             }));
             
             const newRequestId = generateCustomId('REQ');
             const newRequestRef = doc(collection(db, 'tuition_requests'));
             await setDoc(newRequestRef, {
                requestId: newRequestId,
                groupDocId: groupDocId,
                parentDocId: user.uid,
                category: groupStudents[0].data.category,
                mode: groupPref.mode || '',
                area: combinedAddress,
                city: groupPref.mode === 'Online' ? '' : (groupPref.addressPincode || combinedAddress.split(',').pop()?.trim() || ''),
                latitude: groupPref.mode === 'Online' ? null : finalLat,
                longitude: groupPref.mode === 'Online' ? null : finalLng,
                teacherGenderPreference: groupPref.teacherGenderPreference || 'No Preference',
                preferredTimeRange: groupPref.hours || '',
                daysPerWeek: groupPref.days || '',
                specificDays: groupPref.specificDays || [],
                studentsDetails,
                combinedSubjects,
                combinedTechnologies,
                combinedLanguages,
                combinedBudget,
                status: 'open',
                acceptedTutorId: '',
                createdAt: Date.now()
             });
           }
        }
        setSuccessMsg('Student(s) added successfully!');
        toast.success("Student(s) added successfully!", { description: "New students have been registered." });
      }

      sessionStorage.removeItem('demoFormData');
      if (isDashboard) {
        if (onSuccess) await onSuccess();
      } else {
        setTimeout(() => router.push('/dashboard/student'), 2000);
      }
    } catch (err: any) {
      toast.error('Submission failed', { description: err.message });
      alert(err.message || 'Failed to submit demo request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shouldSubmitGroup) {
      setShouldSubmitGroup(false);
      handleSubmit(undefined, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSubmitGroup]);

  const getAvailableSubjects = (board: string, classGrade: string, stream?: string) => {
    return getSubjectsForStudent(board, classGrade, stream);
  };

  const renderProfileView = () => {
    const student = formData.students[0];
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="flex justify-between items-center border-b border-slate-100 pb-6">
          <div>
            <h2 className="text-3xl font-black text-black flex items-center gap-2.5">
              <User className="w-7 h-7 text-[#00a992]" />
              <span>My Profile</span>
            </h2>
            <p className="text-slate-500 mt-1 font-medium">Your learning preferences and details.</p>
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="bg-teal-50 text-[#00a992] hover:bg-teal-100 hover:text-[#008f7b] px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {!parentOnly && (
            <>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Full Name</p>
                <p className="text-lg font-bold text-slate-800">{student.fullName || '-'}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Gender</p>
                <p className="text-lg font-bold text-slate-800 capitalize">{student.gender || '-'}</p>
              </div>
            </>
          )}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Parent's Name</p>
            <p className="text-lg font-bold text-slate-800">{formData.parentName || '-'}</p>
          </div>
          {!parentOnly && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Category</p>
              <p className="text-lg font-bold text-purple-600 capitalize">{formData.students?.[0]?.category || category || '-'}</p>
            </div>
          )}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Phone / WhatsApp</p>
            <p className="text-lg font-bold text-slate-800">{formData.phone || formData.whatsapp || '-'}</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Email</p>
            <p className="text-lg font-bold text-slate-800">{formData.email || '-'}</p>
          </div>
          {(!formData.groupPreferences || !Object.values(formData.groupPreferences).every((g: any) => g.mode === 'Online')) && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 md:col-span-2">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Residential Address</p>
              <p className="text-lg font-bold text-slate-800">{[formData.addressFlat, formData.addressStreet, formData.addressPincode].filter(Boolean).join(', ') || '-'}</p>
            </div>
          )}
          
          {student.category === 'school' && (
            <>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Class / Grade</p>
                <p className="text-lg font-bold text-slate-800">{student.classGrade || '-'}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Subjects</p>
                <p className="text-lg font-bold text-slate-800">{student.subjects?.length > 0 ? student.subjects.join(', ') : '-'}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Board</p>
                <p className="text-lg font-bold text-slate-800">{student.board || '-'}</p>
              </div>
            </>
          )}

          {student.category === 'programming' && student.technologies.length > 0 && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 col-span-1 md:col-span-2">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Technologies</p>
              <div className="flex gap-2 flex-wrap">
                {student.technologies.map((t: string) => (
                  <span key={t} className="bg-purple-100/50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-md text-sm font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {student.category === 'languages' && student.languages.length > 0 && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 col-span-1 md:col-span-2">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Languages</p>
              <div className="flex gap-2 flex-wrap">
                {student.languages.map((l: string) => (
                  <span key={l} className="bg-blue-100/50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-md text-sm font-medium">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}


          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Preferred Mode</p>
            <p className="text-lg font-bold text-slate-800">{(formData.students?.[0]?.category === 'programming') ? 'Online' : (Array.from(new Set(Object.values(formData.groupPreferences || {}).map((g: any) => g.mode).filter(Boolean))).join(', ') || '-')}</p>
          </div>
          
          {(formData.goal || formData.requirements) && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 col-span-1 md:col-span-2">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Goals & Requirements</p>
              <p className="text-base text-slate-700 whitespace-pre-wrap">{formData.goal} {formData.requirements}</p>
            </div>
          )}
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-500 font-medium">
          <p className="mb-2">Legal & Policies</p>
          <div className="flex justify-center gap-4">
            <Link href="/legal/privacy-policy" target="_blank" className="hover:text-[#00a992] transition-colors">Privacy Policy</Link>
            <span>&bull;</span>
            <Link href="/legal/terms-and-conditions" target="_blank" className="hover:text-[#00a992] transition-colors">Terms & Conditions</Link>
            <span>&bull;</span>
            <Link href="/legal/refund-policy" target="_blank" className="hover:text-[#00a992] transition-colors">Refund Policy</Link>
          </div>
        </div>
      </div>
    );
  };

  const isGroupPreferencesStep = !parentOnly && formData.step === (formData.numberOfStudents || 1) + 3;

  const renderFormStep = () => {
    if (formData.step === 1) {
      return (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
          {(!hasProfile || parentOnly) && (
            <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800 border-b pb-3 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#00a992]" />
                <span>Parent / Guardian Details</span>
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#00a992]" />
                    <span>Parent/Guardian Name</span>
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    name="parentName"
                    value={formData.parentName}
                    onChange={handleCommonChange}
                    required
                    placeholder="Enter full name"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#00a992]" />
                    <span>Email Address</span>
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleCommonChange}
                    required
                    disabled={isDashboard}
                    placeholder="Enter email"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-slate-100/50 cursor-not-allowed text-slate-500"
                  />
                  {isDashboard && <p className="text-xs text-slate-500 mt-1">Fetched securely from your account.</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#00a992]" />
                    <span>Phone Number</span>
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">+91</span>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0,10);
                        setFormData(prev => {
                          const next = { ...prev, phone: val };
                          if (sameAsPhone) next.whatsapp = val;
                          return next;
                        });
                      }}
                      required
                      placeholder="Enter 10-digit number"
                      className="w-full border border-slate-300 rounded-xl pl-12 pr-4 py-3 bg-white"
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-[#00a992]" />
                      <span>WhatsApp Number</span>
                      <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={sameAsPhone}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSameAsPhone(checked);
                          if (checked) {
                            setFormData(prev => ({ ...prev, whatsapp: prev.phone }));
                          }
                        }}
                        className="accent-emerald-600"
                      />
                      Same as Phone
                    </label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">+91</span>
                    <input
                      type="tel"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={(e) => {
                        if (!sameAsPhone) {
                          setFormData(prev => ({ ...prev, whatsapp: e.target.value.replace(/\D/g, '').slice(0,10) }));
                        }
                      }}
                      required
                      disabled={sameAsPhone}
                      placeholder="WhatsApp number"
                      className={`w-full border border-slate-300 rounded-xl pl-12 pr-4 py-3 ${sameAsPhone ? 'bg-slate-100' : 'bg-white'}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}


          {!parentOnly && (
            <>
              <div>
                <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#00a992]" />
                  <span>Learning Goal</span>
                </label>
                <textarea
                  name="goal"
                  value={formData.goal}
                  onChange={handleCommonChange}
                  placeholder="E.g., Improve grades, learn conversational German..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  rows={2}
                />
              </div>
            </>
          )}
        </div>
      );
    }

    if (isGroupPreferencesStep) {
      const uniqueGroups = Array.from(new Set(formData.students.slice(0, formData.numberOfStudents).map((s: any) => s.groupId || 'unassigned')));
      
      const handleGroupPrefChange = (groupId: string, field: string, value: any) => {
        setFormData((prev: any) => {
          let updatedSpecificDays = prev.groupPreferences[groupId]?.specificDays || [];
          
          if (field === 'days') {
             const maxDays = value === 'Daily' ? 7 : parseInt(value.charAt(0)) || 0;
             if (maxDays > 0 && updatedSpecificDays.length > maxDays) {
                 updatedSpecificDays = updatedSpecificDays.slice(0, maxDays);
             }
          }
          
          const isAddressChange = ['addressFlat', 'addressStreet', 'addressPincode'].includes(field);

          return {
            ...prev,
            groupPreferences: {
              ...prev.groupPreferences,
              [groupId]: {
                ...prev.groupPreferences[groupId],
                [field]: value,
                ...(field === 'days' ? { specificDays: updatedSpecificDays } : {}),
                ...(isAddressChange ? { latitude: null, longitude: null } : {})
              }
            }
          };
        });
      };

      const handleSpecificDayGroup = (groupId: string, day: string) => {
        setFormData(prev => {
          const currentDays = prev.groupPreferences[groupId]?.specificDays || [];
          const newDays = currentDays.includes(day) ? currentDays.filter((d: string) => d !== day) : [...currentDays, day];
          return {
            ...prev,
            groupPreferences: {
              ...prev.groupPreferences,
              [groupId]: {
                ...prev.groupPreferences[groupId],
                specificDays: newDays
              }
            }
          };
        });
      };

      return (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
          <h3 className="text-2xl font-bold border-b pb-4">Group Preferences</h3>
          <p className="text-slate-500 mb-6">Please set the preferences for each group you created.</p>
          
          <div className="space-y-10">
            {uniqueGroups.map((groupId: string, index: number) => {
              const pref = formData.groupPreferences[groupId] || {};
              const studentsInGroup = formData.students.filter(s => s.groupId === groupId);
              const groupNames = studentsInGroup.map(s => s.fullName || 'Student').join(', ');
              const isProgramming = studentsInGroup.some(s => s.category === 'programming');
              
              if (isProgramming && pref.mode !== 'Online') {
                 setTimeout(() => handleGroupPrefChange(groupId, 'mode', 'Online'), 0);
              }

              return (
                <div key={groupId} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 relative">
                  <div className="absolute top-0 left-0 bg-purple-100 text-purple-700 font-bold px-4 py-1 rounded-br-xl rounded-tl-2xl text-xs uppercase tracking-wider">
                    Group {index + 1}
                  </div>
                  <div className="pt-4">
                    <p className="font-semibold text-slate-800 text-sm mb-1">Students in this group:</p>
                    <p className="text-slate-600 font-medium">{groupNames}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#00a992]" />
                        <span>Teacher Gender Preference</span>
                        <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {['Male', 'Female', 'No Preference'].map((item) => (
                          <label key={item} className="flex items-center gap-2 font-medium cursor-pointer bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-purple-500 transition-colors">
                            <input
                              type="radio"
                              name={`gender_${groupId}`}
                              value={item}
                              checked={pref.teacherGenderPreference === item}
                              onChange={(e) => handleGroupPrefChange(groupId, 'teacherGenderPreference', e.target.value)}
                              required
                              className="accent-purple-500"
                            />
                            <span className="text-sm">{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#00a992]" />
                        <span>Preferred Mode</span>
                        <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      {isProgramming ? (
                        <div className="border border-purple-200 bg-purple-50 rounded-xl px-4 py-3 flex items-center gap-3">
                          <input type="radio" checked readOnly className="accent-purple-500" />
                          <span className="font-semibold text-purple-700 text-sm">Online Only (For Programming)</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {['Online', 'Offline'].map((item) => (
                            <label key={item} className="flex items-center gap-2 font-medium cursor-pointer bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-purple-500 transition-colors">
                              <input
                                type="radio"
                                name={`mode_${groupId}`}
                                value={item}
                                checked={pref.mode === item}
                                onChange={(e) => handleGroupPrefChange(groupId, 'mode', e.target.value)}
                                required
                                className="accent-purple-500"
                              />
                              <span className="text-sm">{item}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {(pref.mode === 'Offline' && !isProgramming) && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <label className="text-sm font-semibold flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-[#00a992]" />
                          <span>Group Address</span>
                          <span className="text-red-500 font-bold ml-0.5">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDetectLocation(groupId)}
                          disabled={locationLoading}
                          className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{locationLoading ? 'Detecting...' : 'Detect Current Location'}</span>
                        </button>
                      </div>
                      <div className="grid gap-3">
                        <input
                          type="text"
                          placeholder="Flat / House No. & Building"
                          value={pref.addressFlat || ''}
                          onChange={(e) => handleGroupPrefChange(groupId, 'addressFlat', e.target.value)}
                          required={pref.mode === 'Offline'}
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Street & Landmark"
                          value={pref.addressStreet || ''}
                          onChange={(e) => handleGroupPrefChange(groupId, 'addressStreet', e.target.value)}
                          required={pref.mode === 'Offline'}
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Pincode"
                          value={pref.addressPincode || ''}
                          onChange={(e) => handleGroupPrefChange(groupId, 'addressPincode', e.target.value)}
                          required={pref.mode === 'Offline'}
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#00a992]" />
                        <span>Preferred Time Range</span>
                        <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <select 
                        value={pref.hours || ''} 
                        onChange={(e) => handleGroupPrefChange(groupId, 'hours', e.target.value)} 
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white text-sm"
                        required
                      >
                        <option value="">Flexible / Any Time</option>
                        <option value="Morning (8 AM - 12 PM)">Morning (8 AM - 12 PM)</option>
                        <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                        <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
                        <option value="Night (After 8 PM)">Night (After 8 PM)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#00a992]" />
                        <span>Days per Week</span>
                        <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <select 
                        value={pref.days || ''} 
                        onChange={(e) => handleGroupPrefChange(groupId, 'days', e.target.value)} 
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white text-sm"
                        required
                      >
                        <option value="">Select days</option>
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
                  
                  {pref.days && (
                    <div>
                      <label className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-[#00a992]" />
                        <span>Specific Days of the Week (Optional)</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                          const specificDays = pref.specificDays || [];
                          const isChecked = specificDays.includes(day);
                          const maxDays = pref.days === 'Daily' ? 7 : parseInt(pref.days?.charAt(0)) || 0;
                          const isAtMax = maxDays > 0 && specificDays.length >= maxDays;
                          const isDisabled = !isChecked && isAtMax;
                          return (
                          <label key={day} className={`flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-purple-500'}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isDisabled}
                              onChange={() => handleSpecificDayGroup(groupId, day)}
                              className="accent-purple-500"
                            />
                            <span className="text-xs font-medium">{day.substring(0,3)}</span>
                          </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const sIndex = formData.step - 2;
    const student = formData.students[sIndex];

    return (
      <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
        <h3 className="text-2xl font-bold border-b pb-4">
          {(!activeStudentId || activeStudentId === 'new') && formData.numberOfStudents > 1
            ? `Details for Student (${sIndex + 1}/${formData.numberOfStudents})`
            : 'Details for Student'}
        </h3>
        
        {!hasProfile && sIndex === 0 && (
          <div className="my-6">
            <label className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00a992]" />
              <span>Number of Students</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.numberOfStudents || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                updateNumberOfStudents(val === '' ? 0 : parseInt(val));
              }}
              placeholder="Enter number of students (e.g. 1)"
              className="w-full border border-slate-300 rounded-xl px-4 py-4 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Select how many students you'd like to register (you can add more later from your profile).
            </p>
          </div>
        )}
        
        <div className="mb-6">
          <label className="text-sm font-semibold mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#00a992]" />
            <span>Category</span>
            <span className="text-red-500 font-bold ml-0.5">*</span>
          </label>
          <select
            name="category"
            value={student.category || ''}
            onChange={(e) => handleStudentChange(sIndex, e)}
            className="w-full border border-slate-300 rounded-xl px-4 py-4 bg-white"
            required
          >
            <option value="">Select Category</option>
            <option value="school">School / Academics</option>
            <option value="programming">Programming / IT</option>
            <option value="languages">Languages</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-semibold mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-[#00a992]" />
              <span>Student Name</span>
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              placeholder="Enter student name"
              value={student.fullName}
              onChange={(e) => handleStudentChange(sIndex, e)}
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-4"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00a992]" />
              <span>Gender</span>
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <div className="flex flex-wrap gap-4 sm:gap-6 pt-3">
              {['Female', 'Male', 'Other'].map((item) => (
                <label key={item} className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="gender"
                    value={item}
                    checked={student.gender === item}
                    onChange={(e) => handleStudentChange(sIndex, e)}
                    required
                    className="accent-purple-500 w-4 h-4"
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <label className="block text-sm font-semibold mb-2 flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-[#00a992]" />
              <span>Expected Budget / Monthly Fee</span>
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </span>
            <span className="text-emerald-600 font-bold">&#8377;{student.budget}</span>
          </label>
          <input
            type="range"
            name="budget"
            min="1000"
            max="20000"
            step="500"
            value={student.budget || '4000'}
            onChange={(e) => handleStudentChange(sIndex, e)}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium">
            <span>&#8377;1,000</span>
            <span>&#8377;20,000</span>
          </div>
        </div>

        {student.category === 'school' && (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#00a992]" />
                  <span>Student Type</span>
                  <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <select
                  name="studentType"
                  value={student.studentType}
                  onChange={(e) => handleStudentChange(sIndex, e)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-4 bg-white"
                  required
                >
                  <option value="">Select option</option>
                  <option value="School Student">School Student</option>
                  <option value="College Student">College Student</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#00a992]" />
                  <span>Class / Grade</span>
                  <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <select
                  name="classGrade"
                  value={student.classGrade}
                  onChange={(e) => handleStudentChange(sIndex, e)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-4 bg-white"
                  required
                >
                  <option value="">Select class</option>
                  {student.studentType === 'College Student' ? (
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
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                        <option key={num} value={`${num}th Standard`}>{num}th Standard</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#00a992]" />
                <span>Board</span>
                <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['CBSE', 'ICSE', 'State Board', 'IB / IGCSE'].map((item) => (
                  <label key={item} className="flex items-center gap-3 border border-slate-300 rounded-xl px-4 py-4 cursor-pointer hover:border-purple-500">
                    <input
                      type="radio"
                      name="board"
                      value={item}
                      checked={student.board === item}
                      onChange={(e) => handleStudentChange(sIndex, e)}
                      required
                      className="accent-purple-500"
                    />
                    <span className="font-medium">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex flex-col gap-2 mb-3">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#00a992]" />
                  <span>Subjects</span>
                  <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>

                {isSeniorSecondary(student.classGrade) && (
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-medium w-full sm:w-fit">
                    <span className="text-slate-500 px-1.5">Stream:</span>
                    {(['All', 'Science', 'Commerce', 'Arts / Humanities'] as const).map((st) => {
                      const active = (student.stream || 'All') === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            const newStudents = [...formData.students];
                            newStudents[sIndex] = { ...newStudents[sIndex], stream: st === 'All' ? '' : st };
                            setFormData({ ...formData, students: newStudents });
                          }}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            active
                              ? 'bg-purple-600 text-white shadow-sm font-semibold'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {!student.board ? (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">Please select a board to see subjects.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getAvailableSubjects(student.board, student.classGrade, student.stream).map(sub => (
                    <label key={sub} className="flex items-center gap-3 border border-slate-300 rounded-xl px-4 py-3 cursor-pointer hover:border-purple-500 transition-all">
                      <input
                        type="checkbox"
                        checked={student.subjects?.includes(sub)}
                        onChange={() => handleStudentCheckbox(sIndex, 'subjects', sub)}
                        className="accent-purple-500"
                      />
                      <span className="text-sm font-medium">{sub}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {student.category === 'programming' && (
          <div>
            <label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-[#00a992]" />
              <span>Technologies</span>
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['Python', 'Java', 'AI & ML', 'HTML & CSS', 'Data Analytics', 'Gen AI', 'Agentic AI'].map((item) => (
                <label key={item} className="border border-slate-300 rounded-xl px-4 py-4 flex items-center gap-3 hover:border-purple-500 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={student.technologies.includes(item)}
                    onChange={() => handleStudentCheckbox(sIndex, 'technologies', item)}
                    className="accent-purple-500"
                  />
                  <span className="font-medium">{item}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {student.category === 'languages' && (
          <div>
            <label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Languages className="w-4 h-4 text-[#00a992]" />
              <span>Languages</span>
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['English', 'Arabic', 'German', 'Japanese', 'French', 'Spanish'].map((item) => (
                <label key={item} className="border border-slate-300 rounded-xl px-4 py-4 flex items-center gap-3 hover:border-purple-500 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={student.languages.includes(item)}
                    onChange={() => handleStudentCheckbox(sIndex, 'languages', item)}
                    className="accent-purple-500"
                  />
                  <span className="font-medium">{item}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const isGroupingStep = !parentOnly && formData.step === (formData.numberOfStudents || 1) + 2;

  if (isGroupingStep) {
    const handleGroupingStrategy = (strategy: string, existingGroupId?: string) => {
      const newStudents = [...formData.students];
      if (strategy === 'together') {
        const newGroupId = `new_group_${Date.now()}`;
        for (let i = 0; i < formData.numberOfStudents; i++) {
          newStudents[i].groupId = newGroupId;
        }
        setFormData(prev => ({ ...prev, students: newStudents, step: prev.step + 1 }));
      } else if (strategy === 'separate') {
        for (let i = 0; i < formData.numberOfStudents; i++) {
          newStudents[i].groupId = `indv_${newStudents[i].id || Date.now()}_${i}`;
        }
        setFormData(prev => ({ ...prev, students: newStudents, step: prev.step + 1 }));
      } else if (strategy === 'existing' && existingGroupId) {
        for (let i = 0; i < formData.numberOfStudents; i++) {
          newStudents[i].groupId = existingGroupId;
        }
        setFormData(prev => ({ ...prev, students: newStudents, step: prev.step + 1 }));
      }
    };

    return (
      <div className="bg-white rounded-3xl p-5 sm:p-7 md:p-10 border border-slate-200/80 max-w-3xl mx-auto animate-in slide-in-from-right-8 duration-300">
        <div className="text-center mb-10">
           <div className="w-20 h-20 bg-teal-50 text-[#00a992] rounded-3xl flex items-center justify-center mx-auto mb-5 border border-teal-100 transform -rotate-3">
             <Handshake className="w-10 h-10" />
           </div>
           <h3 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">How should we group these students?</h3>
           <p className="text-slate-500 font-medium text-lg max-w-md mx-auto">Choose a grouping strategy below to proceed to setting their study preferences.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
           {formData.numberOfStudents > 1 && (
             <button type="button" onClick={() => handleGroupingStrategy('together')} className="p-6 rounded-3xl border-2 border-slate-100 hover:border-teal-400 hover:bg-teal-50/50 transition-all text-left group relative overflow-hidden bg-white">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#00a992] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform origin-bottom-left border border-teal-100/60">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">Group them together</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">They will share the same teacher, timings, budget, and study mode.</p>
             </button>
           )}
           <button type="button" onClick={() => handleGroupingStrategy('separate')} className="p-6 rounded-3xl border-2 border-slate-100 hover:border-teal-400 hover:bg-teal-50/50 transition-all text-left group relative overflow-hidden bg-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#00a992] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform origin-bottom-left border border-teal-100/60">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">Keep them separate</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Set individual study preferences and find separate teachers for each student.</p>
           </button>
        </div>

        {existingGroups && existingGroups.length > 0 && (
           <div className="p-6 sm:p-8 rounded-3xl border-2 border-slate-100 bg-slate-50/50 relative overflow-hidden">
             <Building className="absolute -top-6 -right-6 w-32 h-32 text-slate-300 opacity-20 pointer-events-none" />
             <h4 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">Add to an existing group</h4>
             <p className="text-sm text-slate-500 font-medium mb-5">Add the newly created {formData.numberOfStudents > 1 ? 'students' : 'student'} to one of your active groups.</p>
             
             <div className="flex flex-col sm:flex-row gap-4 relative z-10">
               <div className="relative flex-1">
                 <select 
                   className="w-full border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all appearance-none cursor-pointer bg-white"
                   onChange={(e) => setSelectedExistingGroup(e.target.value)}
                   value={selectedExistingGroup}
                 >
                   <option value="">Select a group...</option>
                   {existingGroups.map(g => (
                     <option key={g.id} value={g.id}>{g.name || 'Existing Group'} - {g.category}</option>
                   ))}
                 </select>
                 <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                   ▼
                 </div>
               </div>
               <button 
                 type="button" 
                 disabled={!selectedExistingGroup}
                 onClick={() => setShowModifyPrompt(true)}
                 className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-8 py-4 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
               >
                 Select
               </button>
             </div>
           </div>
        )}

        {showModifyPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-teal-900/20 animate-in zoom-in-95 duration-300 relative overflow-hidden border border-slate-100">
               <div className="absolute -top-24 -right-24 w-48 h-48 bg-teal-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
               
               <div className="w-16 h-16 bg-teal-50 text-[#00a992] rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-teal-100">
                 <Settings className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Review Preferences?</h3>
               <p className="text-slate-500 font-medium mb-8 leading-relaxed">Would you like to review and modify the study preferences (time, mode, budget) for this existing group, or keep the current settings?</p>
               
               <div className="flex gap-4">
                 <button 
                   type="button"
                   onClick={() => {
                      handleGroupingStrategy('existing', selectedExistingGroup);
                      setShouldSubmitGroup(true); 
                   }}
                   className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-xl transition-all active:scale-95"
                 >
                   Keep Current
                 </button>
                 <button 
                   type="button"
                   onClick={() => {
                      handleGroupingStrategy('existing', selectedExistingGroup);
                   }}
                   className="flex-1 bg-gradient-to-r from-[#00a992] to-teal-500 hover:from-[#009b86] hover:to-teal-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-teal-500/25 active:scale-95 hover:-translate-y-0.5"
                 >
                   Review
                 </button>
               </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 md:p-10 shadow-2xl max-w-6xl mx-auto relative">
      {showStudentNumberPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-teal-900/20 animate-in zoom-in-95 duration-300 border border-slate-100 relative overflow-hidden">
            {/* Decorative background circle */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-teal-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            
            <div className="relative">
              <div className="w-16 h-16 bg-teal-50 text-[#00a992] rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-teal-100">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Add New Students</h3>
              <p className="text-slate-500 mb-8 font-medium">How many students would you like to register? You can add up to 5 at once.</p>
              
              <div className="mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Number of Students</label>
                <div className="relative">
                  <select
                    value={tempStudentCount}
                    onChange={(e) => setTempStudentCount(parseInt(e.target.value))}
                    className="w-full border-2 border-slate-200 rounded-xl px-5 py-4 bg-white text-slate-800 font-bold focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5].map(num => (
                      <option key={num} value={num}>{num} {num > 1 ? 'Students' : 'Student'}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    if (onCancel) {
                      onCancel();
                    } else {
                      router.back();
                    }
                  }}
                  className="px-6 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateNumberOfStudents(tempStudentCount);
                    setShowStudentNumberPopup(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-[#00a992] to-teal-500 hover:from-[#009b86] hover:to-teal-600 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-teal-500/25 hover:-translate-y-1 active:scale-95 flex justify-center items-center gap-2"
                >
                  Continue
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasProfile && !isEditing ? (
        renderProfileView()
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-2 flex items-center gap-2.5">
                {activeStudentId === 'new' ? (
                  <UserPlus className="w-8 h-8 text-[#00a992] shrink-0" />
                ) : hasProfile ? (
                  <UserCheck className="w-8 h-8 text-[#00a992] shrink-0" />
                ) : (
                  <GraduationCap className="w-8 h-8 text-[#00a992] shrink-0" />
                )}
                <span>{activeStudentId === 'new' ? 'Add Student' : (hasProfile ? 'Edit Profile' : (isDashboard ? 'Complete Demo Request' : 'Book a Free Demo'))}</span>
              </h2>
              {activeStudentId !== 'new' && (
                <p className="text-slate-500 text-base">
                  {formData.step === 1 ? 'Step 1: Common Details & Preferences' : `Step ${formData.step}: Details for Student ${formData.step - 1}`}
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {renderFormStep()}

            {successMsg && (
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl border border-emerald-200">
                {successMsg}
              </div>
            )}

            {!hasProfile && formData.step >= ((formData.numberOfStudents || 1) > 1 ? (formData.numberOfStudents || 1) + 3 : (formData.numberOfStudents || 1) + 2) && (
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex items-start gap-4">
                <input
                  type="checkbox"
                  id="legalConsent"
                  checked={acceptedLegal}
                  onChange={(e) => setAcceptedLegal(e.target.checked)}
                  className="mt-1 w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <label htmlFor="legalConsent" className="text-sm text-slate-600 leading-relaxed cursor-pointer select-none">
                  I have read and accept the{' '}
                  <Link href="/legal/terms-and-conditions" target="_blank" onClick={(e) => e.stopPropagation()} className="text-emerald-600 hover:underline font-semibold">Terms & Conditions</Link>,{' '}
                  <Link href="/legal/privacy-policy" target="_blank" onClick={(e) => e.stopPropagation()} className="text-emerald-600 hover:underline font-semibold">Privacy Policy</Link>, and{' '}
                  <Link href="/legal/refund-policy" target="_blank" onClick={(e) => e.stopPropagation()} className="text-emerald-600 hover:underline font-semibold">Refund Policy</Link>. I consent to being contacted by MiTutora via WhatsApp or phone.
                </label>
              </div>
            )}
            
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-slate-100">
              {formData.step > (hasProfile ? 2 : 1) && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, step: prev.step - 1 }))}
                  className="w-full sm:w-auto px-6 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span>← Back</span>
                </button>
              )}
              <button
                type="submit"
                disabled={loading || (!hasProfile && formData.step >= ((formData.numberOfStudents || 1) > 1 ? (formData.numberOfStudents || 1) + 3 : (formData.numberOfStudents || 1) + 2) && !acceptedLegal)}
                className="flex-1 bg-gradient-to-r from-[#00a992] to-teal-500 hover:from-[#009b86] hover:to-teal-600 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-teal-500/25 hover:-translate-y-1 active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    {parentOnly || hasProfile ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <ArrowRight className="w-5 h-5" />
                    )}
                    <span>
                      {parentOnly ? 'Save Profile' : (formData.step < ((formData.numberOfStudents || 1) > 1 ? (formData.numberOfStudents || 1) + 3 : (formData.numberOfStudents || 1) + 2) ? 'Next Step' : (hasProfile ? 'Save Changes' : 'Submit Request'))}
                    </span>
                  </div>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {locationPermissionTargetGroupId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-teal-50 text-[#00a992] rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-teal-100">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Location Permission</h3>
            <p className="text-slate-600 mb-8 font-medium text-sm leading-relaxed">
              Allow Mushi to access your device location to automatically detect and fill your offline tutoring address?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLocationPermissionTargetGroupId(null)}
                className="flex-1 py-3.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const gId = locationPermissionTargetGroupId;
                  setLocationPermissionTargetGroupId(null);
                  if (gId) executeDetectLocation(gId);
                }}
                className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#00a992] to-teal-500 text-white font-bold shadow-lg shadow-teal-500/25 hover:from-[#009b86] hover:to-teal-600 transition-all"
              >
                Allow Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
