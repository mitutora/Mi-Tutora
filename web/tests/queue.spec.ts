import { test, expect } from '@playwright/test';
import { APP_STATUS_PENDING } from '../src/utils/constants';

// These tests validate the architectural limits defined in docs/Student_Queue_Architecture.md
// In production, these filters run via SWR caching on the frontend and Firestore Security Rules on the backend.

function checkConcurrentLimit(applications: any[], groupId: string) {
  const pendingCount = applications.filter((app: any) => app.groupDocId === groupId && APP_STATUS_PENDING.includes(app.status)).length;
  return pendingCount < 5;
}

function checkDemoLimit(applications: any[], groupId: string, nowMs: number) {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const recentDemosCount = applications.filter((app: any) => 
    app.groupDocId === groupId &&
    ['demo_requested_by_student', 'demo_pending_payment', 'demo_booking_phase', 'demo_scheduled', 'waiting_for_parent_decision'].includes(app.status) &&
    (nowMs - (app.updatedAt || app.createdAt || 0) < SEVEN_DAYS)
  ).length;
  
  return recentDemosCount < 2;
}

test.describe('Student Queue Architecture', () => {

  test.describe('Layer 2: Concurrent Request Limit (5)', () => {
    test('Allows request when pending count is under 5', () => {
      const apps = [
        { groupDocId: 'group1', status: 'negotiating' },
        { groupDocId: 'group1', status: 'pending' },
        { groupDocId: 'group1', status: 'reviewing' },
        { groupDocId: 'group1', status: 'offer_sent' }
      ]; // 4 pending
      
      expect(checkConcurrentLimit(apps, 'group1')).toBe(true);
    });

    test('Blocks request when pending count hits 5', () => {
      const apps = [
        { groupDocId: 'group1', status: 'negotiating' },
        { groupDocId: 'group1', status: 'pending' },
        { groupDocId: 'group1', status: 'reviewing' },
        { groupDocId: 'group1', status: 'offer_sent' },
        { groupDocId: 'group1', status: 'demo_requested_by_student' }
      ]; // 5 pending
      
      expect(checkConcurrentLimit(apps, 'group1')).toBe(false);
    });

    test('Does not count declined or active tuitions towards limit', () => {
      const apps = [
        { groupDocId: 'group1', status: 'negotiating' },
        { groupDocId: 'group1', status: 'pending' },
        { groupDocId: 'group1', status: 'declined' }, // should not count
        { groupDocId: 'group1', status: 'tuition_started' }, // should not count
        { groupDocId: 'group1', status: 'locked' } // should not count
      ]; // Only 2 pending
      
      expect(checkConcurrentLimit(apps, 'group1')).toBe(true);
    });

    test('Isolates limits per group', () => {
      const apps = [
        { groupDocId: 'group1', status: 'negotiating' },
        { groupDocId: 'group1', status: 'pending' },
        { groupDocId: 'group1', status: 'reviewing' },
        { groupDocId: 'group1', status: 'offer_sent' },
        { groupDocId: 'group1', status: 'demo_requested_by_student' }, // Group 1 is at limit (5)
        
        { groupDocId: 'group2', status: 'negotiating' } // Group 2 is at 1
      ];
      
      expect(checkConcurrentLimit(apps, 'group1')).toBe(false);
      expect(checkConcurrentLimit(apps, 'group2')).toBe(true);
    });
  });

  test.describe('Layer 3: 2-Demo Anti-Spam Limit', () => {
    test('Allows demo request when recent demo count is under 2', () => {
      const nowMs = Date.now();
      const apps = [
        { groupDocId: 'group1', status: 'demo_scheduled', updatedAt: nowMs - 1000 }
      ]; // 1 active demo
      
      expect(checkDemoLimit(apps, 'group1', nowMs)).toBe(true);
    });

    test('Blocks demo request when recent demo count hits 2', () => {
      const nowMs = Date.now();
      const apps = [
        { groupDocId: 'group1', status: 'demo_scheduled', updatedAt: nowMs - 1000 },
        { groupDocId: 'group1', status: 'demo_booking_phase', updatedAt: nowMs - 2000 }
      ]; // 2 active demos
      
      expect(checkDemoLimit(apps, 'group1', nowMs)).toBe(false);
    });

    test('Allows demo if previous demos are older than 7 days', () => {
      const nowMs = Date.now();
      const EIGHT_DAYS_MS = 8 * 24 * 60 * 60 * 1000;
      
      const apps = [
        { groupDocId: 'group1', status: 'demo_scheduled', updatedAt: nowMs - EIGHT_DAYS_MS }, // Expired
        { groupDocId: 'group1', status: 'demo_scheduled', updatedAt: nowMs - EIGHT_DAYS_MS }  // Expired
      ]; 
      
      expect(checkDemoLimit(apps, 'group1', nowMs)).toBe(true);
    });
  });

  test.describe('Layer 4: 7-Day Post-Decline Lockout', () => {
    function isTutorLockedAfterDecline(declinedAtMs: number, nowMs: number) {
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      return (nowMs - declinedAtMs) < SEVEN_DAYS;
    }

    test('Blocks sending offer to student if declined 3 days ago', () => {
      const nowMs = Date.now();
      const THREE_DAYS_AGO = nowMs - (3 * 24 * 60 * 60 * 1000);
      expect(isTutorLockedAfterDecline(THREE_DAYS_AGO, nowMs)).toBe(true);
    });

    test('Allows sending offer to student once 7 days have elapsed', () => {
      const nowMs = Date.now();
      const EIGHT_DAYS_AGO = nowMs - (8 * 24 * 60 * 60 * 1000);
      expect(isTutorLockedAfterDecline(EIGHT_DAYS_AGO, nowMs)).toBe(false);
    });
  });
});
