import { auth, db } from '@/utils/firebase/client';
import { doc, getDoc, collection, query, where, getDocs, setDoc, documentId, updateDoc, arrayRemove, orderBy, limit } from 'firebase/firestore';

export const fetchStudentDashboardData = async () => {
  await new Promise(resolve => auth.onAuthStateChanged(resolve));
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('Unauthenticated');
  }

  let userDocRef = doc(db, 'users', user.uid);
  let userDocSnap = await getDoc(userDocRef);
  let userData = userDocSnap.exists() ? userDocSnap.data() : null;
  
  const roles = userData?.roles || (userData?.role ? [userData.role] : []);
  if (userData) {
    userData.roles = roles;
    userData.id = user.uid;
  }
  if (userData && !roles.includes('student')) {
    throw new Error('Unauthorized');
  }

  if (!userData) {
    userData = {
      id: user.uid,
      email: user.email,
      name: user.displayName || 'Student',
      roles: ['student'],
      hasProfile: false,
      walletBalance: 0
    };
    await setDoc(userDocRef, userData);
  }
  
  const parentDocSnap = await getDoc(doc(db, 'parents', user.uid));
  const parentData = parentDocSnap.exists() ? parentDocSnap.data() : null;
  const parentId = user.uid;
  const [
    applicationsSnap,
    studentsSnap,
    groupsSnap,
    requestsSnap,
    tutorsSnapResult,
    referralsSnap,
    pricingSnap
  ] = await Promise.all([
    getDocs(query(collection(db, 'applications'), where('parentDocId', '==', parentId))),
    getDocs(query(collection(db, 'students'), where('parentDocId', '==', parentId))),
    getDocs(query(collection(db, 'groups'), where('parentDocId', '==', parentId))),
    getDocs(query(collection(db, 'tuition_requests'), where('parentDocId', '==', parentId), limit(50))),
    getDocs(query(collection(db, 'tutors'), where('hasProfile', '==', true), limit(100))).catch(e => {
      console.warn("Failed to fetch tutors", e);
      return { docs: [] };
    }),
    getDocs(query(collection(db, 'referrals'), where('referrerId', '==', user.uid), limit(50))),
    getDocs(collection(db, 'marketplace_pricing'))
  ]);

  const parseTimestamp = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (val.toMillis) return val.toMillis();
    if (val.seconds) return val.seconds * 1000;
    if (val._seconds) return val._seconds * 1000;
    return 0;
  };

  const applications = applicationsSnap.docs.map(d => {
    const data = d.data() as any;
    return { 
      id: d.id, 
      ...data,
      createdAt: parseTimestamp(data.createdAt),
      updatedAt: parseTimestamp(data.updatedAt),
      declinedAt: parseTimestamp(data.declinedAt),
      startDate: parseTimestamp(data.startDate)
    };
  });
  
  const students = studentsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  students.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
  const myStudent = students.length > 0 ? students[0] : null;

  const groups = groupsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  
  const requests = requestsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  const myRequest = requests.length > 0 ? requests[0] : null;

  const availableTutors = tutorsSnapResult.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
  
  const referrals = referralsSnap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      createdAt: parseTimestamp(data.createdAt),
      qualifiedAt: parseTimestamp(data.qualifiedAt)
    };
  });
  const marketplacePricing = pricingSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

  const tutorIds = applications.map((app: any) => app.tutorDocId).filter(Boolean);
  let tutorsInfo: any[] = [];
  if (tutorIds.length > 0) {
     const uniqueTutorIds = Array.from(new Set(tutorIds));
     const chunkPromises = [];
     for (let i = 0; i < uniqueTutorIds.length; i += 10) {
       const chunk = uniqueTutorIds.slice(i, i + 10);
       chunkPromises.push(getDocs(query(collection(db, 'tutors'), where(documentId(), 'in', chunk))));
     }
     const chunkSnaps = await Promise.all(chunkPromises);
     chunkSnaps.forEach(tSnap => {
       tutorsInfo = [...tutorsInfo, ...tSnap.docs.map(d => ({ id: d.id, ...d.data() }))];
     });
  }

  const baseData = {
    user,
    userData,
    marketplacePricing,
    parentData,
    students,
    myStudent,
    requests,
    myRequest,
    groups,
    applications,
    availableTutors,
    referrals,
    tutorsInfo
  };

  return deriveStudentDashboardState(baseData);
};

