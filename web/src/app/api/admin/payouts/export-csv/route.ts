import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/utils/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const adminAuth = await getAdminAuth();
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Enforce Admin Access Check
    const isAdminClaim = decodedToken.admin === true || decodedToken.role === 'admin';
    let isDbAdmin = false;
    if (!isAdminClaim) {
      const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data();
      const roles: string[] = Array.isArray(userData?.roles) ? userData.roles : [userData?.role];
      isDbAdmin = roles.includes('admin');
    }

    if (!isAdminClaim && !isDbAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin privileges required' }, { status: 403 });
    }

    const tutorSnapshot = await adminDb.collection('tutor_payouts').get();
    const referralSnapshot = await adminDb.collection('referrals')
      .where('status', '==', 'qualified')
      .where('rewardType', '==', 'wallet_cash')
      .get();
    
    // CSV Headers
    const headers = ['Payout ID', 'Beneficiary Type', 'Reference ID', 'Beneficiary Name', 'Beneficiary UPI', 'Payable Amount (INR)', 'Status', 'Release Date', 'UTR Number'];
    const rows = [headers.join(',')];

    // 1. Tutors
    tutorSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const releaseDate = data.releaseEligibleAt ? new Date(data.releaseEligibleAt).toISOString().split('T')[0] : 'N/A';
      
      const row = [
        `"${doc.id}"`,
        `"Tutor"`,
        `"${data.applicationDocId || ''}"`,
        `"${(data.tutorName || '').replace(/"/g, '""')}"`,
        `"${data.payoutVpa || ''}"`,
        data.tutorShareAmount || 0,
        `"${data.status || 'pending'}"`,
        `"${releaseDate}"`,
        `"${data.utrNumber || ''}"`
      ];
      rows.push(row.join(','));
    });

    // 2. Referrers
    referralSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const releaseDate = data.releaseEligibleAt ? new Date(data.releaseEligibleAt).toISOString().split('T')[0] : 'N/A';
      
      const row = [
        `"${doc.id}"`,
        `"Student Referrer"`,
        `"${data.referredUserId || ''}"`,
        `"${(data.referrerName || '').replace(/"/g, '""')}"`,
        `"${data.payoutVpa || ''}"`,
        data.reward || 0,
        `"${data.payoutStatus || 'pending'}"`,
        `"${releaseDate}"`,
        `"${data.utrNumber || ''}"`
      ];
      rows.push(row.join(','));
    });

    const csvContent = rows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="all_payouts_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error: any) {
    console.error('Error exporting payouts CSV:', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
