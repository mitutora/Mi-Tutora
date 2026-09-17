"use client";

// src/app/components/TeacherForm.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateReferralCode } from '@/utils/referral';
import { 
  MapPin, 
  Loader2, 
  Edit2, 
  User, 
  Users, 
  FileText, 
  CheckCircle, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  ExternalLink, 
  X, 
  UploadCloud, 
  Clock, 
  ShieldCheck,
  Phone,
  MessageCircle,
  Mail,
  Globe,
  Layers,
  GraduationCap,
  Briefcase,
  BookOpen,
  Award,
  Laptop,
  Languages,
  Lightbulb,
  Navigation,
  IndianRupee,
  Check,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '@/utils/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  getRequiredDocuments,
  validatePdfFile,
  validateResumeFile,
  isResumeComplete,
  isVerificationComplete,
  DocumentRequirement,
} from '@/utils/documentVerification';
import { getSubjectsForTeacher } from '@/utils/subjects';


interface Props {
  category?: string;
  isDashboard?: boolean;
  hasProfile?: boolean;
  initialData?: any;
  onSuccess?: () => void;
}

export default function TeacherForm({
  category,
  isDashboard = false,
  hasProfile = false,
  initialData = null,
  onSuccess,
}: Props) {

  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!hasProfile);
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [stagedFiles, setStagedFiles] = useState<Record<string, File>>({});
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [existingResume, setExistingResume] = useState<{ url: string; fileName: string; uploadedAt: number } | null>(
    initialData?.resume || (initialData?.resumeUrl ? { url: initialData.resumeUrl, fileName: 'Resume', uploadedAt: Date.now() } : null)
  );
  const [existingDocs, setExistingDocs] = useState<Record<string, { url: string; fileName: string; uploadedAt: number }>>(
    initialData?.verificationDocs || {}
  );
  const [successMsg, setSuccessMsg] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: initialData?.name || (typeof window !== 'undefined' ? localStorage.getItem('signup_name') || '' : ''),
    gender: initialData?.gender || '',
    phone: initialData?.phone || '',
    whatsapp: initialData?.whatsapp || '',
    email: initialData?.email || (typeof window !== 'undefined' ? localStorage.getItem('signup_email') || '' : ''),
    street: initialData?.area || '',
    city: initialData?.city || '',
    pincode: initialData?.pincode || '',
    latitude: initialData?.latitude || 0.0,
    longitude: initialData?.longitude || 0.0,
    qualification: initialData?.qualification || '',
    experience: initialData?.experience || '',
    occupation: initialData?.occupation || '',
    subjects: initialData?.subjects || [] as string[],
    mode: initialData?.mode || '',
    description: initialData?.teachingApproach || '',
    studentsCount: initialData?.studentCount || '',
    locations: initialData?.preferredLocations || '',
    travelKm: initialData?.travelDistance || '',
    feeRange: initialData?.feeRange || '',
    classes: initialData?.classes || [] as string[],
    boards: initialData?.boards || [] as string[],
    technologies: initialData?.technologies || [] as string[],
    languages: initialData?.languages || [] as string[],
    category: initialData?.category || category || (typeof window !== 'undefined' ? localStorage.getItem('selectedCategory') || '' : ''),
  });
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (initialData && !dataLoaded) {
      setFormData({
        fullName: initialData.name || (typeof window !== 'undefined' ? localStorage.getItem('signup_name') || '' : ''),
        gender: initialData.gender || '',
        phone: initialData.phone || '',
        whatsapp: initialData.whatsapp || '',
        email: initialData.email || (typeof window !== 'undefined' ? localStorage.getItem('signup_email') || '' : ''),
        street: initialData.area || '',
        city: initialData.city || '',
        pincode: initialData.pincode || '',
        latitude: initialData.latitude || 0.0,
        longitude: initialData.longitude || 0.0,
        qualification: initialData.qualification || '',
        experience: initialData.experience || '',
        occupation: initialData.occupation || '',
        subjects: initialData.subjects || [] as string[],
        mode: initialData.mode || '',
        description: initialData.teachingApproach || '',
        studentsCount: initialData.studentCount || '',
        locations: initialData.preferredLocations || '',
        travelKm: initialData.travelDistance || '',
        feeRange: initialData.feeRange || '',
        classes: initialData.classes || [] as string[],
        boards: initialData.boards || [] as string[],
        technologies: initialData.technologies || [] as string[],
        languages: initialData.languages || [] as string[],
        category: initialData.category || category || (typeof window !== 'undefined' ? localStorage.getItem('selectedCategory') || '' : ''),
      });
      if (initialData.verificationDocs) {
        setExistingDocs(initialData.verificationDocs);
      }
      if (initialData.resume || initialData.resumeUrl) {
        setExistingResume(initialData.resume || { url: initialData.resumeUrl, fileName: 'Resume', uploadedAt: Date.now() });
      }
      setDataLoaded(true);
      if (!hasProfile) {
        setIsEditing(true);
      }
    }
  }, [initialData, dataLoaded, category, hasProfile]);

  useEffect(() => {
    if (initialData?.verificationDocs) {
      setExistingDocs(initialData.verificationDocs);
    }
  }, [initialData?.verificationDocs]);

  useEffect(() => {
    if (initialData?.resume || initialData?.resumeUrl) {
      setExistingResume(initialData.resume || { url: initialData.resumeUrl, fileName: 'Resume', uploadedAt: Date.now() });
    }
  }, [initialData?.resume, initialData?.resumeUrl]);

  useEffect(() => {
    if (isEditing) {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: 'instant' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  }, [isEditing]);

  const handleFileSelect = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = validatePdfFile(file);
    if (!result.valid) {
      toast.error(result.error || 'Invalid file');
      alert(result.error || 'Invalid file');
      e.target.value = '';
      return;
    }

    setStagedFiles(prev => ({
      ...prev,
      [docId]: file,
    }));
    e.target.value = '';
  };

  const handleRemoveStagedFile = (docId: string) => {
    setStagedFiles(prev => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
  };

  const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = validateResumeFile(file);
    if (!result.valid) {
      toast.error(result.error || 'Invalid resume file');
      alert(result.error || 'Invalid resume file');
      e.target.value = '';
      return;
    }

    setResumeFile(file);
    e.target.value = '';
  };

  const handleRemoveResume = () => {
    setResumeFile(null);
  };

  const handleCheckboxChange = (field: string, value: string) => {
    setFormData((prev: any) => {
      const array = prev[field] || [];
      if (array.includes(value)) {
        return { ...prev, [field]: array.filter((item: string) => item !== value) };
      } else {
        return { ...prev, [field]: [...array, value] };
      }
    });
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement |
      HTMLSelectElement
    >
  ) => {
    const val = e.target.value;
    const name = e.target.name;
    
    setFormData((prev: any) => {
      const next = { ...prev, [name]: val };
      if (name === 'phone' && sameAsPhone) {
        next.whatsapp = val;
      }
      if (name === 'street' || name === 'city' || name === 'pincode') {
        next.latitude = 0.0;
        next.longitude = 0.0;
      }
      return next;
    });
  };

  const handleSameAsPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSameAsPhone(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, whatsapp: prev.phone }));
    }
  };

  const [showLocationConfirmModal, setShowLocationConfirmModal] = useState(false);

  const handleDetectLocation = () => {
    setShowLocationConfirmModal(true);
  };

  const executeDetectLocation = () => {
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
          street: street || prev.street,
          city: city || prev.city,
          pincode: pincode || prev.pincode,
          latitude,
          longitude
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

  const handleSubmit = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();
    if (!formData.category) {
      alert("Please select at least one teaching category.");
      return;
    }

    if (isDashboard) {
      if (!formData.qualification) {
        toast.error("Please select your highest qualification.");
        alert("Please select your highest qualification.");
        return;
      }

      if (!isResumeComplete(existingResume, resumeFile)) {
        toast.error("Please upload your Resume / CV before saving your profile.");
        alert("Please upload your Resume / CV before saving your profile.");
        return;
      }
    }
    
    setLoading(true);
    setSuccessMsg('');

    if (!isDashboard) {
      // Check if they are logged in, and sign them out so they can log in as a tutor
      const { auth } = await import('@/utils/firebase/client');
      if (auth.currentUser) {
        await auth.signOut();
      }

      // Save data to localStorage (more robust across OAuth redirects) and redirect to signup
      sessionStorage.setItem('teacherFormData', JSON.stringify({ ...formData, category }));
      router.push('/signup?role=teacher&next=/dashboard/teacher');
      return;
    }

    try {
      const { auth, db } = await import('@/utils/firebase/client');
      const { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, query, where, getDocs, updateDoc } = await import('firebase/firestore');
      
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");

      // Update user hasProfile flag, name, and referral code
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const newCode = (userDocSnap.exists() && userDocSnap.data().referralCode) || generateReferralCode(formData.fullName, user.uid);
      await setDoc(userDocRef, { hasProfile: true, referralCode: newCode, name: formData.fullName }, { merge: true });

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
          refereeName: formData.fullName
        })
      }).catch(console.error);

      // Find the tutor document using user.uid (since tutorDocId is user.uid now)
      const tutorDocId = user.uid;
      const tutorDocRef = doc(db, 'tutors', tutorDocId);
      const tutorDocSnap = await getDoc(tutorDocRef);
      
      let existingTutorId = '';
      if (tutorDocSnap.exists()) {
        existingTutorId = tutorDocSnap.data().tutorId || '';
      } else {
        const { generateCustomId } = await import('@/utils/idGenerator');
        existingTutorId = generateCustomId('MTT');
      }

      // Upload resume to Firebase Storage if a new file is staged
      let finalResume = existingResume;
      if (resumeFile) {
        setUploadingDocs(true);
        setUploadProgressMsg(`Uploading Resume (${resumeFile.name})...`);
        const safeName = resumeFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageRef = ref(storage, `tutor_documents/${user.uid}/resume_${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, resumeFile, {
          contentType: resumeFile.type || 'application/pdf',
        });
        const downloadUrl = await getDownloadURL(snapshot.ref);
        finalResume = {
          url: downloadUrl,
          fileName: resumeFile.name,
          uploadedAt: Date.now(),
        };
        setUploadingDocs(false);
        setUploadProgressMsg('');
      }

      // Upload any staged verification documents to Firebase Storage (optional)
      let finalVerificationDocs: Record<string, { url: string; fileName: string; uploadedAt: number }> = {
        ...existingDocs,
      };

      const stagedKeys = Object.keys(stagedFiles);
      if (stagedKeys.length > 0) {
        setUploadingDocs(true);
        for (const docId of stagedKeys) {
          const file = stagedFiles[docId];
          if (file) {
            setUploadProgressMsg(`Uploading ${file.name}...`);
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const storageRef = ref(storage, `tutor_documents/${user.uid}/${docId}_${Date.now()}_${safeName}`);
            const snapshot = await uploadBytes(storageRef, file, {
              contentType: 'application/pdf',
            });
            const downloadUrl = await getDownloadURL(snapshot.ref);
            finalVerificationDocs[docId] = {
              url: downloadUrl,
              fileName: file.name,
              uploadedAt: Date.now(),
            };
          }
        }
        setUploadingDocs(false);
        setUploadProgressMsg('');
      }

      const hasNewDocs = stagedKeys.length > 0;
      const currentStatus = initialData?.verificationStatus;
      const verificationStatus = hasNewDocs
        ? 'pending'
        : (currentStatus || (Object.keys(finalVerificationDocs).length > 0 ? 'pending' : 'unsubmitted'));
      const verificationSubmittedAt = hasNewDocs
        ? Date.now()
        : (initialData?.verificationSubmittedAt || Date.now());

      // Update the existing tutor record
      const isOnlineOnlyCategory = formData.category === 'programming' || formData.category === 'languages';
      const actualMode = isOnlineOnlyCategory ? 'Online' : formData.mode;
      const combinedAddress = (actualMode?.toLowerCase() === 'online') ? '' : [formData.street, formData.city, formData.pincode].filter(Boolean).join(', ');

      let finalLat = typeof formData.latitude === 'number' ? formData.latitude : 0.0;
      let finalLng = typeof formData.longitude === 'number' ? formData.longitude : 0.0;

      // If offline/both and coordinates were not captured via auto-detect, forward-geocode the typed address
      if (actualMode?.toLowerCase() !== 'online' && (finalLat === 0.0 || finalLng === 0.0) && combinedAddress) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(combinedAddress)}&limit=1`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              finalLat = parseFloat(data[0].lat) || 0.0;
              finalLng = parseFloat(data[0].lon) || 0.0;
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.error('Forward geocoding request timed out');
          } else {
            console.error('Forward geocoding failed during teacher save:', err);
          }
        }
      }
      
      await setDoc(doc(db, 'tutors', tutorDocId), {
        tutorId: existingTutorId,
        authUid: user.uid,
        category: formData.category,
        name: formData.fullName,
        email: formData.email,
        gender: formData.gender,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        mode: actualMode,
        qualification: formData.qualification,
        experience: formData.experience,
        occupation: formData.occupation,
        subjects: formData.subjects,
        teachingApproach: formData.description,
        studentCount: formData.studentsCount,
        preferredLocations: formData.locations,
        travelDistance: formData.travelKm,
        feeRange: formData.feeRange,
        classes: formData.classes,
        boards: formData.boards,
        technologies: formData.technologies,
        languagesTaught: formData.languages,
        knownLanguages: [],
        preferredTimeRange: '',
        price: 0,
        rating: 0.0,
        area: (actualMode?.toLowerCase() === 'online') ? '' : (formData.street || ''),
        city: (actualMode?.toLowerCase() === 'online') ? '' : (formData.city || ''),
        pincode: (actualMode?.toLowerCase() === 'online') ? '' : (formData.pincode || ''),
        latitude: (actualMode?.toLowerCase() === 'online') ? 0.0 : finalLat,
        longitude: (actualMode?.toLowerCase() === 'online') ? 0.0 : finalLng,
        hasProfile: true,
        resume: finalResume,
        resumeUrl: finalResume?.url || '',
        verificationDocs: finalVerificationDocs,
        verificationStatus: verificationStatus,
        verificationSubmittedAt: verificationSubmittedAt,
        createdAt: Date.now()
      }, { merge: true });

      setExistingResume(finalResume);
      setResumeFile(null);
      setExistingDocs(finalVerificationDocs);
      setStagedFiles({});

      sessionStorage.removeItem('teacherFormData');
      setSuccessMsg('Profile updated successfully!');
      toast.success("Profile saved successfully!", { description: "Your teacher profile and verification documents have been updated." });
      if (isDashboard) {
        if (onSuccess) await onSuccess();
      } else {
        setTimeout(() => router.push('/dashboard/teacher'), 1500);
      }
      setIsEditing(false);
      
    } catch (error: any) {
      setUploadingDocs(false);
      setUploadProgressMsg('');
      toast.error('Failed to update profile', { description: error.message });
      alert(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
      setUploadingDocs(false);
      setUploadProgressMsg('');
    }
  };

  return (

    <div className={hasProfile && !isEditing && isDashboard ? "" : "bg-white rounded-3xl p-4 sm:p-7 md:p-10 shadow-2xl max-w-6xl mx-auto"}>

      {hasProfile && !isEditing ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center gap-3 mb-2">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">Teacher Profile</h2>
            <button 
              onClick={() => setIsEditing(true)}
              className="bg-white border border-emerald-200 text-emerald-700 px-3.5 sm:px-5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-sm hover:bg-emerald-50 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
            >
              <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span>Edit Profile</span>
            </button>
          </div>
          
          <div className="relative bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-xl shadow-teal-900/5 border border-white/50 hover:shadow-2xl hover:shadow-teal-900/10 transition-all duration-300 overflow-hidden mb-6 sm:mb-8 group">
            <div className="bg-gradient-to-br from-[#00a992] to-teal-600 p-4 sm:p-6 md:p-8 flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-900/10 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 flex-1 w-full sm:w-auto">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white/20 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-bold text-white backdrop-blur-md shadow-inner border border-white/30 shrink-0">
                    {(formData.fullName || 'T').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">{formData.fullName || 'Teacher Profile'}</h3>
                    <p className="text-xs sm:text-sm font-medium text-emerald-100/90 mt-0.5 truncate">{formData.email || 'No email provided'}</p>
                  </div>
                </div>
                {initialData?.tutorId && (
                  <div className="flex items-center sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-1 sm:gap-0.5 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-white/15 sm:border-t-0 shrink-0">
                     <p className="text-[11px] text-emerald-100/80 font-bold uppercase tracking-wider mb-0.5">Tutor ID</p>
                     <p className="text-sm sm:text-base md:text-lg font-bold text-white font-mono bg-white/10 px-2.5 sm:px-3 py-1 rounded-lg border border-white/20 backdrop-blur-sm shadow-sm tracking-wide">{initialData.tutorId}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 sm:p-6 md:p-8 bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Gender</p>
                  <p className="text-lg font-bold text-gray-900 capitalize">{formData.gender || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Teaching Categories</p>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {[formData.category].map(c => (
                      <span key={c} className="bg-emerald-100/50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-sm font-bold capitalize">{c}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Phone / WhatsApp</p>
                  <p className="text-lg font-bold text-gray-900">{formData.phone || formData.whatsapp || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Highest Qualification</p>
                  <p className="text-lg font-bold text-gray-900">{formData.qualification || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Experience</p>
                  <p className="text-lg font-bold text-gray-900">{formData.experience || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Occupation</p>
                  <p className="text-lg font-bold text-gray-900">{formData.occupation || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Mode of Teaching</p>
                  <p className="text-lg font-bold text-gray-900">{(formData.category === 'programming' || formData.category === 'languages') ? 'Online' : (formData.mode || '-')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Fee Range</p>
                  <p className="text-xl font-black text-emerald-600">&#8377;{formData.feeRange || 0} <span className="text-sm text-gray-500 font-medium">/ month</span></p>
                </div>
              </div>

              {formData.category ===('school') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 pt-6 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Subjects (School)</p>
                    <p className="text-lg font-bold text-gray-900">{formData.subjects?.length > 0 ? formData.subjects.join(', ') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Classes (School)</p>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {formData.classes?.map((c: string) => (
                        <span key={c} className="bg-emerald-100/50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-sm font-bold">{c}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Boards (School)</p>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {formData.boards?.map((b: string) => (
                        <span key={b} className="bg-emerald-100/50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-sm font-bold">{b}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {formData.category ===('programming') && formData.technologies?.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">Technologies Taught</p>
                  <div className="flex gap-2 flex-wrap">
                    {formData.technologies.map((t: string) => (
                      <span key={t} className="bg-emerald-100/50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-sm font-bold">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {formData.category ===('languages') && formData.languages?.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">Languages Taught</p>
                  <div className="flex gap-2 flex-wrap">
                    {formData.languages.map((l: string) => (
                      <span key={l} className="bg-emerald-100/50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-sm font-bold">{l}</span>
                    ))}
                  </div>
                </div>
              )}

              {formData.description && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Teaching Approach</p>
                  <p className="text-base text-gray-700 whitespace-pre-wrap">{formData.description}</p>
                </div>
              )}

              {/* RESUME / CV CARD */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#00a992]" /> Resume / CV
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verified educator resume uploaded to profile
                    </p>
                  </div>
                  <div>
                    {existingResume?.url ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Uploaded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Missing
                      </span>
                    )}
                  </div>
                </div>

                {existingResume?.url ? (
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{existingResume.fileName || 'Resume'}</p>
                        <p className="text-[11px] text-slate-400">
                          {existingResume.uploadedAt ? new Date(existingResume.uploadedAt).toLocaleDateString() : 'Active'}
                        </p>
                      </div>
                    </div>
                    <a
                      href={existingResume.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-bold text-[#00a992] hover:text-[#008f7b] bg-[#00a992]/10 hover:bg-[#00a992]/20 px-3 py-1.5 rounded-xl border border-[#00a992]/30 flex items-center gap-1 transition-colors whitespace-nowrap"
                    >
                      View Resume
                    </a>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-dashed border-rose-200 bg-rose-50/50 text-xs text-rose-600">
                    No Resume / CV uploaded. Please edit your profile to upload your resume.
                  </div>
                )}
              </div>

              {/* EDUCATIONAL DOCUMENTS CARD (OPTIONAL) */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Academic Documents (Optional)
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Academic certificates for: <span className="font-semibold text-slate-700">{formData.qualification || 'Not set'}</span>
                    </p>
                  </div>
                  <div>
                    {initialData?.verificationStatus === 'verified' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                      </span>
                    )}
                    {initialData?.verificationStatus === 'rejected' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Action Required
                      </span>
                    )}
                    {(!initialData?.verificationStatus || initialData?.verificationStatus === 'pending' || initialData?.verificationStatus === 'unsubmitted') && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> {initialData?.verificationStatus === 'unsubmitted' || !initialData?.verificationStatus ? 'Unsubmitted' : 'Pending Verification'}
                      </span>
                    )}
                  </div>
                </div>

                {/* List of documents for this qualification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {getRequiredDocuments(formData.qualification).map((req) => {
                    const docData = existingDocs[req.id];
                    return (
                      <div key={req.id} className="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${docData?.url ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{req.label}</p>
                            <p className="text-[11px] text-slate-400 truncate">{docData ? (docData.fileName || 'Uploaded PDF') : 'Missing document'}</p>
                          </div>
                        </div>
                        {docData?.url ? (
                          <a
                            href={docData.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 transition-colors whitespace-nowrap"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="shrink-0 text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                            Missing
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-start mb-6 sm:mb-10 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-2 sm:mb-4 flex items-center gap-2.5 sm:gap-3">
                <UserCheck className="w-7 h-7 sm:w-9 sm:h-9 text-[#00a992] shrink-0" />
                <span>{hasProfile ? 'Edit Profile' : (isDashboard ? 'Complete Teacher Profile' : 'Teacher Information Form')}</span>
              </h2>
              <p className="text-slate-500 text-sm sm:text-base md:text-lg">
                {hasProfile 
                  ? 'Update your teaching details and preferences.'
                  : (isDashboard 
                    ? 'Review and confirm your details to complete your tutor profile.' 
                    : 'Fill in your details to join MiTutora as a tutor.')}
              </p>
            </div>
            {hasProfile && (
              <button 
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs sm:text-sm px-3 sm:px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
              >
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} onKeyDown={(e: any) => { if (e.key === 'Enter' && e.target?.tagName !== 'TEXTAREA') e.preventDefault(); }} className="space-y-8">

        {/* CATEGORY */}
        <div>
          <label className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00a992]" />
            <span>Selected Category</span>
            <span className="text-red-500 font-bold ml-0.5">*</span>
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-xl px-4 py-4 bg-white"
            required
          >
            <option value="">Select Category</option>
            <option value="school">School / Academics</option>
            <option value="programming">Programming / IT</option>
            <option value="languages">Languages</option>
          </select>
        </div>

        {/* FULL NAME + GENDER */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* FULL NAME */}
          <div>
            <label className="text-sm font-semibold mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-[#00a992]" />
              <span>Full Name</span>
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>

            <input
              type="text"
              name="fullName"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-4"
            />
          </div>

          {/* GENDER */}
          <div>
            <label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00a992]" />
              <span>Gender</span>
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>

            <div className="flex flex-wrap gap-4 sm:gap-6 pt-3">

              {[
                'Female',
                'Male',
                'Other',
              ].map((item) => (

                <label
                  key={item}
                  className="flex items-center gap-2"
                >

                  <input
                    type="radio"
                    name="gender"
                    value={item}
                    checked={formData.gender === item}
                    onChange={handleChange}
                  />

                  {item}

                </label>

              ))}

            </div>
          </div>

        </div>

        {/* PHONE + WHATSAPP */}
        <div className="grid md:grid-cols-2 gap-6">

          <div>
            <label className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#00a992]" />
              <span>Phone Number</span>
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>

            <input
              type="tel"
              name="phone"
              maxLength={10}
              pattern="[0-9]{10}"
              placeholder="Enter 10-digit phone number"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-4"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#00a992]" />
                <span>WhatsApp No.</span>
                <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                <input type="checkbox" checked={sameAsPhone} onChange={handleSameAsPhone} /> Same as Phone
              </label>
            </div>

            <input
              type="tel"
              name="whatsapp"
              maxLength={10}
              pattern="[0-9]{10}"
              placeholder="Enter 10-digit WhatsApp number"
              value={formData.whatsapp}
              onChange={handleChange}
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-4"
            />
          </div>

        </div>

        {/* EMAIL + ADDRESS */}
        <div className="grid md:grid-cols-2 gap-6">

          <div>
            <label className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#00a992]" />
              <span>Email ID</span>
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>

            <input
              type="email"
              name="email"
              placeholder="Enter email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-4 py-4"
              required
            />
          </div>



        {/* MODE */}
        <div>
          <label className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#00a992]" />
            <span>Preferred Mode</span>
            <span className="text-red-500 font-bold ml-0.5">*</span>
          </label>

          {(formData.category ===('programming') ||
            formData.category ===('languages'))  ? (

            <div className="border-2 border-emerald-500 bg-emerald-50 rounded-xl px-4 py-4 flex items-center gap-3">

              <input
                type="radio"
                name="mode"
                value="Online"
                checked
                readOnly
              />

              <span className="font-semibold text-emerald-700">
                Online Only
              </span>

            </div>

          ) : (

            <div className="grid grid-cols-2 gap-3">

              {[
                'Online',
                'Offline',
              ].map((item) => (

                <label
                  key={item}
                  className="border border-slate-300 rounded-xl px-4 py-4 flex items-center gap-3"
                >

                  <input
                    type="radio"
                    name="mode"
                    value={item}
                    checked={formData.mode === item}
                    onChange={handleChange}
                  />

                  {item}

                </label>

              ))}

            </div>

          )}

        </div>

          {(formData.mode !== 'Online' && formData.category !== 'programming' && formData.category !== 'languages') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#00a992]" />
                  <span>Residential Address</span>
                  <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locationLoading}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200 shadow-sm"
                >
                  {locationLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                  {locationLoading ? 'Detecting...' : 'Auto-Detect Location'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <input
                    type="text"
                    name="street"
                    placeholder="Street / Locality"
                    value={formData.street}
                    onChange={handleChange}
                    className="w-full border border-slate-300 rounded-xl px-4 py-4"
                    required={formData.mode !== 'Online'}
                  />
                </div>
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-xl px-4 py-4"
                  required={formData.mode !== 'Online'}
                />
                <input
                  type="text"
                  name="pincode"
                  placeholder="Pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-xl px-4 py-4"
                  required={formData.mode !== 'Online'}
                />
              </div>
            </div>
          )}

        </div>

        {/* RESUME / CV */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-5 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#00a992]" />
                <span>Your Resume / CV</span>
                <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your detailed curriculum vitae or resume in <strong className="text-slate-700">PDF or Word format (.pdf, .doc, .docx)</strong> (max 5MB).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white transition-all hover:border-slate-300 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Resume / CV Document</span>
                  {existingResume?.url && !resumeFile && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Uploaded
                    </span>
                  )}
                  {resumeFile && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      Ready to upload
                    </span>
                  )}
                  {!resumeFile && !existingResume?.url && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Action Required
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {resumeFile ? resumeFile.name : (existingResume?.fileName || 'No file selected yet')}
                </p>
              </div>

              {/* ACTIONS / FILE STATE */}
              <div className="shrink-0 flex items-center gap-2">
                {resumeFile ? (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="text-left max-w-[150px] sm:max-w-[200px]">
                      <p className="text-xs font-semibold text-emerald-900 truncate">{resumeFile.name}</p>
                      <p className="text-[10px] text-emerald-600">{(resumeFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveResume}
                      className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                      title="Remove selected file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : existingResume?.url ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={existingResume.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" /> View
                    </a>
                    <label className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors">
                      <UploadCloud className="w-3.5 h-3.5 text-slate-600" /> Replace
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="text-xs font-bold text-white bg-[#00a992] hover:bg-[#008f7b] px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs">
                    <UploadCloud className="w-4 h-4" /> Upload Resume
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* QUALIFICATION + EXPERIENCE */}
        <div className="grid md:grid-cols-2 gap-6">

          <div>
            <label className="text-sm font-semibold mb-2 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#00a992]" />
              <span>Highest Qualification</span>
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>

            <select
              name="qualification"
              value={formData.qualification}
              onChange={handleChange}
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-4 bg-white"
            >
              <option value="">Select Qualification</option>
              <option value="10th">10th</option>
              <option value="12th">12th</option>
              <option value="B.E / B.Tech">B.E / B.Tech</option>
              <option value="B.Sc">B.Sc</option>
              <option value="B.A">B.A</option>
              <option value="B.Com">B.Com</option>
              <option value="M.Sc">M.Sc</option>
              <option value="M.A">M.A</option>
              <option value="PhD">PhD</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00a992]" />
              <span>Total Teaching Experience</span>
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>

            <select
              name="experience"
              value={formData.experience || ''}
              onChange={handleChange}
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-4 bg-white"
            >
              <option value="" disabled>Select your experience</option>
              <option value="Fresher (No experience)">Fresher (No experience)</option>
              <option value="Less than 1 Year">Less than 1 Year</option>
              <option value="1-3 Years">1-3 Years</option>
              <option value="4-6 Years">4-6 Years</option>
              <option value="7-10 Years">7-10 Years</option>
              <option value="10+ Years">10+ Years</option>
            </select>
          </div>

        </div>

        {/* OPTIONAL ACADEMIC DOCUMENT ATTACHMENTS */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-5 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <label className="block text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#00a992]" />
                Academic Documents (Optional)
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Optional: Upload your educational certificates/marksheets in <strong className="text-slate-700">PDF format</strong> (max 5MB each).
              </p>
            </div>
          </div>

          {!formData.qualification ? (
            <div className="text-center py-6 px-4 bg-white/70 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
              Please select your <strong>Highest Qualification</strong> above to view relevant documents.
            </div>
          ) : (
            <div className="space-y-3">
              {getRequiredDocuments(formData.qualification).map((req) => {
                const staged = stagedFiles[req.id];
                const existing = existingDocs[req.id];

                return (
                  <div key={req.id} className="p-4 rounded-xl border border-slate-200 bg-white transition-all hover:border-slate-300 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{req.label}</span>
                          {existing?.url && !staged && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Uploaded
                            </span>
                          )}
                          {staged && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              Ready to upload
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{req.description}</p>
                      </div>

                      {/* ACTIONS / FILE STATE */}
                      <div className="shrink-0 flex items-center gap-2">
                        {staged ? (
                          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div className="text-left max-w-[150px] sm:max-w-[200px]">
                              <p className="text-xs font-semibold text-emerald-900 truncate">{staged.name}</p>
                              <p className="text-[10px] text-emerald-600">{(staged.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveStagedFile(req.id)}
                              className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                              title="Remove selected file"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : existing?.url ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={existing.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> View
                            </a>
                            <label className="cursor-pointer text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 border border-slate-200">
                              <UploadCloud className="w-3.5 h-3.5" /> Replace
                              <input
                                type="file"
                                accept="application/pdf,.pdf"
                                onChange={(e) => handleFileSelect(req.id, e)}
                                className="hidden"
                              />
                            </label>
                          </div>
                        ) : (
                          <label className="cursor-pointer text-xs font-bold text-[#00a992] hover:text-[#008f7b] bg-[#00a992]/10 hover:bg-[#00a992]/20 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 border border-[#00a992]/20">
                            <UploadCloud className="w-4 h-4" /> Upload PDF
                            <input
                              type="file"
                              accept="application/pdf,.pdf"
                              onChange={(e) => handleFileSelect(req.id, e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* OCCUPATION */}
        <div>
          <label className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#00a992]" />
            <span>Current Occupation</span>
          </label>

          <input
            type="text"
            name="occupation"
            placeholder="e.g. Full-Time Teacher, Software Engineer, Student"
            value={formData.occupation}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-xl px-4 py-4"
          />
        </div>

        {/* SCHOOL CATEGORY */}
        {formData.category ===('school') && (

          <>

            {/* CLASSES */}
            <div>
              <label className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#00a992]" />
                <span>Classes you Teach</span>
                <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">

                {[
                  'LKG',
                  'UKG',
                  '1st - 5th',
                  '6th - 8th',
                  '9th - 10th',
                  '1st PU',
                  '2nd PU',
                ].map((item) => (

                  <label
                    key={item}
                    className="flex items-center gap-3 border border-slate-300 rounded-xl px-4 py-4"
                  >

                    <input 
                      type="checkbox" 
                      checked={formData.classes.includes(item)}
                      onChange={() => handleCheckboxChange('classes', item)}
                    />

                    {item}

                  </label>

                ))}

              </div>
            </div>

            {/* BOARD */}
            <div>
              <label className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#00a992]" />
                <span>Preferred Teaching Board</span>
                <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                {[
                  'CBSE',
                  'ICSE',
                  'State Board',
                  'IB / IGCSE',
                ].map((item) => (

                  <label
                    key={item}
                    className="flex items-center gap-3 border border-slate-300 rounded-xl px-4 py-4"
                  >

                    <input 
                      type="checkbox" 
                      checked={formData.boards.includes(item)}
                      onChange={() => handleCheckboxChange('boards', item)}
                    />

                    {item}

                  </label>

                ))}

              </div>
            </div>

          {/* SUBJECTS */}
            <div>
              <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#00a992]" />
                <span>Subjects you Teach</span>
                <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>

              {formData.boards.length === 0 || formData.classes.length === 0 ? (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">Please select at least one class and one board below to see the subjects.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(() => {
                    const { allSubjects } = getSubjectsForTeacher(formData.boards, formData.classes);

                    return allSubjects.sort().map((sub: string) => (
                      <label
                        key={sub}
                        className="flex items-center gap-3 border border-slate-300 rounded-xl px-4 py-3 hover:border-emerald-500 transition-all cursor-pointer"
                      >
                        <input 
                          type="checkbox" 
                          checked={formData.subjects?.includes(sub)}
                          onChange={() => handleCheckboxChange('subjects', sub)}
                          className="accent-emerald-500"
                        />
                        <span className="text-sm font-medium">{sub}</span>
                      </label>
                    ));
                  })()}
                </div>
              )}
            </div>

            </>
        )}

        {/* PROGRAMMING CATEGORY */}
        {formData.category ===('programming') && (

          <div>
            <label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-[#00a992]" />
              <span>Technologies you Teach</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

              {[
                'Python',
                'Java',
                'AI & ML',
                'HTML',
                'Data Analytics',
                'Gen AI',
                'Agentic AI',
              ].map((item) => (

                <label
                  key={item}
                  className="border border-slate-300 rounded-xl px-4 py-4 flex items-center gap-3 hover:border-purple-500 transition-all"
                >

                  <input 
                    type="checkbox" 
                    checked={formData.technologies.includes(item)}
                    onChange={() => handleCheckboxChange('technologies', item)}
                  />

                  {item}

                </label>

              ))}

            </div>
          </div>
        )}

        {/* LANGUAGE CATEGORY */}
        {formData.category ===('languages') && (

          <div>
            <label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Languages className="w-4 h-4 text-[#00a992]" />
              <span>Languages you Teach</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

              {[
                'English',
                'Arabic',
                'German',
                'Japanese',
              ].map((item) => (

                <label
                  key={item}
                  className="border border-slate-300 rounded-xl px-4 py-4 flex items-center gap-3 hover:border-purple-500 transition-all"
                >

                  <input 
                    type="checkbox" 
                    checked={formData.languages.includes(item)}
                    onChange={() => handleCheckboxChange('languages', item)}
                  />

                  {item}

                </label>

              ))}

            </div>
          </div>
        )}


        {/* DESCRIPTION */}
        <div>
          <label className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-[#00a992]" />
            <span>Teaching Approach</span>
          </label>

          <textarea
            rows={4}
            name="description"
            placeholder="Describe your teaching approach"
            value={formData.description}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-xl px-4 py-4"
          />
        </div>

        {/* CURRENT STUDENTS COUNT */}
        <div>
          <label className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00a992]" />
            <span>Current Students Count</span>
          </label>

          <input
            type="text"
            name="studentsCount"
            placeholder="No. of students"
            value={formData.studentsCount}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-xl px-4 py-4"
          />
        </div>

        {/* LOCATION + KM */}
        {(formData.mode !== 'Online' && formData.category !== 'programming' && formData.category !== 'languages') && (
          <div className="grid md:grid-cols-2 gap-6">

            <div>
              <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#00a992]" />
                <span>Preferred Locations</span>
                <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>

              <input
                type="text"
                name="locations"
                placeholder="Area / Pincode"
                value={formData.locations}
                onChange={handleChange}
                required={formData.mode !== 'Online'}
                className="w-full border border-slate-300 rounded-xl px-4 py-4"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#00a992]" />
                <span>Willing to travel within KM</span>
                <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>

              <input
                type="text"
                name="travelKm"
                placeholder="Travel distance"
                value={formData.travelKm}
                onChange={handleChange}
                required={formData.mode !== 'Online'}
                className="w-full border border-slate-300 rounded-xl px-4 py-4"
              />
            </div>

          </div>
        )}



        {/* FEES */}
        <div>
          <label className="text-sm font-semibold mb-2 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-[#00a992]" />
            <span>Expected Fee Range</span>
            <span className="text-red-500 font-bold ml-0.5">*</span>
          </label>

          <div className="flex justify-between items-center mb-2">
            <span className="text-emerald-600 font-bold">&#8377;{formData.feeRange || 1000}</span>
          </div>
          <input
            type="range"
            name="feeRange"
            min="1000"
            max="20000"
            step="500"
            value={formData.feeRange || 1000}
            onChange={handleChange}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium">
            <span>&#8377;1,000</span>
            <span>&#8377;20,000</span>
          </div>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl border border-emerald-200">
            {successMsg}
          </div>
        )}

        {!hasProfile && (
          <div className="flex items-start gap-3 mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <input 
              type="checkbox" 
              id="legal-accept-teacher"
              checked={acceptedLegal}
              onChange={(e) => setAcceptedLegal(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="legal-accept-teacher" className="text-sm text-gray-700 leading-tight">
              I have read and accept the{' '}
              <Link href="/legal/terms-and-conditions" target="_blank" onClick={(e) => e.stopPropagation()} className="text-emerald-600 hover:underline font-semibold">Terms & Conditions</Link>,{' '}
              <Link href="/legal/privacy-policy" target="_blank" onClick={(e) => e.stopPropagation()} className="text-emerald-600 hover:underline font-semibold">Privacy Policy</Link>, and{' '}
              <Link href="/legal/refund-policy" target="_blank" onClick={(e) => e.stopPropagation()} className="text-emerald-600 hover:underline font-semibold">Refund Policy</Link>.
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (!hasProfile && !acceptedLegal)}
          className="w-full bg-gradient-to-r from-[#00a992] to-teal-500 hover:from-[#009b86] hover:to-teal-600 disabled:opacity-50 disabled:hover:from-[#00a992] disabled:hover:to-teal-500 disabled:hover:-translate-y-0 text-white font-bold py-5 rounded-xl transition-all shadow-lg shadow-teal-500/25 text-lg hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{uploadProgressMsg || 'Processing...'}</span>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2">
              {hasProfile || isDashboard ? <Check className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
              <span>{hasProfile ? 'Save Changes' : (isDashboard ? 'Save Profile' : 'Continue to Apply')}</span>
            </div>
          )}
        </button>

        </form>
        </div>
      )}

      {showLocationConfirmModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-teal-50 text-[#00a992] rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-teal-100">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Location Permission</h3>
            <p className="text-slate-600 mb-8 font-medium text-sm leading-relaxed">
              Allow Mushi to access your device location to automatically detect and fill your residential address?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLocationConfirmModal(false)}
                className="flex-1 py-3.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLocationConfirmModal(false);
                  executeDetectLocation();
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