export const deriveStudentDashboardState = (baseData: any) => {
  const { user, userData, marketplacePricing, parentData, students, myStudent, requests, myRequest, groups, applications, availableTutors, referrals, tutorsInfo } = baseData;
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  const matchedTutors = availableTutors.filter((tutor: any) => {
    if (!myStudent) return true;
    const tutorCategories = tutor.category ? tutor.category.split(',').map((c: string) => c.trim()) : [];
    if (!tutorCategories.includes(myStudent.category)) return false;
    return true;
  }) || [];

  const applicationsWithSubjects = applications.map((app: any) => {
    const tutor = tutorsInfo.find((t: any) => t.id === app.tutorDocId);

    let currentStatus = app.status;
    // Auto-expire if teacher hasn't paid demo fee within 7 days
    if (currentStatus === 'demo_pending_payment' && (now - (app.updatedAt || app.createdAt || now)) > SEVEN_DAYS) {
      currentStatus = 'declined';
    }
    // Auto-expire if student hasn't made a decision 48 hours after demo was finished
    if (currentStatus === 'waiting_for_parent_decision' && (now - (app.updatedAt || app.createdAt || now)) > 48 * 60 * 60 * 1000) {
      currentStatus = 'declined';
    }

    return { 
      ...app, 
      status: currentStatus,
      tutorDetails: tutor,
      subjects: tutor?.subjects || [],
      technologies: tutor?.technologies || [],
      languagesTaught: tutor?.languagesTaught || []
    };
  }) || [];

  const dismissedNotifs = userData?.dismissedNotifications || [];
  const allNegotiations = applicationsWithSubjects.filter((app: any) => ['negotiating', 'demo_requested_by_student', 'demo_requested_by_teacher', 'demo_pending_payment', 'demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision'].includes(app.status));
  const allNotifications = [
    ...applicationsWithSubjects
    .filter((app: any) => ['negotiating', 'demo_requested_by_student', 'demo_requested_by_teacher', 'demo_pending_payment', 'demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision', 'declined', 'tuition_started'].includes(app.status))
    .filter((app: any) => !dismissedNotifs.includes(app.id))
    .sort((a: any, b: any) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
  ];
  const recommendedNegotiations = allNegotiations.filter((app: any) => matchedTutors.some((t:any) => t.id === app.tutorDocId));

  return {
    user,
    userData,
    marketplacePricing,
    profile: parentData,
    myStudent,
    students: students,
    allStudents: students,
    myRequest,
    groups,
    tuitionRequests: requests,
    applications: applicationsWithSubjects,
    availableTeachers: matchedTutors,
    allTutors: availableTutors,
    recommendedTutors: matchedTutors,
    referrals,
    negotiations: allNegotiations,
    allNegotiations,
    allNotifications,
    recommendedNegotiations,
    demoClasses: applicationsWithSubjects.filter((app: any) => ['demo_booking_phase', 'demo_scheduled'].includes(app.status)).map((app: any) => ({
      id: app.id,
      app: app,
      subject: app.category || 'General',
      teacher: app.tutorName || 'Assigned Tutor',
      studentDocId: app.studentDocId,
      studentName: app.studentName,
      date: app.demoDate || 'TBD',
      status: app.status,
      finalPrice: app.finalPrice || app.currentOffer || 4000,
      tutorDetails: app.tutorDetails
    })),
    upcomingClasses: applicationsWithSubjects.filter((app: any) => ['tuition_started'].includes(app.status)).map((app: any) => ({
      id: app.id,
      app: app,
      subject: app.category || 'General',
      teacher: app.tutorName || 'Assigned Tutor',
      studentDocId: app.studentDocId,
      studentDocIds: app.studentDocIds || [app.studentDocId],
      studentName: app.studentName,
      date: app.nextPaymentDate || app.startDate || new Date().toISOString(),
      startDate: app.startDate,
      feePaid: Boolean(app.feePaid),
      status: app.status,
      finalPrice: app.finalPrice || app.currentOffer || 4000,
      tutorDetails: app.tutorDetails
    })),
    _baseData: baseData
  };
};

export const fetchTeacherDashboardData = async () => {
  await new Promise(resolve => auth.onAuthStateChanged(resolve));
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('Unauthenticated');
  }

  let userDocRef = doc(db, 'users', user.uid);
  let userDocSnap = await getDoc(userDocRef);
  let userData = userDocSnap.exists() ? userDocSnap.data() : null;
  
  const roles = userData?.roles || (userData?.role ? [userData.role] : []);
  if (userData) {
    userData.roles = roles;
    userData.id = user.uid;
  }
  if (userData && !roles.includes('teacher')) {
    throw new Error('Unauthorized');
  }

  if (!userData) {
    userData = {
      id: user.uid,
      email: user.email,
      name: user.displayName || 'Teacher',
      roles: ['teacher'],
      hasProfile: false,
      walletBalance: 0
    };
    await setDoc(userDocRef, userData);
  }

  const tutorQuery = query(collection(db, 'tutors'), where('authUid', '==', user.uid));
  const tutorSnap = await getDocs(tutorQuery);
  const tutorData = !tutorSnap.empty ? tutorSnap.docs[0].data() : null;
  const tutorId = !tutorSnap.empty ? tutorSnap.docs[0].id : user.uid;
  
  const [
    applicationsSnap,
    studentsSnapResult,
    referralsSnap,
    pricingSnap,
    lockedAppsSnap,
    tutorPayoutsSnap
  ] = await Promise.all([
    getDocs(query(collection(db, 'applications'), where('tutorDocId', '==', tutorId))),
    getDocs(query(collection(db, 'students'), where('isAvailable', '==', true), limit(100))).catch(e => {
      console.warn("Failed to fetch students", e);
      return { docs: [] };
    }),
    getDocs(query(collection(db, 'referrals'), where('referrerId', '==', user.uid), limit(50))),
    getDocs(collection(db, 'marketplace_pricing')),
    getDocs(query(collection(db, 'applications'), where('status', 'in', ['demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision']))),
    getDocs(query(collection(db, 'tutor_payouts'), where('tutorDocId', '==', tutorId))).catch(e => {
      console.warn("Failed to fetch tutor_payouts", e);
      return { docs: [] };
    })
  ]);

  const parseTimestamp = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (val.toMillis) return val.toMillis();
    if (val.seconds) return val.seconds * 1000;
    if (val._seconds) return val._seconds * 1000;
    return 0;
  };

  const applications = applicationsSnap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      createdAt: parseTimestamp(data.createdAt),
      updatedAt: parseTimestamp(data.updatedAt),
      declinedAt: parseTimestamp(data.declinedAt),
      startDate: parseTimestamp(data.startDate)
    };
  });

  const tutorPayouts = tutorPayoutsSnap.docs.map((d: any) => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      applicationDocId: data.applicationDocId || data.applicationId || '',
      tutorShareAmount: typeof data.tutorShareAmount === 'number' ? data.tutorShareAmount : (typeof data.tutorShare === 'number' ? data.tutorShare : Math.round((data.grossAmount || 0) * 0.60)),
      platformFeeAmount: typeof data.platformFeeAmount === 'number' ? data.platformFeeAmount : (typeof data.platformShare === 'number' ? data.platformShare : Math.round((data.grossAmount || 0) * 0.40)),
      startDate: parseTimestamp(data.startDate),
      paidByStudentAt: parseTimestamp(data.paidByStudentAt),
      releaseEligibleAt: parseTimestamp(data.releaseEligibleAt),
      paidAt: parseTimestamp(data.paidAt),
      createdAt: parseTimestamp(data.createdAt)
    };
  });
  
  const referrals = referralsSnap.docs.map((d: any) => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      reward: typeof data.reward === 'number' ? data.reward : (typeof data.estimatedReward === 'number' ? data.estimatedReward : 0),
      createdAt: parseTimestamp(data.createdAt),
      qualifiedAt: parseTimestamp(data.qualifiedAt),
      releaseEligibleAt: parseTimestamp(data.releaseEligibleAt),
      paidAt: parseTimestamp(data.paidAt)
    };
  });
  const marketplacePricing = pricingSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));

  const availableStudentsRaw = studentsSnapResult.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
  availableStudentsRaw.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
  const availableStudents = availableStudentsRaw;

  // Phase 1: API Stitching - Fetch related groups for students to get teacherGenderPreference & schedule
  const uniqueGroupIds = Array.from(new Set([
    ...availableStudentsRaw.map((s: any) => s.groupDocId),
    ...applications.map((a: any) => a.groupDocId)
  ].filter(Boolean))) as string[];
  let fetchedGroups: any[] = [];
  if (uniqueGroupIds.length > 0) {
    const chunkPromises = [];
    for (let i = 0; i < uniqueGroupIds.length; i += 10) {
      const chunk = uniqueGroupIds.slice(i, i + 10);
      chunkPromises.push(getDocs(query(collection(db, 'groups'), where(documentId(), 'in', chunk))));
    }
    const chunkSnaps = await Promise.all(chunkPromises);
    chunkSnaps.forEach(gSnap => {
      fetchedGroups = [...fetchedGroups, ...gSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))];
    });
  }

  // Phase 1.5: Fetch parent custom IDs (MTP...) from 'parents' collection for groups and students
  const allParentDocIds = Array.from(new Set([
    ...availableStudentsRaw.map((s: any) => s.parentDocId),
    ...fetchedGroups.map((g: any) => g.parentDocId),
    ...applications.map((a: any) => a.parentDocId)
  ].filter(Boolean))) as string[];

  let parentCustomIdsMap: Record<string, string> = {};
  if (allParentDocIds.length > 0) {
    const parentChunkPromises = [];
    for (let i = 0; i < allParentDocIds.length; i += 10) {
      const chunk = allParentDocIds.slice(i, i + 10);
      parentChunkPromises.push(getDocs(query(collection(db, 'parents'), where(documentId(), 'in', chunk))));
    }
    const parentSnaps = await Promise.all(parentChunkPromises);
    parentSnaps.forEach(pSnap => {
      pSnap.docs.forEach(d => {
        const pData = d.data();
        if (pData?.parentId) {
          parentCustomIdsMap[d.id] = pData.parentId;
          if (pData.authUid) parentCustomIdsMap[pData.authUid] = pData.parentId;
          if (pData.parentDocId) parentCustomIdsMap[pData.parentDocId] = pData.parentId;
        }
      });
    });
  }

  const globalLocks: Record<string, { unlockDate: number, tutorDocId: string }> = {};
  lockedAppsSnap.docs.forEach(d => {
    const data = d.data();
    const gId = data.groupDocId || data.studentDocId;
    if (gId) {
      let unlockDate = Date.now() + 14 * 24 * 60 * 60 * 1000;
      if (data.status === 'demo_scheduled' || data.status === 'waiting_for_parent_decision') {
        if (data.demoDate) {
          const demoDateObj = new Date(data.demoDate);
          const timeParts = data.demoTime ? data.demoTime.split('||')[0].split(':') : [0, 0];
          if (timeParts.length >= 2) {
            demoDateObj.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
          }
          unlockDate = demoDateObj.getTime() + 48 * 60 * 60 * 1000;
        }
      } else {
         const paidDate = parseTimestamp(data.updatedAt) || parseTimestamp(data.createdAt) || Date.now();
         unlockDate = paidDate + 14 * 24 * 60 * 60 * 1000;
      }
      if (!globalLocks[gId] || unlockDate > globalLocks[gId].unlockDate) {
         globalLocks[gId] = { unlockDate, tutorDocId: data.tutorDocId };
      }
    }
  });

  const teacherCategories = tutorData?.category ? tutorData.category.split(',').map((c:string) => c.trim()) : [];
  

  

  const studentIds = applications.flatMap((app: any) => app.studentDocIds || [app.studentDocId]).filter(Boolean);

  let studentsInfo: any[] = [];
  if (studentIds.length > 0) {
    const uniqueStudentIds = Array.from(new Set(studentIds));
    const chunkPromises = [];
    for (let i = 0; i < uniqueStudentIds.length; i += 10) {
      const chunk = uniqueStudentIds.slice(i, i + 10);
      chunkPromises.push(getDocs(query(collection(db, 'students'), where(documentId(), 'in', chunk))));
    }
    const chunkSnaps = await Promise.all(chunkPromises);
    chunkSnaps.forEach(sSnap => {
      studentsInfo = [...studentsInfo, ...sSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))];
    });
  }

  // Phase 1: Securely Fetch Parent Phone Numbers for Authorized Applications
  const authorizedAppStatuses = ['demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision', 'tuition_started'];
  const authorizedParentIds = applications
    .filter((app: any) => authorizedAppStatuses.includes(app.status))
    .map((app: any) => app.parentDocId || (app.studentDetails?.parentDocId))
    .filter(Boolean);

  let parentsInfo: Record<string, any> = {};
  if (authorizedParentIds.length > 0) {
    const uniqueParentIds = Array.from(new Set(authorizedParentIds));
    const parentPromises = [];
    for (let i = 0; i < uniqueParentIds.length; i += 10) {
      const chunk = uniqueParentIds.slice(i, i + 10);
      parentPromises.push(getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk))));
    }
    const parentSnaps = await Promise.all(parentPromises);
    parentSnaps.forEach(pSnap => {
      pSnap.docs.forEach(d => {
        parentsInfo[d.id] = { id: d.id, ...d.data() as any };
      });
    });
  }

  const stitchedApplications = applications.map((app: any) => {
    const parentId = app.parentDocId;
    if (parentId && parentsInfo[parentId]) {
      return { ...app, parentDetails: parentsInfo[parentId] };
    }
    return app;
  });

  const baseData = {
    user,
    userData,
    tutorId,
    tutorData,
    teacherCategories,
    globalLocks,
    applications: stitchedApplications,
    tutorPayouts,
    referrals,
    marketplacePricing,
    availableStudentsRaw,
    availableStudents,
    studentsInfo,
    fetchedGroups,
    parentCustomIdsMap
  };

  return deriveTeacherDashboardState(baseData);
};

