import { PRINT_STYLES } from './styles';
import { HallSeatingPlan } from '../core/types';

export interface InvigilatorSeatingSheetProps {
  collegeName?: string;
  examTitle: string;
  date: string;
  timeRange: string;
  hallPlan: HallSeatingPlan;
}

export function generateInvigilatorSeatingSheetHtml(props: InvigilatorSeatingSheetProps): string {
  const {
    collegeName = 'COLLEGE OF ENGINEERING, POONJAR',
    examTitle,
    date,
    timeRange,
    hallPlan,
  } = props;

  // Build matrix for Left seats (Table 1) and Right seats (Table 2)
  // Dynamic column detection: A, B for 2-column halls; A, B, C, D for 4-column halls
  const presentCols = (['A', 'B', 'C', 'D'] as const).filter((c) =>
    hallPlan.seats.some((s) => s.column === c)
  );
  const cols = presentCols.length > 0 ? presentCols : (['A', 'B', 'C', 'D'] as const);
  const colWidth = Math.floor(88 / cols.length);

  const maxBenchNo = Math.max(5, ...hallPlan.seats.map((s) => s.benchNo || 0));
  const rowNumbers = Array.from({ length: maxBenchNo }, (_, i) => i + 1);

  const hasMiddle = hallPlan.seats.some((s) => s.position === 'middle');

  function renderMatrix(side: 'left' | 'middle' | 'right', title: string) {
    const rowsHtml = rowNumbers
      .map((benchNo) => {
        const colCells = cols.map((col) => {
          const seat = hallPlan.seats.find(
            (s) => s.position === side && s.column === col && s.benchNo === benchNo
          );
          if (seat) {
            if (seat.student) {
              const grp = seat.student.groupId;
              const roll = seat.student.rollNo;
              const isWritingPad = seat.seatType === 'writing_pad';
              return `
                <td class="seat-cell">
                  <strong>${grp}</strong><br />${roll}
                  ${isWritingPad ? '<div style="font-size: 7.5pt; color: #555; font-weight: normal; margin-top: 1px;">[Textpad Chair]</div>' : ''}
                </td>
              `;
            }
            const isWritingPad = seat.seatType === 'writing_pad';
            return `<td class="seat-cell" style="color: #999;">${isWritingPad ? '- [Textpad]' : '-'}</td>`;
          }

          // Check if the other stream has a single textpad chair at this row and column
          const otherSeat = hallPlan.seats.find(
            (s) => s.column === col && s.benchNo === benchNo
          );
          if (otherSeat && otherSeat.seatType === 'writing_pad') {
            const otherSideLabel = otherSeat.position === 'left' ? 'Left' : otherSeat.position === 'middle' ? 'Middle' : 'Right';
            return `<td class="seat-cell" style="color: #888; font-size: 7.5pt; background: #fafafa; font-style: italic;">(Textpad on ${otherSideLabel})</td>`;
          }

          return `<td class="seat-cell" style="color: #bbb;">-</td>`;
        });

        return `
          <tr>
            <td class="center" style="font-weight: 700; width: 12%;">${benchNo}</td>
            ${colCells.join('')}
          </tr>
        `;
      })
      .join('');

    const headersHtml = cols
      .map((col) => `<th style="width: ${colWidth}%;">${col}</th>`)
      .join('');

    return `
      <div style="margin-top: 15px;">
        <div style="font-weight: 700; font-size: 10pt; margin-bottom: 4px; text-transform: uppercase;">${title}</div>
        <table class="seating-matrix">
          <thead>
            <tr>
              <th style="width: 12%;">Seat No.</th>
              ${headersHtml}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Seating Arrangement - ${hallPlan.hallName}</title>
        <style>${PRINT_STYLES}</style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <h1>${collegeName}</h1>
            <h2>${examTitle}</h2>
            <h3>SEATING ARRANGEMENT</h3>
            <div style="font-size: 13pt; font-weight: 800; margin-top: 8px;">HALL NO. : &nbsp; ${hallPlan.hallName}</div>
            <div class="meta-row">
              <div>DATE : ${date}</div>
              <div>TIME : ${timeRange}</div>
            </div>
          </div>

          ${renderMatrix('left', 'Table 1 (Bench Left Side)')}
          ${hasMiddle ? renderMatrix('middle', 'Table 2 (Bench Middle)') : ''}
          ${renderMatrix('right', hasMiddle ? 'Table 3 (Bench Right Side)' : 'Table 2 (Bench Right Side)')}

          <div style="margin-top: 40px; display: flex; justify-content: space-between;">
            <div>
              <strong>Total Students in Hall:</strong> ${hallPlan.totalStudents}
            </div>
            <div style="text-align: right; width: 300px;">
              <div style="margin-top: 35px; border-top: 1px solid #000; padding-top: 5px; font-weight: 700;">
                Name and Signature of Invigilator
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

