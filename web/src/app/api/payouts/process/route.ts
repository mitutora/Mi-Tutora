import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/utils/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Authorization: Verify Secret or Admin Token
    const authHeader = req.headers.get('authorization');
    const cronSecretHeader = req.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('[/api/payouts/process] CRON_SECRET environment variable is not set. Refusing to process payouts.');
      return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET is not set.' }, { status: 500 });
    }

    let isAuthorized = false;
    if (cronSecretHeader && cronSecretHeader === expectedSecret) {
      isAuthorized = true;
    } else if (authHeader?.startsWith('Bearer ')) {
      const adminAuth = await getAdminAuth();
      if (adminAuth) {
        try {
          const decodedToken = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
          if (decodedToken) {
            const isAdminClaim = decodedToken.admin === true || decodedToken.role === 'admin';
            let isDbAdmin = false;
            if (!isAdminClaim) {
              const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
              const userData = userDoc.data();
              const roles: string[] = Array.isArray(userData?.roles) ? userData.roles : [userData?.role];
              isDbAdmin = roles.includes('admin');
            }
            if (isAdminClaim || isDbAdmin) {
              isAuthorized = true;
            }
          }
        } catch (e) {
          // Token invalid
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin or Cron authorization required' }, { status: 401 });
    }

    const now = Date.now();
    // -------------------------------------------------------------------------
    // 1. PROCESS TUTOR PAYOUTS (60% First-Month Tuition Share)
    // -------------------------------------------------------------------------
    const tutorSnapshot = await adminDb.collection('tutor_payouts')
      .where('status', 'in', ['escrow_held', 'action_required_missing_upi'])
      .get();

    const results: any[] = [];
    let batch = adminDb.batch();
    let batchCount = 0;
    let totalProcessed = 0;

    const commitBatchIfNeeded = async () => {
      batchCount++;
      totalProcessed++;
      if (batchCount >= 400) {
        await batch.commit();
        batch = adminDb.batch();
        batchCount = 0;
      }
    };

    // MANUAL PAYOUT MODE: Automated RazorpayX disbursements are explicitly disabled.
    // Day 30 escrows and referral bonuses will transition to 'ready_for_payout'
    // for manual fulfillment in the Admin Dashboard.
    const hasRazorpayX = false;
    const authString = '';

    for (const docSnap of tutorSnapshot.docs) {
      const payout = docSnap.data();
      const releaseEligibleAt = payout.releaseEligibleAt || 0;

      // STRICT SAFETY GUARD: Payout only processes if student has verified paid their tuition fee
      if (!payout.studentPaymentId || !payout.paidByStudentAt) {
        console.warn(`[/api/payouts/process] Skipping tutor payout ${docSnap.id}: student payment verification missing.`);
        continue;
      }

      // Only process if Day 30 has arrived
      if (now < releaseEligibleAt) {
        continue;
      }

      let targetVpa = payout.payoutVpa || '';

      // If missing in payout doc, check if tutor updated their profile upiId
      if (!targetVpa && payout.tutorDocId) {
        const tutorSnap = await adminDb.collection('tutors').doc(payout.tutorDocId).get();
        if (tutorSnap.exists) {
          targetVpa = tutorSnap.data()?.upiId || '';
        }
      }

      if (!targetVpa) {
        batch.update(docSnap.ref, {
          status: 'action_required_missing_upi',
          updatedAt: FieldValue.serverTimestamp()
        });
        await commitBatchIfNeeded();
        results.push({ id: docSnap.id, type: 'tutor', status: 'action_required_missing_upi' });
        continue;
      }

      // In Manual Payout Mode: Escrows that reach Day 30 transition to ready_for_payout
      // to be manually reviewed and paid by admin via the Admin Dashboard.
      batch.update(docSnap.ref, {
        status: 'ready_for_payout',
        payoutVpa: targetVpa,
        updatedAt: FieldValue.serverTimestamp()
      });
      await commitBatchIfNeeded();
      results.push({ id: docSnap.id, type: 'tutor', status: 'ready_for_payout' });
    }

    // -------------------------------------------------------------------------
    // 2. PROCESS REFERRAL REWARD PAYOUTS (25% Platform Cut for Student Referrers)
    // -------------------------------------------------------------------------
    const referralSnapshot = await adminDb.collection('referrals')
      .where('status', '==', 'qualified')
      .where('rewardType', '==', 'wallet_cash')
      .where('payoutStatus', 'in', ['escrow_held', 'action_required_missing_upi'])
      .get();

    for (const refSnap of referralSnapshot.docs) {
      const refData = refSnap.data();
      const releaseEligibleAt = refData.releaseEligibleAt || 0;
      const rewardAmount = refData.reward || 0;

      if (rewardAmount <= 0) continue;

      // STRICT SAFETY GUARD: Referral reward only processes if qualified via verified payment
      if (refData.status !== 'qualified' || !refData.qualifiedAt) {
        console.warn(`[/api/payouts/process] Skipping referral payout ${refSnap.id}: student fee payment qualification missing.`);
        continue;
      }

      // Only process if Day 30 has arrived
      if (now < releaseEligibleAt) {
        continue;
      }

      let targetVpa = refData.payoutVpa || '';

      // If missing in referral doc, check if referrer updated their profile upiId (check users and tutors)
      if (!targetVpa && refData.referrerId) {
        const userSnap = await adminDb.collection('users').doc(refData.referrerId).get();
        if (userSnap.exists) {
          targetVpa = userSnap.data()?.upiId || '';
        }
        if (!targetVpa) {
          const tutorSnap = await adminDb.collection('tutors').doc(refData.referrerId).get();
          if (tutorSnap.exists) {
            targetVpa = tutorSnap.data()?.upiId || '';
          }
        }
      }

      if (!targetVpa) {
        batch.update(refSnap.ref, {
          payoutStatus: 'action_required_missing_upi'
        });
        await commitBatchIfNeeded();
        results.push({ id: refSnap.id, type: 'referrer', status: 'action_required_missing_upi' });
        continue;
      }

      // In Manual Payout Mode: Referrals that reach Day 30 transition to ready_for_payout
      // to be manually reviewed and paid by admin via the Admin Dashboard.
      batch.update(refSnap.ref, {
        payoutStatus: 'ready_for_payout',
        payoutVpa: targetVpa
      });
      await commitBatchIfNeeded();
      results.push({ id: refSnap.id, type: 'referrer', status: 'ready_for_payout' });
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      results
    });

  } catch (error: any) {
    console.error('Error in /api/payouts/process:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
