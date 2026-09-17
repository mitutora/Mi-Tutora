import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

export const syncStudentAvailability = async (db: any, studentDocIds: string[]) => {
  if (!studentDocIds || studentDocIds.length === 0) return;
  
  const uniqueIds = Array.from(new Set(studentDocIds.filter(Boolean)));
  
  for (const sid of uniqueIds) {
    try {
      // Find any application where this student is individual or part of a group that is locked/hired
      const q1 = query(
        collection(db, 'applications'), 
        where('studentDocId', '==', sid), 
        where('status', 'in', ['tuition_started', 'demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision'])
      );
      
      const q2 = query(
        collection(db, 'applications'), 
        where('studentDocIds', 'array-contains', sid), 
        where('status', 'in', ['tuition_started', 'demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision'])
      );
      
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const isLocked = !snap1.empty || !snap2.empty;
      
      await updateDoc(doc(db, 'students', sid), { isAvailable: !isLocked });
    } catch (err) {
      console.error(`Failed to sync availability for student ${sid}:`, err);
    }
  }
};
