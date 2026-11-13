import { describe, it, expect } from 'vitest';
import { generateAllSessionDocuments } from '../src/core/documentGenerator';
import { HallSeatingPlan, Student } from '../src/core/types';

describe('Document Generation Module', () => {
  const dummyStudents: Student[] = [
    {
      id: 's1',
      rollNo: '1',
      name: 'ADARSH S',
      programme: 'B.Tech',
      branch: 'EC',
      semester: 'S5',
      status: 'active',
      groupId: 'S5 EC',
    },
    {
      id: 's2',
      rollNo: '2',
      name: 'ANAKHA SHAJIMON',
      programme: 'B.Tech',
      branch: 'EC',
      semester: 'S5',
      status: 'active',
      groupId: 'S5 EC',
    },
  ];

  const dummyHallPlan: HallSeatingPlan = {
    hallId: 'h-102',
    hallName: 'D 102',
    capacity: 40,
    totalStudents: 2,
    groupsPresent: ['S5 EC'],
    seats: [
      {
        seatNumber: 1,
        benchNo: 1,
        column: 'A',
        position: 'left',
        studentId: 's1',
        student: dummyStudents[0],
      },
      {
        seatNumber: 2,
        benchNo: 2,
        column: 'A',
        position: 'left',
        studentId: 's2',
        student: dummyStudents[1],
      },
    ],
  };

  it('generates all 5 official print documents', () => {
    const docs = generateAllSessionDocuments({
      collegeName: 'COLLEGE OF ENGINEERING POONJAR',
      examTitle: 'BTECH (S3,S5), MCA S3, BCA S3 SECOND INTERNAL EXAM OCTOBER 2026',
      date: '09/10/2026',
      timeRange: '10.15 AM - 12.15 PM',
      hallPlans: [dummyHallPlan],
      dates: ['09/10/2026', '12/10/2026'],
      staffList: [{ id: 'st1', name: 'Rajesh K R', designation: 'Assistant Professor', department: 'CS' }],
      dutyAssignments: [{ id: 'd1', sessionId: 'sess1', date: '09/10/2026', sessionSlot: 'FN', hallId: 'h-102', hallName: 'D 102', staffId: 'st1', staffName: 'Rajesh K R', staffDepartment: 'CS' }],
      scheduleItems: [{ programmeDept: 'B.Tech - S3 / S5', firstSeriesDeadline: '19-08-2026', secondSeriesDeadline: '16-10-2026' }],
      submissionDeadline: '05-10-2026',
    });

    expect(docs.hallAllocationNotice).toContain('COLLEGE OF ENGINEERING POONJAR');
    expect(docs.hallAllocationNotice).toContain('D 102');
    expect(docs.hallAllocationNotice).toContain('S5 EC');

    expect(docs.seatingSheets.length).toBe(1);
    expect(docs.seatingSheets[0].html).toContain('D 102');
    expect(docs.seatingSheets[0].html).toContain('S5 EC');

    expect(docs.consolidatedSeatingSheet).toContain('D 102');
    expect(docs.consolidatedSeatingSheet).toContain('SEATING ARRANGEMENT');

    expect(docs.attendanceSheets.length).toBe(1);
    expect(docs.attendanceSheets[0].html).toContain('Attendance Sheet');
    expect(docs.attendanceSheets[0].html).toContain('ADARSH S');
    expect(docs.attendanceSheets[0].html).toContain('ANAKHA SHAJIMON');
    expect(docs.attendanceSheets[0].html).toContain('S5 EC 01');
    expect(docs.attendanceSheets[0].html).toContain('Semester : &nbsp; V');
    expect(docs.attendanceSheets[0].html).toContain('Electronics and Communication Engineering');
    expect(docs.attendanceSheets[0].html).toContain('attendance-page-box');

    expect(docs.dutyListNotice).toContain('INVIGILATION DUTY LIST');
    expect(docs.dutyListNotice).toContain('Rajesh K R');

    expect(docs.timetableNotice).toContain('EXAMINATION CELL - CIRCULAR');
  });
});
