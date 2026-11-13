import { PRINT_STYLES } from './styles';

export interface TimetableNoticeProps {
  collegeName?: string;
  subtitle?: string;
  noticeNo?: string;
  noticeDate: string;
  academicYear: string;
  seriesType: 'First Series' | 'Second Series';
  scheduleItems: {
    programmeDept: string;
    firstSeriesDeadline: string;
    secondSeriesDeadline: string;
  }[];
  submissionDeadline: string;
  convenerName?: string;
  principalName?: string;
}

export function generateTimetableNoticeHtml(props: TimetableNoticeProps): string {
  const {
    collegeName = 'COLLEGE OF ENGINEERING POONJAR',
    noticeDate,
    academicYear = '2026-27',
    seriesType = 'Second Series',
    scheduleItems = [],
    submissionDeadline = '05.10.2026',
    principalName = 'PRINCIPAL',
  } = props;

  const scheduleRows = scheduleItems
    .map(
      (item) => `
      <tr>
        <td style="font-weight: 700; border: 1px solid #000; padding: 6px 10px;">${item.programmeDept}</td>
        <td class="center numeric" style="border: 1px solid #000; text-align: center; padding: 6px 10px;">${item.firstSeriesDeadline}</td>
        <td class="center numeric" style="border: 1px solid #000; text-align: center; padding: 6px 10px;">${item.secondSeriesDeadline}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Examination Notice & Question Paper Submission Circular</title>
        <style>
          ${PRINT_STYLES}
        </style>
      </head>
      <body>
        <div class="page">
          <div style="display: flex; justify-content: flex-end; font-size: 11pt; font-weight: 700; margin-bottom: 25px;">
            Dated: ${noticeDate}
          </div>

          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="font-size: 13pt; font-weight: 800; text-decoration: underline; letter-spacing: 1px; margin: 0;">NOTICE</h2>
            <div style="font-size: 10pt; font-weight: 700; margin-top: 4px; color: #222;">EXAMINATION CELL - CIRCULAR</div>
          </div>

          <div style="font-size: 11pt; line-height: 1.6; text-align: justify;">
            <p style="margin-bottom: 16px;">
              The ${seriesType.toLowerCase()} examination for odd semesters (Academic Year ${academicYear}) will be conducted as per the university and state board schedule.
            </p>

            <p style="margin-bottom: 16px;">
              <strong>Time of exam:</strong><br />
              10:15 am – 12:15 pm (Forenoon) &nbsp;|&nbsp; 01:30 pm – 03:30 pm (Afternoon)
            </p>

            <p style="margin-bottom: 16px;">
              The faculty members are directed to upload their Question Paper in PDF format in the prescribed template, on or before <strong>${submissionDeadline}</strong>.
            </p>

            <p style="margin-bottom: 16px;">
              The Google form link for uploading the Question Paper will be available in your college e-mail.
            </p>

            <p style="margin-bottom: 20px;">
              Class tutors of respective classes are directed to prepare and share the detailed exam timetable in the student class groups. Also, send a copy of the timetable to the internal exam coordinators.
            </p>
          </div>

          ${
            scheduleItems.length > 0
              ? `
          <div style="margin-top: 15px; margin-bottom: 10px;">
            <div style="font-weight: 800; font-size: 10.5pt; margin-bottom: 6px; text-transform: uppercase;">
              Series Test Schedule Summary (AY ${academicYear}):
            </div>
            <table class="doc-table">
              <thead>
                <tr>
                  <th style="width: 44%;">Department / Semester</th>
                  <th style="width: 28%;">First Series Deadline</th>
                  <th style="width: 28%;">Second Series Deadline</th>
                </tr>
              </thead>
              <tbody>
                ${scheduleRows}
              </tbody>
            </table>
          </div>
          `
              : ''
          }

          <div style="margin-top: 50px; display: flex; justify-content: flex-end;">
            <div style="text-align: center; width: 220px; font-weight: 800; font-size: 11pt;">
              ${principalName}
            </div>
          </div>

          <div style="margin-top: 40px; font-size: 10pt; font-weight: 600;">
            <div>Circulate:</div>
            <div style="margin-top: 4px; font-weight: 500;">Among all faculty members handling odd semester classes</div>
          </div>
        </div>
      </body>
    </html>
  `;
}


