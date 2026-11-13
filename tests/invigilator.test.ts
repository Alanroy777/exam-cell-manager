import { describe, it, expect } from 'vitest';
import {
  autoAssignInvigilators,
  validateInvigilatorAssignment,
  getHallProgrammes,
  getStaffProgrammes,
} from '../src/core/invigilator';
import { HallSeatingPlan, Staff } from '../src/core/types';

describe('Invigilator Duty Assignment & Rules', () => {
  const staffList: Staff[] = [
    { id: 'st1', name: 'Rajesh K R', designation: 'Assistant Professor', department: 'CS', tutorOfGroup: 'S3 CS A', programmes: ['B.Tech'] },
    { id: 'st2', name: 'Flower Abraham', designation: 'Assistant Professor', department: 'EC', tutorOfGroup: 'S5 EC', programmes: ['B.Tech'] },
    { id: 'st3', name: 'Adithya S Reji', designation: 'Lecturer', department: 'Diploma', programmes: ['Diploma'] },
    { id: 'st4', name: 'Aparna A Nair', designation: 'Assistant Professor', department: 'MCA', tutorOfGroup: 'MCA S1', programmes: ['MCA'] },
    { id: 'st5', name: 'Treesa Maria Sunny', designation: 'Assistant Professor', department: 'CS', programmes: ['B.Tech'] },
    { id: 'st6', name: 'Manoj K R', designation: 'HOD', department: 'CS', programmes: ['B.Tech'] },
    { id: 'st7', name: 'Martin James', designation: 'Assistant Professor', department: 'Diploma', programmes: ['B.Tech', 'Diploma'] },
  ];

  const hallPlans: HallSeatingPlan[] = [
    {
      hallId: 'h1',
      hallName: 'B 206',
      capacity: 40,
      totalStudents: 35,
      groupsPresent: ['S3 CS A', 'S5 EC'], // B.Tech
      seats: [],
    },
    {
      hallId: 'h2',
      hallName: 'B 207',
      capacity: 40,
      totalStudents: 30,
      groupsPresent: ['MCA S1', 'BCA S3'], // MCA & BCA
      seats: [],
    },
    {
      hallId: 'h3',
      hallName: 'D 101',
      capacity: 40,
      totalStudents: 30,
      groupsPresent: ['Diploma S1', 'Diploma S3'], // Diploma
      seats: [],
    },
  ];

  it('Excludes class tutors from halls containing their students', () => {
    // Rajesh K R is tutor of S3 CS A. S3 CS A is in B 206.
    // Rajesh cannot be assigned to B 206.
    const result = autoAssignInvigilators({
      sessionId: 'sess1',
      dates: ['09/10/2026'],
      slots: ['FN'],
      hallPlans,
      staffList,
    });

    const b206Duty = result.assignments.find((a) => a.hallId === 'h1');
    expect(b206Duty).toBeDefined();
    // Neither Rajesh (tutor of S3 CS A) nor Flower (tutor of S5 EC) can be in B 206
    expect(b206Duty?.staffId).not.toBe('st1');
    expect(b206Duty?.staffId).not.toBe('st2');
  });

  it('No staff member can be double-booked in the same slot', () => {
    const result = autoAssignInvigilators({
      sessionId: 'sess1',
      dates: ['09/10/2026'],
      slots: ['FN'],
      hallPlans,
      staffList,
    });

    const staffInSlot = result.assignments.map((a) => a.staffId);
    const uniqueStaff = new Set(staffInSlot);
    expect(staffInSlot.length).toBe(uniqueStaff.size);
  });

  it('Validates tutor conflict correctly when manual override is attempted', () => {
    const conflict = validateInvigilatorAssignment(
      {
        id: 'test-1',
        sessionId: 'sess1',
        date: '09/10/2026',
        sessionSlot: 'FN',
        hallId: 'h1',
        hallName: 'B 206',
        staffId: 'st1',
        staffName: 'Rajesh K R',
        staffDepartment: 'CS',
      },
      hallPlans[0], // B 206 has S3 CS A
      staffList[0], // Rajesh K R is tutor of S3 CS A
      []
    );

    expect(conflict.length).toBe(1);
    expect(conflict[0].reason).toBe('TUTOR_OF_HALL_STUDENT');
  });

  it('Validates double-booking conflict correctly when manual allocation overlaps', () => {
    const existingDuties = [
      {
        id: 'duty-existing-1',
        sessionId: 'sess1',
        date: '09/10/2026',
        sessionSlot: 'FN' as const,
        hallId: 'h1',
        hallName: 'B 206',
        staffId: 'st5', // Treesa Maria Sunny
        staffName: 'Treesa Maria Sunny',
        staffDepartment: 'CS',
      },
    ];

    const conflicts = validateInvigilatorAssignment(
      {
        id: 'duty-new-2',
        sessionId: 'sess1',
        date: '09/10/2026',
        sessionSlot: 'FN' as const,
        hallId: 'h2',
        hallName: 'B 207',
        staffId: 'st5', // Treesa Maria Sunny
        staffName: 'Treesa Maria Sunny',
        staffDepartment: 'CS',
      },
      hallPlans[1],
      staffList[4],
      existingDuties
    );

    expect(conflicts.length).toBe(1);
    expect(conflicts[0].reason).toBe('DOUBLE_BOOKED');
  });

  it('Assigns Diploma teachers to Diploma exam halls', () => {
    // D 101 has Diploma students. Staff Adithya S Reji is pure Diploma.
    const result = autoAssignInvigilators({
      sessionId: 'sess1',
      dates: ['09/10/2026'],
      slots: ['FN'],
      hallPlans: [hallPlans[2]], // Only D 101 (Diploma)
      staffList,
    });

    const d101Duty = result.assignments.find((a) => a.hallId === 'h3');
    expect(d101Duty).toBeDefined();
    // Must be assigned a staff member with Diploma in their programmes (st3 or st7)
    expect(['st3', 'st7']).toContain(d101Duty?.staffId);
  });

  it('Assigns MCA teachers to MCA/BCA exam halls', () => {
    // B 207 has MCA S1 and BCA S3. Aparna A Nair is MCA tutor for MCA S1, but if non-tutor MCA staff exists:
    const staffWithMca: Staff[] = [
      ...staffList,
      { id: 'st8', name: 'Gincy Jose', designation: 'Assistant Professor', department: 'MCA', programmes: ['MCA', 'BCA'] },
    ];

    const result = autoAssignInvigilators({
      sessionId: 'sess1',
      dates: ['09/10/2026'],
      slots: ['FN'],
      hallPlans: [hallPlans[1]], // B 207 (MCA/BCA)
      staffList: staffWithMca,
    });

    const b207Duty = result.assignments.find((a) => a.hallId === 'h2');
    expect(b207Duty).toBeDefined();
    // Aparna is tutor of MCA S1, so st8 (Gincy Jose) who teaches MCA/BCA should be assigned
    expect(b207Duty?.staffId).toBe('st8');
  });
});
