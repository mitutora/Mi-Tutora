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
    const { reference_id, otp } = body;
    const tutorDocId = decodedToken.uid; // SECURE: Override with verified token UID

    if (!reference_id || !otp || !tutorDocId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const POWERAPI_KEY = process.env.POWERAPI_KEY;

    // Production PowerAPI Integration
    if (!POWERAPI_KEY) {
      return NextResponse.json({ 
        error: 'Aadhaar KYC service is temporarily unavailable pending company license activation.' 
      }, { status: 503 });
    }

    const response = await fetch('https://api.powerapi.com/v1/aadhar/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${POWERAPI_KEY}`
      },
      body: JSON.stringify({ reference_id, otp })
    });
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      return NextResponse.json({ error: data.message || 'Invalid OTP' }, { status: response.status || 400 });
    }
    
    // In PowerAPI, verified Aadhaar number or masked number is returned
    const rawAadhar = data.aadhaar_data?.aadhaar_number || '';
    const maskedAadhar = rawAadhar ? `XXXX-XXXX-${rawAadhar.slice(-4)}` : (data.masked_aadhaar || 'XXXX-XXXX-XXXX');

    // Save the success to the tutor's main document for ranking and badging
    const tutorRef = adminDb.collection('tutors').doc(tutorDocId);
    await tutorRef.set({
      aadharVerified: true,
      maskedAadhar: maskedAadhar,
      kycUpdatedAt: new Date()
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Aadhar Verified successfully',
      maskedAadhar
    });

  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json({ error: error.message || 'Failed to process request' }, { status: 500 });
  }
}
