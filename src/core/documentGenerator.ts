import { HallAllocationNoticeProps, generateHallAllocationNoticeHtml } from '../templates/hallAllocationNotice';
import { InvigilatorSeatingSheetProps, generateInvigilatorSeatingSheetHtml } from '../templates/invigilatorSeatingSheet';
import { AttendanceSheetProps, generateAttendanceSheetHtml } from '../templates/attendanceSheet';
import { DutyListNoticeProps, generateDutyListNoticeHtml } from '../templates/dutyListNotice';
import { TimetableNoticeProps, generateTimetableNoticeHtml } from '../templates/timetableNotice';
import { HallSeatingPlan, Student } from './types';

export interface DocumentBatchResult {
  hallAllocationNotice: string;
  seatingSheets: { hallName: string; html: string }[];
  attendanceSheets: { hallName: string; groupName: string; html: string }[];
  dutyListNotice: string;
  timetableNotice: string;
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
    examTitle,
    date,
    timeRange,
    hallPlans,
    dates,
    staffList,
    dutyAssignments,
    scheduleItems,
    submissionDeadline,
  } = params;

  // 1. Hall Allocation Notice
  const hallAllocationNotice = generateHallAllocationNoticeHtml({
    collegeName,
    examTitle,
    date,
    timeRange,
    hallPlans,
  });

  // 2. Invigilator Seating Sheets (one per hall)
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

  // 3. Attendance Sheets (one per group per hall)
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
      const branchDisplay =
        first.branch === 'CS'
          ? 'Computer Science and Engineering'
          : first.branch === 'EC'
          ? 'Electronics and Communication Engineering'
          : first.branch;

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
          students: list,
        }),
      });
    }
  }

  // 4. Invigilation Duty List Notice
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

  // 5. Timetable / QP Notice
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
    seatingSheets,
    attendanceSheets,
    dutyListNotice,
    timetableNotice,
  };
}

