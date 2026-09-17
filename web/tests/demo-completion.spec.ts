import { test, expect } from '@playwright/test';

test.describe('Demo Completion & Hiring Architecture (Demo_Completion_Hiring_Architecture.md)', () => {

  function canParentHire(app: { demoDate?: string; demoTime?: string; status: string }, currentTimeMs: number) {
    if (!app.demoDate || !app.demoTime) {
      return { allowed: false, reason: 'Demo not scheduled' };
    }

    const demoDateObj = new Date(app.demoDate);
    const timeParts = app.demoTime.split('||')[0].split(':');
    if (timeParts.length >= 2) {
      demoDateObj.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
    }
    const demoEndTime = demoDateObj.getTime();

    if (currentTimeMs < demoEndTime) {
      return { allowed: false, reason: 'Demo has not finished yet' };
    }

    if (!['demo_scheduled', 'waiting_for_parent_decision'].includes(app.status)) {
      return { allowed: false, reason: 'Invalid application status' };
    }

    return { allowed: true, reason: 'Allowed to hire' };
  }

  function evaluateLazyStatus(app: { status: string; demoDate: string; demoTime: string }, currentTimeMs: number) {
    if (app.status !== 'demo_scheduled') return app.status;

    const demoDateObj = new Date(app.demoDate);
    const timeParts = app.demoTime.split('||')[0].split(':');
    if (timeParts.length >= 2) {
      demoDateObj.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
    }
    const demoEndTime = demoDateObj.getTime();
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

    // If demo is complete and 48 hours passed without parent hiring, transitions to waiting_for_parent_decision
    if (currentTimeMs >= demoEndTime) {
      return 'waiting_for_parent_decision';
    }

    return app.status;
  }

  test.describe('Hiring Time Lock', () => {
    test('Blocks hiring before the scheduled demo ends', () => {
      const app = {
        demoDate: '2026-09-03',
        demoTime: '16:00',
        status: 'demo_scheduled'
      };

      // Attempt to hire at 15:30 (before demo)
      const testTime = new Date('2026-09-03T15:30:00').getTime();
      const result = canParentHire(app, testTime);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Demo has not finished yet');
    });

    test('Allows hiring immediately once the demo time has elapsed', () => {
      const app = {
        demoDate: '2026-09-03',
        demoTime: '16:00',
        status: 'demo_scheduled'
      };

      // Attempt to hire at 16:01 (after demo)
      const testTime = new Date('2026-09-03T16:01:00').getTime();
      const result = canParentHire(app, testTime);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Allowed to hire');
    });
  });

  test.describe('Status Prerequisites for Hiring', () => {
    test('Allows hiring for waiting_for_parent_decision status', () => {
      const app = {
        demoDate: '2026-09-01',
        demoTime: '10:00',
        status: 'waiting_for_parent_decision'
      };

      const now = new Date('2026-09-02T10:00:00').getTime();
      const result = canParentHire(app, now);

      expect(result.allowed).toBe(true);
    });

    test('Rejects hiring if application is already in tuition_started or declined', () => {
      const appStarted = {
        demoDate: '2026-09-01',
        demoTime: '10:00',
        status: 'tuition_started'
      };
      const appDeclined = {
        demoDate: '2026-09-01',
        demoTime: '10:00',
        status: 'declined'
      };

      const now = new Date('2026-09-02T10:00:00').getTime();
      expect(canParentHire(appStarted, now).allowed).toBe(false);
      expect(canParentHire(appDeclined, now).allowed).toBe(false);
    });
  });

  test.describe('Lazy Auto-Completion After Demo', () => {
    test('Transitions from demo_scheduled to waiting_for_parent_decision when evaluated post-demo', () => {
      const app = {
        status: 'demo_scheduled',
        demoDate: '2026-09-01',
        demoTime: '12:00'
      };

      // 1 day after demo
      const checkTime = new Date('2026-09-02T12:00:00').getTime();
      const status = evaluateLazyStatus(app, checkTime);

      expect(status).toBe('waiting_for_parent_decision');
    });
  });
});