export const deriveTeacherDashboardState = (baseData: any) => {
  const { 
    user, userData, tutorId, tutorData, teacherCategories, globalLocks, 
    applications, tutorPayouts = [], referrals, marketplacePricing, 
    availableStudentsRaw, availableStudents, studentsInfo, fetchedGroups,
    parentCustomIdsMap = {}
  } = baseData;

  // Deduplicate students first by id
  const deduplicatedStudentsRaw: any[] = [];
  const seenStudentIds = new Set();
  (availableStudentsRaw || []).forEach((student: any) => {
    if (!student || !student.id || seenStudentIds.has(student.id)) return;
    seenStudentIds.add(student.id);
    deduplicatedStudentsRaw.push(student);
  });

  // Group students
  const groupedStudentsMap = deduplicatedStudentsRaw.reduce((acc: any, student: any) => {
    const gId = student.groupDocId || student.groupId || `indv_${student.id}`;
    if (!acc[gId]) {
      const groupDoc = (fetchedGroups || []).find((g: any) => g.id === gId || g.groupDocId === gId || g.groupId === gId) || null;
      const pDocId = student.parentDocId || groupDoc?.parentDocId || student.parentId;
      const resolvedParentId = groupDoc?.parentId || student.parentId || (pDocId ? parentCustomIdsMap[pDocId] : '') || '';
      const resolvedGroupId = groupDoc?.groupId || student.groupId || (gId.startsWith('indv_') ? '' : gId);

      let cleanMode = groupDoc?.mode || student.preferredMode || '';
      if (cleanMode === 'Offline (Home Tuition)') cleanMode = 'Offline';

      acc[gId] = { 
        id: gId, 
        groupId: resolvedGroupId,
        parentId: resolvedParentId,
        students: [], 
        totalBudget: 0,
        parentDocId: pDocId,
        categories: [],
        requestDoc: groupDoc,
        daysPerWeek: groupDoc?.daysPerWeek || student.daysPerWeek || '',
        specificDays: groupDoc?.specificDays || student.specificDays || [],
        preferredTimeRange: groupDoc?.preferredTimeRange || student.preferredTimeRange || student.hours || '',
        mode: cleanMode,
        area: groupDoc?.area || student.area || '',
        city: groupDoc?.city || student.city || '',
        latitude: groupDoc?.latitude || student.latitude || null,
        longitude: groupDoc?.longitude || student.longitude || null,
        teacherGenderPreference: groupDoc?.teacherGenderPreference || 'No Preference'
      };
    }
    acc[gId].students.push({
      ...student,
      parentId: acc[gId].parentId,
      groupId: acc[gId].groupId
    });
    acc[gId].totalBudget += (parseInt(student.budget) || 0);
    if (student.category) acc[gId].categories.push(student.category);
    return acc;
  }, {});

  const availableGroupsRaw = Object.values(groupedStudentsMap).map((g: any) => ({
    ...g,
    groupId: g.groupId,
    parentId: g.parentId,
    name: g.students.length === 1 ? g.students[0].name : `Group: ${g.students.map((s:any) => s.name).join(', ')}`,
    category: g.categories[0] || 'school',
    budget: g.totalBudget
  }));

  const matchedGroups = availableGroupsRaw.filter((group: any) => {
    if (!tutorData) return true;
    
    // A group matches if any student inside it matches the teacher's profile
    return group.students.some((student: any) => {
      const studentCat = (student.category || '').toLowerCase().trim();
      const teacherCats = teacherCategories.map((c:string) => c.toLowerCase().trim());
      
      if (!teacherCats.includes(studentCat)) return false;
      
      return true;
    });
  });

  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  const applicationsWithSubjects = applications.map((app: any) => {
    const student = studentsInfo.find((s: any) => s.id === app.studentDocId);
    const appStudentsList = studentsInfo.filter((s: any) => (app.studentDocIds || []).includes(s.id) || s.id === app.studentDocId);
    
    let currentStatus = app.status;
    // Auto-expire if teacher hasn't paid demo fee within 7 days
    if (currentStatus === 'demo_pending_payment' && (now - (app.updatedAt || app.createdAt || now)) > SEVEN_DAYS) {
      currentStatus = 'declined';
    }
    // Auto-expire if student hasn't made a decision 48 hours after demo was finished
    if (currentStatus === 'waiting_for_parent_decision' && (now - (app.updatedAt || app.createdAt || now)) > 48 * 60 * 60 * 1000) {
      currentStatus = 'declined';
    }

    const stitchedStudent = student ? { ...student, parentDetails: app.parentDetails } : null;
    const stitchedAppStudentsList = appStudentsList.map((s: any) => ({ ...s, parentDetails: app.parentDetails }));
    const appGroup = (fetchedGroups || []).find((g: any) => g.id === app.groupDocId) || null;
    const resolvedParentId = app.parentId || appGroup?.parentId || (app.parentDocId && parentCustomIdsMap ? parentCustomIdsMap[app.parentDocId] : '') || '';
    const resolvedGroupId = app.groupId || appGroup?.groupId || '';

    return { 
      ...app, 
      groupId: resolvedGroupId,
      parentId: resolvedParentId,
      status: currentStatus,
      studentDetails: stitchedStudent,
      studentsList: stitchedAppStudentsList,
      groupDetails: appGroup,
      daysPerWeek: app.daysPerWeek || appGroup?.daysPerWeek || '',
      specificDays: app.specificDays || appGroup?.specificDays || [],
      preferredTimeRange: app.preferredTimeRange || appGroup?.preferredTimeRange || '',
      subjects: student?.subjects || [],
      technologies: student?.technologies || [],
      languages: student?.languages || []
    };
  }) || [];

  const dismissedNotifs = userData?.dismissedNotifications || [];
  const allNegotiations = applicationsWithSubjects.filter((app: any) => ['negotiating', 'demo_requested_by_student', 'demo_requested_by_teacher', 'demo_pending_payment', 'demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision'].includes(app.status));
  const allNotifications = applicationsWithSubjects
    .filter((app: any) => ['negotiating', 'demo_requested_by_student', 'demo_requested_by_teacher', 'demo_pending_payment', 'demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision', 'declined', 'tuition_started'].includes(app.status))
    .filter((app: any) => !dismissedNotifs.includes(app.id))
    .sort((a: any, b: any) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  const recommendedNegotiations = allNegotiations.filter((app: any) => matchedGroups.some((g:any) => g.id === (app.groupDocId || app.studentDocId)));

  const findPayoutForApp = (appId: string) => (tutorPayouts || []).find((p: any) => p.applicationDocId === appId || p.applicationId === appId || p.id === `payout_${appId}`);

  let grossStudentVolume = 0;
  let tuitionRevenue = 0;
  let demoFeesPaid = 0;
  let activeMRR = 0;
  let tuitionEscrow = 0;
  let referralEscrow = 0;
  let referralCashEarned = 0;
  let bankedTokensEarned = 0;
  const ledgerEntries: any[] = [];

  applicationsWithSubjects.forEach((app: any) => {
    // Track Demo Fee (Teacher Outflow)
    const hasPassedDemoPhase = ['demo_scheduled', 'waiting_for_parent_decision', 'demo_booked', 'accepted', 'tuition_started'].includes(app.status);
    if (hasPassedDemoPhase) {
      const dFee = 100; // Standard demo fee
      demoFeesPaid += dFee;
      ledgerEntries.push({
        id: `${app.id}_demo`,
        date: app.createdAt || Date.now(),
        studentName: app.studentName || 'Student',
        subject: app.category || 'General',
        amount: dFee,
        type: 'demo_fee_paid',
        isOutflow: true,
        status: 'paid'
      });
    }

    // Track First Month Fee & Escrow
    if (app.status === 'tuition_started') {
      const fFee = app.finalPrice || 0;
      activeMRR += fFee;
      
      if (app.feePaid === true) {
        grossStudentVolume += fFee;
        const payout = findPayoutForApp(app.id);
        const tShare = payout?.tutorShareAmount ?? Math.round(fFee * 0.60);
        tuitionRevenue += tShare;

        const isDisbursed = payout?.status === 'paid';
        if (!payout || ['escrow_held', 'ready_for_payout', 'action_required_missing_upi'].includes(payout.status)) {
          tuitionEscrow += tShare;
        }

        ledgerEntries.push({
          id: `${app.id}_first_month`,
          date: app.updatedAt || Date.now(),
          studentName: app.studentName || 'Student',
          subject: app.category || 'General',
          amount: tShare,
          type: 'first_month_tutor_share',
          isOutflow: false,
          status: isDisbursed ? 'paid' : 'escrow_held'
        });
      }
    }

    // Track Subsequent Direct Payments (Month 2+)
    if (app.subsequentPayments && Array.isArray(app.subsequentPayments)) {
      app.subsequentPayments.forEach((pmt: any, index: number) => {
        grossStudentVolume += pmt.amount;
        tuitionRevenue += pmt.amount;
        ledgerEntries.push({
          id: `${app.id}_manual_${index}`,
          date: pmt.date || Date.now(),
          studentName: app.studentName || 'Student',
          subject: app.category || 'General',
          amount: pmt.amount,
          type: 'manual_payment',
          isOutflow: false,
          status: 'paid'
        });
      });
    }
  });

  // Track Referral Rewards (Cash to UPI or Banked Proposal Tokens)
  (referrals || []).forEach((ref: any) => {
    if (ref.rewardType === 'banked_token') {
      if (ref.status === 'qualified') {
        bankedTokensEarned += 1;
      }
    } else {
      const reward = ref.reward || 0;
      if (reward > 0) {
        if (ref.payoutStatus === 'paid') {
          referralCashEarned += reward;
          ledgerEntries.push({
            id: `${ref.id}_ref_paid`,
            date: ref.paidAt || Date.now(),
            studentName: ref.referredUserName || 'Referred Friend',
            subject: 'Referral Cash Payout',
            amount: reward,
            type: 'referral_paid_upi',
            isOutflow: false,
            status: 'paid'
          });
        } else if (ref.status === 'qualified' && ['escrow_held', 'ready_for_payout', 'action_required_missing_upi'].includes(ref.payoutStatus || 'escrow_held')) {
          referralEscrow += reward;
          referralCashEarned += reward;
          ledgerEntries.push({
            id: `${ref.id}_ref_escrow`,
            date: ref.qualifiedAt || Date.now(),
            studentName: ref.referredUserName || 'Referred Friend',
            subject: 'Referral Reward in Day 30 Escrow',
            amount: reward,
            type: 'referral_escrow_held',
            isOutflow: false,
            status: 'escrow_held'
          });
        }
      }
    }
  });

  const referralLedger = (referrals || []).map((r: any) => ({
    id: r.id,
    name: r.referredUserName || 'Referred Friend',
    status: r.status || 'pending',
    reward: r.reward || r.estimatedReward || 0,
    rewardType: r.rewardType || 'wallet_cash',
    payoutStatus: r.payoutStatus || (r.status === 'qualified' ? 'escrow_held' : 'pending'),
    releaseEligibleAt: r.releaseEligibleAt || 0,
    qualifiedAt: r.qualifiedAt || 0,
    createdAt: r.createdAt || 0,
    payoutVpa: r.payoutVpa || '',
    utrNumber: r.utrNumber || ''
  }));

  const heldInEscrow = tuitionEscrow + referralEscrow;
  const netRevenue = (tuitionRevenue + referralCashEarned) - demoFeesPaid;

  ledgerEntries.sort((a, b) => b.date - a.date);

  const earningsData = {
    totalRevenue: grossStudentVolume,
    grossStudentVolume,
    tuitionRevenue,
    referralCashEarned,
    bankedTokensEarned,
    demoFeesPaid,
    netRevenue,
    activeMRR,
    heldInEscrow,
    tuitionEscrow,
    referralEscrow,
    ledgerEntries,
    referralLedger
  };

  return {
    user,
    userData,
    tutorDocId: tutorId,
    globalLocks,
    profile: tutorData,
    teacherCategories,
    availableStudents: matchedGroups,
    allStudents: availableGroupsRaw,
    recommendedStudents: matchedGroups,
    applications: applicationsWithSubjects,
    marketplacePricing,
    notifications: allNotifications,
    referrals,
    negotiations: allNegotiations,
    allNegotiations,
    allNotifications,
    recommendedNegotiations,
    earningsData,
    tutorPayouts,
    demoClasses: applicationsWithSubjects.filter((app: any) => ['demo_booking_phase', 'demo_scheduled'].includes(app.status)).map((app: any) => ({
      id: app.id,
      app: app,
      student: app.studentName || (app.studentDocIds?.length > 1 ? 'Group' : 'Student'),
      subject: app.category || 'General',
      date: app.demoDate || 'TBD',
      status: app.status,
      studentDetails: app.studentDetails,
      groupDetails: app.groupDetails
    })),
    upcomingClasses: applicationsWithSubjects.filter((app: any) => ['tuition_started'].includes(app.status)).map((app: any) => {
      const payout = findPayoutForApp(app.id);
      const baseStart = app.startDate || app.updatedAt || app.createdAt || Date.now();
      const day7DueDate = baseStart + (7 * 24 * 60 * 60 * 1000);
      const day30PayoutDate = payout?.releaseEligibleAt || (baseStart + (30 * 24 * 60 * 60 * 1000));
      const tutorShare = payout?.tutorShareAmount ?? Math.round((app.finalPrice || 0) * 0.60);
      const platformShare = payout?.platformFeeAmount ?? Math.round((app.finalPrice || 0) * 0.40);
      const isMonth1 = !app.subsequentPayments || app.subsequentPayments.length === 0;

      return {
        id: app.id,
        app: app,
        student: app.studentName || 'Assigned Student',
        subject: app.category || 'General',
        date: app.nextPaymentDate || app.startDate || new Date().toISOString(),
        status: app.status === 'tuition_started' ? 'confirmed' : 'pending',
        studentDetails: app.studentDetails,
        groupDetails: app.groupDetails,
        day7DueDate,
        day30PayoutDate,
        tutorShare,
        platformShare,
        payoutRecord: payout || null,
        isMonth1
      };
    }),
    _baseData: baseData
  };
};
