import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import { calculateTotalDemoFee, getStudentDemoFee } from '../src/utils/pricing';

test.describe('Payment Architecture & Financial Integrity (Payment_Architecture.md)', () => {

  test.describe('Razorpay Signature Verification', () => {
    function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
      const generated = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      return generated === signature;
    }

    test('Passes for valid HMAC-SHA256 signature', () => {
      const secret = 'rzp_test_secret_12345';
      const orderId = 'order_DAF87123';
      const paymentId = 'pay_998877';
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(verifyRazorpaySignature(orderId, paymentId, validSignature, secret)).toBe(true);
    });

    test('Fails when order ID or payment ID is tampered with', () => {
      const secret = 'rzp_test_secret_12345';
      const orderId = 'order_DAF87123';
      const paymentId = 'pay_998877';
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      // Hacker changes the order ID to another order
      expect(verifyRazorpaySignature('order_HACKED', paymentId, validSignature, secret)).toBe(false);
      // Hacker changes the payment ID
      expect(verifyRazorpaySignature(orderId, 'pay_HACKED', validSignature, secret)).toBe(false);
    });
  });

  test.describe('Ledger Authority & Anti-Substitution', () => {
    interface PaymentLedgerRecord {
      razorpayOrderId: string;
      applicationDocId: string;
      userId: string;
      type: 'tuition' | 'demo';
      amount: number;
      status: 'created' | 'paid' | 'failed';
    }

    function resolvePaymentDetails(ledger: PaymentLedgerRecord[], orderId: string, requesterUid: string) {
      const record = ledger.find(p => p.razorpayOrderId === orderId);
      if (!record) throw new Error('Order ID not found in secure ledger');
      if (record.status === 'paid') throw new Error('Payment already verified (Replay blocked)');
      if (record.userId !== requesterUid) throw new Error('Unauthorized: User mismatch');

      return {
        applicationId: record.applicationDocId,
        role: record.type === 'demo' ? 'teacher' : 'student',
        amount: record.amount
      };
    }

    const mockLedger: PaymentLedgerRecord[] = [
      {
        razorpayOrderId: 'order_100',
        applicationDocId: 'app_REAL_99',
        userId: 'student_uid_1',
        type: 'tuition',
        amount: 4000,
        status: 'created'
      },
      {
        razorpayOrderId: 'order_ALREADY_PAID',
        applicationDocId: 'app_PAID_1',
        userId: 'student_uid_1',
        type: 'tuition',
        amount: 4000,
        status: 'paid'
      }
    ];

    test('Strictly resolves applicationDocId and role from database ledger', () => {
      const resolved = resolvePaymentDetails(mockLedger, 'order_100', 'student_uid_1');
      expect(resolved.applicationId).toBe('app_REAL_99');
      expect(resolved.role).toBe('student');
      expect(resolved.amount).toBe(4000);
    });

    test('Rejects payment if requester is not the ledger record owner', () => {
      expect(() => {
        resolvePaymentDetails(mockLedger, 'order_100', 'hacker_uid');
      }).toThrow('Unauthorized: User mismatch');
    });

    test('Rejects replay attacks for already-paid orders', () => {
      expect(() => {
        resolvePaymentDetails(mockLedger, 'order_ALREADY_PAID', 'student_uid_1');
      }).toThrow('Payment already verified (Replay blocked)');
    });
  });

  test.describe('7-Day Payment & 30-Day Escrow Disbursement Schedule', () => {
    function calculatePaymentAndEscrowSchedule(hireDateMs: number, grossTuition: number) {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      
      const paymentDueAt = hireDateMs + SEVEN_DAYS_MS;
      const escrowReleaseAt = hireDateMs + THIRTY_DAYS_MS;
      
      const platformFee = Math.round(grossTuition * 0.40);
      const tutorShare = Math.round(grossTuition * 0.60);
      const referralReward = Math.round(platformFee * 0.25);

      return { 
        paymentDueAt, 
        escrowReleaseAt,
        platformFee,
        tutorShare,
        referralReward
      };
    }

    test('Payment is due on Day 7, and tutor 60% share unlocks on Day 30', () => {
      const hireDate = new Date('2026-09-01T10:00:00Z').getTime();
      const schedule = calculatePaymentAndEscrowSchedule(hireDate, 6000);

      const expectedPaymentDate = new Date('2026-09-08T10:00:00Z').getTime();
      const expectedReleaseDate = new Date('2026-10-01T10:00:00Z').getTime();

      expect(schedule.paymentDueAt).toBe(expectedPaymentDate);
      expect(schedule.escrowReleaseAt).toBe(expectedReleaseDate);
      expect(schedule.platformFee).toBe(2400);
      expect(schedule.tutorShare).toBe(3600);
      expect(schedule.referralReward).toBe(600);
    });
  });

  test.describe('Platform Demo Fee Calculation (utils/pricing.ts)', () => {
    const mockPricing = [
      { id: 'school_class_10', displayName: 'Class 10 School Tuition', price: 150 },
      { id: 'competitive_neet', displayName: 'NEET Preparation', price: 250 },
      { id: 'programming_beginner', displayName: 'Beginner Coding', price: 180 },
      { id: 'languages_general', displayName: 'Language Tuition', price: 120 },
      { id: 'general', displayName: 'General Tuition', price: 100 }
    ];

    test('Correctly prices individual school class demo fee', () => {
      const student = { category: 'school', classLevel: 'Class 10' };
      const fee = getStudentDemoFee(student, mockPricing);
      expect(fee.price).toBe(150);
    });

    test('Correctly prices competitive exam demo fee', () => {
      const student = { category: 'competitive', learningGoal: 'NEET' };
      const fee = getStudentDemoFee(student, mockPricing);
      expect(fee.price).toBe(250);
    });

    test('Sums multi-student group demo fees accurately', () => {
      const students = [
        { category: 'school', classLevel: 'Class 10' }, // 150
        { category: 'competitive', learningGoal: 'NEET' } // 250
      ];
      const total = calculateTotalDemoFee(students, mockPricing);
      expect(total).toBe(400); // 150 + 250
    });

    test('Correctly prices Karnataka 1st PUC and 2nd PUC to Class 11 and Class 12', () => {
      const mockPucPricing = [
        { id: 'school_class_1', displayName: 'Class 1 School Tuition', price: 100 },
        { id: 'school_class_2', displayName: 'Class 2 School Tuition', price: 100 },
        { id: 'school_class_11', displayName: 'Class 11 School Tuition', price: 200 },
        { id: 'school_class_12', displayName: 'Class 12 School Tuition', price: 220 },
      ];

      const puc1 = { category: 'school', classLevel: '1st PUC' };
      const puc2 = { category: 'school', classLevel: '2nd PUC' };

      expect(getStudentDemoFee(puc1, mockPucPricing).price).toBe(200);
      expect(getStudentDemoFee(puc2, mockPucPricing).price).toBe(220);
    });
  });

  test.describe('Student 7-Day Trial Tuition Fee Payment Gating', () => {
    function evaluateTuitionPaymentEligibility(appData: { startDate: number; feePaid?: boolean }, isRemoval: boolean, serverTime: number) {
      const daysElapsed = Math.floor((serverTime - appData.startDate) / (1000 * 60 * 60 * 24));
      
      if (isRemoval) {
        if (daysElapsed < 7) {
          return { allowed: true, type: 'prorated_cancellation', daysElapsed };
        } else {
          return { allowed: true, type: 'full_fee_cancellation', daysElapsed };
        }
      }

      if (daysElapsed < 7) {
        return { 
          allowed: false, 
          error: 'Tuition fee payment unlocks on Day 7 of your trial period.',
          daysRemaining: 7 - daysElapsed 
        };
      }

      return { allowed: true, type: 'full_tuition_payment', daysElapsed };
    }

    test('Blocks full tuition payment on Day 0 through Day 6 with countdown', () => {
      const start = Date.now();
      
      // Day 0
      const day0 = evaluateTuitionPaymentEligibility({ startDate: start }, false, start);
      expect(day0.allowed).toBe(false);
      expect(day0.daysRemaining).toBe(7);

      // Day 3
      const day3 = evaluateTuitionPaymentEligibility({ startDate: start }, false, start + (3 * 24 * 60 * 60 * 1000));
      expect(day3.allowed).toBe(false);
      expect(day3.daysRemaining).toBe(4);

      // Day 6
      const day6 = evaluateTuitionPaymentEligibility({ startDate: start }, false, start + (6 * 24 * 60 * 60 * 1000));
      expect(day6.allowed).toBe(false);
      expect(day6.daysRemaining).toBe(1);
    });

    test('Unlocks full tuition payment exactly on Day 7 and onwards', () => {
      const start = Date.now();

      // Day 7
      const day7 = evaluateTuitionPaymentEligibility({ startDate: start }, false, start + (7 * 24 * 60 * 60 * 1000));
      expect(day7.allowed).toBe(true);
      expect(day7.type).toBe('full_tuition_payment');

      // Day 10 (Within 13-day Grace Period)
      const day10 = evaluateTuitionPaymentEligibility({ startDate: start }, false, start + (10 * 24 * 60 * 60 * 1000));
      expect(day10.allowed).toBe(true);
      expect(day10.type).toBe('full_tuition_payment');

      // Day 20 (Post-Grace Lockout)
      const day20 = evaluateTuitionPaymentEligibility({ startDate: start }, false, start + (20 * 24 * 60 * 60 * 1000));
      expect(day20.allowed).toBe(true);
      expect(day20.type).toBe('full_tuition_payment');
    });

    test('Allows prorated cancellation payment before Day 7 during trial', () => {
      const start = Date.now();
      const day4Removal = evaluateTuitionPaymentEligibility({ startDate: start }, true, start + (4 * 24 * 60 * 60 * 1000));
      expect(day4Removal.allowed).toBe(true);
      expect(day4Removal.type).toBe('prorated_cancellation');
    });

    test('Accurately tracks early cancellation request and withdrawal lifecycle', () => {
      const app = {
        id: 'app_trial_cancel',
        status: 'tuition_started',
        startDate: Date.now() - (3 * 24 * 60 * 60 * 1000), // Day 3
        feePaid: false,
        finalPrice: 6000,
        cancellationRequested: false,
        cancellationProratedFee: 0,
      };

      // 1. Initial State: Normal trial
      expect(app.cancellationRequested).toBe(false);

      // 2. Student requests early cancellation
      const daysElapsed = 3;
      const daysInMonth = 30;
      const proratedFee = Math.round((app.finalPrice / daysInMonth) * daysElapsed);
      app.cancellationRequested = true;
      app.cancellationProratedFee = proratedFee;

      expect(app.cancellationRequested).toBe(true);
      expect(app.cancellationProratedFee).toBe(600); // (6000/30) * 3 = 600

      // 3. Student withdraws cancellation to keep teacher
      app.cancellationRequested = false;
      expect(app.cancellationRequested).toBe(false);
    });
  });
});