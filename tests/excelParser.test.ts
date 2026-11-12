import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseStudentsFromExcel, inferGroupFromTitle } from '../src/core/excelParser';

describe('Excel Parser Module', () => {
  it('correctly infers group metadata from titles', () => {
    const meta1 = inferGroupFromTitle('S2 CSE(BATCH A)  - 2025 ADMISSION');
    expect(meta1.branch).toBe('CS');
    expect(meta1.semester).toBe('S2');
    expect(meta1.batch).toBe('A');

    const meta2 = inferGroupFromTitle('B.Tech FIFTH Semester B Batch (2024 Admn) - Students List');
    expect(meta2.programme).toBe('B.Tech');
    expect(meta2.semester).toBe('S5');
    expect(meta2.batch).toBe('B');

    const meta3 = inferGroupFromTitle('MCA S3');
    expect(meta3.programme).toBe('MCA');
    expect(meta3.branch).toBe('MCA');
    expect(meta3.semester).toBe('S3');
  });

  it('parses BTECH S3 A BATCH STUDENT LIST EXAMPLE.xlsx', async () => {
    const filePath = path.resolve(__dirname, '../reference/BTECH S3 A BATCH STUDENT LIST EXAMPLE.xlsx');
    if (!fs.existsSync(filePath)) return;

    const buffer = fs.readFileSync(filePath);
    const result = await parseStudentsFromExcel(buffer);

    expect(result.students.length).toBeGreaterThan(30);
    expect(result.students[0].name).toBe('ABHINAV P');
    expect(result.students[0].rollNo).toBe('1');
    expect(result.students[0].registerNo).toBe('PJR25CS002');
    expect(result.students[0].branch).toBe('CS');
    expect(result.students[0].batch).toBe('A');
  });

  it('parses Attendance sheet.xlsx Stude list sheet', async () => {
    const filePath = path.resolve(__dirname, '../reference/Attendance sheet.xlsx');
    if (!fs.existsSync(filePath)) return;

    const buffer = fs.readFileSync(filePath);
    const result = await parseStudentsFromExcel(buffer, {
      sheetName: 'Stude list',
      headerRowIndex: 4,
      columnMapping: { rollNoCol: 1, nameCol: 2 },
    });

    expect(result.students.length).toBeGreaterThan(40);
    expect(result.students[0].name).toBe('ABI SUNEER');
    expect(result.students[0].rollNo).toBe('S5 CS B 1');
  });

  it('correctly parses BTECH-S5.xlsx without phantom headers and with S5 CS A', async () => {
    const filePath = 'C:/Users/Alan roy/Desktop/exs-docs/BTECH-S5.xlsx';
    if (!fs.existsSync(filePath)) return;

    const buffer = fs.readFileSync(filePath);
    const res = await parseStudentsFromExcel(buffer, { filename: 'BTECH-S5.xlsx' });
    expect(res.students.length).toBe(47);
    expect(res.students[0].rollNo).toBe('1');
    expect(res.students[0].registerNo).toBe('PJR24CS001');
    expect(res.students[0].name).toBe('ABHIJITH BIJU');
    expect(res.students[0].semester).toBe('S5');
    expect(res.students[0].branch).toBe('CS');
    expect(res.students[0].batch).toBe('A');
    expect(res.students[0].groupId).toBe('S5 CS A');
  });

  it('inspects all files in exs-docs if present', async () => {
    const dir = 'C:/Users/Alan roy/Desktop/exs-docs';
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
    for (const f of files) {
      const p = path.join(dir, f);
      console.log('--- Inspecting file:', f);
      const buffer = fs.readFileSync(p);
      const res = await parseStudentsFromExcel(buffer, { filename: f } as any);
      console.log(`  File: ${f}, Sheets: ${res.sheetNames.join(', ')}`);
      console.log(`  Parsed ${res.students.length} students. Sample student:`, res.students[0] ? {
        rollNo: res.students[0].rollNo,
        name: res.students[0].name,
        group: res.students[0].groupId,
        branch: res.students[0].branch,
        sem: res.students[0].semester,
        batch: res.students[0].batch
      } : 'No students');
    }
  });
});

