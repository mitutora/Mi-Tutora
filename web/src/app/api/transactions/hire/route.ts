import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/utils/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const adminAuth = await getAdminAuth();
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { applicationId } = body;
    const parentDocId = decodedToken.uid; // SECURE: Override the body parentDocId with the verified token UID

    if (!applicationId || !parentDocId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const appRef = adminDb.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    const appData = appSnap.data()!;

    if (appData.parentDocId !== parentDocId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    if (!appData.demoDate || !appData.demoTime) {
      return NextResponse.json({ success: false, error: 'Demo not scheduled' }, { status: 400 });
    }

    const cleanTime = (appData.demoTime || '').split('||')[0].trim();
    const formattedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
    let demoEndTime: number;
    const istParsed = new Date(`${appData.demoDate}T${formattedTime}+05:30`).getTime();
    if (!isNaN(istParsed)) {
      demoEndTime = istParsed;
    } else {
      const demoDateObj = new Date(appData.demoDate);
      const timeParts = cleanTime.split(':');
      if (timeParts.length >= 2) {
        demoDateObj.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
      }
      demoEndTime = demoDateObj.getTime();
    }

    if (Date.now() < demoEndTime) {
      return NextResponse.json({ success: false, error: 'Demo has not finished yet' }, { status: 403 });
    }

    if (!['demo_scheduled', 'waiting_for_parent_decision'].includes(appData.status)) {
      return NextResponse.json({ success: false, error: 'Invalid application status' }, { status: 400 });
    }

    const batch = adminDb.batch();

    batch.update(appRef, {
      status: 'tuition_started',
      startDate: FieldValue.serverTimestamp(),
      feePaid: false
    });

    const newPendingFeeRef = adminDb.collection('pending_tuition_fees').doc(applicationId);
    batch.set(newPendingFeeRef, {
      applicationDocId: applicationId,
      studentDocId: appData.parentDocId || appData.studentDocId || '',
      tutorDocId: appData.tutorDocId || '',
      startDate: FieldValue.serverTimestamp(),
      status: 'pending',
      amount: appData.finalPrice || appData.currentOffer || appData.budget || 4000
    });

    if (appData.tutorDocId) {
      batch.update(adminDb.collection('tutors').doc(appData.tutorDocId), {
        pendingRequests: FieldValue.arrayRemove(applicationId)
      });
    }

    if (appData.studentDocIds) {
      for (const sid of appData.studentDocIds) {
        batch.update(adminDb.collection('students').doc(sid), {
          pendingRequests: FieldValue.arrayRemove(applicationId)
        });
      }
    } else if (appData.studentDocId) {
      batch.update(adminDb.collection('students').doc(appData.studentDocId), {
        pendingRequests: FieldValue.arrayRemove(applicationId)
      });
    }

    const qGroupId = appData.groupDocId || appData.studentDocId;
    if (qGroupId) {
      const query1 = adminDb.collection('applications').where('groupDocId', '==', qGroupId);
      const query2 = adminDb.collection('applications').where('studentDocId', '==', qGroupId);
      
      const [snap1, snap2] = await Promise.all([query1.get(), query2.get()]);
      const docsToProcess = new Map();
      snap1.docs.forEach((d: any) => docsToProcess.set(d.id, d));
      snap2.docs.forEach((d: any) => docsToProcess.set(d.id, d));
      
      for (const [docId, docSnap] of Array.from(docsToProcess.entries())) {
        if (docId !== applicationId && docSnap.data().status !== 'declined' && docSnap.data().status !== 'tuition_started') {
          batch.update(adminDb.collection('applications').doc(docId), {
            status: 'declined',
            reason: 'student_hired_another_tutor',
            declinedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });
          const d = docSnap.data();
          if (d.tutorDocId) {
            batch.update(adminDb.collection('tutors').doc(d.tutorDocId), { pendingRequests: FieldValue.arrayRemove(docId) });
          }
        }
      }
    }

    await batch.commit();

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in hire transaction:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
