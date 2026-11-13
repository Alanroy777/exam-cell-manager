import { PRINT_STYLES } from './styles';
import { HallSeatingPlan } from '../core/types';
import { normalizeGroupId } from '../core/validator';

export interface HallAllocationNoticeProps {
  collegeName?: string;
  examTitle: string;
  date: string;
  timeRange: string;
  hallPlans: HallSeatingPlan[];
}

export function toNoticeCourseName(groupId: string): string {
  if (!groupId) return '';
  const trimmed = groupId.trim();
  // Format CS batches: "S5 CS B" -> "S5 B", "S3 CS A" -> "S3 A", "S5 CS A" -> "S5 A"
  const csMatch = trimmed.match(/^S(\d)\s+(?:CS|CSE)\s+([A-Z])/i);
  if (csMatch) {
    return `S${csMatch[1]} ${csMatch[2].toUpperCase()}`;
  }
  const s7Match = trimmed.match(/^S7\b/i);
  if (s7Match) {
    return 'S7';
  }
  // Remove redundant CS/CSE while keeping clean course/branch indicator
  return trimmed
    .replace(/\bCS\b/gi, '')
    .replace(/\bCSE\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface RoomGroupAllocation {
  courseName: string;
  rollRange: string;
}

export function generateHallAllocationNoticeHtml(props: HallAllocationNoticeProps): string {
  const {
    collegeName = 'COLLEGE OF ENGINEERING POONJAR',
    examTitle,
    date,
    timeRange,
    hallPlans,
  } = props;

  // Build room-by-room allocation data
  const roomAllocations: { roomName: string; courses: RoomGroupAllocation[] }[] = [];

  for (const plan of hallPlans) {
    if (plan.totalStudents === 0) continue;

    // Map each group to its list of roll numbers
    const groupRolls = new Map<string, number[]>();
    for (const seat of plan.seats) {
      if (seat.student) {
        // Skip header-like fake student entries if any were imported
        const nameLower = (seat.student.name || '').toLowerCase().trim();
        const rollLower = (seat.student.rollNo || '').toLowerCase().trim();
        if (
          nameLower === 'register number' ||
          nameLower === 'name' ||
          rollLower === 'sl.no' ||
          rollLower === 'sl no' ||
          rollLower === 'rollno' ||
          rollLower === 'roll no' ||
          rollLower.includes('b.tech s7')
        ) {
          continue;
        }

        const gid = normalizeGroupId(seat.student.groupId);
        if (!groupRolls.has(gid)) groupRolls.set(gid, []);

        // Extract roll number digits (trailing number at end of roll string, e.g. "S7-01" -> 1, "S5 CS B 12" -> 12, "5" -> 5)
        let rollNum = 0;
        const trailingMatch = seat.student.rollNo ? seat.student.rollNo.trim().match(/(\d+)$/) : null;
        if (trailingMatch) {
          rollNum = parseInt(trailingMatch[1], 10);
        } else if (seat.student.rollNo) {
          const rawDigits = seat.student.rollNo.replace(/\D/g, '');
          rollNum = rawDigits ? parseInt(rawDigits, 10) : 0;
        }

        // If rollNo had no positive number, fallback to registerNo digits (e.g. PJR23CS015 -> 15)
        if (rollNum <= 0 && seat.student.registerNo) {
          const regDigits = seat.student.registerNo.match(/(\d+)$/);
          if (regDigits && parseInt(regDigits[1], 10) > 0) {
            rollNum = parseInt(regDigits[1], 10);
          }
        }

        // If still 0, fallback to sequential order within this room
        if (rollNum <= 0) {
          rollNum = groupRolls.get(gid)!.length + 1;
        }

        groupRolls.get(gid)!.push(rollNum);
      }
    }

    const courses: RoomGroupAllocation[] = [];
    for (const [gid, rolls] of groupRolls.entries()) {
      if (rolls.length === 0) continue;
      const validRolls = rolls.filter((r) => r > 0);
      const sortedRolls = validRolls.length > 0 ? validRolls.sort((a, b) => a - b) : rolls.map((_, i) => i + 1);
      const minRoll = sortedRolls[0];
      const maxRoll = sortedRolls[sortedRolls.length - 1];
      const rollRange = minRoll === maxRoll ? `${minRoll}` : `${minRoll} - ${maxRoll}`;

      courses.push({
        courseName: toNoticeCourseName(gid),
        rollRange,
      });
    }

    if (courses.length > 0) {
      roomAllocations.push({
        roomName: plan.hallName,
        courses,
      });
    }
  }

  // Generate table rows with vertical centering & rowspan for ROOM
  const tableRowsHtml = roomAllocations
    .map((room) => {
      const firstCourse = room.courses[0];
      const otherCourses = room.courses.slice(1);

      const firstRow = `
        <tr style="height: 38px;">
          <td rowspan="${room.courses.length}" class="center" style="font-weight: 800; font-size: 11pt; vertical-align: middle; text-align: center; border: 1.5px solid #000; padding: 6px 12px;">
            ${room.roomName}
          </td>
          <td class="center" style="font-weight: 700; font-size: 11pt; vertical-align: middle; text-align: center; padding: 6px 12px; border: 1.5px solid #000;">
            ${firstCourse.courseName}
          </td>
          <td class="center numeric" style="font-weight: 700; font-size: 11pt; vertical-align: middle; text-align: center; padding: 6px 12px; border: 1.5px solid #000;">
            ${firstCourse.rollRange}
          </td>
        </tr>
      `;

      const remainingRows = otherCourses
        .map(
          (c) => `
        <tr style="height: 38px;">
          <td class="center" style="font-weight: 700; font-size: 11pt; vertical-align: middle; text-align: center; padding: 6px 12px; border: 1.5px solid #000;">
            ${c.courseName}
          </td>
          <td class="center numeric" style="font-weight: 700; font-size: 11pt; vertical-align: middle; text-align: center; padding: 6px 12px; border: 1.5px solid #000;">
            ${c.rollRange}
          </td>
        </tr>
      `
        )
        .join('');

      return firstRow + remainingRows;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Examination Hall Allocation</title>
        <style>
          ${PRINT_STYLES}
          table.allocation-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 11pt;
          }
          table.allocation-table th, table.allocation-table td {
            border: 1.5px solid #000000;
          }
          table.allocation-table th {
            background-color: #ffffff !important;
            font-weight: 800;
            text-align: center;
            padding: 8px 12px;
            font-size: 11pt;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="page" style="padding: 10px 14px;">
          <div style="text-align: center; margin-bottom: 12px;">
            <h1 style="font-size: 14pt; font-weight: 800; margin: 0 0 3px 0; letter-spacing: 0.3px;">${collegeName}</h1>
            <h2 style="font-size: 10.5pt; font-weight: 700; margin: 0 0 3px 0;">${examTitle}</h2>
            <h3 style="font-size: 11.5pt; font-weight: 800; margin: 4px 0 2px 0; letter-spacing: 0.5px;">EXAMINATION HALL ALLOCATION</h3>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 11pt; font-weight: 700; margin-bottom: 8px; padding: 0 4px;">
            <div>Date : &nbsp; ${date}</div>
            <div>Time : &nbsp; ${timeRange}</div>
          </div>

          <table class="allocation-table">
            <thead>
              <tr style="height: 32px;">
                <th style="width: 25%;">ROOM</th>
                <th style="width: 42%;">COURSE</th>
                <th style="width: 33%;">ROLL NUMBER</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;
}
