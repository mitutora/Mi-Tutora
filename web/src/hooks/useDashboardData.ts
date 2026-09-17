import { useEffect } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { fetchStudentDashboardData, fetchTeacherDashboardData, deriveStudentDashboardState, deriveTeacherDashboardState } from '@/api/dashboardApi';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/utils/firebase/client';

// Shared helper — converts any Firestore Timestamp variant or raw number to a plain ms number.
// Defined at module level so both useStudentData and useTeacherData use the same logic.
const parseTimestamp = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (val.toMillis) return val.toMillis();
  if (val.seconds) return val.seconds * 1000;
  if (val._seconds) return val._seconds * 1000;
  return 0;
};

export function useStudentData() {
  const router = useRouter();

  const { data, error, isLoading, mutate } = useSWR(
    'studentDashboardData', 
    fetchStudentDashboardData,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 60000 
    }
  );

  useEffect(() => {
    if (error) {
      if (error.message === 'Unauthenticated') {
        router.push('/login');
      } else if (error.message === 'Unauthorized') {
        router.push('/dashboard/teacher');
      }
    }
  }, [error, router]);

  useEffect(() => {
    if (!data?.user?.uid) return;
    let isCancelled = false;
    let unsubscribe: any;
    let unsubscribeTutors: any;
    let unsubscribeReferrals: any;
    

    const setupRealtime = async () => {
      if (isCancelled) return;
      
      const q = query(collection(db, 'applications'), where('parentDocId', '==', data.user.uid));
      unsubscribe = onSnapshot(q, (snapshot: any) => {
        if (isCancelled) return;
        if (snapshot.metadata.hasPendingWrites) return;

        const changedDocs = snapshot.docChanges();
        if (changedDocs.length === 0) return;

        mutate((currentData: any) => {
          if (!currentData || !currentData._baseData) return currentData;
          let apps = [...currentData._baseData.applications];
          let updated = false;

          changedDocs.forEach((change: any) => {
            const rawData = change.doc.data();
            const docData = { 
              id: change.doc.id, 
              ...rawData,
              createdAt: parseTimestamp(rawData.createdAt),
              updatedAt: parseTimestamp(rawData.updatedAt),
              declinedAt: parseTimestamp(rawData.declinedAt),
              startDate: parseTimestamp(rawData.startDate)
            };
            if (change.type === 'added' || change.type === 'modified') {
              const index = apps.findIndex((a: any) => a.id === docData.id);
              if (index !== -1) {
                apps[index] = docData;
              } else {
                apps.push(docData);
              }
              updated = true;
            } else if (change.type === 'removed') {
              apps = apps.filter((a: any) => a.id !== docData.id);
              updated = true;
            }
          });

          if (!updated) return currentData;
          const newBaseData = { ...currentData._baseData, applications: apps };
          return deriveStudentDashboardState(newBaseData);
        }, { revalidate: false });
      }, (error: any) => {
        console.error("Realtime listener error:", error);
      });
      
      const tutorsQ = query(collection(db, 'tutors'), where('createdAt', '>=', Date.now()));
      unsubscribeTutors = onSnapshot(tutorsQ, (snapshot: any) => {
        if (isCancelled) return;
        const addedDocs = snapshot.docChanges().filter((c: any) => c.type === 'added');
        if (addedDocs.length === 0) return;
        
        mutate((currentData: any) => {
          if (!currentData || !currentData._baseData) return currentData;
          const newTutors = addedDocs.map((c: any) => ({ id: c.doc.id, ...c.doc.data() }));
          const newBaseData = {
            ...currentData._baseData,
            availableTutors: [...currentData._baseData.availableTutors, ...newTutors],
            tutorsInfo: [...(currentData._baseData.tutorsInfo || []), ...newTutors]
          };
          return deriveStudentDashboardState(newBaseData);
        }, { revalidate: false });
      });

      const refsQ = query(collection(db, 'referrals'), where('referrerId', '==', data.user.uid));
      unsubscribeReferrals = onSnapshot(refsQ, (snapshot: any) => {
        if (isCancelled) return;
        if (snapshot.metadata.hasPendingWrites) return;
        
        const changedDocs = snapshot.docChanges();
        if (changedDocs.length === 0) return;
        
        mutate((currentData: any) => {
          if (!currentData || !currentData._baseData) return currentData;
          let refs = [...(currentData._baseData.referrals || [])];
          let updated = false;

          changedDocs.forEach((change: any) => {
            const docData = { id: change.doc.id, ...change.doc.data() };
            if (change.type === 'added' || change.type === 'modified') {
               const index = refs.findIndex((r: any) => r.id === docData.id);
               if (index !== -1) refs[index] = docData;
               else refs.push(docData);
               updated = true;
            } else if (change.type === 'removed') {
               refs = refs.filter((r: any) => r.id !== docData.id);
               updated = true;
            }
          });

          if (!updated) return currentData;
          const newBaseData = { ...currentData._baseData, referrals: refs };
          return deriveStudentDashboardState(newBaseData);
        }, { revalidate: false });
      });
    };
    setupRealtime();

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
      if (unsubscribeTutors) unsubscribeTutors();
      if (unsubscribeReferrals) unsubscribeReferrals();
    };
  }, [data?.user?.uid, mutate]);

  useEffect(() => {
    if (data?.user?.uid && data?.userData?.referredBy && !data?.userData?.referrerName) {
      (async () => {
        try {
          const { auth } = await import('@/utils/firebase/client');
          const token = await auth.currentUser?.getIdToken();
          if (token) {
            const res = await fetch('/api/referrals/track', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                referralCode: data.userData.referredBy,
                refereeUid: data.user.uid,
                refereeName: data.userData.name || '',
                role: data.userData.role || 'student'
              })
            });
            const resData = await res.json();
            if (resData.success && resData.referrerName) {
              mutate();
            }
          }
        } catch (err) {
          console.error('Referral auto-healing error:', err);
        }
      })();
    }
  }, [data?.user?.uid, data?.userData?.referredBy, data?.userData?.referrerName, mutate]);

  return { data, error, isLoading, mutate };
}

