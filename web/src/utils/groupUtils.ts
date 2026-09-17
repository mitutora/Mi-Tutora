import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { generateCustomId } from '@/utils/idGenerator';

export async function syncTuitionRequestForGroup(db: any, groupId: string, parentId: string) {
  // 1. Fetch group
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await (await import('firebase/firestore')).getDoc(groupRef);
  
  if (!groupSnap.exists()) {
    return;
  }
  
  const groupData = groupSnap.data();
  
  // 2. Fetch all students in this group
  const studentsSnap = await getDocs(query(collection(db, 'students'), where('groupDocId', '==', groupId)));
  const students = studentsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  const resolvedStudentIds = Array.from(new Set([...(groupData.studentDocIds || []), ...students.map(s => s.id)]));
  
  // 3. Find or Create tuition_request
  let requestQuery = query(collection(db, 'tuition_requests'), where('groupDocId', '==', groupId));
  let requestSnap = await getDocs(requestQuery);
  if (requestSnap.empty) {
    const legacyQuery = query(collection(db, 'tuition_requests'), where('groupId', '==', groupId));
    requestSnap = await getDocs(legacyQuery);
  }
  
  if (resolvedStudentIds.length === 0 && students.length === 0) {
    for (const reqDoc of requestSnap.docs) {
      await deleteDoc(reqDoc.ref);
    }
    await deleteDoc(groupRef);
    return;
  }

  // Update group studentDocIds if out of sync
  if ((groupData.studentDocIds || []).length !== resolvedStudentIds.length) {
    await updateDoc(groupRef, { studentDocIds: resolvedStudentIds });
  }

  let studentsDetails: any[] = [];
  let combinedSubjects = new Set<string>();
  let combinedTechnologies = new Set<string>();
  let combinedLanguages = new Set<string>();
  let combinedBudget = 0;
  let category = '';

  for (const st of students) {
    if (!category && st.category) category = st.category;
    
    studentsDetails.push({
      id: st.id,
      name: st.name || '',
      classLevel: st.classLevel || st.classGrade || '',
      board: st.board || '',
      subjects: st.subjects || [],
      technologies: st.technologies || [],
      languages: st.languages || [],
      budget: st.budget || 0,
    });
    
    (st.subjects || []).forEach((s: string) => combinedSubjects.add(s));
    (st.technologies || []).forEach((s: string) => combinedTechnologies.add(s));
    (st.languages || []).forEach((s: string) => combinedLanguages.add(s));
    combinedBudget += (st.budget || 0);
  }

  let cleanMode = groupData.mode;
  if (cleanMode === 'Offline (Home Tuition)') cleanMode = 'Offline';
  if (!cleanMode) cleanMode = 'Online';

  const payload = {
    groupDocId: groupId,
    parentId,
    parentDocId: parentId,
    category,
    mode: cleanMode,
    area: groupData.area || '',
    city: groupData.city || '',
    latitude: groupData.latitude || null,
    longitude: groupData.longitude || null,
    teacherGenderPreference: groupData.teacherGenderPreference || 'No Preference',
    preferredTimeRange: groupData.preferredTimeRange || '',
    daysPerWeek: groupData.daysPerWeek || '',
    specificDays: groupData.specificDays || [],
    studentsDetails,
    combinedSubjects: Array.from(combinedSubjects),
    combinedTechnologies: Array.from(combinedTechnologies),
    combinedLanguages: Array.from(combinedLanguages),
    combinedBudget,
    status: 'open',
    acceptedTutorId: '',
  };

  if (requestSnap.empty) {
    const newRequestRef = doc(collection(db, 'tuition_requests'));
    await setDoc(newRequestRef, {
      requestId: generateCustomId('REQ'),
      id: newRequestRef.id,
      createdAt: Date.now(),
      ...payload
    });
  } else {
    for (const reqDoc of requestSnap.docs) {
      await updateDoc(reqDoc.ref, payload);
    }
  }
}
