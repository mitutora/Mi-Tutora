import { test, expect } from '@playwright/test';

test.describe('Account Security & Banked Token Redemption', () => {

  test.describe('Teacher Banked Token Redemption Logic (redeemBankedToken)', () => {
    function processTokenRedemption(tutor: { bankedTokens?: number; weeklyQuota?: { tokensUsed: number } }) {
      const bankedTokens = tutor.bankedTokens || 0;
      if (bankedTokens <= 0) {
        return { success: false, error: 'NO_BANKED_TOKENS' };
      }

      const tokensUsed = tutor.weeklyQuota?.tokensUsed || 0;
      if (tokensUsed <= 0) {
        return { success: false, error: 'QUOTA_ALREADY_FULL' };
      }

      return {
        success: true,
        remainingBankedTokens: bankedTokens - 1,
        newTokensUsed: tokensUsed - 1,
      };
    }

    test('Rejects redemption if teacher has 0 banked tokens', () => {
      const tutor = { bankedTokens: 0, weeklyQuota: { tokensUsed: 3 } };
      const res = processTokenRedemption(tutor);
      expect(res.success).toBe(false);
      expect(res.error).toBe('NO_BANKED_TOKENS');
    });

    test('Rejects redemption if bankedTokens is undefined or missing', () => {
      const tutor = { weeklyQuota: { tokensUsed: 5 } };
      const res = processTokenRedemption(tutor);
      expect(res.success).toBe(false);
      expect(res.error).toBe('NO_BANKED_TOKENS');
    });

    test('Rejects redemption if weeklyQuota.tokensUsed is 0 (quota not used yet)', () => {
      const tutor = { bankedTokens: 3, weeklyQuota: { tokensUsed: 0 } };
      const res = processTokenRedemption(tutor);
      expect(res.success).toBe(false);
      expect(res.error).toBe('QUOTA_ALREADY_FULL');
    });

    test('Successfully redeems 1 banked token and reduces tokensUsed by 1', () => {
      const tutor = { bankedTokens: 2, weeklyQuota: { tokensUsed: 5 } };
      const res = processTokenRedemption(tutor);
      expect(res.success).toBe(true);
      expect(res.remainingBankedTokens).toBe(1);
      expect(res.newTokensUsed).toBe(4);
    });
  });

  test.describe('Protected Account Deletion Guard (deleteUserAccount)', () => {
    function canDeleteAccount(applications: Array<{ status: string; tutorDocId?: string; parentDocId?: string }>, uid: string) {
      const activeTuitions = applications.filter(
        (app) => (app.tutorDocId === uid || app.parentDocId === uid) && app.status === 'tuition_started'
      );

      if (activeTuitions.length > 0) {
        return {
          allowed: false,
          error: 'Cannot delete account while you have an active tuition agreement.',
        };
      }

      return { allowed: true };
    }

    function resolveRoleDeletion(roles: string[], targetRole?: string) {
      const isDualRole = roles.length > 1 && Boolean(targetRole && roles.includes(targetRole));
      if (isDualRole) {
        const remaining = roles.filter((r) => r !== targetRole);
        return { isFullyDeleted: false, remainingRoles: remaining };
      }
      return { isFullyDeleted: true, remainingRoles: [] };
    }

    test('Strictly blocks account deletion if user has an active tuition contract (tuition_started)', () => {
      const apps = [
        { status: 'tuition_started', tutorDocId: 'tutor_123', parentDocId: 'parent_456' },
      ];
      const tutorCheck = canDeleteAccount(apps, 'tutor_123');
      expect(tutorCheck.allowed).toBe(false);
      expect(tutorCheck.error).toContain('active tuition agreement');

      const parentCheck = canDeleteAccount(apps, 'parent_456');
      expect(parentCheck.allowed).toBe(false);
      expect(parentCheck.error).toContain('active tuition agreement');
    });

    test('Allows deletion if user only has completed, negotiating, or declined applications', () => {
      const apps = [
        { status: 'declined', tutorDocId: 'tutor_123', parentDocId: 'parent_456' },
        { status: 'negotiating', tutorDocId: 'tutor_123', parentDocId: 'parent_789' },
      ];
      const check = canDeleteAccount(apps, 'tutor_123');
      expect(check.allowed).toBe(true);
    });

    test('Allows deletion if user has no applications', () => {
      const check = canDeleteAccount([], 'user_999');
      expect(check.allowed).toBe(true);
    });

    test('Correctly preserves remaining role for dual-role users (partial role deletion)', () => {
      const dualRole = ['student', 'teacher'];
      const result = resolveRoleDeletion(dualRole, 'teacher');
      expect(result.isFullyDeleted).toBe(false);
      expect(result.remainingRoles).toEqual(['student']);

      const studentResult = resolveRoleDeletion(dualRole, 'student');
      expect(studentResult.isFullyDeleted).toBe(false);
      expect(studentResult.remainingRoles).toEqual(['teacher']);
    });

    test('Executes full profile deletion for single-role users', () => {
      const singleRole = ['student'];
      const result = resolveRoleDeletion(singleRole, 'student');
      expect(result.isFullyDeleted).toBe(true);
      expect(result.remainingRoles).toEqual([]);
    });
  });
});
