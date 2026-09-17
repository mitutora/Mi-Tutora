import { test, expect } from '@playwright/test';
import { generateReferralCode } from '../src/utils/referral';

test.describe('Referral System Logic', () => {

  test('Generates code with exactly 4 letters of name and 6 chars of UID', () => {
    const name = 'John Doe';
    const uid = 'abc123def456ghi789jkl012mno3';
    
    const code = generateReferralCode(name, uid);
    
    // Expected: JOHN-23DEF4
    expect(code).toBe('JOHN-23DEF4');
  });

  test('Pads short names with X', () => {
    const name = 'Jo';
    const uid = 'abc123def456ghi789jkl012mno3';
    
    const code = generateReferralCode(name, uid);
    
    // Expected: JOXX-23DEF4
    expect(code).toBe('JOXX-23DEF4');
  });

  test('Handles empty names by falling back to USER', () => {
    const name = '';
    const uid = 'abc123def456ghi789jkl012mno3';
    
    const code = generateReferralCode(name, uid);
    
    expect(code.startsWith('USER-')).toBe(true);
  });

  test('Strips non-alphabetical characters from names', () => {
    const name = 'J@hn_123!';
    const uid = 'abc123def456ghi789jkl012mno3';
    
    const code = generateReferralCode(name, uid);
    
    expect(code.startsWith('JHNX-')).toBe(true);
  });

  test('Handles missing UID safely by generating random fallback', () => {
    const name = 'Sarah';
    const code = generateReferralCode(name, '');
    
    expect(code.startsWith('SARA-')).toBe(true);
    expect(code.length).toBeGreaterThan(8); // Fallback generates a random 4-6 char suffix
  });

  test.describe('Reward Distribution on First Month Tuition Payment', () => {
    function calculateReferralReward(finalPrice: number, referralType: 'student' | 'teacher') {
      const platformFee = Math.round(finalPrice * 0.40);
      const rewardAmount = Math.round(platformFee * 0.25);
      if (referralType === 'teacher') {
        return {
          status: 'qualified',
          reward: 0,
          rewardType: 'banked_token',
          bankedTokensIncrement: 1
        };
      } else {
        return {
          status: 'qualified',
          reward: rewardAmount,
          rewardType: 'wallet_cash',
          walletCashIncrement: rewardAmount
        };
      }
    }

    test('Awards 25% of 40% platform fee (10% of gross tuition) as cash wallet credit to student referrer', () => {
      const tuitionFee = 4000;
      const result = calculateReferralReward(tuitionFee, 'student');
      expect(result.status).toBe('qualified');
      expect(result.reward).toBe(400); // 25% of (4000 * 0.40 = 1600) = 400
      expect(result.rewardType).toBe('wallet_cash');
      expect(result.walletCashIncrement).toBe(400);
    });

    test('Awards 1 banked token to teacher referrer instead of cash', () => {
      const tuitionFee = 6000;
      const result = calculateReferralReward(tuitionFee, 'teacher');
      expect(result.status).toBe('qualified');
      expect(result.rewardType).toBe('banked_token');
      expect(result.bankedTokensIncrement).toBe(1);
    });

    test('Rounds decimal rewards properly', () => {
      const tuitionFee = 3555;
      const result = calculateReferralReward(tuitionFee, 'student');
      // platformFee = Math.round(3555 * 0.40) = 1422
      // reward = Math.round(1422 * 0.25) = 355.5 -> 356
      expect(result.reward).toBe(356);
    });
  });

  test.describe('Automated Day 30 Direct Referral Payout (Zero-Threshold)', () => {
    function processDay30ReferralPayout(referral: {
      status: string;
      reward: number;
      rewardType: string;
      payoutStatus: string;
      releaseEligibleAt: number;
      payoutVpa?: string;
    }, currentTimestamp: number) {
      if (referral.status !== 'qualified' || referral.rewardType !== 'wallet_cash') {
        return referral.payoutStatus;
      }

      // If before Day 30, remains locked in escrow
      if (currentTimestamp < referral.releaseEligibleAt) {
        return 'escrow_held';
      }

      // If UPI is missing, request action
      if (!referral.payoutVpa || !referral.payoutVpa.trim()) {
        return 'action_required_missing_upi';
      }

      // Disburses automatically regardless of balance (no ₹1,000 threshold!)
      return 'paid';
    }

    test('Locks reward in escrow from Day 7 until Day 30', () => {
      const hireDate = new Date('2026-09-01T10:00:00Z').getTime();
      const day30Timestamp = hireDate + (30 * 24 * 60 * 60 * 1000);
      const day15Timestamp = hireDate + (15 * 24 * 60 * 60 * 1000);

      const referral = {
        status: 'qualified',
        reward: 600,
        rewardType: 'wallet_cash',
        payoutStatus: 'escrow_held',
        releaseEligibleAt: day30Timestamp,
        payoutVpa: 'student@okhdfcbank'
      };

      // On Day 15, still in escrow
      expect(processDay30ReferralPayout(referral, day15Timestamp)).toBe('escrow_held');

      // On Day 30, executes payout without needing ₹1,000 threshold
      expect(processDay30ReferralPayout(referral, day30Timestamp)).toBe('paid');
    });

    test('Transitions to action_required_missing_upi if student has no UPI on Day 30', () => {
      const hireDate = new Date('2026-09-01T10:00:00Z').getTime();
      const day30Timestamp = hireDate + (30 * 24 * 60 * 60 * 1000);

      const referral = {
        status: 'qualified',
        reward: 600,
        rewardType: 'wallet_cash',
        payoutStatus: 'escrow_held',
        releaseEligibleAt: day30Timestamp,
        payoutVpa: '' // Missing UPI
      };

      expect(processDay30ReferralPayout(referral, day30Timestamp)).toBe('action_required_missing_upi');
    });
  });
});
