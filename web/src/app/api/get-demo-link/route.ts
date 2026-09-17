import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/utils/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const adminAuth = await getAdminAuth();
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { applicationId } = body;
    const parentDocId = decodedToken.uid; // SECURE: Override with verified token UID

    if (!applicationId || !parentDocId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify application and student identity
    const appRef = adminDb.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const appData = appSnap.data();
    if (appData?.parentDocId !== parentDocId) {
      return NextResponse.json({ error: 'Unauthorized: You are not the student/parent for this application' }, { status: 403 });
    }

    if (appData?.status !== 'demo_scheduled' && appData?.status !== 'tuition_started') {
      return NextResponse.json({ error: 'Cannot retrieve link: Demo is not scheduled yet' }, { status: 400 });
    }

    // Verify Time Lock
    if (!appData?.demoDate || !appData?.demoTime) {
      return NextResponse.json({ error: 'Demo date and time are not fully set' }, { status: 400 });
    }

    // Parse the demo datetime with explicit IST (+05:30) timezone offset
    const cleanTime = (appData.demoTime || '').split('||')[0].trim();
    const formattedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
    const demoDateObj = new Date(`${appData.demoDate}T${formattedTime}+05:30`);

    if (isNaN(demoDateObj.getTime())) {
      return NextResponse.json({ error: 'Invalid demo date or time format' }, { status: 400 });
    }

    // Allow entry 5 minutes before scheduled start time
    const allowedEntryTime = new Date(demoDateObj.getTime() - 5 * 60 * 1000);
    // Lock link 90 minutes after scheduled start time (unless converted to full tuition)
    const lockExpiryTime = new Date(demoDateObj.getTime() + 90 * 60 * 1000);
    const now = new Date();

    if (now < allowedEntryTime) {
      return NextResponse.json({ 
        error: 'Too early to join. The link will unlock 5 minutes before the scheduled time.',
        serverTime: now.toISOString(),
        unlockTime: allowedEntryTime.toISOString()
      }, { status: 403 });
    }

    if (now > lockExpiryTime && appData.status !== 'tuition_started') {
      return NextResponse.json({ 
        error: 'Demo class time window has expired.',
        serverTime: now.toISOString()
      }, { status: 403 });
    }

    // Fetch the link from the vault
    const meetingSnap = await appRef.collection('privateData').doc('meeting').get();
    if (!meetingSnap.exists) {
      return NextResponse.json({ error: 'The tutor has not added a meeting link yet. Please check back shortly.' }, { status: 404 });
    }

    const meetingData = meetingSnap.data();
    const finalLink = meetingData?.meetingLink || meetingData?.gmeetLink;
    if (!finalLink) {
      return NextResponse.json({ error: 'Meeting link is empty.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, link: finalLink });
  } catch (error: any) {
    console.error('Error retrieving GMeet link:', error);
    return NextResponse.json({ error: error.message || 'Failed to retrieve link' }, { status: 500 });
  }
}
