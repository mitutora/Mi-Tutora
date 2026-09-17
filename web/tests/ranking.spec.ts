import { test, expect } from '@playwright/test';
import { calculateSuitabilityScore, isStrictMatch, calculateDistanceKm, matchesSubjectToken } from '../src/utils/matching';
import { getSubjectsForStudent, getSubjectsForTeacher } from '../src/utils/subjects';

test.describe('Matchmaking & Ranking Algorithm (Ranking_System_Architecture.md)', () => {

  test.describe('Strict Filter (isStrictMatch)', () => {
    test('Returns false if Category does not match', () => {
      const student = { category: 'school' };
      const teacher = { category: 'programming' };
      expect(isStrictMatch(student, teacher)).toBe(false);
    });

    test('Returns false if Board does not match for school category', () => {
      const student = { category: 'school', board: 'CBSE' };
      const teacher = { category: 'school', boards: ['ICSE', 'State Board'] };
      expect(isStrictMatch(student, teacher)).toBe(false);
    });

    test('Returns false if Class does not match', () => {
      const student = { category: 'school', board: 'CBSE', classLevel: 'Class 10' };
      const teacher = { category: 'school', boards: ['CBSE'], classes: ['Class 12', 'Class 11'] };
      expect(isStrictMatch(student, teacher)).toBe(false);
    });

    test('Returns false if Gender Preference does not match', () => {
      const student = { category: 'school', board: 'CBSE', classLevel: 'Class 10', teacherGenderPreference: 'Female' };
      const teacher = { category: 'school', boards: ['CBSE'], classes: ['Class 10'], gender: 'Male' };
      expect(isStrictMatch(student, teacher)).toBe(false);
    });

    test('Returns false if teacher does not offer 100% of requested subjects', () => {
      const student = { category: 'school', board: 'CBSE', classLevel: 'Class 10', subjects: ['Mathematics', 'Science'] };
      const teacher = { category: 'school', boards: ['CBSE'], classes: ['Class 10'], subjects: ['Mathematics', 'English'] };
      expect(isStrictMatch(student, teacher)).toBe(false);
    });

    test('Returns true if all strict criteria are met', () => {
      const student = { category: 'school', board: 'CBSE', classLevel: 'Class 10', subjects: ['Mathematics', 'Science'] };
      const teacher = { category: 'school', boards: ['CBSE'], classes: ['Class 10'], subjects: ['Mathematics', 'Science', 'English'] };
      expect(isStrictMatch(student, teacher)).toBe(true);
    });

    test('Returns false if Teacher is Online and Student is Offline', () => {
      const student = { category: 'school', board: 'CBSE', classLevel: 'Class 10', subjects: ['Mathematics', 'Science'], mode: 'Offline' };
      const teacher = { category: 'school', boards: ['CBSE'], classes: ['Class 10'], subjects: ['Mathematics', 'Science'], mode: 'Online' };
      expect(isStrictMatch(student, teacher)).toBe(false);
    });

    test('Returns false if Teacher is Offline and Student is Online', () => {
      const student = { category: 'school', board: 'CBSE', classLevel: 'Class 10', subjects: ['Mathematics', 'Science'], mode: 'Online' };
      const teacher = { category: 'school', boards: ['CBSE'], classes: ['Class 10'], subjects: ['Mathematics', 'Science'], mode: 'Offline' };
      expect(isStrictMatch(student, teacher)).toBe(false);
    });

    test('Returns true if both Teacher and Student are Online', () => {
      const student = { category: 'school', board: 'CBSE', classLevel: 'Class 10', subjects: ['Mathematics', 'Science'], mode: 'Online' };
      const teacher = { category: 'school', boards: ['CBSE'], classes: ['Class 10'], subjects: ['Mathematics', 'Science'], mode: 'Online' };
      expect(isStrictMatch(student, teacher)).toBe(true);
    });

    test('Returns true if both Teacher and Student are Offline (Standardized)', () => {
      const student = { category: 'school', board: 'CBSE', classLevel: 'Class 10', subjects: ['Mathematics', 'Science'], mode: 'Offline' };
      const teacher = { category: 'school', boards: ['CBSE'], classes: ['Class 10'], subjects: ['Mathematics', 'Science'], mode: 'Offline' };
      expect(isStrictMatch(student, teacher)).toBe(true);
    });

    test('Returns true if both Teacher and Student are Offline (Legacy string backwards-compatibility)', () => {
      const student = { category: 'school', board: 'CBSE', classLevel: 'Class 10', subjects: ['Mathematics', 'Science'], mode: 'Offline (Home Tuition)' };
      const teacher = { category: 'school', boards: ['CBSE'], classes: ['Class 10'], subjects: ['Mathematics', 'Science'], mode: 'Offline' };
      expect(isStrictMatch(student, teacher)).toBe(true);
    });

    test('Returns false if Teacher is Offline for programming student (forced online category)', () => {
      const student = { category: 'programming', technologies: ['Python'] };
      const teacher = { category: 'programming', technologies: ['Python'], mode: 'Offline' };
      expect(isStrictMatch(student, teacher)).toBe(false);
    });
  });

  test.describe('Haversine Distance (calculateDistanceKm)', () => {
    test('Returns Infinity if any coordinate is 0 or invalid', () => {
      expect(calculateDistanceKm(0, 0, 12.9716, 77.5946)).toBe(Infinity);
      expect(calculateDistanceKm(12.9716, 77.5946, 0, 0)).toBe(Infinity);
      expect(calculateDistanceKm(NaN, 77.5946, 12.9716, 77.5946)).toBe(Infinity);
    });

    test('Accurately computes distance between coordinates', () => {
      // Bangalore Center (12.9716, 77.5946) to Indiranagar (12.9784, 77.6408) is approx ~5.1 km
      const distance = calculateDistanceKm(12.9716, 77.5946, 12.9784, 77.6408);
      expect(distance).toBeGreaterThan(4.5);
      expect(distance).toBeLessThan(5.5);
    });
  });

  test.describe('Suitability Score Calculation', () => {
    test('Awards +50 points per matching subject', () => {
      const student = { category: 'school', subjects: ['Mathematics', 'Science', 'English'] };
      const teacher = { category: 'school', subjects: ['Mathematics', 'Physics', 'English'] };
      // Matches: Math (+50), English (+50) = 100 points
      const score = calculateSuitabilityScore(student, teacher);
      expect(score).toBe(100);
    });

    test('Awards +30 points for Class match', () => {
      const student = { category: 'school', classLevel: 'Class 10' };
      const teacher = { category: 'school', classes: ['Class 10', 'Class 12'] };
      const score = calculateSuitabilityScore(student, teacher);
      expect(score).toBe(30);
    });

    test('Awards +20 points for Board match', () => {
      const student = { category: 'school', board: 'CBSE' };
      const teacher = { category: 'school', boards: ['CBSE', 'ICSE'] };
      const score = calculateSuitabilityScore(student, teacher);
      expect(score).toBe(20);
    });

    test('Awards up to +30 points for perfect budget match', () => {
      const student = { category: 'school', budget: 1000 };
      const teacher = { category: 'school', feeRange: 1000 };
      const score = calculateSuitabilityScore(student, teacher);
      expect(score).toBe(30);
    });

    test('Awards partial points for close budget match', () => {
      const student = { category: 'school', budget: 800 };
      const teacher = { category: 'school', feeRange: 1000 };
      // diff = 200, diffRatio = 200/1000 = 0.2. 30 - (0.2*30) = 24
      const score = calculateSuitabilityScore(student, teacher);
      expect(score).toBe(24);
    });

    test('Awards 0 budget points if gap is huge', () => {
      const student = { category: 'school', budget: 1000 };
      const teacher = { category: 'school', feeRange: 100 };
      // diff = 900, diffRatio = 900/100 = 9. 30 - 270 < 0 -> 0
      const score = calculateSuitabilityScore(student, teacher);
      expect(score).toBe(0);
    });

    test('Awards +20 points for Aadhar Verification badge', () => {
      const student = { category: 'school' };
      const teacher = { category: 'school', aadharVerified: true };
      const score = calculateSuitabilityScore(student, teacher);
      expect(score).toBe(20);
    });

    test('Awards +20 points for Pro Subscription badge', () => {
      const student = { category: 'school' };
      const teacherPro = { 
        category: 'school', 
        subscriptionPlan: 'pro',
        subscriptionExpiry: Date.now() + 86400000 // Valid future expiry
      };
      const teacherSubscribed = { 
        category: 'school', 
        isSubscribed: true,
        subscriptionExpiry: Date.now() + 86400000 // Valid future expiry
      };
      
      expect(calculateSuitabilityScore(student, teacherPro)).toBe(20);
      expect(calculateSuitabilityScore(student, teacherSubscribed)).toBe(20);
    });

    test('Awards offline proximity points correctly', () => {
      // Base student in Koramangala
      const baseStudent = {
        category: 'school',
        mode: 'offline',
        latitude: 12.9352,
        longitude: 77.6245
      };

      // Teacher 1: ~1.5km away (<= 3km -> +30 points)
      const closeTeacher = {
        category: 'school',
        mode: 'offline',
        latitude: 12.9380,
        longitude: 77.6320
      };
      expect(calculateSuitabilityScore(baseStudent, closeTeacher)).toBe(30);

      // Teacher 2: ~5.1km away (> 3km && <= 6km -> +20 points)
      const midTeacher = {
        category: 'school',
        mode: 'offline',
        latitude: 12.9716,
        longitude: 77.5946
      };
      expect(calculateSuitabilityScore(baseStudent, midTeacher)).toBe(20);

      // Teacher 3: ~8.5km away (> 6km && <= 10km -> +10 points)
      const farTeacher = {
        category: 'school',
        mode: 'offline',
        latitude: 13.0068,
        longitude: 77.6006
      };
      expect(calculateSuitabilityScore(baseStudent, farTeacher)).toBe(10);

      // Teacher 4: ~25km away (> 10km -> +0 points)
      const veryFarTeacher = {
        category: 'school',
        mode: 'offline',
        latitude: 13.1986,
        longitude: 77.7066
      };
      expect(calculateSuitabilityScore(baseStudent, veryFarTeacher)).toBe(0);
    });

    test('Does not award proximity points for online mode', () => {
      const studentOnline = {
        category: 'school',
        mode: 'online',
        latitude: 12.9352,
        longitude: 77.6245
      };
      const closeTeacher = {
        category: 'school',
        mode: 'offline',
        latitude: 12.9380,
        longitude: 77.6320
      };
      expect(calculateSuitabilityScore(studentOnline, closeTeacher)).toBe(0);
    });

    test('Does not crash or award points when coordinates are missing or 0', () => {
      const student = { category: 'school', mode: 'offline', latitude: 0, longitude: 0 };
      const teacher = { category: 'school', mode: 'offline' };
      expect(calculateSuitabilityScore(student, teacher)).toBe(0);
    });

    test('Calculates scores for Programming category', () => {
      const student = { category: 'programming', technologies: ['Python', 'React'] };
      const teacher = { category: 'programming', technologies: ['Python', 'Node.js', 'React'] };
      // 2 matches: Python (+50), React (+50) = 100
      expect(calculateSuitabilityScore(student, teacher)).toBe(100);
    });

    test('Calculates scores for Languages category', () => {
      const student = { category: 'languages', languages: ['French', 'Spanish'] };
      const teacher = { category: 'languages', languagesTaught: ['French', 'German'] };
      // 1 match: French (+50) = 50
      expect(calculateSuitabilityScore(student, teacher)).toBe(50);
    });

    test('Combined perfect match awards maximum score including Aadhar and Pro boosts', () => {
      const student = { 
        category: 'school',
        subjects: ['Mathematics', 'Science'], 
        classLevel: 'Class 10', 
        board: 'CBSE',
        budget: 1000
      };
      const teacher = { 
        category: 'school',
        subjects: ['Mathematics', 'Science'], 
        classes: ['Class 10'], 
        boards: ['CBSE'],
        feeRange: 1000,
        aadharVerified: true,
        subscriptionPlan: 'pro',
        subscriptionExpiry: Date.now() + 86400000
      };
      // 100 (2 Subjects) + 30 (Class) + 20 (Board) + 30 (Budget) + 20 (Aadhar) + 20 (Pro) = 220 points
      const score = calculateSuitabilityScore(student, teacher);
      expect(score).toBe(220);
    });

    test('Prevents false positive matches for short tokens (e.g. C does not match CSS or React)', () => {
      const student = { category: 'programming', technologies: ['C'] };
      const teacher = { category: 'programming', technologies: ['CSS', 'React', 'JavaScript'] };
      expect(isStrictMatch(student, teacher)).toBe(false);
      expect(calculateSuitabilityScore(student, teacher)).toBe(0);
    });

    test('Prevents false positive match for Science vs Social Science', () => {
      const student = { category: 'school', board: 'CBSE', classLevel: 'Class 10', subjects: ['Science'] };
      const teacher = { category: 'school', boards: ['CBSE'], classes: ['Class 10'], subjects: ['Social Science'] };
      expect(isStrictMatch(student, teacher)).toBe(false);
      expect(calculateSuitabilityScore(student, teacher)).toBe(50); // Class (30) + Board (20) = 50, but 0 subject points
    });
  });

  test.describe('Standardized Subject Taxonomy & Matchmaking Tolerances', () => {
    test('Matches compound slash-separated subjects in both directions', () => {
      expect(matchesSubjectToken('Computer Science', 'Computer Science / Informatics Practices')).toBe(true);
      expect(matchesSubjectToken('Informatics Practices', 'Computer Science / Informatics Practices')).toBe(true);
      expect(matchesSubjectToken('Computer Science / Informatics Practices', 'Computer Science')).toBe(true);
      expect(matchesSubjectToken('Physical Education', 'Physical Education / Psychology')).toBe(true);
      expect(matchesSubjectToken('Psychology', 'Physical Education / Psychology')).toBe(true);
    });

    test('Matches All Subject / All Subjects wildcard when offered by teacher', () => {
      expect(matchesSubjectToken('English', 'All Subject')).toBe(true);
      expect(matchesSubjectToken('Math', 'All Subject')).toBe(true);
      expect(matchesSubjectToken('Science', 'All Subjects')).toBe(true);
      expect(matchesSubjectToken('Hindi', 'All Subjects')).toBe(true);
    });

    test('Matches standard academic aliases without false positives', () => {
      expect(matchesSubjectToken('Math', 'Mathematics')).toBe(true);
      expect(matchesSubjectToken('Mathematics', 'Math')).toBe(true);
      expect(matchesSubjectToken('SST', 'Social Science')).toBe(true);
      expect(matchesSubjectToken('SST', 'Social Studies')).toBe(true);
      expect(matchesSubjectToken('EVS', 'Environmental Studies')).toBe(true);
      expect(matchesSubjectToken('GK', 'General Knowledge (GK)')).toBe(true);
      expect(matchesSubjectToken('English Core', 'English')).toBe(true);
      expect(matchesSubjectToken('Hindi Core', 'Hindi')).toBe(true);

      // Verify no false positive between Science and Social Science
      expect(matchesSubjectToken('Science', 'Social Science')).toBe(false);
      expect(matchesSubjectToken('Science', 'Social Studies')).toBe(false);
    });

    test('Resolves student subject sets accurately by Board, Class, and Stream', () => {
      // Early CBSE / State (Nursery to 6th) -> 21 subjects
      const cbseEarly = getSubjectsForStudent('CBSE', '4th Standard');
      expect(cbseEarly.length).toBe(21);
      expect(cbseEarly).toContain('All Subject');
      expect(cbseEarly).toContain('Math');
      expect(cbseEarly).not.toContain('Physics');

      // Early ICSE -> 22 subjects
      const icseEarly = getSubjectsForStudent('ICSE', '4th Standard');
      expect(icseEarly.length).toBe(22);
      expect(icseEarly).toContain('All Subjects');
      expect(icseEarly).toContain('Mathematics');
      expect(icseEarly).toContain('Moral Science / Value Education');

      // Middle/High CBSE (7th to 10th) -> 27 subjects
      const cbseHigh = getSubjectsForStudent('CBSE', '9th Standard');
      expect(cbseHigh.length).toBe(27);
      expect(cbseHigh).toContain('Physics');
      expect(cbseHigh).toContain('Chemistry');
      expect(cbseHigh).toContain('Biology');

      // 11th Science Stream
      const scienceStream = getSubjectsForStudent('CBSE', '11th Standard', 'Science');
      expect(scienceStream).toContain('Physics');
      expect(scienceStream).toContain('Computer Science / Informatics Practices');
      expect(scienceStream).toContain('JEE');

      // 12th Commerce Stream
      const commerceStream = getSubjectsForStudent('CBSE', '12th Standard', 'Commerce');
      expect(commerceStream).toContain('Accountancy');
      expect(commerceStream).toContain('Business Studies');
      expect(commerceStream).toContain('Applied Mathematics');

      // 11th Arts Stream
      const artsStream = getSubjectsForStudent('CBSE', '11th Standard', 'Arts / Humanities');
      expect(artsStream).toContain('History');
      expect(artsStream).toContain('Political Science');
      expect(artsStream).toContain('Sociology');
      expect(artsStream).toContain('Legal Studies');
    });

    test('Resolves teacher subject union based on selected boards and classes', () => {
      const teacherRes = getSubjectsForTeacher(['CBSE'], ['1st - 5th', '1st PU']);
      expect(teacherRes.hasSenior).toBe(true);
      expect(teacherRes.allSubjects).toContain('All Subject');
      expect(teacherRes.allSubjects).toContain('Physics');
      expect(teacherRes.allSubjects).toContain('Accountancy');
      expect(teacherRes.allSubjects).toContain('History');
    });
  });
});

