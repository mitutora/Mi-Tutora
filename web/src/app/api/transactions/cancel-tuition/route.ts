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
    const { applicationId, action = 'request' } = body;
    const parentDocId = decodedToken.uid;

    if (!applicationId) {
      return NextResponse.json({ success: false, error: 'Missing applicationId' }, { status: 400 });
    }

    const appRef = adminDb.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    const appData = appSnap.data()!;

    if (appData.parentDocId !== parentDocId && appData.studentDocId !== parentDocId) {
      return NextResponse.json({ success: false, error: 'Unauthorized to modify this application' }, { status: 403 });
    }

    if (appData.status !== 'tuition_started' || appData.feePaid === true) {
      return NextResponse.json({ success: false, error: 'Tuition must be active and unpaid to request cancellation' }, { status: 400 });
    }

    if (action === 'withdraw') {
      await appRef.update({
        cancellationRequested: false,
        cancellationWithdrawnAt: FieldValue.serverTimestamp()
      });
      return NextResponse.json({ success: true, message: 'Cancellation request withdrawn' });
    }

    // Default action: 'request'
    const serverCurrentTime = Date.now();
    const startMillis = appData.startDate?.toMillis ? appData.startDate.toMillis() : (appData.startDate || serverCurrentTime);
    const daysElapsed = Math.max(1, Math.ceil((serverCurrentTime - startMillis) / (1000 * 60 * 60 * 24)));
    const monthlyFee = appData.finalPrice || appData.currentOffer || appData.budget || 4000;
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

    let proratedFee = monthlyFee;
    if (daysElapsed < 7) {
      proratedFee = Math.max(1, Math.round((monthlyFee / daysInMonth) * daysElapsed));
    }

    await appRef.update({
      cancellationRequested: true,
      cancellationRequestedAt: FieldValue.serverTimestamp(),
      cancellationProratedFee: proratedFee,
      cancellationDaysElapsed: daysElapsed
    });

    return NextResponse.json({
      success: true,
      message: 'Cancellation requested',
      proratedFee,
      daysElapsed
    });
  } catch (err: any) {
    console.error('Error in cancel-tuition route:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
