import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/utils/firebase/admin';

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
    const { applicationId, rating, comment } = body;
    const parentDocId = decodedToken.uid; // SECURE: Override the body parentDocId with the verified token UID

    // 1. Basic Input Validation
    if (!applicationId || !parentDocId || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: 'Missing or invalid required fields' }, { status: 400 });
    }

    // 2. Fetch the Application to verify authorization and status
    const appRef = adminDb.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    const appData = appSnap.data()!;

    // Verify the parent owns this application
    if (appData.parentDocId !== parentDocId) {
      return NextResponse.json({ success: false, error: 'Unauthorized to review this application' }, { status: 403 });
    }

    // Verify the teacher was actually hired
    if (appData.status !== 'tuition_started') {
      return NextResponse.json({ success: false, error: 'You can only review teachers who are actively teaching (tuition_started)' }, { status: 403 });
    }

    const tutorDocId = appData.tutorDocId;

    // 3. Prevent duplicate reviews for the same application
    const existingReviewQuery = await adminDb.collection('reviews').where('applicationDocId', '==', applicationId).get();
    
    if (!existingReviewQuery.empty) {
      return NextResponse.json({ success: false, error: 'Review already submitted for this application' }, { status: 400 });
    }

    // 4. Fetch the Tutor to calculate the new average rating
    const tutorRef = adminDb.collection('tutors').doc(tutorDocId);
    const tutorSnap = await tutorRef.get();

    if (!tutorSnap.exists) {
      return NextResponse.json({ success: false, error: 'Tutor not found' }, { status: 404 });
    }

    const tutorData = tutorSnap.data()!;
    const currentRating = typeof tutorData.rating === 'number' ? tutorData.rating : 0;
    const currentReviewCount = typeof tutorData.reviewCount === 'number' ? tutorData.reviewCount : 0;

    // Calculate new average mathematically
    const totalPreviousScore = currentRating * currentReviewCount;
    const newReviewCount = currentReviewCount + 1;
    const newAverageRating = (totalPreviousScore + rating) / newReviewCount;

    // Format to 1 decimal place (e.g., 4.5)
    const roundedNewRating = Math.round(newAverageRating * 10) / 10;

    // 5. Secure Batch Write
    const batch = adminDb.batch();

    // Create the new review document
    const newReviewRef = adminDb.collection('reviews').doc();
    batch.set(newReviewRef, {
      tutorDocId,
      parentDocId,
      applicationDocId: applicationId,
      rating,
      comment: (comment || '').slice(0, 1000),
      createdAt: Date.now()
    });

    // Update the tutor's aggregate data
    batch.update(tutorRef, {
      rating: roundedNewRating,
      reviewCount: newReviewCount
    });

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: 'Review submitted successfully!',
      newRating: roundedNewRating,
      newReviewCount: newReviewCount
    });

  } catch (error: any) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
