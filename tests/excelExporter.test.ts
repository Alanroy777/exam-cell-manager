import { describe, it, expect } from 'vitest';
import { exportStudentsToExcelBuffer, exportSeatingPlanToExcelBuffer } from '../src/core/excelExporter';
import { HallSeatingPlan, Student } from '../src/core/types';

describe('Excel Exporter Module', () => {
  const dummyStudents: Student[] = [
    {
      id: 'st-1',
      rollNo: '1',
      name: 'ABHINAV P',
      programme: 'B.Tech',
      branch: 'CS',
      semester: 'S3',
      batch: 'A',
      status: 'active',
      groupId: 'S3 CS A',
    },
  ];

  const dummyPlan: HallSeatingPlan = {
    hallId: 'h1',
    hallName: 'B 206',
    capacity: 40,
    totalStudents: 1,
    groupsPresent: ['S3 CS A'],
    seats: [
      {
        seatNumber: 1,
        benchNo: 1,
        column: 'A',
        position: 'left',
        studentId: 'st-1',
        student: dummyStudents[0],
      },
    ],
  };

  it('exports students roster to an Excel buffer', async () => {
    const buffer = await exportStudentsToExcelBuffer(dummyStudents);
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('exports seating plan to an Excel buffer with hall sheets', async () => {
    const buffer = await exportSeatingPlanToExcelBuffer([dummyPlan]);
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);
  });
});

