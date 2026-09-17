import { test, expect } from '@playwright/test';

test.describe('Link Validation & Demo Time Lock Architecture (Link_Validation_Demo_Architecture.md)', () => {

  function validateMeetingLink(url: string, platform: 'gmeet' | 'zoom' | 'teams'): boolean {
    if (!url) return false;
    if (platform === 'gmeet') {
      return /^https:\/\/meet\.google\.com\/[a-z0-9-]+$/.test(url);
    }
    if (platform === 'zoom') {
      return /^https:\/\/(?:[\w-]+\.)?zoom\.us\/(?:j|my)\/\d+(?:\?pwd=[\w.-]+)?$/.test(url);
    }
    if (platform === 'teams') {
      return /^https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[\w%.-]+\/[\w.-]+\?context=[\w%.-]+$/.test(url);
    }
    return false;
  }

  function checkLinkUnlockTime(demoDate: string, demoTime: string, nowMs: number) {
    const demoDateTimeStr = `${demoDate}T${demoTime}:00`;
    const demoDateObj = new Date(demoDateTimeStr);
    const allowedEntryTime = new Date(demoDateObj.getTime() - 5 * 60 * 1000).getTime();

    return {
      isUnlocked: nowMs >= allowedEntryTime,
      unlockTimeMs: allowedEntryTime
    };
  }

  test.describe('Platform URL Format Validation', () => {
    test('Validates Google Meet links', () => {
      expect(validateMeetingLink('https://meet.google.com/abc-defg-hij', 'gmeet')).toBe(true);
      expect(validateMeetingLink('https://meet.google.com/123-456-789', 'gmeet')).toBe(true);
      // Malicious or invalid
      expect(validateMeetingLink('https://evil-site.com/meet.google.com', 'gmeet')).toBe(false);
      expect(validateMeetingLink('http://meet.google.com/abc-defg-hij', 'gmeet')).toBe(false); // HTTP not allowed
      expect(validateMeetingLink('meet.google.com/abc-defg-hij', 'gmeet')).toBe(false);
    });

    test('Validates Zoom links', () => {
      expect(validateMeetingLink('https://zoom.us/j/1234567890', 'zoom')).toBe(true);
      expect(validateMeetingLink('https://us04web.zoom.us/j/1234567890?pwd=secretpassword', 'zoom')).toBe(true);
      expect(validateMeetingLink('https://zoom.us/my/1234567890', 'zoom')).toBe(true);
      // Invalid
      expect(validateMeetingLink('https://zoom.fake.com/j/123', 'zoom')).toBe(false);
    });

    test('Validates Microsoft Teams links', () => {
      const validTeamsUrl = 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_abcdef%40thread.v2/0?context=%7b%22Tid%22%3a%22xyz%22%7d';
      expect(validateMeetingLink(validTeamsUrl, 'teams')).toBe(true);
      expect(validateMeetingLink('https://teams.microsoft.evil.com/join', 'teams')).toBe(false);
    });
  });

  test.describe('5-Minute Entry Time Lock', () => {
    test('Blocks student entry 10 minutes before the scheduled time', () => {
      const demoDate = '2026-09-03';
      const demoTime = '17:00';
      
      // Attempt to access at 16:50 (10 mins before)
      const testTime = new Date('2026-09-03T16:50:00').getTime();
      const status = checkLinkUnlockTime(demoDate, demoTime, testTime);

      expect(status.isUnlocked).toBe(false);
    });

    test('Unlocks student entry exactly 5 minutes before scheduled demo time', () => {
      const demoDate = '2026-09-03';
      const demoTime = '17:00';
      
      // Access at 16:55 (5 mins before)
      const testTime = new Date('2026-09-03T16:55:00').getTime();
      const status = checkLinkUnlockTime(demoDate, demoTime, testTime);

      expect(status.isUnlocked).toBe(true);
    });

    test('Remains unlocked during the class', () => {
      const demoDate = '2026-09-03';
      const demoTime = '17:00';
      
      // Access at 17:15 (during class)
      const testTime = new Date('2026-09-03T17:15:00').getTime();
      const status = checkLinkUnlockTime(demoDate, demoTime, testTime);

      expect(status.isUnlocked).toBe(true);
    });
  });
});
