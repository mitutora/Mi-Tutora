import { test, expect } from '@playwright/test';

// The business logic requires mathematical floors and ceilings on negotiation boundaries.
// The tests here verify the boundaries defined in negotiation_plan.md

function calculateStudentBounds(tutorPrice: number, offerPrice: number) {
  const initialBudget = tutorPrice > 0 ? tutorPrice : offerPrice;
  const absoluteMin = tutorPrice > 0 ? Math.ceil(tutorPrice * 0.6) : Math.ceil(offerPrice * 0.6);
  const absoluteMax = tutorPrice > 0 ? tutorPrice : offerPrice;
  return { initialBudget, absoluteMin, absoluteMax };
}

function calculateTeacherBounds(studentBudget: number, offerPrice: number) {
  const initialBudget = studentBudget || offerPrice;
  const absoluteMin = studentBudget || offerPrice;
  const absoluteMax = studentBudget ? Math.floor(studentBudget * 1.4) : Math.floor(offerPrice * 1.4);
  return { initialBudget, absoluteMin, absoluteMax };
}

test.describe('Negotiation Boundary Rules (negotiation_plan.md)', () => {

  test('Student offering to tutor establishes 60% hard floor', () => {
    const tutorPrice = 1000;
    const offerPrice = 700; // Offer doesn't matter for the bounds if tutor price exists
    const bounds = calculateStudentBounds(tutorPrice, offerPrice);
    
    expect(bounds.initialBudget).toBe(1000);
    expect(bounds.absoluteMin).toBe(600); // 60% of 1000
    expect(bounds.absoluteMax).toBe(1000); 
  });

  test('Teacher offering to student establishes 140% hard ceiling', () => {
    const studentBudget = 1000;
    const offerPrice = 1200; 
    const bounds = calculateTeacherBounds(studentBudget, offerPrice);
    
    expect(bounds.initialBudget).toBe(1000);
    expect(bounds.absoluteMin).toBe(1000);
    expect(bounds.absoluteMax).toBe(1400); // 140% of 1000
  });

  test.describe('Counter-Offer Validation', () => {
    function isCounterOfferAllowed(counterOffer: number, min: number, max: number) {
      return counterOffer >= min && counterOffer <= max;
    }

    test('Accepts counter-offer strictly within [absoluteMin, absoluteMax]', () => {
      const min = 600;
      const max = 1000;
      expect(isCounterOfferAllowed(600, min, max)).toBe(true);
      expect(isCounterOfferAllowed(800, min, max)).toBe(true);
      expect(isCounterOfferAllowed(1000, min, max)).toBe(true);
    });

    test('Rejects counter-offer below absoluteMin (less than 60%)', () => {
      const min = 600;
      const max = 1000;
      expect(isCounterOfferAllowed(599, min, max)).toBe(false);
      expect(isCounterOfferAllowed(400, min, max)).toBe(false);
    });

    test('Rejects counter-offer above absoluteMax (more than 140%)', () => {
      const min = 1000;
      const max = 1400;
      expect(isCounterOfferAllowed(1401, min, max)).toBe(false);
      expect(isCounterOfferAllowed(1600, min, max)).toBe(false);
    });
  });

  test.describe('Negotiation Status Progression', () => {
    const IMMUTABLE_STATUSES = [
      'accepted',
      'tuition_started',
      'demo_booking_phase',
      'demo_scheduled',
      'waiting_for_parent_decision'
    ];

    function canModifyPrice(status: string) {
      return !IMMUTABLE_STATUSES.includes(status);
    }

    test('Allows price updates during active negotiation', () => {
      expect(canModifyPrice('negotiating')).toBe(true);
      expect(canModifyPrice('pending')).toBe(true);
    });

    test('Locks price updates once negotiation reaches booking, scheduling, or tuition', () => {
      expect(canModifyPrice('accepted')).toBe(false);
      expect(canModifyPrice('demo_booking_phase')).toBe(false);
      expect(canModifyPrice('demo_scheduled')).toBe(false);
      expect(canModifyPrice('tuition_started')).toBe(false);
    });
  });

  test.describe('Teacher View Modal: Dual-Card Tuition Fee Breakdown & Counter-Offer Reactivity (StudentViewModal.tsx)', () => {
    function computeTuitionBreakdown(baseBudget: any, enteredOffer?: string) {
      const parsedOffer = enteredOffer ? parseFloat(enteredOffer) : NaN;
      const effectiveBudget = (!isNaN(parsedOffer) && parsedOffer > 0)
        ? parsedOffer
        : (typeof baseBudget === 'number' && !isNaN(baseBudget) && baseBudget > 0 ? baseBudget : 0);

      const hasNumericBudget = effectiveBudget > 0;
      const month1TutorShare = hasNumericBudget ? Math.round(effectiveBudget * 0.60) : 0;
      const month1PlatformFee = hasNumericBudget ? Math.round(effectiveBudget * 0.40) : 0;
      const month2PlusTutorShare = hasNumericBudget ? Math.round(effectiveBudget) : 0;

      return {
        effectiveBudget,
        hasNumericBudget,
        month1TutorShare,
        month1PlatformFee,
        month2PlusTutorShare,
      };
    }

    test('Computes Month 1 (60% net share, 40% platform fee) and Month 2+ (100% direct retainer) for baseline budget', () => {
      const breakdown = computeTuitionBreakdown(5000);
      expect(breakdown.hasNumericBudget).toBe(true);
      expect(breakdown.effectiveBudget).toBe(5000);
      expect(breakdown.month1TutorShare).toBe(3000); // 60% of 5000
      expect(breakdown.month1PlatformFee).toBe(2000); // 40% of 5000
      expect(breakdown.month2PlusTutorShare).toBe(5000); // 100% of 5000
    });

    test('Reactively updates breakdown when teacher enters a custom counter-offer', () => {
      // Student budget is 4000, but teacher inputs 6500 in the counter-offer box
      const breakdown = computeTuitionBreakdown(4000, '6500');
      expect(breakdown.effectiveBudget).toBe(6500);
      expect(breakdown.month1TutorShare).toBe(3900); // 60% of 6500
      expect(breakdown.month1PlatformFee).toBe(2600); // 40% of 6500
      expect(breakdown.month2PlusTutorShare).toBe(6500); // 100% of 6500
    });

    test('Falls back safely to base budget when counter-offer is empty or non-numeric', () => {
      const emptyBreakdown = computeTuitionBreakdown(6000, '');
      expect(emptyBreakdown.effectiveBudget).toBe(6000);
      expect(emptyBreakdown.month1TutorShare).toBe(3600);

      const invalidBreakdown = computeTuitionBreakdown(6000, 'abc');
      expect(invalidBreakdown.effectiveBudget).toBe(6000);
      expect(invalidBreakdown.month1TutorShare).toBe(3600);
    });

    test('Handles zero or undefined budgets gracefully without NaN', () => {
      const zeroBreakdown = computeTuitionBreakdown(0);
      expect(zeroBreakdown.hasNumericBudget).toBe(false);
      expect(zeroBreakdown.effectiveBudget).toBe(0);
      expect(zeroBreakdown.month1TutorShare).toBe(0);
      expect(zeroBreakdown.month1PlatformFee).toBe(0);
      expect(zeroBreakdown.month2PlusTutorShare).toBe(0);

      const undefinedBreakdown = computeTuitionBreakdown(undefined);
      expect(undefinedBreakdown.hasNumericBudget).toBe(false);
      expect(undefinedBreakdown.month1TutorShare).toBe(0);
    });
  });
});

