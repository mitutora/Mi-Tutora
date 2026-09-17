import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
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

    const userId = decodedToken.uid; // SECURE: Ignore body and use verified token UID

    // Price is fixed for the Pro plan subscription (₹299)
    const subscriptionPrice = 299;
    const amountInPaise = subscriptionPrice * 100;



    // LIVE MODE: Create an actual Razorpay order
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_sub_${userId}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    // Create an initial entry in the payments collection
    await adminDb.collection('payments').add({
      razorpayOrderId: order.id,
      userId: userId,
      amount: subscriptionPrice,
      currency: 'INR',
      type: 'subscription',
      status: 'created',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error creating subscription order:', error);
    return NextResponse.json({ error: error.message || 'Failed to create subscription order' }, { status: 500 });
  }
}
