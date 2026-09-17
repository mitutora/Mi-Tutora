import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/utils/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const adminAuth = await getAdminAuth();
    if (!adminAuth) {
      return NextResponse.json({ error: 'Auth service unavailable' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
      await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { aadharNumber } = body;

    if (!aadharNumber || !/^\d{12}$/.test(aadharNumber.replace(/\s+/g, ''))) {
      return NextResponse.json({ error: 'Invalid Aadhar Number. Must be 12 digits.' }, { status: 400 });
    }

    const cleanAadhar = aadharNumber.replace(/\s+/g, '');
    const POWERAPI_KEY = process.env.POWERAPI_KEY;

    // Production PowerAPI Integration
    if (!POWERAPI_KEY) {
      return NextResponse.json({ 
        error: 'Aadhaar KYC service is temporarily unavailable pending company license activation.' 
      }, { status: 503 });
    }

    const response = await fetch('https://api.powerapi.com/v1/aadhar/generate-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${POWERAPI_KEY}`
      },
      body: JSON.stringify({ aadhar_number: cleanAadhar })
    });
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      return NextResponse.json({ error: data.message || 'Failed to generate OTP' }, { status: response.status || 400 });
    }
    
    return NextResponse.json({
      success: true,
      reference_id: data.reference_id,
      message: 'OTP sent successfully.'
    });

  } catch (error: any) {
    console.error('Error generating OTP:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to process request' }, { status: 500 });
  }
}
