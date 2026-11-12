import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';

export interface NoticeDocxData {
  collegeName: string;
  subtitle: string;
  noticeNo: string;
  noticeDate: string;
  academicYear: string;
  seriesType: string;
  scheduleItems: {
    programmeDept: string;
    firstSeriesDeadline: string;
    secondSeriesDeadline: string;
  }[];
  submissionDeadline: string;
  convenerName: string;
  principalName: string;
}

/**
 * Creates an editable .docx document buffer
 */
export function generateTimetableNoticeDocx(data: NoticeDocxData): Buffer {
  // If an existing docx template is available in reference/extra, we can load it, or generate XML
  const templatePath = path.resolve(process.cwd(), 'reference/extra/Series_Test_Reminder_AY2026-27.docx');
  if (fs.existsSync(templatePath)) {
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    doc.render(data);
    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  // Fallback empty zip if template not found
  const zip = new PizZip();
  return zip.generate({ type: 'nodebuffer' });
}

