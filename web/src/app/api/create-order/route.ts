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

    const body = await req.json();
    const { applicationId, role, useWallet = false, isRemoval = false } = body;

    if (!applicationId || !role) {
      return NextResponse.json({ error: 'Missing applicationId or role' }, { status: 400 });
    }

    // Securely fetch the true cost from the database
    const appRef = adminDb.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const appData = appSnap.data();

    // Verify ownership of the application
    if (role === 'teacher' && appData?.tutorDocId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Unauthorized: Not the tutor for this application' }, { status: 403 });
    }
    if (role === 'student' && appData?.parentDocId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Unauthorized: Not the parent for this application' }, { status: 403 });
    }

    if (isRemoval && appData?.feePaid) {
      return NextResponse.json({ 
        error: 'Tuition already paid. Removal does not incur additional charges.' 
      }, { status: 400 });
    }
    
    // Determine the base price based on role and what exists in the document
    let coursePrice = 4000; // Fallback
    
    if (role === 'teacher') {
        // Teacher is paying the platform demo fee, we MUST calculate it from marketplace pricing securely
        const pricingSnap = await adminDb.collection('marketplace_pricing').get();
        const pricingData = pricingSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        
        let studentsList: any[] = [];
        const studentDocIds = appData?.studentDocIds || [appData?.studentDocId];
        
        if (studentDocIds.length > 0) {
            for (const sId of studentDocIds) {
                if (sId) {
                    const studentSnap = await adminDb.collection('students').doc(sId).get();
                    if (studentSnap.exists) studentsList.push({ id: studentSnap.id, ...studentSnap.data() });
                }
            }
        }
        
        const { calculateTotalDemoFee } = await import('@/utils/pricing');
        coursePrice = calculateTotalDemoFee(studentsList, pricingData);
    } else {
        // Student is paying the full tuition fee or prorated cancellation fee
        if (appData) {
            const monthlyFee = appData.finalPrice || appData.currentOffer || appData.budget || 4000;
            
            if (isRemoval && appData.startDate) {
                const serverCurrentTime = Date.now(); // Authoritative server time
                const startMillis = appData.startDate.toMillis ? appData.startDate.toMillis() : appData.startDate;
                const daysElapsed = Math.max(1, Math.ceil((serverCurrentTime - startMillis) / (1000 * 60 * 60 * 24)));
                
                if (daysElapsed < 7) {
                    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
                    coursePrice = Math.max(1, Math.round((monthlyFee / daysInMonth) * daysElapsed));
                } else {
                    coursePrice = monthlyFee; // 7 days passed: NO REFUND
                }
            } else {
                if (appData.startDate) {
                    const serverCurrentTime = Date.now();
                    const startMillis = appData.startDate.toMillis ? appData.startDate.toMillis() : appData.startDate;
                    const daysElapsed = Math.floor((serverCurrentTime - startMillis) / (1000 * 60 * 60 * 24));
                    if (daysElapsed < 7) {
                        return NextResponse.json({ 
                            error: 'Tuition fee payment unlocks on Day 7 of your trial period.' 
                        }, { status: 400 });
                    }
                }
                coursePrice = monthlyFee;
            }
        }
    }

    // Total to pay
    let totalToPay = coursePrice;
    let walletDiscountApplied = 0;
    
    // If the user requested to use their wallet balance, deduct it securely
    if (useWallet) {
        let parentDocId = appData?.parentDocId;
        let tutorDocId = appData?.tutorDocId;
        
        let userId = role === 'student' ? parentDocId : tutorDocId;
        
        if (userId) {
            const userSnap = await adminDb.collection('users').doc(userId).get();
            if (userSnap.exists) {
                const walletBalance = userSnap.data()?.walletBalance || 0;
                if (walletBalance > 0) {
                    const discount = Math.min(totalToPay, walletBalance);
                    walletDiscountApplied = discount;
                    totalToPay -= discount;
                }
            }
        }
    }

    if (totalToPay <= 0) {
      const crypto = await import('crypto');
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        return NextResponse.json({ error: 'Razorpay secret is not configured.' }, { status: 500 });
      }
      const walletOrderId = `order_wallet_${applicationId}_${Date.now()}`;
      const walletPaymentId = `pay_wallet_${Date.now()}`;
      const walletSignature = crypto
        .createHmac('sha256', secret)
        .update(`${walletOrderId}|${walletPaymentId}`)
        .digest('hex');

      await adminDb.collection('payments').add({
        razorpayOrderId: walletOrderId,
        applicationDocId: applicationId,
        userId: decodedToken.uid,
        amount: 0,
        walletDiscountApplied: walletDiscountApplied,
        currency: 'INR',
        status: 'created',
        type: role === 'student' ? 'tuition' : 'demo',
        isRemoval: isRemoval || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json({
        id: walletOrderId,
        amount: 0,
        currency: 'INR',
        receipt: `receipt_${applicationId}_${Date.now()}`,
        status: 'created',
        walletCovered: true,
        mockPaymentId: walletPaymentId,
        mockSignature: walletSignature
      });
    }

    // Razorpay operates in paise (multiply by 100)
    const amountInPaise = totalToPay * 100;

    // LIVE MODE: Create an actual Razorpay order
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${applicationId}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    // Create an initial entry in the payments collection
    await adminDb.collection('payments').add({
      razorpayOrderId: order.id,
      applicationDocId: applicationId,
      userId: decodedToken.uid,
      amount: totalToPay,
      walletDiscountApplied: walletDiscountApplied,
      currency: 'INR',
      status: 'created',
      type: role === 'student' ? 'tuition' : 'demo',
      isRemoval: isRemoval || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
  }
}
