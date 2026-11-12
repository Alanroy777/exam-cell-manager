import { PRINT_STYLES } from './styles';
import { Student } from '../core/types';

export interface AttendanceSheetProps {
  collegeName?: string;
  examTitle: string;
  hallName: string;
  date?: string;
  timeRange: string;
  branchName: string;
  semesterName: string;
  students: Student[];
}

export function generateAttendanceSheetHtml(props: AttendanceSheetProps): string {
  const {
    collegeName = 'COLLEGE OF ENGINEERING POONJAR',
    examTitle,
    hallName,
    date = '…..............................',
    timeRange = '10.15 AM - 12.15 PM',
    branchName,
    semesterName,
    students,
  } = props;

  const rowsHtml = students
    .map(
      (st, index) => `
      <tr>
        <td class="center numeric" style="width: 8%; font-weight: 600;">${index + 1}</td>
        <td class="numeric" style="width: 18%; font-weight: 600;">${st.rollNo}</td>
        <td style="width: 44%; text-transform: uppercase;">${st.name}</td>
        <td style="width: 30%;"></td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Attendance Sheet - ${hallName} - ${semesterName} ${branchName}</title>
        <style>${PRINT_STYLES}</style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <h1>${collegeName}</h1>
            <h2>${examTitle}</h2>
            <h3>Attendance Sheet</h3>
            <div style="font-size: 13pt; font-weight: 800; margin-top: 6px;">Hall No: &nbsp; ${hallName}</div>
            <div class="meta-row">
              <div>Date : ${date}</div>
              <div>Time : ${timeRange}</div>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-top: 6px; font-size: 10.5pt;">
              <div>Branch : ${branchName}</div>
              <div>Semester : ${semesterName}</div>
            </div>
          </div>

          <table class="doc-table">
            <thead>
              <tr>
                <th style="width: 8%;">Sl No</th>
                <th style="width: 18%;">Roll No</th>
                <th style="width: 44%;">Name of student</th>
                <th style="width: 30%;">Signature</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 40px; page-break-inside: avoid;">
            <div style="margin-bottom: 25px; font-weight: 700; font-size: 10.5pt;">
              Name and Signature of Invigilator :
            </div>
            <div style="font-weight: 700; font-size: 10.5pt;">
              Roll nos of Absentees :
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

