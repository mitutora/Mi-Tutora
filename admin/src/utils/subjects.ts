/**
 * Standardized Subject Taxonomy for CBSE, ICSE, and State Board across grades.
 */

// Nursery to Class 6 (CBSE & State Board / IB)
export const CBSE_STATE_NURSERY_TO_6 = [
  'All Subject',
  'English',
  'Math',
  'EVS',
  'SST',
  'Computer',
  'Hindi',
  'Urdu',
  'Science',
  'Social Science',
  'Arabic',
  'Gk',
  'Sanskrit',
  'Kannada',
  'Telugu',
  'Marathi',
  'Tamil',
  'Malayalam',
  'Gujarati',
  'Bengali',
  'Punjabi',
] as const;

// Class 7 to 10 (CBSE & State Board / IB)
export const CBSE_STATE_7_TO_10 = [
  'All Subject',
  'English',
  'Math',
  'EVS',
  'SST',
  'Computer',
  'Hindi',
  'Urdu',
  'Science',
  'Social Science',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Civics',
  'Geography',
  'Arabic',
  'Gk',
  'Sanskrit',
  'Kannada',
  'Telugu',
  'Marathi',
  'Tamil',
  'Malayalam',
  'Gujarati',
  'Bengali',
  'Punjabi',
] as const;

// ICSE Nursery to Class 6
export const ICSE_NURSERY_TO_6 = [
  'All Subjects',
  'English',
  'Mathematics',
  'EVS / Environmental Studies',
  'Science',
  'Social Studies / Social Science',
  'Computer',
  'Hindi',
  'Urdu',
  'Arabic',
  'Bengali',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Marathi',
  'Tamil',
  'Telugu',
  'Punjabi',
  'Sanskrit',
  'General Knowledge (GK)',
  'Art & Craft',
  'Moral Science / Value Education',
] as const;

// ICSE Class 7 to 10
export const ICSE_7_TO_10 = [
  'All Subjects',
  'English',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Science',
  'History',
  'Civics',
  'Geography',
  'Social Studies',
  'Computer',
  'Hindi',
  'Urdu',
  'Arabic',
  'Sanskrit',
  'Kannada',
  'Telugu',
  'Marathi',
  'Tamil',
  'Malayalam',
  'Gujarati',
  'Bengali',
  'Punjabi',
  'General Knowledge (GK)',
  'Environmental Science (EVS)',
  'Art & Craft',
  'Moral Science',
] as const;

// 11th & 12th / PU Streams (Common across CBSE, ICSE/ISC, State Board)
export const STREAM_ARTS = [
  'English Core',
  'Hindi Core',
  'History',
  'Political Science',
  'Geography',
  'Economics',
  'Sociology',
  'Psychology',
  'Legal Studies',
  'Fine Arts / Painting',
  'Physical Education',
  'Home Science',
  'Informatics Practices',
  'Entrepreneurship',
  'Mass Media Studies',
] as const;

export const STREAM_SCIENCE = [
  'English Core',
  'Physics',
  'Chemistry',
  'Mathematics',
  'Biology',
  'Computer Science / Informatics Practices',
  'Physical Education / Psychology',
  'Economics',
  'JEE',
  'NEET',
  'KCET',
] as const;

export const STREAM_COMMERCE = [
  'Accountancy',
  'Business Studies',
  'Economics',
  'English Core',
  'Mathematics',
  'Applied Mathematics',
  'Entrepreneurship',
  'Informatics Practices',
  'Computer Science',
  'Physical Education',
  'Psychology',
] as const;

export const SENIOR_SECONDARY_STREAMS = {
  Science: STREAM_SCIENCE,
  Commerce: STREAM_COMMERCE,
  'Arts / Humanities': STREAM_ARTS,
} as const;

export type SeniorStreamKey = keyof typeof SENIOR_SECONDARY_STREAMS;

/**
 * Determine if a grade string represents Senior Secondary (11th, 12th, 1st PU, 2nd PU).
 */
export function isSeniorSecondary(classGrade: string): boolean {
  if (!classGrade) return false;
  const lower = classGrade.toLowerCase().trim();
  if (
    lower.includes('11') ||
    lower.includes('12') ||
    lower.includes('pu') ||
    lower.includes('degree') ||
    lower.includes('engineering') ||
    lower.includes('medical')
  ) {
    return true;
  }
  return false;
}

