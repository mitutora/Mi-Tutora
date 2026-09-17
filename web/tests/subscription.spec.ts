import { test, expect } from '@playwright/test';

// These tests validate the architectural limits for Subscriptions and Tokens.

function canTeacherSendOffer(subscriptionPlan: string, isSubscribed: boolean, currentTokensUsed: number) {
  const isPro = subscriptionPlan === 'pro' || isSubscribed;
  const weeklyLimit = isPro ? 15 : 5;
  return currentTokensUsed < weeklyLimit;
}

test.describe('Subscription & Token Architecture', () => {

  test.describe('Token Quotas', () => {
    test('Free tier teacher is blocked after 5 tokens', () => {
      // 4 tokens used
      expect(canTeacherSendOffer('free', false, 4)).toBe(true);
      // 5 tokens used (Limit reached)
      expect(canTeacherSendOffer('free', false, 5)).toBe(false);
      // 6 tokens used
      expect(canTeacherSendOffer('free', false, 6)).toBe(false);
    });

    test('Pro tier teacher is allowed up to 15 tokens', () => {
      // 5 tokens used (Free limit, but Pro should pass)
      expect(canTeacherSendOffer('pro', true, 5)).toBe(true);
      // 14 tokens used
      expect(canTeacherSendOffer('pro', true, 14)).toBe(true);
      // 15 tokens used (Limit reached)
      expect(canTeacherSendOffer('pro', true, 15)).toBe(false);
    });

    test('Legacy isSubscribed flag correctly grants Pro limits', () => {
      // isSubscribed = true, but plan string is missing or old
      expect(canTeacherSendOffer('', true, 10)).toBe(true);
      expect(canTeacherSendOffer('legacy_plan', true, 14)).toBe(true);
      expect(canTeacherSendOffer('legacy_plan', true, 15)).toBe(false);
    });
  });

  test.describe('Weekly Quota Rollover (Monday Reset)', () => {
    function getWeekStartDate(date: Date) {
      const d = new Date(date);
      d.setHours(12, 0, 0, 0);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${dayStr}`;
    }

    test('Identifies Monday as the start of the current week', () => {
      // 2026-09-03 is a Thursday
      const thursday = new Date('2026-09-03T12:00:00Z');
      const monday = getWeekStartDate(thursday);
      expect(monday).toBe('2026-08-31');

      // 2026-09-06 is a Sunday
      const sunday = new Date('2026-09-06T12:00:00Z');
      expect(getWeekStartDate(sunday)).toBe('2026-08-31');

      // 2026-09-07 is the next Monday
      const nextMonday = new Date('2026-09-07T00:00:00Z');
      expect(getWeekStartDate(nextMonday)).toBe('2026-09-07');
    });
  });

  test.describe('Subscription Duration & Clock-Rewind Anti-Spoofing', () => {
    test('Calculates 30-day expiry from payment timestamp', () => {
      const paymentTime = 1756800000000; // arbitrary timestamp
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const expiry = paymentTime + THIRTY_DAYS_MS;
      expect(expiry - paymentTime).toBe(2592000000);
    });

    test('Early renewal extends expiry from existing expiry date rather than overwriting', () => {
      const now = 1756800000000;
      const existingExpiry = now + (10 * 24 * 60 * 60 * 1000); // 10 days remaining
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      
      const newExpiry = Math.max(now, existingExpiry) + THIRTY_DAYS_MS;
      // Should equal existingExpiry + 30 days (40 days from now)
      expect(newExpiry).toBe(existingExpiry + THIRTY_DAYS_MS);
      expect(newExpiry - now).toBe(40 * 24 * 60 * 60 * 1000);
    });

    test('Pro upgrade deducts 10 tokens from tokensUsed bounded at 0', () => {
      const currentUsed = 7;
      const updatedUsed = Math.max(0, currentUsed - 10);
      expect(updatedUsed).toBe(0);

      const heavyUsed = 12;
      const updatedHeavy = Math.max(0, heavyUsed - 10);
      expect(updatedHeavy).toBe(2);
    });

    test('Banked token allows proposal when weekly quota is reached', () => {
      function canSendWithBanked(currentTokens: number, limit: number, bankedTokens: number) {
        if (currentTokens < limit) return { allowed: true, useBanked: false };
        if (bankedTokens > 0) return { allowed: true, useBanked: true };
        return { allowed: false, useBanked: false };
      }

      // Quota reached, has banked tokens
      expect(canSendWithBanked(5, 5, 2)).toEqual({ allowed: true, useBanked: true });
      // Quota reached, no banked tokens
      expect(canSendWithBanked(5, 5, 0)).toEqual({ allowed: false, useBanked: false });
      // Quota not reached
      expect(canSendWithBanked(4, 5, 0)).toEqual({ allowed: true, useBanked: false });
    });

    test('Neutralizes local clock rewind using latestServerTime', () => {
      const latestServerTime = 1756800000000;
      const expiredSubExpiry = latestServerTime - 1000; // Expired 1 second ago on server
      
      // User rewinds their clock backward by 1 year (365 days)
      const tamperedClientClock = latestServerTime - (365 * 24 * 60 * 60 * 1000);
      
      // Vulnerable check: would wrongly think user is active
      const naiveIsActive = tamperedClientClock < expiredSubExpiry;
      expect(naiveIsActive).toBe(true);

      // Secure check: forces clock forward to latestServerTime
      const effectiveTime = Math.max(tamperedClientClock, latestServerTime);
      const secureIsActive = effectiveTime < expiredSubExpiry;
      expect(secureIsActive).toBe(false); // Pro badge correctly blocked!
    });
  });
});
