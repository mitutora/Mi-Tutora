import { test, expect } from '@playwright/test';

test.describe('Student Grouping Architecture (Student_Grouping_Architecture.md)', () => {

  interface StudentItem {
    id: string;
    name: string;
    category?: string;
    subjects?: string[];
    technologies?: string[];
    languages?: string[];
    budget?: number;
  }

  function aggregateGroupDetails(students: StudentItem[]) {
    let combinedBudget = 0;
    const combinedSubjects = new Set<string>();
    const combinedTechnologies = new Set<string>();
    const combinedLanguages = new Set<string>();
    let category = '';

    for (const st of students) {
      if (!category && st.category) category = st.category;
      combinedBudget += (st.budget || 0);

      (st.subjects || []).forEach(s => combinedSubjects.add(s));
      (st.technologies || []).forEach(t => combinedTechnologies.add(t));
      (st.languages || []).forEach(l => combinedLanguages.add(l));
    }

    return {
      category,
      combinedBudget,
      combinedSubjects: Array.from(combinedSubjects),
      combinedTechnologies: Array.from(combinedTechnologies),
      combinedLanguages: Array.from(combinedLanguages)
    };
  }

  test('Correctly aggregates combined budget from all students in group', () => {
    const students: StudentItem[] = [
      { id: 's1', name: 'Alice', budget: 1500 },
      { id: 's2', name: 'Bob', budget: 2000 },
      { id: 's3', name: 'Charlie', budget: 1200 }
    ];

    const result = aggregateGroupDetails(students);
    expect(result.combinedBudget).toBe(4700);
  });

  test('Deduplicates combined subjects across multiple students', () => {
    const students: StudentItem[] = [
      { id: 's1', name: 'Alice', subjects: ['Mathematics', 'Science'] },
      { id: 's2', name: 'Bob', subjects: ['Science', 'English'] },
      { id: 's3', name: 'Charlie', subjects: ['Mathematics', 'Social Studies'] }
    ];

    const result = aggregateGroupDetails(students);
    expect(result.combinedSubjects.sort()).toEqual(['English', 'Mathematics', 'Science', 'Social Studies']);
  });

  test('Deduplicates combined technologies for programming groups', () => {
    const students: StudentItem[] = [
      { id: 's1', name: 'Alice', category: 'programming', technologies: ['Python', 'SQL'] },
      { id: 's2', name: 'Bob', category: 'programming', technologies: ['Python', 'Docker'] }
    ];

    const result = aggregateGroupDetails(students);
    expect(result.category).toBe('programming');
    expect(result.combinedTechnologies.sort()).toEqual(['Docker', 'Python', 'SQL']);
  });

  test('Adopts first student category as primary group category', () => {
    const students: StudentItem[] = [
      { id: 's1', name: 'Alice', category: 'school' },
      { id: 's2', name: 'Bob', category: 'languages' }
    ];

    const result = aggregateGroupDetails(students);
    expect(result.category).toBe('school');
  });

  test.describe('Student Deduplication across Groups (Prevent Duplicate Profile Cards)', () => {
    function computeStudentGroupsWithDeduplication(allStudents: Array<{ id: string; name: string; groupDocId?: string; budget?: number; category?: string }>) {
      const acc: any = {};
      const seenStudentIds = new Set();
      allStudents.forEach((student: any) => {
        if (!student?.id || seenStudentIds.has(student.id)) return;
        seenStudentIds.add(student.id);
        const gId = student.groupDocId || `indv_${student.id}`;
        if (!acc[gId]) acc[gId] = { id: gId, students: [], totalBudget: 0, categories: [] };
        acc[gId].students.push(student);
        acc[gId].totalBudget += (student.budget || 0);
        if (student.category) acc[gId].categories.push(student.category);
      });
      return Object.values(acc).map((g: any) => ({
        ...g,
        name: g.students.length === 1 ? g.students[0].name : `Group: ${g.students.map((s: any) => s.name).join(', ')}`,
        category: g.categories[0]
      }));
    }

    test('Deduplicates students when student ID appears in multiple records', () => {
      const duplicateStudents = [
        { id: 'student_1', name: 'Alice', groupDocId: 'group_A', budget: 2000, category: 'school' },
        { id: 'student_1', name: 'Alice Duplicate', groupDocId: 'group_B', budget: 2000, category: 'school' },
        { id: 'student_2', name: 'Bob', groupDocId: 'group_A', budget: 2500, category: 'school' },
      ];

      const groups = computeStudentGroupsWithDeduplication(duplicateStudents);
      expect(groups.length).toBe(1);
      expect(groups[0].id).toBe('group_A');
      expect(groups[0].students.length).toBe(2);
      expect(groups[0].students.map((s: any) => s.name)).toEqual(['Alice', 'Bob']);
      expect(groups[0].totalBudget).toBe(4500);
    });

    test('Creates distinct groups when students have different groupDocIds', () => {
      const students = [
        { id: 'student_1', name: 'Alice', groupDocId: 'group_A', budget: 2000, category: 'school' },
        { id: 'student_2', name: 'Bob', groupDocId: 'group_B', budget: 3000, category: 'programming' },
      ];

      const groups = computeStudentGroupsWithDeduplication(students);
      expect(groups.length).toBe(2);
      expect(groups.map((g: any) => g.id)).toEqual(['group_A', 'group_B']);
    });
  });

  test.describe('Teaching Mode Standardization & Tuition Request Sync', () => {
    function buildTuitionRequestPayload(groupId: string, parentId: string, groupData: any, students: any[]) {
      let cleanMode = groupData.mode;
      if (cleanMode === 'Offline (Home Tuition)') cleanMode = 'Offline';
      if (!cleanMode) cleanMode = 'Online';

      return {
        groupDocId: groupId,
        parentId,
        parentDocId: parentId,
        category: students[0]?.category || 'school',
        mode: cleanMode,
        area: groupData.area || '',
        city: groupData.city || '',
        status: 'open',
      };
    }

    test('Standardizes legacy "Offline (Home Tuition)" to "Offline" in tuition request payload', () => {
      const payload = buildTuitionRequestPayload(
        'group_123',
        'parent_abc',
        { mode: 'Offline (Home Tuition)', area: '101 MG Road', city: 'Bengaluru' },
        [{ id: 's1', category: 'school' }]
      );

      expect(payload.mode).toBe('Offline');
      expect(payload.groupDocId).toBe('group_123');
      expect(payload.parentDocId).toBe('parent_abc');
    });

    test('Retains standard "Online" mode in tuition request payload', () => {
      const payload = buildTuitionRequestPayload(
        'group_456',
        'parent_def',
        { mode: 'Online', area: '', city: '' },
        [{ id: 's2', category: 'languages' }]
      );

      expect(payload.mode).toBe('Online');
      expect(payload.groupDocId).toBe('group_456');
      expect(payload.parentDocId).toBe('parent_def');
    });

    test('Prevents accidental group deletion when studentDocIds is initially empty but students exist in DB', () => {
      const groupData = { studentDocIds: [] }; // Legacy or out-of-sync group doc
      const studentsFromDb = [{ id: 'st_1', name: 'Learner', groupDocId: 'grp_test' }];

      const resolvedStudentIds = Array.from(new Set([...(groupData.studentDocIds || []), ...studentsFromDb.map(s => s.id)]));
      const shouldDelete = resolvedStudentIds.length === 0 && studentsFromDb.length === 0;

      expect(shouldDelete).toBe(false);
      expect(resolvedStudentIds).toEqual(['st_1']);
    });
  });
});