/**
 * Determine grade tier: 'early' (Nursery–6th), 'middle_high' (7th–10th), or 'senior' (11th–12th/PU).
 */
export function getGradeTier(classGrade: string): 'early' | 'middle_high' | 'senior' {
  if (!classGrade) return 'early';
  const lower = classGrade.toLowerCase().trim();
  if (isSeniorSecondary(lower)) return 'senior';

  if (lower.includes('nursery') || lower.includes('lkg') || lower.includes('ukg')) {
    return 'early';
  }

  const match = lower.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num <= 6) return 'early';
    if (num <= 10) return 'middle_high';
    return 'senior';
  }

  return 'early';
}

/**
 * Get the list of available subjects for a student given their Board, Grade, and optional Stream.
 */
export function getSubjectsForStudent(
  board: string,
  classGrade: string,
  stream?: string
): string[] {
  const tier = getGradeTier(classGrade);

  if (tier === 'senior') {
    if (stream && stream in SENIOR_SECONDARY_STREAMS) {
      return Array.from(SENIOR_SECONDARY_STREAMS[stream as SeniorStreamKey]);
    }
    // Return all senior subjects combined if no stream specified
    const combined = new Set<string>([
      ...STREAM_SCIENCE,
      ...STREAM_COMMERCE,
      ...STREAM_ARTS,
    ]);
    return Array.from(combined);
  }

  const isIcse = board === 'ICSE';
  if (tier === 'early') {
    return isIcse ? [...ICSE_NURSERY_TO_6] : [...CBSE_STATE_NURSERY_TO_6];
  }

  // tier === 'middle_high'
  return isIcse ? [...ICSE_7_TO_10] : [...CBSE_STATE_7_TO_10];
}

/**
 * Get the union of subjects for a teacher based on their selected boards and class tiers.
 */
export function getSubjectsForTeacher(
  boards: string[],
  classes: string[]
): {
  allSubjects: string[];
  earlySubjects: string[];
  middleHighSubjects: string[];
  seniorStreams: {
    science: string[];
    commerce: string[];
    arts: string[];
  };
  hasSenior: boolean;
} {
  const earlySet = new Set<string>();
  const middleHighSet = new Set<string>();

  const hasEarly = classes.some((c) => ['LKG', 'UKG', '1st - 5th'].includes(c));
  const hasMiddleHigh = classes.some((c) => ['6th - 8th', '9th - 10th'].includes(c));
  const hasSenior = classes.some((c) => ['1st PU', '2nd PU'].includes(c));

  const hasIcse = boards.includes('ICSE');
  const hasCbseOrState =
    boards.some((b) => ['CBSE', 'State Board', 'IB / IGCSE'].includes(b)) ||
    boards.length === 0;

  if (hasEarly) {
    if (hasIcse) ICSE_NURSERY_TO_6.forEach((s) => earlySet.add(s));
    if (hasCbseOrState) CBSE_STATE_NURSERY_TO_6.forEach((s) => earlySet.add(s));
  }

  if (hasMiddleHigh) {
    if (hasIcse) ICSE_7_TO_10.forEach((s) => middleHighSet.add(s));
    if (hasCbseOrState) CBSE_STATE_7_TO_10.forEach((s) => middleHighSet.add(s));
  }

  const allSubjects = new Set<string>([
    ...earlySet,
    ...middleHighSet,
  ]);

  if (hasSenior) {
    STREAM_SCIENCE.forEach((s) => allSubjects.add(s));
    STREAM_COMMERCE.forEach((s) => allSubjects.add(s));
    STREAM_ARTS.forEach((s) => allSubjects.add(s));
  }

  return {
    allSubjects: Array.from(allSubjects),
    earlySubjects: Array.from(earlySet),
    middleHighSubjects: Array.from(middleHighSet),
    seniorStreams: {
      science: Array.from(STREAM_SCIENCE),
      commerce: Array.from(STREAM_COMMERCE),
      arts: Array.from(STREAM_ARTS),
    },
    hasSenior,
  };
}
