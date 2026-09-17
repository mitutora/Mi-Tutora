"use client";

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, UserPlus, Sparkles, BookOpen, Users, Award, Briefcase, GraduationCap, ArrowLeft, Eye, EyeOff, AlertTriangle, ArrowRight, CheckCircle2, Lightbulb } from 'lucide-react';
import { getFriendlyAuthError } from '@/utils/authErrors';
import { generateCustomId } from '@/utils/idGenerator';
import { generateReferralCode } from '@/utils/referral';

function SignupContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const searchParams = useSearchParams();
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  
  useEffect(() => {
    if (!referralCode) {
      const savedRef = localStorage.getItem('mitutora_ref');
      if (savedRef) setReferralCode(savedRef);
    }
  }, [referralCode]);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isAnyLoading = isEmailLoading || isGoogleLoading;
  const [showGoogleRefModal, setShowGoogleRefModal] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<any>(null);

  // Email Verification Modal & Spam Warning State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const router = useRouter();
  const urlRole = searchParams.get('role');
  const role = ['student', 'teacher', 'parent'].includes(urlRole as string) ? (urlRole as string) : 'student';
  const isTeacher = role === 'teacher';

  const handleProceedToLogin = () => {
    setShowVerifyModal(false);
    router.push(`/login?role=${role}`);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnyLoading) return;
    setIsEmailLoading(true);
    setError('');
    
    let createdUser: any = null;

    try {
      const { auth, db } = await import('@/utils/firebase/client');
      const { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } = await import('firebase/auth');
      const { doc, setDoc, collection, query, where, getDocs, addDoc } = await import('firebase/firestore');

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      createdUser = user;
      
      if (user) {
        await updateProfile(user, { displayName: name });
        await sendEmailVerification(user);
        
        let finalReferrerName = '';
        
        if (referralCode.trim()) {
          try {
            const token = await user.getIdToken();
            const trackRes = await fetch('/api/referrals/track', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                referralCode: referralCode.trim(),
                refereeUid: user.uid,
                refereeName: name,
                role
              })
            });
            const trackData = await trackRes.json();
            if (trackData.success && trackData.referrerName) {
              finalReferrerName = trackData.referrerName;
            }
          } catch (refErr) {
            console.error('Referral tracking error:', refErr);
          }
        }

        const userPayload: any = {
          id: user.uid,
          email: user.email,
          name: name,
          roles: [role],
          role: role,
          referralCode: generateReferralCode(name, user.uid),
          walletBalance: 0,
          referredBy: referralCode.trim()
        };
        if (finalReferrerName) userPayload.referrerName = finalReferrerName;
        await setDoc(doc(db, 'users', user.uid), userPayload);
        
        await auth.signOut();
        localStorage.removeItem('mitutora_ref');
        setRegisteredEmail(email);
        setShowVerifyModal(true);
      }
    } catch (err: any) {
      if (createdUser) {
        try {
          const { deleteUser } = await import('firebase/auth');
          await deleteUser(createdUser);
          const { auth } = await import('@/utils/firebase/client');
          await auth.signOut();
        } catch (rollbackErr) {
          console.error('Failed to rollback user creation:', rollbackErr);
        }
      }

      if (err.code === 'auth/email-already-in-use') {
        setError(`This email is already registered! Please go to the Login page and select '${role === 'teacher' ? 'Teacher' : 'Student'}' to instantly add this role to your account.`);
      } else {
        setError(getFriendlyAuthError(err));
      }
    } finally {
      setIsEmailLoading(false);
    }
  };
  const handleGoogleSignup = async () => {
    if (isAnyLoading) return;
    setIsGoogleLoading(true);
    const { auth, db } = await import('@/utils/firebase/client');
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
    const { doc, getDoc, updateDoc, arrayUnion } = await import('firebase/firestore');
    
    let focusTimer: any = null;
    let authFinished = false;

    const onWindowFocus = () => {
      focusTimer = setTimeout(() => {
        if (!authFinished && !auth.currentUser) {
          setIsGoogleLoading(false);
          window.removeEventListener('focus', onWindowFocus);
        }
      }, 600);
    };

    window.addEventListener('focus', onWindowFocus);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      authFinished = true;
      clearTimeout(focusTimer);
      window.removeEventListener('focus', onWindowFocus);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let userRole = role;
      const accountType = role;
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        let roles = data.roles || (data.role ? [data.role] : []);
        
        if (!roles.includes(role)) {
          const payload = data.roles ? { roles: arrayUnion(role) } : { roles: [...roles, role] };
          await updateDoc(doc(db, 'users', user.uid), payload);
          roles.push(role);
        }
        
        localStorage.setItem('user', JSON.stringify({ id: user.uid, email: user.email, role: userRole, roles: roles }));
        localStorage.removeItem('mitutora_ref');
        const searchParams = new URLSearchParams(window.location.search);
        let nextUrl = searchParams.get('next');
        if (nextUrl && (!nextUrl.startsWith('/') || nextUrl.startsWith('//'))) {
          nextUrl = null;
        }
        router.push(nextUrl || (userRole === 'student' ? '/dashboard/student' : '/dashboard/teacher'));
      } else {
        // User is brand new.
        if (referralCode.trim()) {
          // If we already have a referral code silently stored, just complete signup directly
          await completeGoogleSignup(user);
        } else {
          // No referral code yet. Show the popup and pause signup!
          setPendingGoogleUser(user);
          setShowGoogleRefModal(true);
          setIsGoogleLoading(false); // Enable buttons for the modal
        }
      }
    } catch (err: any) {
      clearTimeout(focusTimer);
      window.removeEventListener('focus', onWindowFocus);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setIsGoogleLoading(false);
        return;
      }
      setError(getFriendlyAuthError(err));
      setIsGoogleLoading(false);
    } finally {
      clearTimeout(focusTimer);
      window.removeEventListener('focus', onWindowFocus);
    }
  };

  const completeGoogleSignup = async (user: any) => {
    setIsGoogleLoading(true);
    const { db } = await import('@/utils/firebase/client');
    const { doc, setDoc, collection, query, where, getDocs, addDoc } = await import('firebase/firestore');
    const accountType = role;
    
    try {
      let finalReferrerName = '';
      if (referralCode.trim()) {
        try {
          const token = await user.getIdToken();
          const trackRes = await fetch('/api/referrals/track', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              referralCode: referralCode.trim(),
              refereeUid: user.uid,
              refereeName: user.displayName || '',
              role
            })
          });
          const trackData = await trackRes.json();
          if (trackData.success && trackData.referrerName) {
            finalReferrerName = trackData.referrerName;
          }
        } catch (refErr) {
          console.error('Referral tracking error:', refErr);
        }
      }

      const userPayload: any = {
        id: user.uid,
        email: user.email,
        name: user.displayName || '',
        roles: [role],
        referredBy: referralCode.trim()
      };
      if (finalReferrerName) userPayload.referrerName = finalReferrerName;
      await setDoc(doc(db, 'users', user.uid), userPayload);

      if (accountType === 'parent') {
        const parentId = generateCustomId('MTP');
        await setDoc(doc(db, 'parents', user.uid), { parentId: parentId, authUid: user.uid, name: user.displayName || '' });
      } else if (accountType === 'teacher') {
        const tutorId = generateCustomId('MTT');
        await setDoc(doc(db, 'tutors', user.uid), { tutorId: tutorId, authUid: user.uid, name: user.displayName || '', email: user.email });
      }
      
      localStorage.setItem('user', JSON.stringify({ id: user.uid, email: user.email, role: role, roles: [role] }));
      localStorage.removeItem('mitutora_ref');
      const searchParams = new URLSearchParams(window.location.search);
      let nextUrl = searchParams.get('next');
      if (nextUrl && (!nextUrl.startsWith('/') || nextUrl.startsWith('//'))) {
        nextUrl = null;
      }
      router.push(nextUrl || (role === 'student' ? '/dashboard/student' : '/dashboard/teacher'));
    } catch (err: any) {
      setError(getFriendlyAuthError(err));
      setIsGoogleLoading(false);
      setShowGoogleRefModal(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      
      {/* LEFT COLUMN - BRANDING (Visible on Mobile as Banner) */}
      <div className={`flex w-full lg:w-1/2 relative overflow-hidden flex-col justify-between p-6 pt-8 pb-16 lg:p-12 transition-colors duration-200
        ${isTeacher ? 'bg-gradient-to-br from-[#04241f] to-[#021411]' : 'bg-gradient-to-br from-[#063831] to-[#04241f]'}
      `}>
        {/* Decorative Background Elements */}
        <div className={`absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3 transition-colors duration-200
          ${isTeacher ? 'bg-emerald-500/10' : 'bg-[#00a992]/20'}
        `} />
        <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/3 transition-colors duration-200
          ${isTeacher ? 'bg-orange-500/10' : 'bg-emerald-500/20'}
        `} />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Logo & Role Selector Toggle */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Image
              src="/logo.png"
              alt="MiTutora"
              width={160}
              height={50}
              className="h-9 sm:h-10 w-auto object-contain"
              priority
            />
          </Link>

          <div className="flex bg-white/10 p-1 rounded-xl backdrop-blur-md border border-white/10">
            <button
              onClick={() => router.push('/signup?role=student')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-150 ${!isTeacher ? 'bg-white text-[#063831] shadow-md' : 'text-white/70 hover:text-white'}`}
            >
              Student
            </button>
            <button
              onClick={() => router.push('/signup?role=teacher')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-150 ${isTeacher ? 'bg-white text-[#063831] shadow-md' : 'text-white/70 hover:text-white'}`}
            >
              Teacher
            </button>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10 max-w-lg mt-12 lg:mt-20 mb-8 lg:mb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6 backdrop-blur-sm">
                <Sparkles className={`w-4 h-4 ${isTeacher ? 'text-emerald-400' : 'text-[#00a992]'}`} />
                <span className="text-sm text-emerald-100 font-semibold uppercase tracking-wider">
                  {isTeacher ? 'Join as an Educator' : 'Join as a Student'}
                </span>
              </div>
              
              <h1 className="text-3xl lg:text-5xl font-black text-white leading-tight mb-4 lg:mb-6 tracking-tight">
                {isTeacher ? (
                  <>Start inspiring <br /> <span className="bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">minds today.</span></>
                ) : (
                  <>Unlock your <br /> <span className="bg-gradient-to-r from-[#00a992] to-emerald-300 bg-clip-text text-transparent">true potential.</span></>
                )}
              </h1>
              
              <p className="hidden lg:block text-emerald-100/80 text-lg leading-relaxed font-medium mb-12">
                Create your account in seconds and get full access to the MiTutora platform.
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="hidden lg:flex relative z-10 text-emerald-100/60 text-sm font-medium justify-between">
          <span>&copy; {new Date().getFullYear()} MiTutora. All rights reserved.</span>
          <span className="opacity-50">Support: +91 7483034168</span>
        </div>
      </div>

      {/* RIGHT COLUMN - SIGNUP FORM */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-start lg:justify-center pt-3 pb-6 px-5 sm:p-8 lg:p-12 relative overflow-hidden bg-white min-h-0 lg:min-h-screen -mt-8 lg:mt-0 rounded-t-2xl sm:rounded-t-[2.5rem] lg:rounded-none z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] lg:shadow-none">
        
        {/* Subtle mobile background glow */}
        <div className={`lg:hidden absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none -translate-y-1/2 transition-colors duration-200
          ${isTeacher ? 'bg-emerald-500/5' : 'bg-[#00a992]/5'}
        `} />

        {/* Back to Home Button (Mobile & Desktop) */}
        <div className="w-full max-w-md flex justify-start mt-4 sm:mt-0 mb-5 sm:mb-6 lg:mb-10 z-20 relative">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-white bg-[#063831] hover:bg-[#04241f] shadow-sm hover:shadow-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Back to Home
          </button>
        </div>

        <motion.div 
          key={role + '-form'}
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile Logo & Role Selector Removed (now in banner) */}

          <div className="mb-3 sm:mb-6 lg:mb-10 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-1 sm:mb-2">
              Create an Account
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Already have an account? <a href={`/login${searchParams.toString() ? '?' + searchParams.toString() : ''}`} className="text-[#00a992] hover:underline font-bold">Log in</a></p>
          </div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 text-red-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 text-xs sm:text-sm font-medium border border-red-100 flex items-center justify-center lg:justify-start"
            >
              {error}
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 text-emerald-700 p-3 sm:p-4 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 text-xs sm:text-sm font-medium border border-emerald-100 flex items-center justify-center lg:justify-start"
            >
              {successMsg}
            </motion.div>
          )}

          <div className="mb-3 sm:mb-5 lg:mb-6">
            <button
              type="button"
              disabled={isAnyLoading}
              onClick={handleGoogleSignup}
              className="w-full flex items-center justify-center gap-2.5 sm:gap-3 py-2.5 sm:py-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl sm:rounded-2xl shadow-sm hover:shadow transition-all text-xs sm:text-sm font-bold text-gray-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
              )}
              {isGoogleLoading ? 'Connecting to Google...' : 'Sign in with Google'}
            </button>
          </div>

          <div className="relative mb-3 sm:mb-5 lg:mb-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <span className="relative bg-white px-3 sm:px-4 text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Or sign up with email</span>
          </div>

          <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-xs sm:text-sm font-bold text-gray-700 block mb-1 sm:mb-1.5">
                Full Name<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none">
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  disabled={isAnyLoading}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className={`w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-4 transition duration-300 placeholder:text-gray-400 font-medium hover:border-gray-300 disabled:opacity-70 disabled:cursor-not-allowed
                    ${isTeacher ? 'focus:border-emerald-500 focus:ring-emerald-500/10' : 'focus:border-[#00a992] focus:ring-[#00a992]/10'}
                  `}
                />
              </div>
            </div>

            <div>
              <label className="text-xs sm:text-sm font-bold text-gray-700 block mb-1 sm:mb-1.5">
                Email<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  disabled={isAnyLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-4 transition duration-300 placeholder:text-gray-400 font-medium hover:border-gray-300 disabled:opacity-70 disabled:cursor-not-allowed
                    ${isTeacher ? 'focus:border-emerald-500 focus:ring-emerald-500/10' : 'focus:border-[#00a992] focus:ring-[#00a992]/10'}
                  `}
                />
              </div>
            </div>

            <div>
              <label className="text-xs sm:text-sm font-bold text-gray-700 block mb-1 sm:mb-1.5">
                Password<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isAnyLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 sm:pl-11 pr-11 sm:pr-12 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-4 transition duration-300 placeholder:text-gray-400 font-medium hover:border-gray-300 disabled:opacity-70 disabled:cursor-not-allowed
                    ${isTeacher ? 'focus:border-emerald-500 focus:ring-emerald-500/10' : 'focus:border-[#00a992] focus:ring-[#00a992]/10'}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 sm:pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs sm:text-sm font-bold text-gray-700 block mb-1 sm:mb-1.5">
                Referral Code <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none">
                  <Award className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g. JOHN-X8B2"
                  className={`w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-4 transition duration-300 placeholder:text-gray-400 font-medium hover:border-gray-300
                    ${isTeacher ? 'focus:border-emerald-500 focus:ring-emerald-500/10' : 'focus:border-[#00a992] focus:ring-[#00a992]/10'}
                  `}
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isAnyLoading}
              className={`group w-full disabled:opacity-70 disabled:cursor-not-allowed text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold transition duration-300 shadow-xl flex items-center justify-center gap-2 cursor-pointer mt-3 sm:mt-6
                ${isTeacher 
                  ? 'bg-gradient-to-r from-[#04241f] to-emerald-800 hover:from-emerald-900 hover:to-emerald-700 shadow-emerald-900/20 hover:shadow-emerald-900/40' 
                  : 'bg-[#063831] hover:bg-[#04241f] shadow-[#063831]/20 hover:shadow-[#063831]/40'
                }
              `}
            >
              {isEmailLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                  Create {isTeacher ? 'Educator' : 'Student'} Account
                </>
              )}
            </button>       
          </form>
        </motion.div>
      </div>

      {/* Google Referral Modal */}
      <AnimatePresence>
        {showGoogleRefModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setShowGoogleRefModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-[#00a992]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Have a Referral Code?</h3>
                <p className="text-sm text-gray-500 mb-5 font-medium">
                  If a friend invited you, enter their code now to claim your network benefits!
                </p>
                
                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Award className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="e.g. JOHN-X8B2"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00a992]/20 focus:border-[#00a992] transition-all font-medium uppercase"
                  />
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (pendingGoogleUser) completeGoogleSignup(pendingGoogleUser);
                    }}
                    disabled={isGoogleLoading}
                    className="w-full bg-[#00a992] hover:bg-emerald-600 disabled:opacity-70 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center"
                  >
                    {isGoogleLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Submit & Continue"}
                  </button>
                  <button
                    onClick={() => {
                      setReferralCode('');
                      if (pendingGoogleUser) completeGoogleSignup(pendingGoogleUser);
                    }}
                    disabled={isGoogleLoading}
                    className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-70 disabled:cursor-not-allowed text-gray-700 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center"
                  >
                    Skip, I don't have one
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Verification Spam Notice Modal */}
      <AnimatePresence>
        {showVerifyModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
              onClick={handleProceedToLogin}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
              className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 z-10 my-auto"
            >
              {/* Header Gradient Accent Strip */}
              <div className="h-2 w-full bg-gradient-to-r from-[#00a992] via-emerald-400 to-teal-500" />

              <div className="p-6 sm:p-8">
                {/* Icon Badge with gentle pulse indicator */}
                <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 relative shadow-sm">
                  <Mail className="w-8 h-8 text-[#00a992]" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00a992] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-[#00a992]"></span>
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
                  Verify Your Email Address
                </h3>
                <p className="text-sm text-gray-600 text-center mb-5 leading-relaxed">
                  We&apos;ve sent a verification link to{" "}
                  <span className="font-semibold text-gray-900 underline decoration-[#00a992]/40 break-all">
                    {registeredEmail || email}
                  </span>
                  . Please verify your email before logging in.
                </p>

                {/* Prominent Spam / Junk Alert Card */}
                <div className="bg-amber-50/90 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 mb-5 text-left shadow-sm">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-amber-700">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-amber-950 mb-1">
                        Can&apos;t find the email in your Inbox?
                      </h4>
                      <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                        Automated verification emails frequently land in your{" "}
                        <span className="font-bold underline text-amber-950">Spam</span>,{" "}
                        <span className="font-bold underline text-amber-950">Junk</span>, or{" "}
                        <span className="font-bold underline text-amber-950">Promotions</span> folder.
                      </p>
                      <div className="mt-2.5 pt-2.5 border-t border-amber-200/80 flex items-start gap-2 text-xs text-amber-800 font-medium">
                        <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Pro Tip:</strong> Open the email and click <strong>&ldquo;Report Not Spam&rdquo;</strong> or move it to your Primary Inbox so you never miss class reminders or session links!
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Steps Guide */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100 text-xs text-gray-600 space-y-2 text-left">
                  <div className="font-semibold text-gray-800 text-[11px] tracking-wider uppercase">
                    Next Steps
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00a992] flex-shrink-0" />
                    <span>Check your email (including Spam/Junk folder)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00a992] flex-shrink-0" />
                    <span>Click the verification link in the email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00a992] flex-shrink-0" />
                    <span>Return here and log in to your account</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div>
                  <button
                    type="button"
                    onClick={handleProceedToLogin}
                    className="w-full bg-[#00a992] hover:bg-emerald-600 active:scale-[0.99] text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceed to Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={<div className="min-h-screen flex bg-gray-50 items-center justify-center">Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
