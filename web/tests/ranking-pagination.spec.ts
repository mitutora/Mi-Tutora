import { test, expect } from '@playwright/test';
import { rankAndPaginateTutors, rankAndPaginateStudents } from '../src/utils/matching';

test.describe('Phase 1: Server-Side Matchmaking Engine & Pagination Logic', () => {

  const mockStudentContext = {
    category: 'school',
    board: 'CBSE',
    classLevel: 'Class 10',
    subjects: ['Mathematics', 'Science'],
    budget: 5000,
    teacherGenderPreference: 'No Preference',
  };

  // Helper to generate N mock tutors
  function generateMockTutors(count: number) {
    return Array.from({ length: count }, (_, i) => {
      const id = `tutor_${i + 1}`;
      // Make tutor_42 the ultimate champion match (all subjects + board + class + Pro + Aadhar)
      if (i === 41) {
        return {
          id: 'tutor_42_champion',
          name: 'Champion Tutor',
          category: 'school',
          boards: ['CBSE'],
          classes: ['Class 10'],
          subjects: ['Mathematics', 'Science', 'English'],
          feeRange: '5000',
          aadharVerified: true,
          subscriptionPlan: 'pro',
          subscriptionExpiry: Date.now() + 1000000,
        };
      }

      // Other tutors have varying partial matches
      return {
        id,
        name: `Tutor ${i + 1}`,
        category: 'school',
        boards: ['CBSE'],
        classes: ['Class 10'],
        subjects: ['Mathematics'], // only 1 subject -> strict match fails for school requiring 2
        feeRange: `${4000 + (i * 50)}`,
        aadharVerified: false,
        subscriptionPlan: 'free',
      };
    });
  }

  test('Guarantees Rank #1 champion is Card #1 on Page 1 even if originally at index 42', () => {
    const rawTutors = generateMockTutors(60);
    // Add another tutor that passes strict match with fewer points
    rawTutors.push({
      id: 'tutor_pass_low_score',
      name: 'Passing Lower Score Tutor',
      category: 'school',
      boards: ['CBSE'],
      classes: ['Class 10'],
      subjects: ['Mathematics', 'Science'],
      feeRange: '4000',
      aadharVerified: false,
      subscriptionPlan: 'free',
    });

    const result = rankAndPaginateTutors(mockStudentContext, rawTutors, [], {
      tab: 'recommended',
      page: 1,
      limit: 20,
    });

    expect(result.tutors.length).toBeGreaterThan(0);
    // Card #1 must be the champion
    const topTutor = result.tutors[0];
    expect(topTutor.id).toBe('tutor_42_champion');
    expect(topTutor.rank).toBe(1);
    expect(topTutor.suitabilityScore).toBeGreaterThan(150);
  });

  test('Slices exactly 20 items per page with accurate hasMore flag', () => {
    // Generate 45 tutors who all pass strict match
    const candidateTutors = Array.from({ length: 45 }, (_, i) => ({
      id: `tutor_valid_${i + 1}`,
      name: `Valid Tutor ${i + 1}`,
      category: 'school',
      boards: ['CBSE'],
      classes: ['Class 10'],
      subjects: ['Mathematics', 'Science'],
      feeRange: '5000',
    }));

    // Page 1: items 0 to 20
    const page1 = rankAndPaginateTutors(mockStudentContext, candidateTutors, [], {
      tab: 'recommended',
      page: 1,
      limit: 20,
    });

    expect(page1.tutors.length).toBe(20);
    expect(page1.page).toBe(1);
    expect(page1.totalMatches).toBe(45);
    expect(page1.hasMore).toBe(true);
    expect(page1.tutors[0].rank).toBe(1);
    expect(page1.tutors[19].rank).toBe(20);

    // Page 2: items 20 to 40
    const page2 = rankAndPaginateTutors(mockStudentContext, candidateTutors, [], {
      tab: 'recommended',
      page: 2,
      limit: 20,
    });

    expect(page2.tutors.length).toBe(20);
    expect(page2.page).toBe(2);
    expect(page2.totalMatches).toBe(45);
    expect(page2.hasMore).toBe(true);
    expect(page2.tutors[0].rank).toBe(21);
    expect(page2.tutors[19].rank).toBe(40);

    // Page 3: items 40 to 45 (last 5 items)
    const page3 = rankAndPaginateTutors(mockStudentContext, candidateTutors, [], {
      tab: 'recommended',
      page: 3,
      limit: 20,
    });

    expect(page3.tutors.length).toBe(5);
    expect(page3.page).toBe(3);
    expect(page3.hasMore).toBe(false);
    expect(page3.tutors[0].rank).toBe(41);
    expect(page3.tutors[4].rank).toBe(45);
  });

  test('Gives +1000 priority boost to active negotiating conversations', () => {
    const candidateTutors = [
      {
        id: 'tutor_normal',
        name: 'Normal High Score Tutor',
        category: 'school',
        boards: ['CBSE'],
        classes: ['Class 10'],
        subjects: ['Mathematics', 'Science'],
        feeRange: '5000',
      },
      {
        id: 'tutor_negotiating',
        name: 'Negotiating Tutor',
        category: 'school',
        boards: ['CBSE'],
        classes: ['Class 10'],
        subjects: ['Mathematics', 'Science'],
        feeRange: '5000',
      },
    ];

    const mockApplications = [
      {
        tutorDocId: 'tutor_negotiating',
        status: 'negotiating',
      },
    ];

    const result = rankAndPaginateTutors(mockStudentContext, candidateTutors, mockApplications, {
      tab: 'recommended',
      page: 1,
      limit: 20,
    });

    // Negotiating tutor must be #1 due to +1000 conversation priority
    expect(result.tutors[0].id).toBe('tutor_negotiating');
    expect(result.tutors[1].id).toBe('tutor_normal');
  });

  test('Pushes declined or locked applications to the bottom (-1000 penalty)', () => {
    const candidateTutors = [
      {
        id: 'tutor_declined',
        name: 'Declined Tutor',
        category: 'school',
        boards: ['CBSE'],
        classes: ['Class 10'],
        subjects: ['Mathematics', 'Science'],
        feeRange: '5000',
      },
      {
        id: 'tutor_active',
        name: 'Active Available Tutor',
        category: 'school',
        boards: ['CBSE'],
        classes: ['Class 10'],
        subjects: ['Mathematics', 'Science'],
        feeRange: '5000',
      },
    ];

    const mockApplications = [
      {
        tutorDocId: 'tutor_declined',
        status: 'declined',
        declinedAt: Date.now() - 10000,
      },
    ];

    const result = rankAndPaginateTutors(mockStudentContext, candidateTutors, mockApplications, {
      tab: 'recommended',
      page: 1,
      limit: 20,
    });

    expect(result.tutors[0].id).toBe('tutor_active');
    expect(result.tutors[1].id).toBe('tutor_declined');
  });

  test.describe('Teacher Dashboard Student Request Ranking & 20-Item Pagination', () => {
    const mockTeacher = {
      id: 'teacher_123',
      category: 'school',
      boards: ['CBSE'],
      classes: ['Class 10'],
      subjects: ['Mathematics', 'Science'],
      gender: 'Female',
      feeRange: '5000',
    };

    test('Slices exactly 20 student groups per page with accurate hasMore flag', () => {
      const candidateStudents = Array.from({ length: 35 }, (_, i) => ({
        id: `student_req_${i + 1}`,
        category: 'school',
        board: 'CBSE',
        classLevel: 'Class 10',
        subjects: ['Mathematics', 'Science'],
        budget: 5000,
        teacherGenderPreference: 'No Preference',
      }));

      // Page 1: items 0 to 20
      const page1 = rankAndPaginateStudents(mockTeacher, candidateStudents, [], {
        tab: 'recommended',
        page: 1,
        limit: 20,
      });

      expect(page1.students.length).toBe(20);
      expect(page1.totalMatches).toBe(35);
      expect(page1.hasMore).toBe(true);
      expect(page1.students[0].rank).toBe(1);
      expect(page1.students[19].rank).toBe(20);

      // Page 2: items 20 to 35 (15 items)
      const page2 = rankAndPaginateStudents(mockTeacher, candidateStudents, [], {
        tab: 'recommended',
        page: 2,
        limit: 20,
      });

      expect(page2.students.length).toBe(15);
      expect(page2.hasMore).toBe(false);
      expect(page2.students[0].rank).toBe(21);
      expect(page2.students[14].rank).toBe(35);
    });

    test('Server ranking accurately stitches group mode and coordinates onto student records', () => {
      const groupsMap = new Map<string, any>([
        ['grp_offline_1', { id: 'grp_offline_1', mode: 'Offline', area: 'Koramangala', city: 'Bengaluru', latitude: 12.9352, longitude: 77.6245 }],
        ['grp_online_1', { id: 'grp_online_1', mode: 'Online', area: '', city: '', latitude: null, longitude: null }]
      ]);

      const rawStudents = [
        { id: 's_off', name: 'Offline Student', groupDocId: 'grp_offline_1', category: 'school', board: 'CBSE', classLevel: 'Class 10', subjects: ['Mathematics', 'Science'], budget: 5000 },
        { id: 's_on', name: 'Online Student', groupDocId: 'grp_online_1', category: 'school', board: 'CBSE', classLevel: 'Class 10', subjects: ['Mathematics', 'Science'], budget: 5000 },
      ];

      const stitchedStudents = rawStudents.map((sData) => {
        const matchingGroup = groupsMap.get(sData.groupDocId);
        let cleanMode = matchingGroup?.mode || (sData as any).mode || '';
        if (cleanMode === 'Offline (Home Tuition)') cleanMode = 'Offline';

        return {
          ...sData,
          mode: cleanMode,
          area: matchingGroup?.area || '',
          city: matchingGroup?.city || '',
          latitude: matchingGroup?.latitude ?? null,
          longitude: matchingGroup?.longitude ?? null,
        };
      });

      expect(stitchedStudents[0].mode).toBe('Offline');
      expect(stitchedStudents[0].latitude).toBe(12.9352);
      expect(stitchedStudents[1].mode).toBe('Online');
      expect(stitchedStudents[1].latitude).toBeNull();
    });
  });
});
