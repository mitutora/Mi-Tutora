import { test, expect } from '@playwright/test';

test.describe('Review System Architecture (Review_Architecture.md)', () => {

  function validateReviewInput(rating: number, comment: string) {
    if (typeof rating !== 'number' || !Number.isInteger(rating)) {
      return { valid: false, error: 'Rating must be an integer' };
    }
    if (rating < 1 || rating > 5) {
      return { valid: false, error: 'Rating must be between 1 and 5' };
    }
    const trimmedComment = (comment || '').trim();
    return { valid: true, trimmedComment, rating };
  }

  function calculateNewTutorRating(currentAverage: number, currentCount: number, newRating: number) {
    const totalPoints = (currentAverage * currentCount) + newRating;
    const newCount = currentCount + 1;
    const newAverage = Math.round((totalPoints / newCount) * 10) / 10;
    return { newAverage, newCount };
  }

  test.describe('Review Input Validation', () => {
    test('Accepts ratings between 1 and 5', () => {
      expect(validateReviewInput(1, 'Poor').valid).toBe(true);
      expect(validateReviewInput(3, 'Average').valid).toBe(true);
      expect(validateReviewInput(5, 'Excellent').valid).toBe(true);
    });

    test('Rejects ratings out of bounds or non-integers', () => {
      expect(validateReviewInput(0, 'Zero').valid).toBe(false);
      expect(validateReviewInput(6, 'Too high').valid).toBe(false);
      expect(validateReviewInput(4.5, 'Decimal').valid).toBe(false);
    });

    test('Trims whitespace from comments', () => {
      const result = validateReviewInput(5, '   Great teacher!   ');
      expect(result.trimmedComment).toBe('Great teacher!');
    });
  });

  test.describe('Weighted Rating Average Calculation', () => {
    test('Calculates rating for the first review', () => {
      const result = calculateNewTutorRating(0, 0, 5);
      expect(result.newAverage).toBe(5);
      expect(result.newCount).toBe(1);
    });

    test('Updates average when subsequent reviews arrive', () => {
      // Tutor has 1 review of 5.0. New review is 4.
      // (5 + 4) / 2 = 4.5
      let stats = calculateNewTutorRating(5.0, 1, 4);
      expect(stats.newAverage).toBe(4.5);
      expect(stats.newCount).toBe(2);

      // Third review is 5.
      // (4.5 * 2 + 5) / 3 = 14 / 3 = 4.67 -> 4.7
      stats = calculateNewTutorRating(stats.newAverage, stats.newCount, 5);
      expect(stats.newAverage).toBe(4.7);
      expect(stats.newCount).toBe(3);
    });
  });
});
