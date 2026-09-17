/**
 * Utility functions for 12-hour AM/PM and 24-hour time conversions.
 * Ensures the UI can present friendly 12-hour AM/PM formats while the
 * database and backend continue to store standard 24-hour "HH:mm" strings.
 */

export interface Parsed12HourTime {
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
}

/**
 * Formats a 24-hour time string (e.g. "20:34" or "09:05") to 12-hour AM/PM format (e.g. "08:34 PM" or "09:05 AM").
 * Gracefully handles legacy strings with metadata separated by "||" or missing seconds.
 */
export function formatTimeTo12Hour(timeStr?: string | null): string {
  if (!timeStr) return '';

  const cleanTime = timeStr.split('||')[0].trim();
  if (!cleanTime) return '';

  const parts = cleanTime.split(':');
  if (parts.length < 2) return cleanTime;

  const rawHour = parseInt(parts[0], 10);
  const rawMinute = parseInt(parts[1], 10);

  if (isNaN(rawHour) || isNaN(rawMinute)) return cleanTime;

  const period: 'AM' | 'PM' = rawHour >= 12 ? 'PM' : 'AM';
  const hour12 = rawHour % 12 === 0 ? 12 : rawHour % 12;

  const formattedHour = String(hour12).padStart(2, '0');
  const formattedMinute = String(rawMinute).padStart(2, '0');

  return `${formattedHour}:${formattedMinute} ${period}`;
}

/**
 * Parses a 24-hour time string (e.g. "20:34") into 12-hour components: hour (01-12), minute (00-59), and period (AM/PM).
 * Defaults to 05:00 PM if input is empty or invalid.
 */
export function parse24To12Hour(timeStr?: string | null): Parsed12HourTime {
  if (!timeStr) {
    return { hour: '05', minute: '00', period: 'PM' };
  }

  const cleanTime = timeStr.split('||')[0].trim();
  const parts = cleanTime.split(':');

  if (parts.length >= 2) {
    const rawHour = parseInt(parts[0], 10);
    const rawMinute = parseInt(parts[1], 10);

    if (!isNaN(rawHour) && !isNaN(rawMinute)) {
      const period: 'AM' | 'PM' = rawHour >= 12 ? 'PM' : 'AM';
      const hour12 = rawHour % 12 === 0 ? 12 : rawHour % 12;
      return {
        hour: String(hour12).padStart(2, '0'),
        minute: String(rawMinute).padStart(2, '0'),
        period,
      };
    }
  }

  return { hour: '05', minute: '00', period: 'PM' };
}

/**
 * Converts 12-hour time components (e.g. hour: "08", minute: "34", period: "PM")
 * back into standard 24-hour "HH:mm" format (e.g. "20:34") for backend/database storage.
 */
export function to24HourTime(hour: string, minute: string, period: 'AM' | 'PM'): string {
  const hNum = parseInt(hour, 10);
  const mNum = parseInt(minute, 10);

  const safeMinute = isNaN(mNum) ? '00' : String(Math.min(59, Math.max(0, mNum))).padStart(2, '0');

  if (isNaN(hNum) || hNum < 1 || hNum > 12) {
    return `17:${safeMinute}`; // Default fallback to 5 PM
  }

  let h24 = hNum;
  if (period === 'AM') {
    h24 = hNum === 12 ? 0 : hNum;
  } else {
    h24 = hNum === 12 ? 12 : hNum + 12;
  }

  return `${String(h24).padStart(2, '0')}:${safeMinute}`;
}
