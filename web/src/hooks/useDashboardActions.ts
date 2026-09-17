import { db, auth } from '@/utils/firebase/client';
import { doc, runTransaction, arrayRemove, collection, getDocs, query, where, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { syncStudentAvailability } from '@/utils/studentAvailability';

export const executeDeclineOffer = async (appId: string, role: 'student' | 'teacher', data?: any) => {
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
    
    transaction.update(appRef, {
      status: 'declined',
      declinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastUpdatedBy: role
    });
    
    if (appData.tutorDocId) {
      transaction.update(doc(db, 'tutors', appData.tutorDocId), { pendingRequests: arrayRemove(appId) });
    }
    if (appData.studentDocIds) {
      for (const sid of appData.studentDocIds) {
        transaction.update(doc(db, 'students', sid), { pendingRequests: arrayRemove(appId) });
      }
    }
  });

  if (data?.applications) {
    const appDataSync = data.applications.find((a: any) => a.id === appId);
    if (appDataSync) {
      await syncStudentAvailability(db, appDataSync.studentDocIds || [appDataSync.studentDocId]).catch(console.error);
    }
  }
};

export const executeAppointTutor = async (appId: string, data?: any) => {
  const parentDocId = data?.user?.uid;
  if (!parentDocId) throw new Error("Unauthorized");

  const token = await auth.currentUser?.getIdToken();
  const response = await fetch('/api/transactions/hire', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ applicationId: appId })
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to hire teacher");
  }
  
  const app = data?.applications?.find((a: any) => a.id === appId);
  
  if (app) {
    await syncStudentAvailability(db, app.studentDocIds || [app.studentDocId]).catch(console.error);
  }
};
