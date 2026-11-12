import ExcelJS from 'exceljs';
import { Programme, Student } from './types';
import { normalizeBranch, normalizeSemester } from './validator';

export interface ColumnMapping {
  rollNoCol: number;
  nameCol: number;
  regNoCol?: number;
  branchCol?: number;
  semCol?: number;
  batchCol?: number;
  statusCol?: number;
}

export interface ParseOptions {
  filename?: string;
  sheetName?: string;
  defaultProgramme?: Programme;
  defaultBranch?: string;
  defaultSemester?: string;
  defaultBatch?: string;
  headerRowIndex?: number;
  columnMapping?: ColumnMapping;
}

export interface DetectedGroupMeta {
  programme?: Programme;
  branch?: string;
  semester?: string;
  batch?: string;
}

export interface ParseResult {
  students: Student[];
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
  detectedHeaders: { colIndex: number; text: string }[];
  sheetNames: string[];
  detectedMeta: DetectedGroupMeta;
}

function resolveBestSemester(topRowsSem?: string, sheetSem?: string, fileSem?: string): string {
  if (sheetSem && fileSem && sheetSem === fileSem) return sheetSem;
  if (sheetSem) return sheetSem;
  if (topRowsSem) return topRowsSem;
  if (fileSem) return fileSem;
  return 'S5';
}

function resolveBestBatch(topRowsBatch?: string, sheetBatch?: string, fileBatch?: string): string | undefined {
  if (sheetBatch && fileBatch && sheetBatch === fileBatch) return sheetBatch;
  if (sheetBatch) return sheetBatch;
  if (topRowsBatch) return topRowsBatch;
  if (fileBatch) return fileBatch;
  return undefined;
}

function resolveBestBranch(topRowsBranch?: string, sheetBranch?: string, fileBranch?: string, programme?: Programme): string {
  if (programme === 'MCA') return 'MCA';
  if (programme === 'BCA') return 'BCA';
  if (topRowsBranch) return topRowsBranch;
  if (sheetBranch) return sheetBranch;
  if (fileBranch) return fileBranch;
  return 'CS';
}

/**
 * Extracts student metadata from sheet titles, filenames, or pre-header rows
 * e.g. "B.TECH S5 A - STUDENTS LIST", "student_list_a", "BTECH-S5-A.xlsx"
 */
export function inferGroupFromTitle(title: string): DetectedGroupMeta {
  const t = title.toUpperCase();
  let programme: Programme | undefined = undefined;
  if (t.includes('MCA')) programme = 'MCA';
  else if (t.includes('BCA')) programme = 'BCA';
  else if (t.includes('DIPLOMA')) programme = 'Diploma';
  else if (t.includes('B.TECH') || t.includes('BTECH') || t.includes('B TECH') || t.includes('CSE') || t.includes('ECE') || t.includes('KTU')) {
    programme = 'B.Tech';
  }

  let branch: string | undefined = undefined;
  if (t.includes('COMPUTER SCIENCE') || t.includes('CSE') || /\bCS\b/.test(t) || t.includes('COMPUTER')) branch = 'CS';
  else if (t.includes('ELECTRONIC') || t.includes('ECE') || /\bEC\b/.test(t)) branch = 'EC';
  else if (t.includes('ELECTRICAL') || t.includes('EEE')) branch = 'EEE';
  else if (t.includes('AUTO') || /\bAU\b/.test(t)) branch = 'AU';
  else if (/\bCT\b/.test(t)) branch = 'CT';
  else if (programme === 'MCA') branch = 'MCA';
  else if (programme === 'BCA') branch = 'BCA';

  let semester: string | undefined = undefined;
  const semMatch = t.match(/\bS([1-8])\b/) || t.match(/\bSEM(?:ESTER)?\s*([1-8])\b/) || t.match(/\b([1-8])(?:ST|ND|RD|TH)\s+SEM/);
  if (semMatch) {
    semester = `S${semMatch[1]}`;
  } else if (t.includes('FIRST') || t.includes('1ST SEM')) semester = 'S1';
  else if (t.includes('SECOND') || t.includes('2ND SEM')) semester = 'S2';
  else if (t.includes('THIRD') || t.includes('3RD SEM')) semester = 'S3';
  else if (t.includes('FOURTH') || t.includes('4TH SEM')) semester = 'S4';
  else if (t.includes('FIFTH') || t.includes('5TH SEM')) semester = 'S5';
  else if (t.includes('SIXTH') || t.includes('6TH SEM')) semester = 'S6';
  else if (t.includes('SEVENTH') || t.includes('7TH SEM')) semester = 'S7';
  else if (t.includes('EIGHTH') || t.includes('8TH SEM')) semester = 'S8';

  let batch: string | undefined = undefined;
  // Match batch A, B, or C specifically, avoiding room numbers like D 103 or D 205
  const explicitBatchMatch =
    t.match(/\bBATCH\s*([A-C])\b/) ||
    t.match(/\b([A-C])\s*BATCH\b/) ||
    t.match(/\bS[1-8]\s*([A-C])(?!\s*\d)/) ||
    t.match(/(?:LIST|STUDENT|STUDENTS)[_\s\-]+([A-C])\b/) ||
    t.match(/[_\-\s]([A-C])(?:\.XLSX?|$|[\s_])/i);

  if (explicitBatchMatch) {
    batch = explicitBatchMatch[1].toUpperCase();
  }

  return { programme, branch, semester, batch };
}

