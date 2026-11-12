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
    subtitle = 'A Unit of IHRD, Government of Kerala',
    noticeNo = 'CEP/EXAM/ST-REM/2026-27/01',
    noticeDate,
    academicYear,
    seriesType,
    scheduleItems,
    submissionDeadline,
    convenerName = 'Exam Cell Convener',
    principalName = 'Principal / HOD',
  } = props;

  const scheduleRows = scheduleItems
    .map(
      (item) => `
      <tr>
        <td style="font-weight: 600;">${item.programmeDept}</td>
        <td class="center numeric">${item.firstSeriesDeadline}</td>
        <td class="center numeric">${item.secondSeriesDeadline}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Timetable and Question Paper Submission Circular</title>
        <style>${PRINT_STYLES}</style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <h1>${collegeName}</h1>
            <h2 style="font-weight: 600; font-size: 10pt; text-transform: none;">${subtitle}</h2>
            <h3>EXAMINATION CELL - CIRCULAR</h3>
            <div class="meta-row">
              <div>Ref No : ${noticeNo}</div>
              <div>Date : ${noticeDate}</div>
            </div>
          </div>

          <div style="margin: 15px 0 10px 0; font-size: 11pt; line-height: 1.5;">
            <p><strong>Sub:</strong> Conduct of ${seriesType} Examinations (Academic Year ${academicYear}) - Request for Timetable and Question Paper Submission - Reg.</p>
            <p>Faculty members handling courses for the odd semesters are hereby informed that the ${seriesType} Examinations will be conducted as per the academic calendar schedule specified below:</p>
          </div>

          <table class="doc-table">
            <thead>
              <tr>
                <th style="width: 40%;">Department / Semester</th>
                <th style="width: 30%;">First Series Test Deadline</th>
                <th style="width: 30%;">Second Series Test Deadline</th>
              </tr>
            </thead>
            <tbody>
              ${scheduleRows}
            </tbody>
          </table>

          <div style="margin-top: 15px; font-size: 10pt; line-height: 1.5;">
            <p><strong>Guidelines for Question Paper Submission:</strong></p>
            <ol style="margin: 5px 0; padding-left: 20px;">
              <li>Syllabus Coverage: Two full modules as mandated by the University / State Board curriculum.</li>
              <li>Question papers must follow the standard KTU format with Course Outcomes (CO) and Bloom's Taxonomy levels marked.</li>
              <li>A typed copy of the Question Paper along with Scheme of Evaluation must be submitted to the Exam Cell on or before <strong>${submissionDeadline}</strong>.</li>
              <li>Class tutors are requested to verify student registration lists and notify the Exam Cell of any dropouts or condonation cases.</li>
            </ol>
          </div>

          <div class="signatory-block" style="margin-top: 50px;">
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

