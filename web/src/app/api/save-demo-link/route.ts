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
    const { applicationId, gmeetLink, platform = 'gmeet' } = body;
    const tutorDocId = decodedToken.uid; // SECURE: Override with verified token UID

    if (!applicationId || !tutorDocId || !gmeetLink) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Dynamic regex validation based on platform
    let isValid = false;
    let errorMessage = 'Invalid meeting link format';

    if (platform === 'gmeet') {
      isValid = /^https:\/\/meet\.google\.com\/[a-z0-9-]+$/.test(gmeetLink);
      errorMessage = 'Invalid Google Meet link format. Must be https://meet.google.com/...';
    } else if (platform === 'zoom') {
      isValid = /^https:\/\/(?:[\w-]+\.)?zoom\.us\/(?:j|my)\/\d+(?:\?pwd=[\w.-]+)?$/.test(gmeetLink);
      errorMessage = 'Invalid Zoom link format. Must be https://zoom.us/j/...';
    } else if (platform === 'teams') {
      isValid = /^https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[\w%.-]+\/[\w.-]+\?context=[\w%.-]+$/.test(gmeetLink);
      errorMessage = 'Invalid MS Teams link format.';
    } else {
      return NextResponse.json({ error: 'Unsupported meeting platform' }, { status: 400 });
    }

    if (!isValid) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }


    // Verify application and tutor identity
    const appRef = adminDb.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const appData = appSnap.data();
    if (appData?.tutorDocId !== tutorDocId) {
      return NextResponse.json({ error: 'Unauthorized: You are not the tutor for this application' }, { status: 403 });
    }

    if (appData?.status !== 'demo_scheduled' && appData?.status !== 'tuition_started') {
      return NextResponse.json({ error: 'Cannot save link: Demo is not scheduled yet' }, { status: 400 });
    }

    if (appData?.mode !== 'Online') {
      return NextResponse.json({ error: 'Cannot save link: Class mode is not Online' }, { status: 400 });
    }

    // Save to the privateData vault (using a subcollection so the student cannot read it directly)
    await appRef.collection('privateData').doc('meeting').set({
      gmeetLink, // Kept for backward compatibility
      meetingLink: gmeetLink, // The new standard field
      platform,
      updatedAt: new Date()
    }, { merge: true });

    return NextResponse.json({ success: true, message: 'Meeting link securely saved.' });
  } catch (error: any) {
    console.error('Error saving GMeet link:', error);
    return NextResponse.json({ error: error.message || 'Failed to save link' }, { status: 500 });
  }
}
