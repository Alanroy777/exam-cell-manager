import { describe, it, expect } from 'vitest';
import { generateSeatingPlan, distributeEvenly } from '../src/core/seating';
import { areStudentsInConflict, validateSeatingPlan } from '../src/core/validator';
import { Hall, Student } from '../src/core/types';

describe('Seating Algorithm & Rules', () => {
  const sampleHalls: Hall[] = [
    { id: 'h1', name: 'B 206', department: 'CS', benchCount: 20, deskCount: 20, chairCount: 40, capacity: 40, isAvailable: true },
    { id: 'h2', name: 'B 207', department: 'CS', benchCount: 20, deskCount: 20, chairCount: 40, capacity: 40, isAvailable: true },
    { id: 'h3', name: 'D 101', department: 'EC', benchCount: 20, deskCount: 20, chairCount: 40, capacity: 40, isAvailable: true },
    { id: 'h4', name: 'D 102', department: 'EC', benchCount: 20, deskCount: 20, chairCount: 40, capacity: 40, isAvailable: true },
  ];

  function createStudent(id: string, roll: number, branch: string, sem: string, batch?: string, status: 'active' | 'dropped' = 'active'): Student {
    const groupId = `${sem} ${branch}${batch ? ' ' + batch : ''}`;
    return {
      id,
      rollNo: `${roll}`,
      name: `Student ${id}`,
      programme: branch === 'MCA' ? 'MCA' : branch === 'BCA' ? 'BCA' : 'B.Tech',
      branch,
      semester: sem,
      batch,
      status,
      groupId,
    };
  }

  it('distributeEvenly divides items with max delta <= 1', () => {
    const items20 = Array.from({ length: 20 }, (_, i) => i);
    const chunks2 = distributeEvenly(items20, 2);
    expect(chunks2[0].length).toBe(10);
    expect(chunks2[1].length).toBe(10);

    const items35 = Array.from({ length: 35 }, (_, i) => i);
    const chunks3 = distributeEvenly(items35, 3);
    expect(chunks3[0].length).toBe(12);
    expect(chunks3[1].length).toBe(12);
    expect(chunks3[2].length).toBe(11);
  });

  it('Rule 2 & 3: Conflict detection between same branch + sem batches vs different sem/branch', () => {
    const s1CsA = createStudent('s1', 1, 'CS', 'S1', 'A');
    const s1CsB = createStudent('s2', 2, 'CS', 'S1', 'B');
    const s3CsA = createStudent('s3', 3, 'CS', 'S3', 'A');
    const s1Mca = createStudent('s4', 4, 'MCA', 'S1');

    // Same branch + same sem, different batch -> CONFLICT
    expect(areStudentsInConflict(s1CsA, s1CsB).conflict).toBe(true);

    // Same branch, different sem -> ALLOWED
    expect(areStudentsInConflict(s1CsA, s3CsA).conflict).toBe(false);

    // Different branch -> ALLOWED
    expect(areStudentsInConflict(s1CsA, s1Mca).conflict).toBe(false);
  });

  it('Rule 1 & 4: Max 40 capacity and balanced distribution across halls', () => {
    // 35 students of S5 CS B and 35 students of S3 CS A = 70 students total
    // Needs ceil(70/40) = 2 halls
    const students: Student[] = [];
    for (let i = 1; i <= 35; i++) {
      students.push(createStudent(`s5b_${i}`, i, 'CS', 'S5', 'B'));
      students.push(createStudent(`s3a_${i}`, i, 'CS', 'S3', 'A'));
    }

    const result = generateSeatingPlan({
      students,
      halls: sampleHalls,
      maxHallCapacity: 40,
    });

    if (!result.isValid) {
      console.log('VIOLATIONS:', result.violations);
      console.log('UNASSIGNED:', result.unassignedStudents.length);
      console.log('HALLS:', result.hallPlans.map(p => ({ name: p.hallName, total: p.totalStudents, groups: p.groupsPresent })));
    }

    expect(result.isValid).toBe(true);
    expect(result.hallPlans.length).toBe(2);

    for (const plan of result.hallPlans) {
      expect(plan.totalStudents).toBeLessThanOrEqual(40);
    }

    // Both halls should have 35 students (or 35 and 35)
    expect(result.hallPlans[0].totalStudents).toBe(35);
    expect(result.hallPlans[1].totalStudents).toBe(35);

    // Zero error violations
    const errors = result.violations.filter((v) => v.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('Excludes dropped out students from seating', () => {
    const students: Student[] = [
      createStudent('s1', 1, 'CS', 'S5', 'A', 'active'),
      createStudent('s2', 2, 'CS', 'S5', 'A', 'dropped'),
      createStudent('s3', 3, 'CS', 'S3', 'A', 'active'),
    ];

    const result = generateSeatingPlan({
      students,
      halls: sampleHalls,
    });

    expect(result.summary.totalStudents).toBe(2);
    expect(result.summary.assignedStudents).toBe(2);
    const allSeatedIds = result.hallPlans.flatMap((p) =>
      p.seats.filter((s) => s.studentId).map((s) => s.studentId)
    );
    expect(allSeatedIds).toContain('s1');
    expect(allSeatedIds).toContain('s3');
    expect(allSeatedIds).not.toContain('s2');
  });

  it('Complex multi-department series exam: B.Tech CS, MCA, BCA, EC', () => {
    // Current series exam scenario:
    // S5 CS A: 25 students
    // S5 CS B: 25 students
    // S3 CS A: 20 students
    // MCA S1: 15 students
    // BCA S3: 10 students
    // S5 EC: 12 students
    // Total = 107 students. Ceil(107 / 40) = 3 halls.
    const students: Student[] = [];
    for (let i = 1; i <= 25; i++) students.push(createStudent(`s5csa_${i}`, i, 'CS', 'S5', 'A'));
    for (let i = 1; i <= 25; i++) students.push(createStudent(`s5csb_${i}`, i, 'CS', 'S5', 'B'));
    for (let i = 1; i <= 20; i++) students.push(createStudent(`s3csa_${i}`, i, 'CS', 'S3', 'A'));
    for (let i = 1; i <= 15; i++) students.push(createStudent(`mcas1_${i}`, i, 'MCA', 'S1'));
    for (let i = 1; i <= 10; i++) students.push(createStudent(`bcas3_${i}`, i, 'BCA', 'S3'));
    for (let i = 1; i <= 12; i++) students.push(createStudent(`s5ec_${i}`, i, 'EC', 'S5'));

    const result = generateSeatingPlan({
      students,
      halls: sampleHalls,
      maxHallCapacity: 40,
    });

    if (!result.isValid) {
      console.log('VIOLATIONS:', result.violations);
      console.log('UNASSIGNED:', result.unassignedStudents.length);
      console.log('HALLS:', result.hallPlans.map(p => ({ name: p.hallName, total: p.totalStudents, groups: p.groupsPresent })));
    }

    expect(result.isValid).toBe(true);
    expect(result.violations.filter((v) => v.severity === 'error').length).toBe(0);

    for (const plan of result.hallPlans) {
      expect(plan.totalStudents).toBeLessThanOrEqual(40);
    }
  });

  it('Supports halls with varying bench counts and writing pad chairs (attached book placers)', () => {
    const customHalls: Hall[] = [
      // Hall 1: 15 benches (30 capacity)
      { id: 'ch1', name: 'D 101', department: 'EC', furnitureType: 'bench_desk', benchCount: 15, deskCount: 15, chairCount: 30, capacity: 30, isAvailable: true },
      // Hall 2: 30 Writing pad chairs with book placers (30 capacity)
      { id: 'ch2', name: 'B 206', department: 'CS', furnitureType: 'writing_pad_chair', benchCount: 0, deskCount: 0, chairCount: 30, capacity: 30, isAvailable: true },
      // Hall 3: Standard 20 benches (40 capacity)
      { id: 'ch3', name: 'B 207', department: 'CS', furnitureType: 'bench_desk', benchCount: 20, deskCount: 20, chairCount: 40, capacity: 40, isAvailable: true },
    ];

    // 25 students of S5 CS A + 25 students of S3 CS A = 50 students
    const students: Student[] = [];
    for (let i = 1; i <= 25; i++) students.push(createStudent(`s5_${i}`, i, 'CS', 'S5', 'A'));
    for (let i = 1; i <= 25; i++) students.push(createStudent(`s3_${i}`, i, 'CS', 'S3', 'A'));

    const result = generateSeatingPlan({
      students,
      halls: customHalls,
    });

    expect(result.isValid).toBe(true);
    expect(result.summary.assignedStudents).toBe(50);
    expect(result.unassignedStudents.length).toBe(0);

    // Verify hall 1 does not exceed its custom 30 capacity
    const h1Plan = result.hallPlans.find((p) => p.hallId === 'ch1');
    if (h1Plan) {
      expect(h1Plan.totalStudents).toBeLessThanOrEqual(30);
    }

    // Verify hall 2 (writing pad chairs) does not exceed 30 capacity
    const h2Plan = result.hallPlans.find((p) => p.hallId === 'ch2');
    if (h2Plan) {
      expect(h2Plan.totalStudents).toBeLessThanOrEqual(30);
    }

    // Zero rule violations
    const errors = result.violations.filter((v) => v.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('Supports mixed furniture halls (2 columns, 5 rows with 8 benches + 2 textpad chairs in last row)', () => {
    // User scenario:
    // Hall has 2 columns (A, B) and 5 rows:
    // Rows 1-4: 8 2-seater benches (16 seats)
    // Row 5: 2 textpad chairs (2 seats, 1 in Col A, 1 in Col B)
    // Total capacity = 18 students.
    const mixedHall: Hall = {
      id: 'mixed-1',
      name: 'D 205',
      department: 'EC',
      furnitureType: 'mixed',
      columnCount: 2,
      rowCount: 5,
      benchCount: 8,
      textpadChairCount: 2,
      deskCount: 8,
      chairCount: 18,
      capacity: 18,
      isAvailable: true,
    };

    // 9 students of S5 CS A + 9 students of S3 CS A = 18 students
    const students: Student[] = [];
    for (let i = 1; i <= 9; i++) students.push(createStudent(`s5_${i}`, i, 'CS', 'S5', 'A'));
    for (let i = 1; i <= 9; i++) students.push(createStudent(`s3_${i}`, i, 'CS', 'S3', 'A'));

    const result = generateSeatingPlan({
      students,
      halls: [mixedHall],
    });

    expect(result.isValid).toBe(true);
    expect(result.summary.assignedStudents).toBe(18);
    expect(result.unassignedStudents.length).toBe(0);

    const plan = result.hallPlans[0];
    expect(plan.totalStudents).toBe(18);
    expect(plan.columnCount).toBe(2);

    // Verify row 5 contains textpad chairs with non-conflicting students
    const row5Seats = plan.seats.filter((s) => s.benchNo === 5);
    expect(row5Seats.length).toBe(2);
    expect(row5Seats.every((s) => s.seatType === 'writing_pad')).toBe(true);

    const colASeat = row5Seats.find((s) => s.column === 'A');
    const colBSeat = row5Seats.find((s) => s.column === 'B');
    expect(colASeat?.student?.groupId).toBe('S5 CS A');
    expect(colBSeat?.student?.groupId).toBe('S3 CS A');

    // Zero errors
    const errors = result.violations.filter((v) => v.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('Short Bench Scenario: If 1 bench is short (19 benches), 2 chairs added for desk, capacity remains 40', () => {
    // 19 benches in a 4-column 5-row room. 1 bench is short, so 2 chairs are added to that desk.
    // Total chairs = 40, Capacity = 40.
    const shortBenchHall: Hall = {
      id: 'h-short-1',
      name: 'B 206',
      department: 'CS',
      furnitureType: 'bench_desk',
      columnCount: 4,
      rowCount: 5,
      benchCount: 19,
      deskCount: 20,
      chairCount: 40,
      capacity: 40,
      isAvailable: true,
    };

    // 20 students of S5 CS B + 20 students of S3 CS A = 40 students
    const students: Student[] = [];
    for (let i = 1; i <= 20; i++) students.push(createStudent(`s5b_${i}`, i, 'CS', 'S5', 'B'));
    for (let i = 1; i <= 20; i++) students.push(createStudent(`s3a_${i}`, i, 'CS', 'S3', 'A'));

    const result = generateSeatingPlan({
      students,
      halls: [shortBenchHall],
    });

    expect(result.isValid).toBe(true);
    expect(result.summary.assignedStudents).toBe(40);
    expect(result.unassignedStudents.length).toBe(0);

    const plan = result.hallPlans[0];
    expect(plan.totalStudents).toBe(40);
    expect(plan.seats.length).toBe(40);

    // Verify 20th slot (Row 5 Col D) has seatType 'desk_chair'
    const slotD5Seats = plan.seats.filter((s) => s.column === 'D' && s.benchNo === 5);
    expect(slotD5Seats.length).toBe(2);
    expect(slotD5Seats.every((s) => s.seatType === 'desk_chair')).toBe(true);

    // Left seat has S5 CS B student, Right seat has S3 CS A student
    const leftD5 = slotD5Seats.find((s) => s.position === 'left');
    const rightD5 = slotD5Seats.find((s) => s.position === 'right');
    expect(leftD5?.student?.groupId).toBe('S5 CS B');
    expect(rightD5?.student?.groupId).toBe('S3 CS A');

    // Zero violations
    const errors = result.violations.filter((v) => v.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('Supports 3-seater benches in a hall (all large benches, 3 students per bench)', () => {
    // 10 benches in a 2-column, 5-row room. All 10 benches are 3-seaters.
    // Capacity = 10 * 3 = 30 students.
    const threeSeaterHall: Hall = {
      id: 'h-3seater-all',
      name: 'Hall 301',
      department: 'CS',
      furnitureType: 'bench_desk',
      columnCount: 2,
      rowCount: 5,
      benchCount: 10,
      deskCount: 10,
      chairCount: 0,
      capacity: 30,
      studentsPerBench: 3,
      isAvailable: true,
    };

    // 3 distinct groups of 10 students = 30 students total
    const students: Student[] = [];
    for (let i = 1; i <= 10; i++) students.push(createStudent(`s5cs_${i}`, i, 'CS', 'S5'));
    for (let i = 1; i <= 10; i++) students.push(createStudent(`s3ec_${i}`, i, 'EC', 'S3'));
    for (let i = 1; i <= 10; i++) students.push(createStudent(`s1mca_${i}`, i, 'MCA', 'S1'));

    const result = generateSeatingPlan({
      students,
      halls: [threeSeaterHall],
    });

    expect(result.isValid).toBe(true);
    expect(result.summary.assignedStudents).toBe(30);
    expect(result.unassignedStudents.length).toBe(0);

    const plan = result.hallPlans[0];
    expect(plan.totalStudents).toBe(30);
    expect(plan.seats.length).toBe(30);

    // Verify each bench (e.g., Row 1 Col A) has left, middle, and right assigned
    const b1Seats = plan.seats.filter((s) => s.column === 'A' && s.benchNo === 1);
    expect(b1Seats.length).toBe(3);
    const left = b1Seats.find((s) => s.position === 'left')?.student;
    const middle = b1Seats.find((s) => s.position === 'middle')?.student;
    const right = b1Seats.find((s) => s.position === 'right')?.student;

    expect(left).toBeDefined();
    expect(middle).toBeDefined();
    expect(right).toBeDefined();

    // Verify no two students on the same bench have the same branch + semester
    expect(left?.branch !== middle?.branch || left?.semester !== middle?.semester).toBe(true);
    expect(middle?.branch !== right?.branch || middle?.semester !== right?.semester).toBe(true);
    expect(left?.branch !== right?.branch || left?.semester !== right?.semester).toBe(true);

    // Verify zero error violations
    const errors = result.violations.filter((v) => v.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('Supports partial 3-seater benches (e.g. 4 large 3-seaters, 6 standard 2-seaters)', () => {
    // 10 benches: 4 are 3-seaters, 6 are 2-seaters.
    // Capacity = (6 * 2) + (4 * 3) = 12 + 12 = 24 seats (10 Left, 4 Middle, 10 Right).
    const partialHall: Hall = {
      id: 'h-partial-3seater',
      name: 'Hall 302',
      department: 'CS',
      furnitureType: 'bench_desk',
      columnCount: 2,
      rowCount: 5,
      benchCount: 10,
      deskCount: 10,
      chairCount: 0,
      capacity: 24,
      studentsPerBench: 2,
      threeSeaterBenchCount: 4,
      isAvailable: true,
    };

    // 3 groups: 10 S5 CS (for left), 10 S3 EC (for right), 4 S1 MCA (for 4 middle seats) = 24 students
    const students: Student[] = [];
    for (let i = 1; i <= 10; i++) students.push(createStudent(`s5cs_${i}`, i, 'CS', 'S5'));
    for (let i = 1; i <= 10; i++) students.push(createStudent(`s3ec_${i}`, i, 'EC', 'S3'));
    for (let i = 1; i <= 4; i++) students.push(createStudent(`s1mca_${i}`, i, 'MCA', 'S1'));

    const result = generateSeatingPlan({
      students,
      halls: [partialHall],
    });

    expect(result.isValid).toBe(true);
    expect(result.summary.assignedStudents).toBe(24);
    expect(result.unassignedStudents.length).toBe(0);

    const plan = result.hallPlans[0];
    expect(plan.totalStudents).toBe(24);
    expect(plan.seats.length).toBe(24);

    // Verify exactly 4 seats have position === 'middle' and are filled with MCA students
    const middleSeats = plan.seats.filter((s) => s.position === 'middle');
    expect(middleSeats.length).toBe(4);
    expect(middleSeats.every((s) => s.student !== null)).toBe(true);
    expect(middleSeats.every((s) => s.student?.branch === 'MCA')).toBe(true);

    // Verify zero error violations
    const errors = result.violations.filter((v) => v.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('Supports mixed layout with 3-seater benches (benches + textpad chairs)', () => {
    // 2 columns, 5 rows: rows 1-4 are 8 benches (all 3-seaters = 24 seats)
    // row 5 contains 2 textpad chairs (1 left in Col A, 1 right in Col B)
    // Total capacity = 24 + 2 = 26 seats (9 Left, 8 Middle, 9 Right).
    const mixed3SeaterHall: Hall = {
      id: 'h-mixed-3seater',
      name: 'B 206 Mixed 3-Seater',
      department: 'CS',
      furnitureType: 'mixed',
      columnCount: 2,
      rowCount: 5,
      benchCount: 8,
      deskCount: 8,
      chairCount: 0,
      textpadChairCount: 2,
      studentsPerBench: 3,
      capacity: 26,
      isAvailable: true,
    };

    // 3 groups: 9 S5 CS (Left), 9 S3 EC (Right), 8 S1 MCA (Middle) = 26 students
    const students: Student[] = [];
    for (let i = 1; i <= 9; i++) students.push(createStudent(`s5cs_${i}`, i, 'CS', 'S5'));
    for (let i = 1; i <= 9; i++) students.push(createStudent(`s3ec_${i}`, i, 'EC', 'S3'));
    for (let i = 1; i <= 8; i++) students.push(createStudent(`s1mca_${i}`, i, 'MCA', 'S1'));

    const result = generateSeatingPlan({
      students,
      halls: [mixed3SeaterHall],
    });

    expect(result.isValid).toBe(true);
    expect(result.summary.assignedStudents).toBe(26);
    expect(result.unassignedStudents.length).toBe(0);

    const plan = result.hallPlans[0];
    expect(plan.totalStudents).toBe(26);
    expect(plan.seats.length).toBe(26);

    // Verify row 5 contains the 2 writing pad chairs
    const row5Seats = plan.seats.filter((s) => s.benchNo === 5);
    expect(row5Seats.length).toBe(2);
    expect(row5Seats.every((s) => s.seatType === 'writing_pad')).toBe(true);

    // Verify benches in rows 1-4 have 3 seats per bench (Left, Middle, Right)
    const b1Seats = plan.seats.filter((s) => s.benchNo === 1 && s.column === 'A');
    expect(b1Seats.length).toBe(3);
    expect(b1Seats.find((s) => s.position === 'left')).toBeDefined();
    expect(b1Seats.find((s) => s.position === 'middle')).toBeDefined();
    expect(b1Seats.find((s) => s.position === 'right')).toBeDefined();

    // Verify zero error violations
    const errors = result.violations.filter((v) => v.severity === 'error');
    expect(errors.length).toBe(0);
  });
});
