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

  // Header date columns
  const dateHeadersHtml = dates
    .map((d) => `<th style="width: ${Math.floor(45 / dates.length)}%;">${d}</th>`)
    .join('');

  // Table rows for all staff
  const rowsHtml = staffList
    .map((st, idx) => {
      const dateCells = dates
        .map((d) => {
          const hasDuty = dutySet.has(`${st.id}_${d}`);
          return `<td class="center" style="font-weight: 800; font-size: 11pt;">${hasDuty ? 'X' : ''}</td>`;
        })
        .join('');

      return `
        <tr>
          <td class="center numeric" style="width: 6%; font-weight: 600;">${idx + 1}</td>
          <td style="width: 25%; font-weight: 600;">${st.name}</td>
          ${dateCells}
          <td style="width: 15%;"></td>
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
        <style>${PRINT_STYLES}</style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <h1>${collegeName}</h1>
            <h2>${examTitle}</h2>
            <h3>INVIGILATION DUTY LIST (${dateRangeText})</h3>
          </div>

          <table class="doc-table">
            <thead>
              <tr>
                <th style="width: 6%;">Sl No</th>
                <th style="width: 25%;">Name</th>
                ${dateHeadersHtml}
                <th style="width: 15%;">Signature</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 15px; font-weight: 600; font-size: 10pt;">
            <div>Date : ${noticeDate}</div>
            <div style="margin-top: 5px;">Time : ${timeRangeText}</div>
          </div>

          <div class="notes-block">
            <p><strong>Note:</strong> The duty assigned staff members are directed to report at the Exam Cell at least 15 minutes prior to the commencement of exams.</p>
            <p>Duty adjustments should be done by invigilators themselves and inform exam cell.</p>
          </div>

          <div class="signatory-block" style="justify-content: flex-end; margin-top: 30px;">
            <div class="signatory-col">
              <div class="signatory-line">${signatoryText}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