/**
 * Parses an Excel buffer or workbook
 */
export async function parseStudentsFromExcel(
  buffer: ArrayBuffer | Buffer,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  // @ts-ignore
  await workbook.xlsx.load(buffer);

  const sheetNames = workbook.worksheets.map((ws) => ws.name);
  const worksheet = options.sheetName
    ? workbook.getWorksheet(options.sheetName) || workbook.worksheets[0]
    : workbook.worksheets[0];

  const students: Student[] = [];
  const errors: { row: number; message: string }[] = [];
  const warnings: { row: number; message: string }[] = [];
  const detectedHeaders: { colIndex: number; text: string }[] = [];

  if (!worksheet) {
    return {
      students,
      errors: [{ row: 0, message: 'No worksheet found in Excel' }],
      warnings,
      detectedHeaders,
      sheetNames,
      detectedMeta: {},
    };
  }

  // 1. Gather text from multiple sources:
  // - options.filename (e.g. "BTECH-S5-A.xlsx")
  // - worksheet.name (e.g. "student_list_a")
  // - pre-header rows 1 to 10 of worksheet
  const filenameMeta = options.filename ? inferGroupFromTitle(options.filename) : {};
  const sheetMeta = inferGroupFromTitle(worksheet.name);

  // Scan top 10 rows for group metadata
  const topRowsMeta: DetectedGroupMeta = {};
  for (let r = 1; r <= Math.min(10, worksheet.rowCount); r++) {
    const row = worksheet.getRow(r);
    const cellTexts: string[] = [];
    row.eachCell((cell) => {
      if (cell.value) cellTexts.push(String(cell.value));
    });
    const rowStr = cellTexts.join(' ');
    if (rowStr.trim()) {
      const meta = inferGroupFromTitle(rowStr);
      if (meta.programme && !topRowsMeta.programme) topRowsMeta.programme = meta.programme;
      if (meta.branch && !topRowsMeta.branch) topRowsMeta.branch = meta.branch;
      if (meta.semester && !topRowsMeta.semester) topRowsMeta.semester = meta.semester;
      if (meta.batch && !topRowsMeta.batch) topRowsMeta.batch = meta.batch;
    }
  }

  // Prioritize detected metadata:
  const detectedProgramme: Programme =
    topRowsMeta.programme || sheetMeta.programme || filenameMeta.programme || 'B.Tech';
  const detectedBranch = resolveBestBranch(
    topRowsMeta.branch,
    sheetMeta.branch,
    filenameMeta.branch,
    detectedProgramme
  );
  const detectedSemester = resolveBestSemester(
    topRowsMeta.semester,
    sheetMeta.semester,
    filenameMeta.semester
  );
  const detectedBatch = resolveBestBatch(
    topRowsMeta.batch,
    sheetMeta.batch,
    filenameMeta.batch
  );

  const detectedMeta: DetectedGroupMeta = {
    programme: detectedProgramme,
    branch: detectedBranch,
    semester: detectedSemester,
    batch: detectedBatch,
  };

  const prog: Programme = options.defaultProgramme || detectedProgramme;
  const branch = normalizeBranch(options.defaultBranch || detectedBranch);
  const semester = normalizeSemester(options.defaultSemester || detectedSemester);
  const batch = options.defaultBatch !== undefined
    ? (options.defaultBatch ? options.defaultBatch.trim() : undefined)
    : detectedBatch;

  // Auto-detect header row if not specified
  let headerRow = options.headerRowIndex || 0;
  if (headerRow === 0) {
    for (let r = 1; r <= Math.min(10, worksheet.rowCount); r++) {
      const row = worksheet.getRow(r);
      let hasRoll = false;
      let hasName = false;
      row.eachCell((cell) => {
        const val = String(cell.value || '').toLowerCase().trim();
        if (val.includes('roll') || val === 'sl' || val === 'sl no' || val === 'sl.' || val === 'no') hasRoll = true;
        if (val.includes('name') || val.includes('student')) hasName = true;
      });
      if (hasRoll && hasName) {
        headerRow = r;
        // Check if the next row is also a duplicate header row (as in BTECH-S5)
        if (r < worksheet.rowCount) {
          const nextRow = worksheet.getRow(r + 1);
          let nextHasRoll = false;
          let nextHasName = false;
          nextRow.eachCell((cell) => {
            const val = String(cell.value || '').toLowerCase().trim();
            if (val.includes('roll') || val === 'sl' || val === 'sl no' || val === 'sl.' || val === 'no') nextHasRoll = true;
            if (val.includes('name') || val.includes('student')) nextHasName = true;
          });
          if (nextHasRoll && nextHasName) {
            headerRow = r + 1;
          }
        }
        break;
      }
    }
    if (headerRow === 0) headerRow = 2; // Default fallback
  }

  // Read detected headers
  const hRow = worksheet.getRow(headerRow);
  let rollCol = options.columnMapping?.rollNoCol || 0;
  let nameCol = options.columnMapping?.nameCol || 0;
  let regNoCol = options.columnMapping?.regNoCol || 0;
  let branchCol = options.columnMapping?.branchCol || 0;
  let semCol = options.columnMapping?.semCol || 0;
  let batchCol = options.columnMapping?.batchCol || 0;
  let statusCol = options.columnMapping?.statusCol || 0;

  hRow.eachCell((cell, colNumber) => {
    const text = String(cell.value || '').trim();
    detectedHeaders.push({ colIndex: colNumber, text });
    const lower = text.toLowerCase();

    if (!rollCol && (lower.includes('roll') || lower === 'sl no' || lower === 'sl' || lower === 'sl.' || lower === 'no')) {
      rollCol = colNumber;
    } else if (!nameCol && (lower.includes('name') || lower.includes('student'))) {
      nameCol = colNumber;
    } else if (!regNoCol && (lower.includes('reg') || lower.includes('register') || lower.includes('ktuid'))) {
      regNoCol = colNumber;
    } else if (!branchCol && lower.includes('branch')) {
      branchCol = colNumber;
    } else if (!semCol && lower.includes('sem')) {
      semCol = colNumber;
    } else if (!batchCol && lower.includes('batch')) {
      batchCol = colNumber;
    } else if (!statusCol && (lower.includes('status') || lower.includes('drop'))) {
      statusCol = colNumber;
    }
  });

  if (!rollCol) rollCol = 1;
  if (!nameCol) nameCol = 3; // In KTU sheets col 1 = Roll, 2 = RegNo, 3 = Name

  // Check if roll numbers are unique
  const seenRolls = new Set<string>();

  for (let r = headerRow + 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const rollVal = String(row.getCell(rollCol).value || '').trim();
    const nameVal = String(row.getCell(nameCol).value || '').trim();

    if (!rollVal && !nameVal) continue; // Empty row
    if (nameVal.toLowerCase().includes('invigilator') || nameVal.toLowerCase().includes('signature')) continue; // Header/footer

    const rollLower = rollVal.toLowerCase();
    const nameLower = nameVal.toLowerCase();
    // Skip duplicate header labels
    if (
      nameLower === 'name' ||
      nameLower === 'name of student' ||
      nameLower === 'student name' ||
      rollLower === 'rollno' ||
      rollLower === 'roll no' ||
      rollLower === 'sl no' ||
      rollLower === 'sl. no' ||
      rollLower === 'sl'
    ) {
      continue;
    }

    if (!nameVal) {
      warnings.push({ row: r, message: `Row ${r}: Missing student name for Roll ${rollVal}` });
      continue;
    }

    // Clean roll number (e.g. 1.0 -> 1)
    const cleanRoll = rollVal.replace(/\.0$/, '');

    const regNoVal = regNoCol ? String(row.getCell(regNoCol).value || '').trim() : undefined;
    const rowBranch = branchCol ? normalizeBranch(String(row.getCell(branchCol).value || branch)) : branch;
    const rowSem = semCol ? normalizeSemester(String(row.getCell(semCol).value || semester)) : semester;
    const rowBatch = batchCol ? String(row.getCell(batchCol).value || batch || '').trim() : batch;

    let status: 'active' | 'dropped' = 'active';
    if (statusCol) {
      const sVal = String(row.getCell(statusCol).value || '').toLowerCase();
      if (sVal.includes('drop') || sVal.includes('inactive') || sVal.includes('discontinued')) {
        status = 'dropped';
      }
    } else {
      // Flag likely dropout by keywords in name
      if (nameVal.toUpperCase().includes('(DROPPED)') || nameVal.toUpperCase().includes('(DISCONTINUED)')) {
        status = 'dropped';
      }
    }

    const groupId = `${rowSem} ${rowBranch}${rowBatch ? ' ' + rowBatch : ''}`;

    if (seenRolls.has(`${groupId}_${cleanRoll}`)) {
      warnings.push({ row: r, message: `Row ${r}: Duplicate roll number ${cleanRoll} in group ${groupId}` });
    }
    seenRolls.add(`${groupId}_${cleanRoll}`);

    students.push({
      id: `std_${Date.now()}_${r}_${cleanRoll}`,
      rollNo: cleanRoll,
      registerNo: regNoVal,
      name: nameVal.replace(/\(DROPPED\)/gi, '').trim(),
      programme: prog,
      branch: rowBranch,
      semester: rowSem,
      batch: rowBatch,
      status,
      groupId,
    });
  }

  return {
    students,
    errors,
    warnings,
    detectedHeaders,
    sheetNames,
    detectedMeta,
  };
}
