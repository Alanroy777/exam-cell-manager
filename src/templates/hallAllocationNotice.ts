import { PRINT_STYLES } from './styles';
import { HallSeatingPlan } from '../core/types';

export interface HallAllocationNoticeProps {
  collegeName?: string;
  examTitle: string;
  date: string;
  timeRange: string;
  hallPlans: HallSeatingPlan[];
  convenerName?: string;
  principalName?: string;
}

interface AllocationRow {
  room: string;
  course: string;
  rollRange: string;
}

export function generateHallAllocationNoticeHtml(props: HallAllocationNoticeProps): string {
  const {
    collegeName = 'COLLEGE OF ENGINEERING POONJAR',
    examTitle,
    date,
    timeRange,
    hallPlans,
    convenerName = 'Exam Cell Convener',
    principalName = 'Principal / HOD',
  } = props;

  // Build allocation rows for each hall
  const rows: AllocationRow[] = [];

  for (const plan of hallPlans) {
    if (plan.totalStudents === 0) continue;

    // Group students by group in this hall
    const groupStudents = new Map<string, number[]>();
    for (const seat of plan.seats) {
      if (seat.student) {
        const gid = seat.student.groupId;
        if (!groupStudents.has(gid)) groupStudents.set(gid, []);
        const rollNum = parseInt(seat.student.rollNo.replace(/\D/g, ''), 10);
        groupStudents.get(gid)!.push(isNaN(rollNum) ? 0 : rollNum);
      }
    }

    let isFirstForRoom = true;
    for (const [gid, rolls] of groupStudents.entries()) {
      rolls.sort((a, b) => a - b);
      const minRoll = rolls[0];
      const maxRoll = rolls[rolls.length - 1];
      const rollRange = minRoll === maxRoll ? `${minRoll}` : `${minRoll} - ${maxRoll}`;

      rows.push({
        room: isFirstForRoom ? plan.hallName : '',
        course: gid,
        rollRange,
      });
      isFirstForRoom = false;
    }
  }

  const tableRowsHtml = rows
    .map(
      (r, idx) => `
      <tr>
        <td class="center" style="font-weight: 700; font-size: 11pt; ${r.room ? 'border-top: 2px solid #000;' : ''}">${r.room}</td>
        <td style="${r.room ? 'border-top: 2px solid #000;' : ''}; font-weight: 600;">${r.course}</td>
        <td class="center numeric" style="${r.room ? 'border-top: 2px solid #000;' : ''}; font-weight: 600;">${r.rollRange}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Hall Allocation Notice</title>
        <style>${PRINT_STYLES}</style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <h1>${collegeName}</h1>
            <h2>${examTitle}</h2>
            <h3>EXAMINATION HALL ALLOCATION</h3>
            <div class="meta-row">
              <div>Date : ${date}</div>
              <div>Time : ${timeRange}</div>
            </div>
          </div>

          <table class="doc-table">
            <thead>
              <tr>
                <th style="width: 25%;">ROOM</th>
                <th style="width: 45%;">COURSE</th>
                <th style="width: 30%;">ROLL NUMBER</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="signatory-block">
            <div class="signatory-col">
              <div class="signatory-line">${convenerName}</div>
            </div>
            <div class="signatory-col">
              <div class="signatory-line">${principalName}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

