import { HallAllocationNoticeProps, generateHallAllocationNoticeHtml, toNoticeCourseName } from '../templates/hallAllocationNotice';
import {
  InvigilatorSeatingSheetProps,
  generateInvigilatorSeatingSheetHtml,
  generateConsolidatedSeatingArrangementHtml,
} from '../templates/invigilatorSeatingSheet';
import { AttendanceSheetProps, generateAttendanceSheetHtml, toRomanSemester, formatAttendanceRollNo } from '../templates/attendanceSheet';
import { DutyListNoticeProps, generateDutyListNoticeHtml } from '../templates/dutyListNotice';
import { TimetableNoticeProps, generateTimetableNoticeHtml } from '../templates/timetableNotice';
import { HallSeatingPlan, Student } from './types';
import { normalizeGroupId } from './validator';

export interface DocumentBatchResult {
  hallAllocationNotice: string;
  consolidatedSeatingSheet: string;
  seatingSheets: { hallName: string; html: string }[];
  attendanceSheets: { hallName: string; groupName: string; html: string }[];
  dutyListNotice: string;
  timetableNotice: string;
}

export function toFullBranchName(branch: string, groupId: string = ''): string {
  const b = branch.toUpperCase().trim();
  const g = groupId.toUpperCase().trim();
  if (b === 'EC' || b === 'ECE' || g.includes(' EC')) return 'Electronics and Communication Engineering';
  if (b === 'CS' || b === 'CSE' || g.includes(' CS')) return 'Computer Science and Engineering';
  if (b === 'BCA' || g.includes('BCA')) return 'Bachelor of Computer Applications';
  if (b === 'MCA' || g.includes('MCA')) return 'Master of Computer Applications';
  if (b === 'EEE' || g.includes('EEE')) return 'Electrical and Electronics Engineering';
  if (b === 'ME' || g.includes('ME')) return 'Mechanical Engineering';
  if (b === 'CE' || g.includes('CE')) return 'Civil Engineering';
  return branch;
}

export function formatInstitutionalExamTitle(
  activeGroups: string[],
  sessionName: string = 'SECOND INTERNAL EXAM',
  examDate: string = ''
): string {
  // If sessionName already has the complete institutional header format
  if (/BTECH/i.test(sessionName) && /(FIRST|SECOND|SERIES|INTERNAL)/i.test(sessionName)) {
    return sessionName.toUpperCase();
  }

  // Derive month and year from examDate
  let monthYear = 'OCTOBER 2026';
  if (examDate) {
    const parts = examDate.split(/[-/.]/);
    if (parts.length === 3) {
      let m = 0;
      let y = '2026';
      if (parts[0].length === 4) {
        m = parseInt(parts[1], 10);
        y = parts[0];
      } else {
        m = parseInt(parts[1], 10);
        y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      }
      const months = [
        'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
      ];
      if (m >= 1 && m <= 12) {
        monthYear = `${months[m - 1]} ${y}`;
      }
    }
  }

  // Determine series cycle name
  let seriesName = 'SECOND INTERNAL EXAM';
  if (/first/i.test(sessionName)) {
    seriesName = 'FIRST INTERNAL EXAM';
  } else if (/second/i.test(sessionName)) {
    seriesName = 'SECOND INTERNAL EXAM';
  } else {
    seriesName = sessionName.toUpperCase();
  }

  // Determine active classes
  const btechSems = new Set<string>();
  let hasBcaS3 = false;
  let hasMcaS1 = false;
  let hasMcaS3 = false;

  for (const g of activeGroups) {
    const ug = normalizeGroupId(g).toUpperCase();
    if (ug.includes('BCA')) hasBcaS3 = true;
    else if (ug.includes('MCA')) {
      if (ug.includes('S1')) hasMcaS1 = true;
      if (ug.includes('S3')) hasMcaS3 = true;
    } else {
      const m = ug.match(/S([1-8])/);
      if (m) btechSems.add(`S${m[1]}`);
    }
  }

  const parts: string[] = [];
  if (btechSems.size > 0) {
    const sorted = Array.from(btechSems).sort();
    parts.push(`BTECH (${sorted.join(',')})`);
  } else {
    parts.push('BTECH (S3,S5)');
  }

  if (hasMcaS1 && hasMcaS3) parts.push('MCA (S1,S3)');
  else if (hasMcaS3) parts.push('MCA S3');
  else if (hasMcaS1) parts.push('MCA S1');

  if (hasBcaS3) parts.push('BCA S3');

  const classesHeader = parts.join(', ');
  return `${classesHeader} ${seriesName} ${monthYear}`;
}

