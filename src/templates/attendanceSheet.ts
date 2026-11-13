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
  courseCode?: string;
  students: Student[];
}

export function toRomanSemester(sem: string): string {
  if (!sem) return '';
  const clean = sem.trim().toUpperCase();
  const match = clean.match(/(\d+)/);
  if (!match) return clean.replace(/^S/i, '').trim();
  const num = parseInt(match[1], 10);
  const romanMap: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
    7: 'VII',
    8: 'VIII',
  };
  return romanMap[num] || clean;
}

export function formatAttendanceRollNo(rollNo: string, courseCode?: string): string {
  if (!rollNo) return '';
  const numMatch = rollNo.match(/(\d+)$/);
  if (numMatch && courseCode) {
    const num = parseInt(numMatch[1], 10);
    const padded = String(num).padStart(2, '0');
    return `${courseCode} ${padded}`;
  }
  return rollNo;
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
    courseCode,
    students,
  } = props;

  const romanSemester = toRomanSemester(semesterName);

  const rowsHtml = students
    .map((st, index) => {
      const rollDisplay = formatAttendanceRollNo(st.rollNo, courseCode);
      return `
      <tr style="height: 30px;">
        <td class="center numeric" style="width: 8%; font-weight: 700; text-align: center; border: 1px solid #000;">${index + 1}</td>
        <td class="numeric center" style="width: 18%; font-weight: 700; text-align: center; border: 1px solid #000;">${rollDisplay}</td>
        <td style="width: 44%; text-transform: uppercase; font-weight: 700; padding-left: 10px; border: 1px solid #000;">${st.name}</td>
        <td style="width: 30%; border: 1px solid #000;"></td>
      </tr>
    `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Attendance Sheet - ${hallName} - ${semesterName} ${branchName}</title>
        <style>
          ${PRINT_STYLES}
          .attendance-page-box {
            width: 100%;
            border: 2px solid #000000;
            padding: 22px 26px 30px 26px;
            box-sizing: border-box;
            min-height: 980px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
          }
          table.attendance-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            font-size: 10pt;
          }
          table.attendance-table th, table.attendance-table td {
            border: 1px solid #000000;
          }
          table.attendance-table th {
            background-color: #ffffff !important;
            font-weight: 800;
            text-align: center;
            padding: 6px;
            font-size: 10pt;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="attendance-page-box">
            <div>
              <div style="text-align: center; margin-bottom: 10px;">
                <h1 style="font-size: 13.5pt; font-weight: 800; margin: 0 0 3px 0; letter-spacing: 0.2px;">${collegeName}</h1>
                <h2 style="font-size: 10.5pt; font-weight: 700; margin: 0 0 4px 0;">${examTitle}</h2>
                <h3 style="font-size: 11.5pt; font-weight: 800; margin: 4px 0 2px 0;">Attendance Sheet</h3>
                <div style="font-size: 10.5pt; font-weight: 800; margin-top: 6px;">Hall No: &nbsp;&nbsp;&nbsp;&nbsp; ${hallName}</div>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 10.5pt; font-weight: 700; margin-bottom: 6px; padding: 0 2px;">
                <div>Date : ${date}</div>
                <div>Time : &nbsp; ${timeRange}</div>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 10.5pt; font-weight: 700; margin-bottom: 8px; padding: 0 2px;">
                <div>Branch :${branchName}</div>
                <div>Semester : &nbsp; ${romanSemester}</div>
              </div>

              <table class="attendance-table">
                <thead>
                  <tr style="height: 28px;">
                    <th style="width: 8%;">Sl<br />No</th>
                    <th style="width: 18%;">Roll No</th>
                    <th style="width: 44%;">Name of student</th>
                    <th style="width: 30%;">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>

            <div style="margin-top: 35px; page-break-inside: avoid; font-size: 10.5pt; font-weight: 700; line-height: 1.8;">
              <div style="margin-bottom: 22px;">Name and Signature of Invigilator</div>
              <div>Roll nos of Absentees : </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
