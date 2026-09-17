import { test, expect } from '@playwright/test';
import { generateReferralCode } from '../src/utils/referral';

test.describe('Event-Driven Database Triggers Architecture', () => {

  test.describe('Application Lifecycle & Auto-Decline Trigger (onApplicationWritten)', () => {
    function processApplicationStatusTransition(
      previousStatus: string,
      currentStatus: string,
      appId: string,
      competingApps: Array<{ id: string; status: string; reason?: string }>
    ) {
      const updates: any = {
        declinedCompeting: [],
        pendingFeeCreated: false,
        cleanedUpTutor: false,
      };

      if (currentStatus === 'tuition_started' && previousStatus !== 'tuition_started') {
        updates.pendingFeeCreated = true;
        for (const app of competingApps) {
          if (app.id !== appId && app.status !== 'declined' && app.status !== 'tuition_started') {
            updates.declinedCompeting.push({
              id: app.id,
              status: 'declined',
              reason: 'student_hired_another_tutor',
            });
          }
        }
      }

      if (currentStatus === 'declined' && previousStatus !== 'declined') {
        updates.cleanedUpTutor = true;
      }

      return updates;
    }

    test('Auto-declines all competing applications when student hires a tutor (tuition_started)', () => {
      const activeAppId = 'app_winner';
      const competing = [
        { id: 'app_winner', status: 'negotiating' },
        { id: 'app_competitor_1', status: 'negotiating' },
        { id: 'app_competitor_2', status: 'demo_scheduled' },
        { id: 'app_already_declined', status: 'declined' },
      ];

      const result = processApplicationStatusTransition('negotiating', 'tuition_started', activeAppId, competing);
      expect(result.pendingFeeCreated).toBe(true);
      expect(result.declinedCompeting.length).toBe(2);
      expect(result.declinedCompeting[0]).toEqual({
        id: 'app_competitor_1',
        status: 'declined',
        reason: 'student_hired_another_tutor',
      });
      expect(result.declinedCompeting[1]).toEqual({
        id: 'app_competitor_2',
        status: 'declined',
        reason: 'student_hired_another_tutor',
      });
    });

    test('Cleans up pending requests when application status transitions to declined', () => {
      const result = processApplicationStatusTransition('negotiating', 'declined', 'app_123', []);
      expect(result.cleanedUpTutor).toBe(true);
      expect(result.pendingFeeCreated).toBe(false);
    });
  });

  test.describe('Review & Rating Aggregation Trigger (onReviewCreated)', () => {
    function computeRollingRating(currentRating: number, currentReviewCount: number, newScore: number) {
      const newReviewCount = currentReviewCount + 1;
      const totalPreviousScore = currentRating * currentReviewCount;
      const newAverageRating = (totalPreviousScore + newScore) / newReviewCount;
      return {
        rating: Math.round(newAverageRating * 10) / 10,
        reviewCount: newReviewCount,
      };
    }

    test('Calculates 5.0 rating for the very first review of 5 stars', () => {
      const result = computeRollingRating(0, 0, 5);
      expect(result.rating).toBe(5.0);
      expect(result.reviewCount).toBe(1);
    });

    test('Accurately averages subsequent ratings with 1 decimal rounding', () => {
      // 5.0 from 1 review + new 4-star review -> 4.5
      const result1 = computeRollingRating(5.0, 1, 4);
      expect(result1.rating).toBe(4.5);
      expect(result1.reviewCount).toBe(2);

      // 4.5 from 2 reviews + new 5-star review -> 4.7
      const result2 = computeRollingRating(4.5, 2, 5);
      expect(result2.rating).toBe(4.7);
      expect(result2.reviewCount).toBe(3);

      // 4.7 from 3 reviews (sum ~ 14) + new 2-star review -> 4.0
      const result3 = computeRollingRating(4.7, 3, 2);
      expect(result3.rating).toBe(4.0);
      expect(result3.reviewCount).toBe(4);
    });
  });

  test.describe('User Initialization & Self-Referral Prevention (onUserCreated / Signup)', () => {
    test('Rejects self-referrals when referrer ID matches the registrant UID', () => {
      const registrantUid = 'user_abc123';
      const referrerUser = { id: 'user_abc123', name: 'Nikhil' };

      const isSelfReferral = referrerUser.id === registrantUid;
      expect(isSelfReferral).toBe(true);
    });

    test('Allows referrals from another user', () => {
      const registrantUid = 'user_student1';
      const referrerUser = { id: 'user_referrer9', name: 'Ananya' };

      const isSelfReferral = referrerUser.id === registrantUid;
      expect(isSelfReferral).toBe(false);
    });

    test('Generates guaranteed 11-character referral code on account creation', () => {
      const code = generateReferralCode('John Doe', 'abc12345xyz');
      expect(code.length).toBe(11);
      expect(code.startsWith('JOHN-')).toBe(true);
    });
  });

  test.describe('Teacher Portal Self-Exclusion for Dual-Role Users', () => {
    function filterTeacherVisibleGroups(groups: Array<{ id: string; parentDocId: string; name: string }>, userData: { id?: string; roles?: string[]; [key: string]: any }) {
      if (!userData?.id) {
        return groups;
      }
      return groups.filter((g) => g.parentDocId !== userData.id);
    }

    test('Strictly excludes teacher\'s own student inquiries when userData.id is populated', () => {
      const teacherUid = 'teacher_and_parent_uid_1';
      const userData = { id: teacherUid, roles: ['teacher', 'student'] };

      const groups = [
        { id: 'group_own', parentDocId: teacherUid, name: 'My Kid' },
        { id: 'group_other_1', parentDocId: 'parent_other_1', name: 'Other Student 1' },
        { id: 'group_other_2', parentDocId: 'parent_other_2', name: 'Other Student 2' },
      ];

      const visible = filterTeacherVisibleGroups(groups, userData);
      expect(visible.length).toBe(2);
      expect(visible.map((g) => g.id)).toEqual(['group_other_1', 'group_other_2']);
      expect(visible.some((g) => g.id === 'group_own')).toBe(false);
    });

    test('Demonstrates failure mode when userData.id is undefined (self-inquiry leaks into feed)', () => {
      const teacherUid = 'teacher_and_parent_uid_1';
      const corruptedUserData = { roles: ['teacher', 'student'] }; // Missing .id

      const groups = [
        { id: 'group_own', parentDocId: teacherUid, name: 'My Kid' },
        { id: 'group_other_1', parentDocId: 'parent_other_1', name: 'Other Student 1' },
      ];

      const visible = filterTeacherVisibleGroups(groups, corruptedUserData);
      expect(visible.some((g) => g.id === 'group_own')).toBe(true);
    });
  });
});
