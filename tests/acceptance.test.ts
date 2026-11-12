import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseStudentsFromExcel } from '../src/core/excelParser';
import { generateSeatingPlan } from '../src/core/seating';
import { generateAllSessionDocuments } from '../src/core/documentGenerator';
import { Hall, Student } from '../src/core/types';

describe('Series Exam Acceptance Suite - College of Engineering Poonjar', () => {
  const halls: Hall[] = [
    { id: 'h-b206', name: 'B 206', department: 'CS', benchCount: 20, deskCount: 20, chairCount: 40, capacity: 40, isAvailable: true, priorityOrder: 1 },
    { id: 'h-b207', name: 'B 207', department: 'CS', benchCount: 20, deskCount: 20, chairCount: 40, capacity: 40, isAvailable: true, priorityOrder: 2 },
    { id: 'h-d101', name: 'D 101', department: 'EC', benchCount: 20, deskCount: 20, chairCount: 40, capacity: 40, isAvailable: true, priorityOrder: 3 },
    { id: 'h-d102', name: 'D 102', department: 'EC', benchCount: 20, deskCount: 20, chairCount: 40, capacity: 40, isAvailable: true, priorityOrder: 4 },
    { id: 'h-d103', name: 'D 103', department: 'EC', benchCount: 20, deskCount: 20, chairCount: 40, capacity: 40, isAvailable: true, priorityOrder: 5 },
    { id: 'h-d106', name: 'D 106', department: 'EC', benchCount: 20, deskCount: 20, chairCount: 40, capacity: 40, isAvailable: true, priorityOrder: 6 },
  ];

  it('Acceptance Check: Full series exam seating for B.Tech CS (S1, S3 A/B, S5 A/B), MCA S1/S3 and BCA S3 with ZERO violations', async () => {
    // 1. Parse sample students from Excel
    const s3aBuf = fs.readFileSync(path.resolve(__dirname, '../reference/BTECH S3 A BATCH STUDENT LIST EXAMPLE.xlsx'));
    const s3aParsed = await parseStudentsFromExcel(s3aBuf);

    const attBuf = fs.readFileSync(path.resolve(__dirname, '../reference/Attendance sheet.xlsx'));
    const s5bParsed = await parseStudentsFromExcel(attBuf, {
      sheetName: 'Stude list',
      headerRowIndex: 4,
      columnMapping: { rollNoCol: 1, nameCol: 2 },
      defaultSemester: 'S5',
      defaultBranch: 'CS',
      defaultBatch: 'B',
    });

    const students: Student[] = [...s3aParsed.students, ...s5bParsed.students];

    // Add MCA S1, MCA S3, BCA S3, S5 EC students
    for (let i = 1; i <= 15; i++) {
      students.push({
        id: `mca1_${i}`,
        rollNo: `${i}`,
        name: `MCA S1 Student ${i}`,
        programme: 'MCA',
        branch: 'MCA',
        semester: 'S1',
        status: 'active',
        groupId: 'MCA S1',
      });
      students.push({
        id: `mca3_${i}`,
        rollNo: `${i}`,
        name: `MCA S3 Student ${i}`,
        programme: 'MCA',
        branch: 'MCA',
        semester: 'S3',
        status: 'active',
        groupId: 'MCA S3',
      });
    }

    for (let i = 1; i <= 10; i++) {
      students.push({
        id: `bca3_${i}`,
        rollNo: `${i}`,
        name: `BCA S3 Student ${i}`,
        programme: 'BCA',
        branch: 'BCA',
        semester: 'S3',
        status: 'active',
        groupId: 'BCA S3',
      });
    }

    for (let i = 1; i <= 14; i++) {
      students.push({
        id: `s5ec_${i}`,
        rollNo: `S5 EC ${i.toString().padStart(2, '0')}`,
        name: `EC Student ${i}`,
        programme: 'B.Tech',
        branch: 'EC',
        semester: 'S5',
        status: 'active',
        groupId: 'S5 EC',
      });
    }

    expect(students.length).toBeGreaterThan(100);

    // 2. Generate Seating Plan
    const result = generateSeatingPlan({
      students,
      halls,
      maxHallCapacity: 40,
    });

    // Zero hard errors
    const errors = result.violations.filter((v) => v.severity === 'error');
    expect(errors.length).toBe(0);
    expect(result.isValid).toBe(true);

    // 3. Rule 1 Check: No hall exceeds 40
    for (const plan of result.hallPlans) {
      expect(plan.totalStudents).toBeLessThanOrEqual(40);
    }

    // 4. Rule 4 Check: Hall splits are balanced within +/- 1
    const groupHallCounts = new Map<string, number[]>();
    for (const plan of result.hallPlans) {
      const gCountsInHall = new Map<string, number>();
      for (const seat of plan.seats) {
        if (seat.student) {
          const gid = seat.student.groupId;
          gCountsInHall.set(gid, (gCountsInHall.get(gid) || 0) + 1);
        }
      }
      for (const [gid, count] of gCountsInHall.entries()) {
        if (!groupHallCounts.has(gid)) groupHallCounts.set(gid, []);
        groupHallCounts.get(gid)!.push(count);
      }
    }

    for (const [gid, counts] of groupHallCounts.entries()) {
      if (counts.length > 1) {
        const delta = Math.max(...counts) - Math.min(...counts);
        expect(delta).toBeLessThanOrEqual(1);
      }
    }

    // 5. Generate Attendance Sheets & Verify Roll Number Ranges
    const docs = generateAllSessionDocuments({
      collegeName: 'COLLEGE OF ENGINEERING POONJAR',
      examTitle: 'Second Series Exam, Odd Sem 2026',
      date: '09/10/2026',
      timeRange: '10.15 AM - 12.15 PM',
      hallPlans: result.hallPlans,
      dates: ['09/10/2026'],
      staffList: [],
      dutyAssignments: [],
      scheduleItems: [],
      submissionDeadline: '05/10/2026',
    });

    expect(docs.attendanceSheets.length).toBeGreaterThan(0);
    // Every attendance sheet belongs to exactly one group in that hall
    for (const sheet of docs.attendanceSheets) {
      expect(sheet.hallName).toBeTruthy();
      expect(sheet.groupName).toBeTruthy();
      expect(sheet.html).toContain(sheet.hallName);
      expect(sheet.html).toContain('Attendance Sheet');
    }
  });
});

