import { test, expect } from '@playwright/test';
import { formatTimeTo12Hour, parse24To12Hour, to24HourTime } from '../src/utils/timeFormat';

test.describe('Cloud Scheduler & Time-Lock Architecture', () => {

  test.describe('Demo Meeting Link Time-Lock & IST Parsing', () => {
    function evaluateDemoLinkAccess(demoDate: string, demoTime: string, mockNowTimestamp: number) {
      if (!demoDate || !demoTime) {
        return { allowed: false, error: 'Demo date and time are not fully set' };
      }

      const cleanTime = demoTime.split('||')[0].trim();
      const formattedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
      const demoDateObj = new Date(`${demoDate}T${formattedTime}+05:30`);

      if (isNaN(demoDateObj.getTime())) {
        return { allowed: false, error: 'Invalid demo date or time format' };
      }

      const allowedEntryTime = new Date(demoDateObj.getTime() - 5 * 60 * 1000);
      const lockExpiryTime = new Date(demoDateObj.getTime() + 90 * 60 * 1000);

      if (mockNowTimestamp < allowedEntryTime.getTime()) {
        return { allowed: false, error: 'Too early to join. The link will unlock 5 minutes before the scheduled time.' };
      }

      if (mockNowTimestamp > lockExpiryTime.getTime()) {
        return { allowed: false, error: 'Demo class time window has expired.' };
      }

      return { allowed: true };
    }

    test('Locks link when user attempts access 15 minutes before demo', () => {
      // Demo at 16:30 IST on 2026-09-10
      const demoDate = '2026-09-10';
      const demoTime = '16:30||4:30 PM';
      // 16:15 IST (15 minutes before)
      const mockNow = new Date('2026-09-10T16:15:00+05:30').getTime();

      const result = evaluateDemoLinkAccess(demoDate, demoTime, mockNow);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Too early to join');
    });

    test('Unlocks link exactly 5 minutes before scheduled demo time', () => {
      const demoDate = '2026-09-10';
      const demoTime = '16:30||4:30 PM';
      // Exactly 16:25 IST (5 minutes before)
      const mockNow = new Date('2026-09-10T16:25:00+05:30').getTime();

      const result = evaluateDemoLinkAccess(demoDate, demoTime, mockNow);
      expect(result.allowed).toBe(true);
    });

    test('Allows access during class time (e.g. 20 minutes in)', () => {
      const demoDate = '2026-09-10';
      const demoTime = '16:30';
      // 16:50 IST (20 minutes into class)
      const mockNow = new Date('2026-09-10T16:50:00+05:30').getTime();

      const result = evaluateDemoLinkAccess(demoDate, demoTime, mockNow);
      expect(result.allowed).toBe(true);
    });

    test('Locks link after 90-minute window has elapsed', () => {
      const demoDate = '2026-09-10';
      const demoTime = '16:30';
      // 18:05 IST (95 minutes later)
      const mockNow = new Date('2026-09-10T18:05:00+05:30').getTime();

      const result = evaluateDemoLinkAccess(demoDate, demoTime, mockNow);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('time window has expired');
    });

    test('Correctly handles timezone conversions against UTC server time', () => {
      // 16:30 IST is 11:00 UTC
      const demoDate = '2026-09-10';
      const demoTime = '16:30';
      // Test at 10:56 UTC (which is 16:26 IST, 4 minutes before demo)
      const mockUtcNow = new Date('2026-09-10T10:56:00Z').getTime();

      const result = evaluateDemoLinkAccess(demoDate, demoTime, mockUtcNow);
      expect(result.allowed).toBe(true);
    });
  });

  test.describe('24-Hour Scheduled Demo Auto-Completion Engine (expireDemos)', () => {
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    function evaluateScheduledDemoTransition(demoDate: string, demoTime: string, now: number) {
      if (!demoDate || !demoTime) return { shouldTransition: false, nextStatus: 'demo_scheduled' };
      const cleanTime = demoTime.split('||')[0].trim();
      const formattedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
      const demoTimeMs = new Date(`${demoDate}T${formattedTime}+05:30`).getTime();

      if (!isNaN(demoTimeMs) && now - demoTimeMs > TWENTY_FOUR_HOURS_MS) {
        return {
          shouldTransition: true,
          nextStatus: 'waiting_for_parent_decision',
          hoursElapsed: (now - demoTimeMs) / (1000 * 60 * 60),
        };
      }
      return {
        shouldTransition: false,
        nextStatus: 'demo_scheduled',
        hoursElapsed: isNaN(demoTimeMs) ? 0 : (now - demoTimeMs) / (1000 * 60 * 60),
      };
    }

    test('Keeps demo as demo_scheduled when less than 24 hours have elapsed since scheduled time', () => {
      // Demo scheduled 12 hours ago
      const mockNow = new Date('2026-09-10T22:00:00+05:30').getTime();
      const res = evaluateScheduledDemoTransition('2026-09-10', '10:00', mockNow);
      expect(res.shouldTransition).toBe(false);
      expect(res.nextStatus).toBe('demo_scheduled');
    });

    test('Transitions unconfirmed demo to waiting_for_parent_decision when > 24 hours have elapsed', () => {
      // Demo scheduled 24 hours and 5 minutes ago
      const mockNow = new Date('2026-09-11T10:05:00+05:30').getTime();
      const res = evaluateScheduledDemoTransition('2026-09-10', '10:00', mockNow);
      expect(res.shouldTransition).toBe(true);
      expect(res.nextStatus).toBe('waiting_for_parent_decision');
      expect(res.hoursElapsed).toBeGreaterThan(24);
    });
  });

  test.describe('48-Hour Decision Window Expiry Engine', () => {
    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

    function evaluateDecisionExpiry(completedAt: number, now: number) {
      if (!completedAt || completedAt <= 0) return { expired: false, remainingHours: 0 };
      const elapsed = now - completedAt;
      const isExpired = elapsed > FORTY_EIGHT_HOURS_MS;
      return {
        expired: isExpired,
        remainingHours: isExpired ? 0 : Math.max(0, (FORTY_EIGHT_HOURS_MS - elapsed) / (1000 * 60 * 60)),
      };
    }

    test('Leaves decision active when 24 hours have elapsed', () => {
      const completedAt = Date.now() - (24 * 60 * 60 * 1000);
      const res = evaluateDecisionExpiry(completedAt, Date.now());
      expect(res.expired).toBe(false);
      expect(res.remainingHours).toBeCloseTo(24, 0);
    });

    test('Leaves decision active at 47 hours and 50 minutes', () => {
      const completedAt = Date.now() - (47.83 * 60 * 60 * 1000);
      const res = evaluateDecisionExpiry(completedAt, Date.now());
      expect(res.expired).toBe(false);
      expect(res.remainingHours).toBeGreaterThan(0);
    });

    test('Marks decision expired when 48 hours and 1 minute have elapsed', () => {
      const completedAt = Date.now() - (48.02 * 60 * 60 * 1000);
      const res = evaluateDecisionExpiry(completedAt, Date.now());
      expect(res.expired).toBe(true);
      expect(res.remainingHours).toBe(0);
    });
  });

  test.describe('Firestore Escrow Batch Chunking Protection', () => {
    test('Chunks operations strictly into sub-400 batches to prevent 500-op limit failures', () => {
      const MAX_BATCH_SIZE = 400;
      const totalOperations = 950;
      const batches: number[] = [];

      let currentBatchCount = 0;
      for (let i = 0; i < totalOperations; i++) {
        currentBatchCount++;
        if (currentBatchCount >= MAX_BATCH_SIZE) {
          batches.push(currentBatchCount);
          currentBatchCount = 0;
        }
      }
      if (currentBatchCount > 0) {
        batches.push(currentBatchCount);
      }

      expect(batches.length).toBe(3);
      expect(batches[0]).toBe(400);
      expect(batches[1]).toBe(400);
      expect(batches[2]).toBe(150);
      expect(batches.every((b) => b <= 400)).toBe(true);
    });
  });

  test.describe('Weekly Token Quota Monday Rollover Timing', () => {
    function getWeekStartDate(date: Date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${dayStr}`;
    }

    test('Identifies the exact Monday for any weekday in the week', () => {
      // 2026-09-03 is a Thursday
      const thursday = new Date('2026-09-03T12:00:00Z');
      expect(getWeekStartDate(thursday)).toBe('2026-08-31');

      // 2026-09-06 is a Sunday
      const sunday = new Date('2026-09-06T12:00:00Z');
      expect(getWeekStartDate(sunday)).toBe('2026-08-31');

      // 2026-09-07 is the next Monday
      const nextMonday = new Date('2026-09-07T00:00:00Z');
      expect(getWeekStartDate(nextMonday)).toBe('2026-09-07');
    });
  });

  test.describe('12-Hour AM/PM Time Format & Conversion Utilities', () => {
    test('Formats 24-hour time to 12-hour AM/PM string', () => {
      expect(formatTimeTo12Hour('20:34')).toBe('08:34 PM');
      expect(formatTimeTo12Hour('09:05')).toBe('09:05 AM');
      expect(formatTimeTo12Hour('17:00')).toBe('05:00 PM');
      expect(formatTimeTo12Hour('12:00')).toBe('12:00 PM');
      expect(formatTimeTo12Hour('00:00')).toBe('12:00 AM');
      expect(formatTimeTo12Hour('00:30')).toBe('12:30 AM');
      expect(formatTimeTo12Hour('11:59')).toBe('11:59 AM');
      expect(formatTimeTo12Hour('23:59')).toBe('11:59 PM');
    });

    test('Gracefully handles metadata suffixes with ||', () => {
      expect(formatTimeTo12Hour('20:34||extra_data')).toBe('08:34 PM');
      expect(formatTimeTo12Hour('')).toBe('');
      expect(formatTimeTo12Hour(null)).toBe('');
    });

    test('Parses 24-hour time into 12-hour UI components', () => {
      expect(parse24To12Hour('20:34')).toEqual({ hour: '08', minute: '34', period: 'PM' });
      expect(parse24To12Hour('09:15')).toEqual({ hour: '09', minute: '15', period: 'AM' });
      expect(parse24To12Hour('00:00')).toEqual({ hour: '12', minute: '00', period: 'AM' });
      expect(parse24To12Hour('12:00')).toEqual({ hour: '12', minute: '00', period: 'PM' });
      expect(parse24To12Hour('')).toEqual({ hour: '05', minute: '00', period: 'PM' });
    });

    test('Converts 12-hour UI components back into 24-hour standard string', () => {
      expect(to24HourTime('08', '34', 'PM')).toBe('20:34');
      expect(to24HourTime('09', '15', 'AM')).toBe('09:15');
      expect(to24HourTime('12', '00', 'AM')).toBe('00:00');
      expect(to24HourTime('12', '00', 'PM')).toBe('12:00');
      expect(to24HourTime('11', '59', 'PM')).toBe('23:59');
    });

    test('Guarantees 12h-to-24h-to-12h round-trip fidelity', () => {
      const original24 = '20:34';
      const parsed = parse24To12Hour(original24);
      const converted24 = to24HourTime(parsed.hour, parsed.minute, parsed.period);
      expect(converted24).toBe(original24);
      expect(formatTimeTo12Hour(converted24)).toBe('08:34 PM');
    });
  });

  test.describe('Offline Teacher Location & Travel Preferences Display', () => {
    function evaluateOfflineTravelDisplay(tutor: {
      mode?: string;
      preferredLocations?: string;
      locations?: string;
      travelDistance?: string | number;
      travelKm?: string | number;
      area?: string;
      city?: string;
      pincode?: string;
    }) {
      const isOffline = (tutor.mode || '').toLowerCase().trim() !== 'online';
      if (!isOffline) {
        return { shouldShow: false, preferredLocations: '', travelDistance: '', baseLocality: '' };
      }

      const locations = tutor.preferredLocations || tutor.locations || [tutor.area, tutor.city].filter(Boolean).join(', ') || 'Open to all nearby areas';
      const rawDistance = tutor.travelDistance || tutor.travelKm;
      const cleanDistance = rawDistance ? String(rawDistance).replace(/[^0-9.]/g, '') : '';
      const travel = cleanDistance ? `Within ${cleanDistance} km radius` : 'Within local vicinity';
      const baseLocality = [tutor.area, tutor.city, tutor.pincode].filter(Boolean).join(', ');

      return {
        shouldShow: true,
        preferredLocations: locations,
        travelDistance: travel,
        baseLocality,
      };
    }

    test('Hides offline travel card for Online-only tutors', () => {
      const res = evaluateOfflineTravelDisplay({ mode: 'Online', preferredLocations: 'Indiranagar', travelDistance: '5' });
      expect(res.shouldShow).toBe(false);
    });

    test('Renders preferred locations and willingness to travel for Offline tutors', () => {
      const res = evaluateOfflineTravelDisplay({
        mode: 'Offline',
        preferredLocations: 'Koramangala, HSR Layout',
        travelDistance: '10',
        area: 'Indiranagar',
        city: 'Bengaluru',
        pincode: '560038',
      });
      expect(res.shouldShow).toBe(true);
      expect(res.preferredLocations).toBe('Koramangala, HSR Layout');
      expect(res.travelDistance).toBe('Within 10 km radius');
      expect(res.baseLocality).toBe('Indiranagar, Bengaluru, 560038');
    });

    test('Falls back gracefully when travel distance is not specified', () => {
      const res = evaluateOfflineTravelDisplay({
        mode: 'Offline',
        area: 'Jayanagar',
        city: 'Bengaluru',
      });
      expect(res.shouldShow).toBe(true);
      expect(res.preferredLocations).toBe('Jayanagar, Bengaluru');
      expect(res.travelDistance).toBe('Within local vicinity');
      expect(res.baseLocality).toBe('Jayanagar, Bengaluru');
    });
  });
});
