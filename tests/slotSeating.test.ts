import { describe, it, expect } from 'vitest';
import { generateSeatingPlan } from '../src/core/seating';
import { Hall, Student, TimetableEntry } from '../src/core/types';

describe('Slot-Based Exam Seating Workflow', () => {
  const sampleHalls: Hall[] = [
    { id: 'hall-b206', name: 'B 206', department: 'CS', benchCount: 20, deskCount: 20, chairCount: 0, capacity: 40, isAvailable: true, priorityOrder: 1 },
    { id: 'hall-b207', name: 'B 207', department: 'CS', benchCount: 20, deskCount: 20, chairCount: 0, capacity: 40, isAvailable: true, priorityOrder: 2 },
    { id: 'hall-d101', name: 'D 101', department: 'EC', benchCount: 20, deskCount: 20, chairCount: 0, capacity: 40, isAvailable: true, priorityOrder: 3 },
  ];

  function createStudentsForGroup(group: string, count: number, branch: string, sem: string): Student[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `${group.replace(/\s+/g, '')}-${i + 1}`,
      rollNo: `${i + 1}`,
      name: `Student ${group} ${i + 1}`,
      programme: 'B.Tech',
      branch,
      semester: sem,
      status: 'active',
      groupId: group,
    }));
  }

  it('generates seating specifically for students in groups scheduled for an exam slot', () => {
    // Slot 1: S3 CS A (30 students) and S5 EC (15 students) = 45 students
    const s3CsA = createStudentsForGroup('S3 CS A', 30, 'CS', 'S3');
    const s5Ec = createStudentsForGroup('S5 EC', 15, 'EC', 'S5');

    // Other students NOT in this slot:
    const s5CsB = createStudentsForGroup('S5 CS B', 30, 'CS', 'S5');

    const allStudents = [...s3CsA, ...s5Ec, ...s5CsB];

    // Exam slot timetable only has S3 CS A and S5 EC
    const slotTimetable: TimetableEntry[] = [
      { id: 'tt-1', sessionId: 's1', date: '09/10/2026', sessionSlot: 'FN', timeRange: '10.15 AM', groupId: 'S3 CS A', subjectCode: 'CST 201', subjectName: 'DS' },
      { id: 'tt-2', sessionId: 's1', date: '09/10/2026', sessionSlot: 'FN', timeRange: '10.15 AM', groupId: 'S5 EC', subjectCode: 'ECT 301', subjectName: 'LIC' },
    ];

    const targetGroupIds = slotTimetable.map((t) => t.groupId);
    const slotStudents = allStudents.filter((s) => targetGroupIds.includes(s.groupId));

    // Choose available halls for this slot: B 206 (40) and B 207 (40) = 80 capacity
    const chosenHalls = sampleHalls.filter((h) => ['hall-b206', 'hall-b207'].includes(h.id));

    const result = generateSeatingPlan({
      students: slotStudents,
      halls: chosenHalls,
      maxHallCapacity: 40,
      useAllProvidedHalls: true,
    });

    expect(result.isValid).toBe(true);
    expect(result.summary.totalStudents).toBe(45);
    expect(result.summary.assignedStudents).toBe(45);
    expect(result.hallPlans.length).toBe(2);

    // Verify S5 CS B is NOT seated in this slot
    const allSeatedStudentIds = result.hallPlans.flatMap((hp) => hp.seats.map((s) => s.studentId).filter(Boolean));
    expect(allSeatedStudentIds.some((id) => id?.startsWith('S5CSB'))).toBe(false);

    // Verify only the chosen halls are used
    const usedHallIds = result.hallPlans.map((hp) => hp.hallId);
    expect(usedHallIds).toContain('hall-b206');
    expect(usedHallIds).toContain('hall-b207');
    expect(usedHallIds).not.toContain('hall-d101');
  });

  it('detects deficit when selected halls have insufficient capacity for slot students', () => {
    const s3CsA = createStudentsForGroup('S3 CS A', 35, 'CS', 'S3');
    const s5Ec = createStudentsForGroup('S5 EC', 15, 'EC', 'S5');
    const slotStudents = [...s3CsA, ...s5Ec]; // 50 students

    // Only 1 hall selected: capacity 40
    const chosenHalls = [sampleHalls[0]];

    const result = generateSeatingPlan({
      students: slotStudents,
      halls: chosenHalls,
      maxHallCapacity: 40,
    });

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.code === 'MAX_CAPACITY')).toBe(true);
  });

  it('correctly handles 40 students of a single group requiring 2 halls for KTU non-adjacent seating', () => {
    // 40 students of S3 CS A (same branch & sem)
    const s3CsA = createStudentsForGroup('S3 CS A', 40, 'CS', 'S3');

    // If only 1 hall of capacity 40 is provided, 20 are seated and 20 are unassigned
    const resultSingleHall = generateSeatingPlan({
      students: s3CsA,
      halls: [sampleHalls[0]],
      useAllProvidedHalls: true,
    });
    expect(resultSingleHall.summary.assignedStudents).toBe(20);
    expect(resultSingleHall.unassignedStudents.length).toBe(20);
    expect(resultSingleHall.isValid).toBe(false);

    // When 2 halls are provided (or auto-selected), all 40 students are seated
    const resultTwoHalls = generateSeatingPlan({
      students: s3CsA,
      halls: [sampleHalls[0], sampleHalls[1]],
      useAllProvidedHalls: true,
    });
    expect(resultTwoHalls.isValid).toBe(true);
    expect(resultTwoHalls.summary.assignedStudents).toBe(40);
    expect(resultTwoHalls.unassignedStudents.length).toBe(0);
    expect(resultTwoHalls.hallPlans.length).toBe(2);
    expect(resultTwoHalls.hallPlans[0].totalStudents).toBe(20);
    expect(resultTwoHalls.hallPlans[1].totalStudents).toBe(20);
  });
});

