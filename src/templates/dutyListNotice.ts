import { PRINT_STYLES } from './styles';
import { InvigilatorDutyAssignment, Staff } from '../core/types';

export interface DutyListNoticeProps {
  collegeName?: string;
  examTitle: string;
  dateRangeText: string;
  noticeDate: string;
  timeRangeText: string;
  dates: string[];
  staffList: Staff[];
  assignments: InvigilatorDutyAssignment[];
  signatoryText?: string;
}

export function generateDutyListNoticeHtml(props: DutyListNoticeProps): string {
  const {
    collegeName = 'COLLEGE OF ENGINEERING POONJAR',
    examTitle,
    dateRangeText,
    noticeDate,
    timeRangeText,
    dates,
    staffList,
    assignments,
    signatoryText = 'Principal',
  } = props;

  // Build a lookup set: `${staffId}_${date}`
  const dutySet = new Set(assignments.map((a) => `${a.staffId}_${a.date}`));

  // Header date columns (vertical text matching reference/Duty List.jpg)
  const dateColWidth = Math.floor(48 / Math.max(1, dates.length));
  const dateHeadersHtml = dates
    .map(
      (d) => `
      <th class="vertical-date-th" style="width: ${dateColWidth}%; border: 1px solid #000;">
        <div class="vertical-date-text">${d}</div>
      </th>
    `
    )
    .join('');

  // Table rows for all staff
  const rowsHtml = staffList
    .map((st, idx) => {
      const dateCells = dates
        .map((d) => {
          const hasDuty = dutySet.has(`${st.id}_${d}`);
          return `<td class="center" style="font-weight: 800; font-size: 11pt; border: 1px solid #000; text-align: center;">${
            hasDuty ? 'X' : ''
          }</td>`;
        })
        .join('');

      return `
        <tr style="height: 24px;">
          <td class="center numeric" style="width: 5%; font-weight: 600; text-align: center; border: 1px solid #000;">${
            idx + 1
          }</td>
          <td style="width: 30%; font-weight: 600; padding-left: 8px; border: 1px solid #000;">${
            st.name
          }</td>
          ${dateCells}
          <td style="width: 17%; border: 1px solid #000;"></td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invigilation Duty List</title>
        <style>
          ${PRINT_STYLES}
          table.duty-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 9.5pt;
          }
          table.duty-table th, table.duty-table td {
            border: 1px solid #000000;
          }
          table.duty-table th {
            background-color: #ffffff !important;
            font-weight: 700;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div style="text-align: center; margin-bottom: 8px;">
            <h1 style="font-size: 14pt; font-weight: 800; margin: 0 0 2px 0;">${collegeName}</h1>
            <h2 style="font-size: 10.5pt; font-weight: 700; margin: 0 0 3px 0;">${examTitle}</h2>
            <h3 style="font-size: 11pt; font-weight: 800; margin: 4px 0 2px 0;">INVIGILATION DUTY LIST (${dateRangeText})</h3>
          </div>

          <table class="duty-table">
            <thead>
              <tr>
                <th style="width: 5%;">Sl<br />No</th>
                <th style="width: 30%;">Name</th>
                ${dateHeadersHtml}
                <th style="width: 17%;">Signature</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 15px; display: flex; justify-content: space-between; font-weight: 700; font-size: 10pt;">
            <div>
              <div>Date : &nbsp; ${noticeDate}</div>
              <div style="margin-top: 4px;">Time : &nbsp; ${timeRangeText}</div>
            </div>
            <div style="text-align: right; width: 180px; padding-right: 15px;">
              ${signatoryText}
            </div>
          </div>

          <div class="notes-block">
            <p><strong>Note:</strong> The duty assigned staff members are directed to report at the Exam Cell at least 15 minutes prior to the commencement of exams.</p>
            <p>Duty adjustments should be done by invigilators themselves and inform exam cell.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}


