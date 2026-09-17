import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/utils/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const adminAuth = await getAdminAuth();
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });
    }

    // Require a valid Firebase token — refereeUid must come from the verified token, not the body
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
    // SECURE: Override refereeUid from body with the verified token UID so users cannot forge other users' referrals
    const { action = 'track', referralCode, refereeName, role } = body;
    const refereeUid = decodedToken.uid;


    if (action === 'sync_name') {
      if (!refereeUid || !refereeName) {
        return NextResponse.json({ success: false, error: 'Missing referee details' }, { status: 400 });
      }

      const refSnap = await adminDb.collection('referrals').where('referredUserId', '==', refereeUid).get();
      const batch = adminDb.batch();
      refSnap.docs.forEach((d) => {
        batch.update(d.ref, { referredUserName: refereeName });
      });
      await batch.commit();

      return NextResponse.json({ success: true });
    }

    // Default action: 'track'
    if (!referralCode || !refereeUid) {
      return NextResponse.json({ success: false, error: 'Missing required referral fields' }, { status: 400 });
    }

    const cleanCode = referralCode.trim().toUpperCase();

    // Check referrer in users collection
    const userQuery = await adminDb.collection('users').where('referralCode', '==', cleanCode).limit(1).get();
    if (userQuery.empty) {
      return NextResponse.json({ success: false, error: 'Invalid referral code' }, { status: 404 });
    }

    const referrerDoc = userQuery.docs[0];
    const referrerData = referrerDoc.data();

    // Prevent self-referral
    if (referrerDoc.id === refereeUid || referrerData.id === refereeUid) {
      return NextResponse.json({ success: false, error: 'Self-referral is not allowed' }, { status: 400 });
    }

    let finalRefereeName = refereeName || '';
    if (!finalRefereeName) {
      const refereeDoc = await adminDb.collection('users').doc(refereeUid).get();
      if (refereeDoc.exists) {
        finalRefereeName = refereeDoc.data()?.name || '';
      }
    }

    // Check if referee already has a referral ticket (prevent duplicates)
    const existingRef = await adminDb.collection('referrals').where('referredUserId', '==', refereeUid).limit(1).get();
    if (!existingRef.empty) {
      // Ensure user document has referrerName synced
      await adminDb.collection('users').doc(refereeUid).set({
        referrerName: referrerData.name || '',
        referredBy: cleanCode
      }, { merge: true });

      return NextResponse.json({ 
        success: true, 
        message: 'Referral already recorded',
        referrerName: referrerData.name || '' 
      });
    }

    // Create the referral record via Admin SDK
    const newRef = await adminDb.collection('referrals').add({
      referrerId: referrerDoc.id,
      referrerName: referrerData.name || 'Referrer',
      referredUserId: refereeUid,
      referredUserName: finalRefereeName,
      referralCode: cleanCode,
      referralType: role || 'student',
      status: 'pending',
      estimatedReward: 0,
      createdAt: Date.now()
    });

    // Ensure users collection also has referrerName and referredBy persisted
    await adminDb.collection('users').doc(refereeUid).set({
      referrerName: referrerData.name || '',
      referredBy: cleanCode
    }, { merge: true });

    return NextResponse.json({
      success: true,
      referralId: newRef.id,
      referrerName: referrerData.name || ''
    });

  } catch (error: any) {
    console.error('Error in /api/referrals/track:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
