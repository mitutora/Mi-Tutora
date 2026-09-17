import { test, expect } from '@playwright/test';
import { generateCustomId } from '../src/utils/idGenerator';

test.describe('Custom Document ID Architecture (Document_ID.md)', () => {

  test('Generates IDs with the exact requested prefix', () => {
    const applicationId = generateCustomId('MTA');
    const studentId = generateCustomId('MTS');
    const parentId = generateCustomId('MTP');
    const tutorId = generateCustomId('MTT');
    const groupId = generateCustomId('MTG');
    const requestId = generateCustomId('REQ');

    expect(applicationId.startsWith('MTA')).toBe(true);
    expect(studentId.startsWith('MTS')).toBe(true);
    expect(parentId.startsWith('MTP')).toBe(true);
    expect(tutorId.startsWith('MTT')).toBe(true);
    expect(groupId.startsWith('MTG')).toBe(true);
    expect(requestId.startsWith('REQ')).toBe(true);
  });

  test('Generates IDs with exactly prefix length + 6 characters', () => {
    const id = generateCustomId('MTA');
    expect(id.length).toBe(9); // 3 (prefix) + 6 (random chars)
  });

  test('Contains only uppercase alphanumeric characters', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateCustomId('MTA');
      const randomSuffix = id.slice(3);
      expect(/^[A-Z0-9]{6}$/.test(randomSuffix)).toBe(true);
    }
  });

  test('Guarantees high entropy and zero collisions over 1,000 iterations', () => {
    const set = new Set<string>();
    const total = 1000;

    for (let i = 0; i < total; i++) {
      const id = generateCustomId('MTA');
      set.add(id);
    }

    expect(set.size).toBe(total); // All 1,000 IDs are completely unique
  });
});
