import { test, expect } from '@playwright/test';

test.describe('First-Month Tuition Escrow & Payout Workflow (First_Month_Tuition_Escrow_Payout_Architecture.md)', () => {

  // Mathematical split formulas
  function calculateFeeSplit(grossTuition: number) {
    const platformFee = Math.round(grossTuition * 0.40);
    const tutorShare = Math.round(grossTuition * 0.60);
    const referralReward = Math.round(platformFee * 0.25);
    const platformNetProfit = platformFee - referralReward;

    return {
      grossTuition,
      platformFee,
      tutorShare,
      referralReward,
      platformNetProfit
    };
  }

  // UPI Format Validation
  function isValidUpiId(upi: string): boolean {
    if (!upi) return false;
    const cleanUpi = upi.trim();
    return /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(cleanUpi);
  }

  // Escrow Timing & Payout Eligibility
  function evaluatePayoutEligibility(startDateMs: number, nowMs: number, tutorUpi: string) {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const releaseDateMs = startDateMs + THIRTY_DAYS_MS;

    if (nowMs < releaseDateMs) {
      return { eligible: false, status: 'escrow_held', releaseDateMs };
    }

    if (!isValidUpiId(tutorUpi)) {
      return { eligible: false, status: 'action_required_missing_upi', releaseDateMs };
    }

    return { eligible: true, status: 'ready_for_payout', releaseDateMs };
  }

  test.describe('Financial Split Math (40% Platform / 60% Tutor / 25% of Cut for Referral)', () => {
    test('Calculates correct 40% platform and 60% tutor shares for ₹6,000 tuition', () => {
      const split = calculateFeeSplit(6000);
      expect(split.platformFee).toBe(2400); // 40% of 6000
      expect(split.tutorShare).toBe(3600);  // 60% of 6000
      expect(split.referralReward).toBe(600); // 25% of 2400 (10% of 6000)
      expect(split.platformNetProfit).toBe(1800); // 2400 - 600 (30% of 6000)
      expect(split.platformFee + split.tutorShare).toBe(6000);
    });

    test('Calculates correct shares for ₹4,000 tuition', () => {
      const split = calculateFeeSplit(4000);
      expect(split.platformFee).toBe(1600);
      expect(split.tutorShare).toBe(2400);
      expect(split.referralReward).toBe(400);
      expect(split.platformNetProfit).toBe(1200);
    });

    test('Handles rounding properly for odd tuition numbers', () => {
      const split = calculateFeeSplit(3333);
      expect(split.platformFee).toBe(1333); // Math.round(3333 * 0.40)
      expect(split.tutorShare).toBe(2000);  // Math.round(3333 * 0.60)
      expect(split.referralReward).toBe(333); // Math.round(1333 * 0.25)
    });
  });

  test.describe('Tutor UPI ID Validation', () => {
    test('Accepts valid UPI IDs with diverse handle formats', () => {
      expect(isValidUpiId('krishna@okhdfcbank')).toBe(true);
      expect(isValidUpiId('9148018043@upi')).toBe(true);
      expect(isValidUpiId('tutor.teacher_99@axisbank')).toBe(true);
      expect(isValidUpiId('teacher-name@ybl')).toBe(true);
    });

    test('Rejects invalid UPI formats', () => {
      expect(isValidUpiId('')).toBe(false);
      expect(isValidUpiId('invalidupi')).toBe(false);
      expect(isValidUpiId('@okhdfcbank')).toBe(false);
      expect(isValidUpiId('user@')).toBe(false);
      expect(isValidUpiId('user@bank@extra')).toBe(false);
      expect(isValidUpiId('user name@okhdfcbank')).toBe(false); // Contains space
    });
  });

  test.describe('30-Day Escrow Lifecycle & Missing UPI Fallback', () => {
    const startDate = new Date('2026-09-01T10:00:00Z').getTime();

    test('Keeps funds in escrow on Day 15 (halfway through Month 1)', () => {
      const day15 = startDate + (15 * 24 * 60 * 60 * 1000);
      const result = evaluatePayoutEligibility(startDate, day15, 'krishna@okhdfcbank');
      expect(result.eligible).toBe(false);
      expect(result.status).toBe('escrow_held');
    });

    test('Unlocks payout on Day 30 when valid UPI ID is present', () => {
      const day30 = startDate + (30 * 24 * 60 * 60 * 1000);
      const result = evaluatePayoutEligibility(startDate, day30, 'krishna@okhdfcbank');
      expect(result.eligible).toBe(true);
      expect(result.status).toBe('ready_for_payout');
    });

    test('Marks status as action_required_missing_upi on Day 30 if tutor has no UPI ID', () => {
      const day30 = startDate + (30 * 24 * 60 * 60 * 1000);
      const result = evaluatePayoutEligibility(startDate, day30, '');
      expect(result.eligible).toBe(false);
      expect(result.status).toBe('action_required_missing_upi');
    });

    test('Transitions immediately to ready_for_payout once tutor adds UPI ID', () => {
      const day30 = startDate + (30 * 24 * 60 * 60 * 1000);
      // Tutor updates profile settings with UPI
      const updatedUpi = 'krishna@okhdfcbank';
      const result = evaluatePayoutEligibility(startDate, day30, updatedUpi);
      expect(result.eligible).toBe(true);
      expect(result.status).toBe('ready_for_payout');
    });
  });

  test.describe('Strict Zero-Refund Policy (Student_Fee_Payment_Architectrue.md)', () => {
    function canStudentGetRefund(daysElapsed: number, feePaid: boolean) {
      // Prior to payment (Day 0 to 6): Prorated fee on cancellation
      if (!feePaid && daysElapsed < 7) {
        return { refundAllowed: false, proratedFeeRequired: true };
      }
      // Once fee is paid on Day 7: Zero refund
      if (feePaid) {
        return { refundAllowed: false, proratedFeeRequired: false, reason: 'Strict Zero Refund Policy' };
      }
      return { refundAllowed: false, proratedFeeRequired: false };
    }

    test('Rejects any refund after fee is paid on Day 7', () => {
      const result = canStudentGetRefund(10, true);
      expect(result.refundAllowed).toBe(false);
      expect(result.reason).toBe('Strict Zero Refund Policy');
    });
  });

  test.describe('Synchronized Dual-Disbursement on Day 30 (Tutor & Referrer)', () => {
    function executeDualDisbursement(grossTuition: number, tutorUpi: string, referrerUpi: string) {
      const platformFee = Math.round(grossTuition * 0.40);
      const tutorPayout = Math.round(grossTuition * 0.60);
      const referrerPayout = Math.round(platformFee * 0.25);
      const platformNetMargin = platformFee - referrerPayout;

      return {
        tutorDisbursement: { amount: tutorPayout, upi: tutorUpi, status: tutorUpi ? 'paid' : 'action_required_missing_upi' },
        referrerDisbursement: { amount: referrerPayout, upi: referrerUpi, status: referrerUpi ? 'paid' : 'action_required_missing_upi' },
        platformNetMargin
      };
    }

    test('Simultaneously disburses 60% to tutor and 25% margin to referrer on Day 30', () => {
      const result = executeDualDisbursement(6000, 'tutor@okhdfcbank', 'student@okaxis');
      expect(result.tutorDisbursement.amount).toBe(3600);
      expect(result.tutorDisbursement.status).toBe('paid');
      expect(result.referrerDisbursement.amount).toBe(600);
      expect(result.referrerDisbursement.status).toBe('paid');
      expect(result.platformNetMargin).toBe(1800);
    });

    test('Isolates missing UPI fallback between tutor and referrer independently', () => {
      // Tutor has UPI, referrer does not
      const result = executeDualDisbursement(6000, 'tutor@okhdfcbank', '');
      expect(result.tutorDisbursement.status).toBe('paid');
      expect(result.referrerDisbursement.status).toBe('action_required_missing_upi');
    });
  });

  test.describe('Teacher Portal StudentViewModal Tuition Fee Transparency (Month 1 vs Month 2+)', () => {
    function computeModalPayoutBreakdown(budget: any, counterOffer: string | undefined, finalPrice?: any) {
      const enteredOffer = counterOffer;
      const effectiveBudget = (enteredOffer !== undefined && enteredOffer !== '')
        ? Number(enteredOffer)
        : (Number(finalPrice) || Number(budget) || 0);

      const hasNumericBudget = !isNaN(effectiveBudget) && effectiveBudget > 0;
      const month1PlatformFee = Math.round(effectiveBudget * 0.40);
      const month1TutorShare = Math.round(effectiveBudget * 0.60);
      const month2TutorShare = effectiveBudget;

      return {
        effectiveBudget,
        hasNumericBudget,
        month1PlatformFee,
        month1TutorShare,
        month2TutorShare
      };
    }

    test('Accurately projects Month 1 (60%/40%) and Month 2+ (100%/0%) for default student budget', () => {
      const breakdown = computeModalPayoutBreakdown(5000, undefined);
      expect(breakdown.hasNumericBudget).toBe(true);
      expect(breakdown.effectiveBudget).toBe(5000);
      expect(breakdown.month1TutorShare).toBe(3000); // 60% of 5000
      expect(breakdown.month1PlatformFee).toBe(2000); // 40% of 5000
      expect(breakdown.month2TutorShare).toBe(5000); // 100% of 5000
    });

    test('Dynamically updates breakdown when tutor inputs a counter-offer', () => {
      const breakdown = computeModalPayoutBreakdown(5000, '7500');
      expect(breakdown.hasNumericBudget).toBe(true);
      expect(breakdown.effectiveBudget).toBe(7500);
      expect(breakdown.month1TutorShare).toBe(4500); // 60% of 7500
      expect(breakdown.month1PlatformFee).toBe(3000); // 40% of 7500
      expect(breakdown.month2TutorShare).toBe(7500); // 100% of 7500
    });

    test('Handles Negotiable or non-numeric budgets gracefully without NaN', () => {
      const breakdown = computeModalPayoutBreakdown('Negotiable', undefined);
      expect(breakdown.hasNumericBudget).toBe(false);
      expect(breakdown.effectiveBudget).toBe(0);
      expect(breakdown.month1TutorShare).toBe(0);
      expect(breakdown.month1PlatformFee).toBe(0);
      expect(breakdown.month2TutorShare).toBe(0);
    });
  });

  test.describe('Student Fee Payment Prerequisite & Earnings Lifecycle Verification', () => {
    function evaluatePayoutBackendGuard(payout: {
      studentPaymentId?: string;
      paidByStudentAt?: any;
      releaseEligibleAt: number;
      now: number;
    }) {
      if (!payout.studentPaymentId || !payout.paidByStudentAt) {
        return { eligible: false, reason: 'student_payment_missing' };
      }
      if (payout.now < payout.releaseEligibleAt) {
        return { eligible: false, reason: 'escrow_timelocked' };
      }
      return { eligible: true, reason: 'ready_for_payout' };
    }

    function evaluateTeacherEarningsMilestone(app: {
      startDate: number;
      feePaid: boolean;
      payoutStatus?: string;
      now: number;
    }) {
      const daysElapsed = Math.max(0, Math.floor((app.now - app.startDate) / (24 * 60 * 60 * 1000)));
      const isPayoutComplete = app.payoutStatus === 'paid';

      let stage1State: 'paid' | 'trial' | 'grace_period' | 'locked_overdue';
      let stage2State: 'disbursed' | 'in_escrow' | 'locked_overdue' | 'locked_grace' | 'locked_trial';

      if (app.feePaid) {
        stage1State = 'paid';
      } else if (daysElapsed >= 20) {
        stage1State = 'locked_overdue';
      } else if (daysElapsed >= 7) {
        stage1State = 'grace_period';
      } else {
        stage1State = 'trial';
      }

      if (isPayoutComplete) {
        stage2State = 'disbursed';
      } else if (app.feePaid) {
        stage2State = 'in_escrow';
      } else if (daysElapsed >= 20) {
        stage2State = 'locked_overdue';
      } else if (daysElapsed >= 7) {
        stage2State = 'locked_grace';
      } else {
        stage2State = 'locked_trial';
      }

      return { daysElapsed, stage1State, stage2State };
    }

    test('Strictly blocks Day 30 payout if student payment ID or payment timestamp is missing', () => {
      const Day30 = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      // Case 1: Unpaid (missing studentPaymentId and paidByStudentAt)
      const resultUnpaid = evaluatePayoutBackendGuard({
        releaseEligibleAt: now - 1000,
        now,
      });
      expect(resultUnpaid.eligible).toBe(false);
      expect(resultUnpaid.reason).toBe('student_payment_missing');

      // Case 2: Verified student payment exists and Day 30 reached
      const resultPaid = evaluatePayoutBackendGuard({
        studentPaymentId: 'pay_12345678',
        paidByStudentAt: now - Day30,
        releaseEligibleAt: now - 1000,
        now,
      });
      expect(resultPaid.eligible).toBe(true);
      expect(resultPaid.reason).toBe('ready_for_payout');
    });

    test('Accurately evaluates Teacher Earnings lifecycle: Trial, Grace Period, Hard Lock, and Escrow', () => {
      const ONE_DAY = 24 * 60 * 60 * 1000;
      const now = Date.now();

      // Day 3 (Trial in progress)
      const day3 = evaluateTeacherEarningsMilestone({
        startDate: now - (3 * ONE_DAY),
        feePaid: false,
        now,
      });
      expect(day3.daysElapsed).toBe(3);
      expect(day3.stage1State).toBe('trial');
      expect(day3.stage2State).toBe('locked_trial');

      // Day 8 (Grace Period Active)
      const day8 = evaluateTeacherEarningsMilestone({
        startDate: now - (8 * ONE_DAY),
        feePaid: false,
        now,
      });
      expect(day8.daysElapsed).toBe(8);
      expect(day8.stage1State).toBe('grace_period');
      expect(day8.stage2State).toBe('locked_grace');

      // Day 12 (Grace Period Still Active in 20-day window)
      const day12 = evaluateTeacherEarningsMilestone({
        startDate: now - (12 * ONE_DAY),
        feePaid: false,
        now,
      });
      expect(day12.daysElapsed).toBe(12);
      expect(day12.stage1State).toBe('grace_period');
      expect(day12.stage2State).toBe('locked_grace');

      // Day 22 (Hard Lock / Overdue after 20 days)
      const day22 = evaluateTeacherEarningsMilestone({
        startDate: now - (22 * ONE_DAY),
        feePaid: false,
        now,
      });
      expect(day22.daysElapsed).toBe(22);
      expect(day22.stage1State).toBe('locked_overdue');
      expect(day22.stage2State).toBe('locked_overdue');

      // Student Paid (Escrow Held)
      const paidEscrow = evaluateTeacherEarningsMilestone({
        startDate: now - (15 * ONE_DAY),
        feePaid: true,
        payoutStatus: 'escrow_held',
        now,
      });
      expect(paidEscrow.stage1State).toBe('paid');
      expect(paidEscrow.stage2State).toBe('in_escrow');

      // Disbursed
      const disbursed = evaluateTeacherEarningsMilestone({
        startDate: now - (32 * ONE_DAY),
        feePaid: true,
        payoutStatus: 'paid',
        now,
      });
      expect(disbursed.stage1State).toBe('paid');
      expect(disbursed.stage2State).toBe('disbursed');
    });
  });
});
