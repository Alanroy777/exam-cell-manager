import { PRINT_STYLES } from './styles';
import { HallSeatingPlan, Student } from '../core/types';
import { toNoticeCourseName } from './hallAllocationNotice';

export interface InvigilatorSeatingSheetProps {
  collegeName?: string;
  examTitle: string;
  date: string;
  timeRange: string;
  hallPlan: HallSeatingPlan;
  secondHallPlan?: HallSeatingPlan; // For 2 halls per page matching reference photo
}

export function toShortCourseName(groupId: string): string {
  return toNoticeCourseName(groupId);
}

function formatSeatCell(student?: Student): string {
  if (!student) return '';
  const shortCourse = toShortCourseName(student.groupId);
  const rollNum = student.rollNo.replace(/\D/g, '');
  const roll = rollNum ? parseInt(rollNum, 10).toString() : student.rollNo;
  return `${shortCourse} ${roll}`.trim();
}

function renderHallSection(
  hallPlan: HallSeatingPlan,
  collegeName: string,
  examTitle: string,
  date: string,
  timeRange: string
): string {
  const presentCols = (['A', 'B', 'C', 'D'] as const).filter((c) =>
    hallPlan.seats.some((s) => s.column === c)
  );
  const cols = presentCols.length > 0 ? presentCols : (['A', 'B', 'C', 'D'] as const);
  const colWidth = (86 / cols.length).toFixed(1);

  const maxBenchNo = Math.max(5, ...hallPlan.seats.map((s) => s.benchNo || 0));
  const rowNumbers = Array.from({ length: maxBenchNo }, (_, i) => i + 1);

  const hasMiddle = hallPlan.seats.some((s) => s.position === 'middle');

  function renderRows(side: 'left' | 'middle' | 'right') {
    return rowNumbers
      .map((benchNo) => {
        const colCells = cols.map((col) => {
          const seat = hallPlan.seats.find(
            (s) => s.position === side && s.column === col && s.benchNo === benchNo
          );
          const cellVal = seat && seat.student ? formatSeatCell(seat.student) : '';
          return `<td class="seat-cell" style="border: 1.5px solid #000; text-align: center; font-weight: 700; font-size: 10pt; height: 21px;">${cellVal}</td>`;
        });

        return `
          <tr style="height: 22px;">
            <td style="width: 14%; font-weight: 800; text-align: center; border: 1.5px solid #000; font-size: 10pt;">${benchNo}</td>
            ${colCells.join('')}
          </tr>
        `;
      })
      .join('');
  }

  const theadHtml = `
    <thead>
      <tr style="height: 22px;">
        <th style="width: 14%; border: 1.5px solid #000; background: #fff !important; font-size: 9.5pt; font-weight: 800;">Seat No.</th>
        ${cols.map((col) => `<th style="width: ${colWidth}%; border: 1.5px solid #000; background: #fff !important; font-size: 9.5pt; font-weight: 800;">${col}</th>`).join('')}
      </tr>
    </thead>
  `;

  return `
    <div class="hall-section" style="margin-bottom: 22px; page-break-inside: avoid;">
      <div style="text-align: center; margin-bottom: 5px;">
        <div style="font-size: 12pt; font-weight: 800; letter-spacing: 0.3px;">${collegeName}</div>
        <div style="font-size: 9.5pt; font-weight: 700; margin-top: 1px;">${examTitle}</div>
        <div style="font-size: 10.5pt; font-weight: 800; margin-top: 2px; letter-spacing: 0.5px;">SEATING ARRANGEMENT</div>
        <div style="display: flex; justify-content: space-between; font-size: 9.5pt; font-weight: 800; margin-top: 3px; padding: 0 4px;">
          <div>HALL NO. : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${hallPlan.hallName}</div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 9pt; font-weight: 700; margin-top: 2px; padding: 0 4px;">
          <div>DATE : &nbsp; ${date}</div>
          <div>TIME : &nbsp; ${timeRange}</div>
        </div>
      </div>

      <!-- Table 1 (Stream 1) -->
      <table class="seating-table" style="width: 100%; border-collapse: collapse; margin-top: 4px;">
        ${theadHtml}
        <tbody>
          ${renderRows('left')}
        </tbody>
      </table>

      ${
        hasMiddle
          ? `
      <!-- Table Middle -->
      <table class="seating-table" style="width: 100%; border-collapse: collapse; margin-top: 6px;">
        ${theadHtml}
        <tbody>
          ${renderRows('middle')}
        </tbody>
      </table>
      `
          : ''
      }

      <!-- Table 2 (Stream 2) -->
      <table class="seating-table" style="width: 100%; border-collapse: collapse; margin-top: 6px;">
        ${theadHtml}
        <tbody>
          ${renderRows('right')}
        </tbody>
      </table>
    </div>
  `;
}

export function generateInvigilatorSeatingSheetHtml(props: InvigilatorSeatingSheetProps): string {
  const {
    collegeName = 'COLLEGE OF ENGINEERING POONJAR',
    examTitle,
    date,
    timeRange,
    hallPlan,
    secondHallPlan,
  } = props;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Seating Arrangement - ${hallPlan.hallName}</title>
        <style>
          ${PRINT_STYLES}
        </style>
      </head>
      <body>
        <div class="page" style="padding: 6px 10px;">
          ${renderHallSection(hallPlan, collegeName, examTitle, date, timeRange)}
          ${
            secondHallPlan
              ? renderHallSection(secondHallPlan, collegeName, examTitle, date, timeRange)
              : ''
          }
        </div>
      </body>
    </html>
  `;
}

/**
 * Generates consolidated A4 Portrait document containing all halls paired 2-per-page
 * exactly matching the physical printed sheets at College of Engineering Poonjar.
 */
export function generateConsolidatedSeatingArrangementHtml(params: {
  collegeName?: string;
  examTitle: string;
  date: string;
  timeRange: string;
  hallPlans: HallSeatingPlan[];
}): string {
  const {
    collegeName = 'COLLEGE OF ENGINEERING POONJAR',
    examTitle,
    date,
    timeRange,
    hallPlans,
  } = params;

  const activePlans = hallPlans.filter((p) => p.totalStudents > 0);
  const pagesHtml: string[] = [];

  for (let i = 0; i < activePlans.length; i += 2) {
    const hall1 = activePlans[i];
    const hall2 = activePlans[i + 1];

    pagesHtml.push(`
      <div class="page" style="padding: 6px 10px; page-break-after: ${i + 2 < activePlans.length ? 'always' : 'avoid'};">
        ${renderHallSection(hall1, collegeName, examTitle, date, timeRange)}
        ${hall2 ? renderHallSection(hall2, collegeName, examTitle, date, timeRange) : ''}
      </div>
    `);
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Seating Arrangement - Consolidated (2 Halls / Page)</title>
        <style>
          ${PRINT_STYLES}
        </style>
      </head>
      <body>
        ${pagesHtml.join('')}
      </body>
    </html>
  `;
}
