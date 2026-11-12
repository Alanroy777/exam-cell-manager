import { describe, it, expect } from 'vitest';
import { autoAssignInvigilators, validateInvigilatorAssignment } from '../src/core/invigilator';
import { HallSeatingPlan, Staff } from '../src/core/types';

describe('Invigilator Duty Assignment & Rules', () => {
  const staffList: Staff[] = [
    { id: 'st1', name: 'Rajesh K R', designation: 'Assistant Professor', department: 'CS', tutorOfGroup: 'S3 CS A' },
    { id: 'st2', name: 'Flower Abraham', designation: 'Assistant Professor', department: 'EC', tutorOfGroup: 'S5 EC' },
    { id: 'st3', name: 'Adithya S Reji', designation: 'Lecturer', department: 'Diploma' },
    { id: 'st4', name: 'Aparna A Nair', designation: 'Assistant Professor', department: 'MCA', tutorOfGroup: 'MCA S1' },
    { id: 'st5', name: 'Treesa Maria Sunny', designation: 'Assistant Professor', department: 'CS' },
    { id: 'st6', name: 'Manoj K R', designation: 'HOD', department: 'CS' },
  ];

  const hallPlans: HallSeatingPlan[] = [
    {
      hallId: 'h1',
      hallName: 'B 206',
      capacity: 40,
      totalStudents: 35,
      groupsPresent: ['S3 CS A', 'S5 EC'],
      seats: [],
    },
    {
      hallId: 'h2',
      hallName: 'B 207',
      capacity: 40,
      totalStudents: 30,
      groupsPresent: ['MCA S1', 'BCA S3'],
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
});

