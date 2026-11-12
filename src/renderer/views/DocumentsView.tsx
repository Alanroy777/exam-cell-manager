import React, { useState } from 'react';
import { useAppStore } from '../store';
import { generateAllSessionDocuments } from '../../core/documentGenerator';
import { api } from '../api';
import {
  Printer,
  Eye,
  Download,
  FolderDown,
  FileText,
  Building2,
  Users,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const DocumentsView: React.FC = () => {
  const {
    students,
    halls,
    staff,
    currentSession,
    seatingResult,
    invigilatorAssignments,
    openPreview,
    settings,
  } = useAppStore();

  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const dates = ['09/10/2026', '12/10/2026', '13/10/2026', '14/10/2026', '15/10/2026'];

  const allDocs = generateAllSessionDocuments({
    collegeName: settings.collegeName,
    examTitle: currentSession.name,
    date: '09/10/2026',
    timeRange: currentSession.defaultTime,
    hallPlans: seatingResult?.hallPlans || [],
    dates,
    staffList: staff,
    dutyAssignments: invigilatorAssignments,
    scheduleItems: [
      { programmeDept: 'B.Tech — S3 / S5 / S7', firstSeriesDeadline: '19-08-2026 (Wed)', secondSeriesDeadline: '16-10-2026 (Fri)' },
      { programmeDept: 'BCA — S3', firstSeriesDeadline: '19-08-2026 (Wed)', secondSeriesDeadline: '16-10-2026 (Fri)' },
      { programmeDept: 'MCA — S3 / S1', firstSeriesDeadline: '19-08-2026 (Wed)', secondSeriesDeadline: '16-10-2026 (Fri)' },
      { programmeDept: 'Diploma — S1 / S3 / S5', firstSeriesDeadline: '21-08-2026 (Fri)', secondSeriesDeadline: '16-10-2026 (Fri)' },
    ],
    submissionDeadline: '05/10/2026',
  });

  const handlePreview = (title: string, html: string) => {
    openPreview(title, html);
  };

  const handlePrint = (html: string) => {
    api.printDocument(html);
  };

  const handleSavePdf = (title: string, html: string) => {
    const filename = `${title.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`;
    api.saveDocumentAsPdf(html, filename);
  };

  const handleBatchExportAll = async () => {
    setIsExportingAll(true);
    setExportMessage(null);

    const docList: { filename: string; html: string }[] = [];

    // 1. Hall Allocation Notice
    docList.push({
      filename: `01_Hall_Allocation_Notice_${currentSession.startDate}.pdf`,
      html: allDocs.hallAllocationNotice,
    });

    // 2. Invigilator Seating Sheets
    allDocs.seatingSheets.forEach((s) => {
      docList.push({
        filename: `02_Seating_Arrangement_Hall_${s.hallName}.pdf`,
        html: s.html,
      });
    });

    // 3. Attendance Sheets
    allDocs.attendanceSheets.forEach((a) => {
      docList.push({
        filename: `03_Attendance_Sheet_${a.hallName}_${a.groupName}.pdf`,
        html: a.html,
      });
    });

    // 4. Invigilation Duty List Notice
    docList.push({
      filename: `04_Invigilation_Duty_List_Notice.pdf`,
      html: allDocs.dutyListNotice,
    });

    // 5. Timetable & QP Notice
    docList.push({
      filename: `05_Timetable_and_QP_Submission_Notice.pdf`,
      html: allDocs.timetableNotice,
    });

    const res = await api.saveAllDocumentsAsPdf(docList);
    setIsExportingAll(false);
    if (res.success) {
      setExportMessage(`Successfully exported all ${res.count} print documents to: ${res.folderPath}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-navy-950 uppercase tracking-tight">
            Official Exam Cell Documents & Printing
          </h1>
          <p className="text-xs text-slate-500">
            A4 Print-ready official institutional notices, seating bench sheets, and per-group attendance sheets.
          </p>
        </div>

        <button
          onClick={handleBatchExportAll}
          disabled={isExportingAll}
          className="flex items-center space-x-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
        >
          <FolderDown className="w-4 h-4" />
          <span>{isExportingAll ? 'Generating PDFs...' : 'Print All for Session (Batch Export)'}</span>
        </button>
      </div>

      {exportMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportMessage}</span>
        </div>
      )}

      {/* Grid of Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Document 1: Hall Allocation Notice */}
        <div className="bg-white border border-gov-border rounded p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div>
            <div className="flex items-center space-x-2 text-navy-900 font-bold text-xs uppercase tracking-wider mb-1">
              <FileText className="w-4 h-4 text-accent" />
              <span>1. Hall Allocation Notice (Notice Board)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Consolidated notice displayed on the student notice board showing Room Number, Course, and Roll Number ranges.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              onClick={() => handlePreview('Hall Allocation Notice', allDocs.hallAllocationNotice)}
              className="flex items-center space-x-1 px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => handlePrint(allDocs.hallAllocationNotice)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded text-xs font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={() => handleSavePdf('Hall_Allocation_Notice', allDocs.hallAllocationNotice)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save PDF</span>
            </button>
          </div>
        </div>

        {/* Document 2: Invigilation Duty List Notice */}
        <div className="bg-white border border-gov-border rounded p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div>
            <div className="flex items-center space-x-2 text-navy-900 font-bold text-xs uppercase tracking-wider mb-1">
              <Calendar className="w-4 h-4 text-accent" />
              <span>2. Invigilation Duty List Notice</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Official faculty circular with date columns, duty markers ('X'), general guidelines, and signatory space.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              onClick={() => handlePreview('Invigilation Duty List Notice', allDocs.dutyListNotice)}
              className="flex items-center space-x-1 px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => handlePrint(allDocs.dutyListNotice)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded text-xs font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={() => handleSavePdf('Invigilation_Duty_List_Notice', allDocs.dutyListNotice)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save PDF</span>
            </button>
          </div>
        </div>

        {/* Document 3: Timetable & Question Paper Circular */}
        <div className="bg-white border border-gov-border rounded p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div>
            <div className="flex items-center space-x-2 text-navy-900 font-bold text-xs uppercase tracking-wider mb-1">
              <FileText className="w-4 h-4 text-accent" />
              <span>3. Request for Timetable & QP Submission Notice</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Formal reminder circular to department heads and lecturers specifying academic deadlines and syllabus coverage.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              onClick={() => handlePreview('Timetable & QP Submission Notice', allDocs.timetableNotice)}
              className="flex items-center space-x-1 px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => handlePrint(allDocs.timetableNotice)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded text-xs font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={() => handleSavePdf('Timetable_and_QP_Submission_Notice', allDocs.timetableNotice)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save PDF</span>
            </button>
          </div>
        </div>

        {/* Document 4: Invigilator Seating Sheets (Per Hall) */}
        <div className="bg-white border border-gov-border rounded p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div>
            <div className="flex items-center space-x-2 text-navy-900 font-bold text-xs uppercase tracking-wider mb-1">
              <Building2 className="w-4 h-4 text-accent" />
              <span>4. Invigilator Seating Sheets ({allDocs.seatingSheets.length} Halls)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Seat-by-seat bench layout carried by invigilators to each hall showing exactly who sits at each bench position.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {allDocs.seatingSheets.map((sheet) => (
                <button
                  key={sheet.hallName}
                  onClick={() => handlePreview(`Seating Arrangement - Hall ${sheet.hallName}`, sheet.html)}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-navy-900 border border-slate-200"
                >
                  Hall {sheet.hallName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Document 5: Attendance Sheets (Per Group per Hall) */}
        <div className="md:col-span-2 bg-white border border-gov-border rounded p-5 space-y-4 shadow-xs">
          <div>
            <div className="flex items-center space-x-2 text-navy-900 font-bold text-xs uppercase tracking-wider mb-1">
              <Users className="w-4 h-4 text-accent" />
              <span>5. Student Attendance Sheets ({allDocs.attendanceSheets.length} Sheets)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              One sheet per group per hall (e.g. Hall D101 holding S1 MCA and S1 EC has two distinct attendance sheets). Includes signature column and absentee summary.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
              {allDocs.attendanceSheets.map((att, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2"
                >
                  <div>
                    <div className="font-bold text-xs text-navy-950 truncate">Hall {att.hallName}</div>
                    <div className="text-[11px] font-semibold text-accent truncate">{att.groupName}</div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handlePreview(`Attendance Sheet - Hall ${att.hallName} - ${att.groupName}`, att.html)}
                      className="flex-1 py-1 text-center bg-white border border-slate-300 rounded text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handlePrint(att.html)}
                      className="px-2 py-1 bg-navy-900 text-white rounded text-[11px] hover:bg-navy-800"
                      title="Print Sheet"
                    >
                      <Printer className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