/**
 * Generates all documents for an exam session
 */
export function generateAllSessionDocuments(params: {
  collegeName?: string;
  examTitle: string;
  date: string;
  timeRange: string;
  hallPlans: HallSeatingPlan[];
  dates: string[];
  staffList: any[];
  dutyAssignments: any[];
  scheduleItems: any[];
  submissionDeadline: string;
}): DocumentBatchResult {
  const {
    collegeName = 'COLLEGE OF ENGINEERING POONJAR',
    examTitle: rawExamTitle,
    date,
    timeRange,
    hallPlans,
    dates,
    staffList,
    dutyAssignments,
    scheduleItems,
    submissionDeadline,
  } = params;

  // Extract all active groups across hall plans
  const activeGroupsSet = new Set<string>();
  for (const plan of hallPlans) {
    for (const seat of plan.seats) {
      if (seat.student) activeGroupsSet.add(normalizeGroupId(seat.student.groupId));
    }
  }
  const activeGroups = Array.from(activeGroupsSet);

  // Format institutional exam title matching reference documents
  const examTitle = formatInstitutionalExamTitle(activeGroups, rawExamTitle, date);

  // 1. Hall Allocation Notice
  const hallAllocationNotice = generateHallAllocationNoticeHtml({
    collegeName,
    examTitle,
    date,
    timeRange,
    hallPlans,
  });

  // 2. Consolidated Seating Arrangement (2 Halls / A4 Portrait Page)
  const consolidatedSeatingSheet = generateConsolidatedSeatingArrangementHtml({
    collegeName,
    examTitle,
    date,
    timeRange,
    hallPlans,
  });

  // 3. Invigilator Seating Sheets (Individual Halls)
  const seatingSheets = hallPlans
    .filter((h) => h.totalStudents > 0)
    .map((plan) => ({
      hallName: plan.hallName,
      html: generateInvigilatorSeatingSheetHtml({
        collegeName,
        examTitle,
        date,
        timeRange,
        hallPlan: plan,
      }),
    }));

  // 4. Attendance Sheets (one per group per hall)
  const attendanceSheets: { hallName: string; groupName: string; html: string }[] = [];
  for (const plan of hallPlans) {
    if (plan.totalStudents === 0) continue;

    const groupStudents = new Map<string, Student[]>();
    for (const seat of plan.seats) {
      if (seat.student) {
        const gid = seat.student.groupId;
        if (!groupStudents.has(gid)) groupStudents.set(gid, []);
        groupStudents.get(gid)!.push(seat.student);
      }
    }

    for (const [gid, list] of groupStudents.entries()) {
      // Sort list by roll number
      list.sort((a, b) => {
        const numA = parseInt(a.rollNo.replace(/\D/g, ''), 10);
        const numB = parseInt(b.rollNo.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
        return a.rollNo.localeCompare(b.rollNo);
      });

      const first = list[0];
      const branchDisplay = toFullBranchName(first.branch, gid);
      const courseCode = toNoticeCourseName(gid);

      attendanceSheets.push({
        hallName: plan.hallName,
        groupName: gid,
        html: generateAttendanceSheetHtml({
          collegeName,
          examTitle,
          hallName: plan.hallName,
          date,
          timeRange,
          branchName: branchDisplay,
          semesterName: first.semester,
          courseCode,
          students: list,
        }),
      });
    }
  }

  // 5. Invigilation Duty List Notice
  const dateRangeText = dates.length > 0 ? `${dates[0]} - ${dates[dates.length - 1]}` : date;
  const dutyListNotice = generateDutyListNoticeHtml({
    collegeName,
    examTitle,
    dateRangeText,
    noticeDate: date,
    timeRangeText: `FN: ${timeRange}`,
    dates,
    staffList,
    assignments: dutyAssignments,
  });

  // 6. Timetable / QP Notice
  const timetableNotice = generateTimetableNoticeHtml({
    collegeName,
    noticeDate: date,
    academicYear: '2026-27',
    seriesType: 'Second Series',
    scheduleItems,
    submissionDeadline,
  });

  return {
    hallAllocationNotice,
    consolidatedSeatingSheet,
    seatingSheets,
    attendanceSheets,
    dutyListNotice,
    timetableNotice,
  };
}