export function useTeacherData() {
  const router = useRouter();

  const { data, error, isLoading, mutate } = useSWR(
    'teacherDashboardData', 
    fetchTeacherDashboardData,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 60000 
    }
  );

  useEffect(() => {
    if (error) {
      if (error.message === 'Unauthenticated') {
        router.push('/login');
      } else if (error.message === 'Unauthorized') {
        router.push('/dashboard/student');
      }
    }
  }, [error, router]);

  useEffect(() => {
    if (!data?.user?.uid) return;
    let isCancelled = false;
    let unsubscribe: any;
    let unsubscribeStudents: any;
    let unsubscribeReferrals: any;
    
    const setupRealtime = async () => {
      if (isCancelled) return;
      
      const q = query(collection(db, 'applications'), where('tutorDocId', '==', data.user.uid));
      unsubscribe = onSnapshot(q, (snapshot: any) => {
        if (isCancelled) return;
        if (snapshot.metadata.hasPendingWrites) return;

        const changedDocs = snapshot.docChanges();
        if (changedDocs.length === 0) return;

        mutate((currentData: any) => {
          if (!currentData || !currentData._baseData) return currentData;
          let apps = [...currentData._baseData.applications];
          let updated = false;

          changedDocs.forEach((change: any) => {
            const rawData = change.doc.data();
            const docData = {
              id: change.doc.id,
              ...rawData,
              createdAt: parseTimestamp(rawData.createdAt),
              updatedAt: parseTimestamp(rawData.updatedAt),
              declinedAt: parseTimestamp(rawData.declinedAt),
              startDate: parseTimestamp(rawData.startDate),
            };
            if (change.type === 'added' || change.type === 'modified') {
              const index = apps.findIndex((a: any) => a.id === docData.id);
              if (index !== -1) {
                apps[index] = docData;
              } else {
                apps.push(docData);
              }
              updated = true;
            } else if (change.type === 'removed') {
              apps = apps.filter((a: any) => a.id !== docData.id);
              updated = true;
            }
          });

          if (!updated) return currentData;
          const newBaseData = { ...currentData._baseData, applications: apps };
          return deriveTeacherDashboardState(newBaseData);
        }, { revalidate: false });
      });
      
      const studentsQ = query(collection(db, 'students'), where('createdAt', '>=', Date.now()));
      unsubscribeStudents = onSnapshot(studentsQ, (snapshot: any) => {
        if (isCancelled) return;
        const addedDocs = snapshot.docChanges().filter((c: any) => c.type === 'added');
        if (addedDocs.length === 0) return;
        
        mutate((currentData: any) => {
          if (!currentData || !currentData._baseData) return currentData;
          const newStudents = addedDocs.map((c: any) => ({ id: c.doc.id, ...c.doc.data() }));
          const newBaseData = {
            ...currentData._baseData,
            availableStudentsRaw: [...currentData._baseData.availableStudentsRaw, ...newStudents],
            studentsInfo: [...(currentData._baseData.studentsInfo || []), ...newStudents]
          };
          return deriveTeacherDashboardState(newBaseData);
        }, { revalidate: false });
      });
      const refsQ = query(collection(db, 'referrals'), where('referrerId', '==', data.user.uid));
      unsubscribeReferrals = onSnapshot(refsQ, (snapshot: any) => {
        if (isCancelled) return;
        if (snapshot.metadata.hasPendingWrites) return;
        
        const changedDocs = snapshot.docChanges();
        if (changedDocs.length === 0) return;
        
        mutate((currentData: any) => {
          if (!currentData || !currentData._baseData) return currentData;
          let refs = [...(currentData._baseData.referrals || [])];
          let updated = false;

          changedDocs.forEach((change: any) => {
            const docData = { id: change.doc.id, ...change.doc.data() };
            if (change.type === 'added' || change.type === 'modified') {
               const index = refs.findIndex((r: any) => r.id === docData.id);
               if (index !== -1) refs[index] = docData;
               else refs.push(docData);
               updated = true;
            } else if (change.type === 'removed') {
               refs = refs.filter((r: any) => r.id !== docData.id);
               updated = true;
            }
          });

          if (!updated) return currentData;
          const newBaseData = { ...currentData._baseData, referrals: refs };
          return deriveTeacherDashboardState(newBaseData);
        }, { revalidate: false });
      });
    };
    setupRealtime();

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
      if (unsubscribeStudents) unsubscribeStudents();
      if (unsubscribeReferrals) unsubscribeReferrals();
    };
  }, [data?.user?.uid, mutate]);

  useEffect(() => {
    if (data?.user?.uid && data?.userData?.referredBy && !data?.userData?.referrerName) {
      (async () => {
        try {
          const { auth } = await import('@/utils/firebase/client');
          const token = await auth.currentUser?.getIdToken();
          if (token) {
            const res = await fetch('/api/referrals/track', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                referralCode: data.userData.referredBy,
                refereeUid: data.user.uid,
                refereeName: data.userData.name || '',
                role: data.userData.role || 'teacher'
              })
            });
            const resData = await res.json();
            if (resData.success && resData.referrerName) {
              mutate();
            }
          }
        } catch (err) {
          console.error('Referral auto-healing error:', err);
        }
      })();
    }
  }, [data?.user?.uid, data?.userData?.referredBy, data?.userData?.referrerName, mutate]);

  return { data, error, isLoading, mutate };
}
