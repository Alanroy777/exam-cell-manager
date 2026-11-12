import ExcelJS from 'exceljs';
import { HallSeatingPlan, Student } from './types';

/**
 * Exports the entire student roster to an Excel workbook buffer
 */
export async function exportStudentsToExcelBuffer(students: Student[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'College of Engineering Poonjar - Exam Cell';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Students Roster');

  // Title Row
  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'COLLEGE OF ENGINEERING POONJAR - STUDENT ROSTER';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF0F0C29' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  // Header Row
  worksheet.getRow(3).values = [
    'Sl No',
    'Roll No',
    'Register / KTU ID',
    'Student Name',
    'Programme',
    'Branch',
    'Semester',
    'Batch',
    'Group ID',
    'Status',
  ];

  const headerRow = worksheet.getRow(3);
  headerRow.height = 24;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F0C29' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Data Rows
  students.forEach((st, idx) => {
    const row = worksheet.addRow([
      idx + 1,
      st.rollNo,
      st.registerNo || '',
      st.name,
      st.programme,
      st.branch,
      st.semester,
      st.batch || '',
      st.groupId,
      st.status === 'active' ? 'Active' : 'Dropped Out',
    ]);

    row.eachCell((cell, colNum) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (colNum === 1 || colNum === 2 || colNum === 10) {
        cell.alignment = { horizontal: 'center' };
      }
    });
  });

  // Column widths
  worksheet.columns = [
    { width: 8 },
    { width: 14 },
    { width: 18 },
    { width: 32 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 10 },
    { width: 16 },
    { width: 14 },
  ];

  const uint8 = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8);
}

/**
 * Exports complete seating arrangement with a dedicated worksheet per hall
 * exactly modeled after the College of Engineering Poonjar Attendance sheet.xlsx
 */
export async function exportSeatingPlanToExcelBuffer(
  hallPlans: HallSeatingPlan[],
  examTitle: string = 'SECOND SERIES EXAM 2026',
  examDate: string = '09/10/2026',
  examTime: string = '10.15 AM - 12.15 PM'
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'College of Engineering Poonjar - Exam Cell';

  for (const plan of hallPlans) {
    if (plan.totalStudents === 0) continue;

    const sheetName = `Hall ${plan.hallName}`.slice(0, 31);
    const ws = workbook.addWorksheet(sheetName);

    // College Header
    ws.mergeCells('A1:G1');
    const h1 = ws.getCell('A1');
    h1.value = 'COLLEGE OF ENGINEERING POONJAR';
    h1.font = { bold: true, size: 13, color: { argb: 'FF000000' } };
    h1.alignment = { horizontal: 'center' };

    ws.mergeCells('A2:G2');
    const h2 = ws.getCell('A2');
    h2.value = examTitle;
    h2.font = { bold: true, size: 10 };
    h2.alignment = { horizontal: 'center' };

    ws.mergeCells('A3:G3');
    const h3 = ws.getCell('A3');
    h3.value = `Seating Arrangement & Attendance - Hall: ${plan.hallName}`;
    h3.font = { bold: true, size: 11, underline: true };
    h3.alignment = { horizontal: 'center' };

    ws.mergeCells('A4:C4');
    ws.getCell('A4').value = `Date: ${examDate}`;
    ws.getCell('A4').font = { bold: true };

    ws.mergeCells('D4:G4');
    ws.getCell('D4').value = `Time: ${examTime}`;
    ws.getCell('D4').font = { bold: true };
    ws.getCell('D4').alignment = { horizontal: 'right' };

    // Bench Matrix Section (Columns A, B, C, D)
    ws.getRow(6).values = ['Bench', 'Seat 1 (Left)', 'Group', 'Seat 2 (Right)', 'Group', 'Booklet No', 'Signature'];
    const tableHeader = ws.getRow(6);
    tableHeader.font = { bold: true };
    tableHeader.eachCell((c) => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    let rowCursor = 7;
    // Iterate through benches
    for (const col of ['A', 'B', 'C', 'D'] as const) {
      for (let b = 1; b <= 5; b++) {
        const leftSeat = plan.seats.find((s) => s.column === col && s.benchNo === b && s.position === 'left');
        const rightSeat = plan.seats.find((s) => s.column === col && s.benchNo === b && s.position === 'right');

        const benchLabel = `Col ${col} - Bench ${b}`;
        const leftRoll = leftSeat?.student ? `${leftSeat.student.rollNo} (${leftSeat.student.name})` : '-';
        const leftGrp = leftSeat?.student?.groupId || '-';
        const rightRoll = rightSeat?.student ? `${rightSeat.student.rollNo} (${rightSeat.student.name})` : '-';
        const rightGrp = rightSeat?.student?.groupId || '-';

        const row = ws.getRow(rowCursor++);
        row.values = [benchLabel, leftRoll, leftGrp, rightRoll, rightGrp, '', ''];
        row.eachCell((c) => {
          c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
      }
    }

    // Footer Block
    rowCursor += 2;
    ws.getCell(`A${rowCursor}`).value = 'Name and Signature of Invigilator: ___________________________';
    ws.getCell(`A${rowCursor}`).font = { bold: true };

    rowCursor++;
    ws.getCell(`A${rowCursor}`).value = 'Roll Nos of Absentees: _____________________________________';
    ws.getCell(`A${rowCursor}`).font = { bold: true };

    ws.columns = [
      { width: 18 },
      { width: 32 },
      { width: 15 },
      { width: 32 },
      { width: 15 },
      { width: 14 },
      { width: 18 },
    ];
  }

  const uint8 = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8);
}

