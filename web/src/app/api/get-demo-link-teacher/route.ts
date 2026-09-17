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
    const tutorDocId = decodedToken.uid; // SECURE: Override with verified token UID

    if (!applicationId || !tutorDocId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify application and tutor identity
    const appRef = adminDb.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const appData = appSnap.data();
    if (appData?.tutorDocId !== tutorDocId) {
      return NextResponse.json({ error: 'Unauthorized: You are not the assigned teacher for this application' }, { status: 403 });
    }

    // Fetch the link from the vault
    const meetingSnap = await appRef.collection('privateData').doc('meeting').get();
    
    if (!meetingSnap.exists) {
      return NextResponse.json({ success: true, link: null }); // No link saved yet, not an error
    }

    const meetingData = meetingSnap.data();
    return NextResponse.json({ 
      success: true, 
      link: meetingData?.meetingLink || meetingData?.gmeetLink || null,
      platform: meetingData?.platform || 'gmeet'
    });

  } catch (error: any) {
    console.error('Error retrieving GMeet link for teacher:', error);
    return NextResponse.json({ error: error.message || 'Failed to retrieve link' }, { status: 500 });
  }
}
