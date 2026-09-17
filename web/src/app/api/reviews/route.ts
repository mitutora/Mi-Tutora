import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/utils/firebase/admin';

// Force dynamic rendering — this route reads nextUrl.searchParams at request time
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tutorDocId = req.nextUrl.searchParams.get('tutorDocId');

    if (!tutorDocId) {
      return NextResponse.json({ success: false, error: 'tutorDocId is required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const reviewsSnapshot = await adminDb.collection('reviews')
      .where('tutorDocId', '==', tutorDocId)
      .get();

    const rawReviews = reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    rawReviews.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

    // Enrich with parent name, group info, and student names
    const enrichedReviews = await Promise.all(rawReviews.map(async (review: any) => {
      let parentName = 'Unknown Parent';
      let groupId = '';
      let studentsList: string[] = [];

      try {
        if (review.parentDocId) {
          const parentSnap = await adminDb.collection('users').doc(review.parentDocId).get();
          if (parentSnap.exists) parentName = parentSnap.data()?.name || parentName;
        }

        if (review.applicationDocId) {
          const appSnap = await adminDb.collection('applications').doc(review.applicationDocId).get();
          if (appSnap.exists) {
            const appData = appSnap.data();
            const rawGroupDocId = appData?.groupDocId || '';
            if (rawGroupDocId) {
              const groupSnap = await adminDb.collection('groups').doc(rawGroupDocId).get();
              if (groupSnap.exists) {
                groupId = groupSnap.data()?.groupId || rawGroupDocId;
              } else {
                groupId = rawGroupDocId;
              }
            }
            const studentDocIds = appData?.studentDocIds || [appData?.studentDocId];
            
            for (const sId of studentDocIds) {
              if (sId) {
                const studentSnap = await adminDb.collection('students').doc(sId).get();
                if (studentSnap.exists) {
                  studentsList.push(studentSnap.data()?.name || 'Unknown Student');
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error enriching review:', err);
      }

      return {
        ...review,
        parentName,
        groupId,
        studentsList
      };
    }));

    return NextResponse.json({ success: true, reviews: enrichedReviews }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
