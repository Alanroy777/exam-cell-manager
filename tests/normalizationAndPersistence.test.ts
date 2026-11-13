import { describe, it, expect } from 'vitest';
import { normalizeGroupId } from '../src/core/validator';
import { toNoticeCourseName, generateHallAllocationNoticeHtml } from '../src/templates/hallAllocationNotice';
import { formatInstitutionalExamTitle } from '../src/core/documentGenerator';
import { HallSeatingPlan } from '../src/core/types';

describe('Group ID Normalization & Consistency Engine', () => {
  it('normalizes BCA variants to canonical BCA S3', () => {
    expect(normalizeGroupId('S3 BCA')).toBe('BCA S3');
    expect(normalizeGroupId('BCA S3')).toBe('BCA S3');
    expect(normalizeGroupId('BCA-S3')).toBe('BCA S3');
    expect(normalizeGroupId('s3_bca')).toBe('BCA S3');
  });

  it('normalizes MCA variants to canonical MCA S1 / MCA S3', () => {
    expect(normalizeGroupId('S1 MCA')).toBe('MCA S1');
    expect(normalizeGroupId('MCA S1')).toBe('MCA S1');
    expect(normalizeGroupId('S3 MCA')).toBe('MCA S3');
    expect(normalizeGroupId('MCA S3')).toBe('MCA S3');
  });

  it('normalizes B.Tech S7 variants to canonical S7 CS', () => {
    expect(normalizeGroupId('S7')).toBe('S7 CS');
    expect(normalizeGroupId('S7 CS')).toBe('S7 CS');
    expect(normalizeGroupId('S7 CSE')).toBe('S7 CS');
    expect(normalizeGroupId('B.Tech S7')).toBe('S7 CS');
    expect(normalizeGroupId('BTECH S7 CSE')).toBe('S7 CS');
  });

  it('normalizes B.Tech CS batches to canonical format', () => {
    expect(normalizeGroupId('S3 CS A')).toBe('S3 CS A');
    expect(normalizeGroupId('S3 CSE A')).toBe('S3 CS A');
    expect(normalizeGroupId('S3 A')).toBe('S3 CS A');
    expect(normalizeGroupId('S5 CS B')).toBe('S5 CS B');
    expect(normalizeGroupId('S5 B')).toBe('S5 CS B');
  });

  it('normalizes B.Tech EC variants to canonical S5 EC / S3 EC', () => {
    expect(normalizeGroupId('S5 EC')).toBe('S5 EC');
    expect(normalizeGroupId('S5 ECE')).toBe('S5 EC');
    expect(normalizeGroupId('S3 EC')).toBe('S3 EC');
    expect(normalizeGroupId('S5EC')).toBe('S5 EC');
  });

  it('normalizes Diploma variants to canonical Diploma S1 / S3 / S5', () => {
    expect(normalizeGroupId('Diploma S1')).toBe('Diploma S1');
    expect(normalizeGroupId('S1 Diploma')).toBe('Diploma S1');
    expect(normalizeGroupId('DIP S3')).toBe('Diploma S3');
    expect(normalizeGroupId('S5 DIP')).toBe('Diploma S5');
  });

  it('formats notice course names cleanly matching reference photos', () => {
    expect(toNoticeCourseName('S3 CS A')).toBe('S3 A');
    expect(toNoticeCourseName('S5 CS B')).toBe('S5 B');
    expect(toNoticeCourseName('S7 CS')).toBe('S7');
    expect(toNoticeCourseName('BCA S3')).toBe('BCA S3');
    expect(toNoticeCourseName('S5 EC')).toBe('S5 EC');
  });

  it('formats institutional exam titles dynamically based on active groups', () => {
    const title = formatInstitutionalExamTitle(
      ['S3 CS A', 'S5 CS B', 'S7 CS', 'BCA S3', 'MCA S1'],
      'SECOND INTERNAL EXAM',
      '10/11/2026'
    );
    expect(title).toContain('BTECH (S3,S5,S7)');
    expect(title).toContain('BCA S3');
    expect(title).toContain('MCA S1');
    expect(title).toContain('NOVEMBER 2026');
  });

  it('hall allocation notice never produces roll number 0 for S7 or imported groups', () => {
    const mockPlan: HallSeatingPlan = {
      hallId: 'hall-d102',
      hallName: 'D 102',
      capacity: 40,
      columnCount: 4,
      totalStudents: 3,
      groupsPresent: ['S7 CS'],
      seats: [
        {
          seatNumber: 1,
          benchNo: 1,
          column: 'A',
          position: 'left',
          studentId: 's7-1',
          student: {
            id: 's7-1',
            rollNo: 'S7-01',
            registerNo: 'PJR23CS001',
            name: 'ALAN ROY',
            programme: 'B.Tech',
            branch: 'CS',
            semester: 'S7',
            status: 'active',
            groupId: 'S7 CS',
          },
        },
        {
          seatNumber: 2,
          benchNo: 1,
          column: 'A',
          position: 'right',
          studentId: 's7-2',
          student: {
            id: 's7-2',
            rollNo: '2',
            registerNo: 'PJR23CS002',
            name: 'BASIL SHAJI',
            programme: 'B.Tech',
            branch: 'CS',
            semester: 'S7',
            status: 'active',
            groupId: 'S7 CS',
          },
        },
        {
          seatNumber: 3,
          benchNo: 2,
          column: 'A',
          position: 'left',
          studentId: 's7-3',
          student: {
            id: 's7-3',
            rollNo: '', // Missing roll number, only has register number
            registerNo: 'PJR23CS015',
            name: 'CHRIS THOMAS',
            programme: 'B.Tech',
            branch: 'CS',
            semester: 'S7',
            status: 'active',
            groupId: 'S7 CS',
          },
        },
      ],
    };

    const html = generateHallAllocationNoticeHtml({
      examTitle: 'BTECH (S3,S5,S7) SECOND INTERNAL EXAM NOVEMBER 2026',
      date: '10/11/2026',
      timeRange: '10.15 AM - 12.15 PM',
      hallPlans: [mockPlan],
    });

    expect(html).toContain('D 102');
    expect(html).toContain('S7');
    // Ensure roll number range does not output lone '0'
    expect(html).not.toMatch(/>\s*0\s*</);
    expect(html).toMatch(/1\s*-\s*15/);
  });
});

