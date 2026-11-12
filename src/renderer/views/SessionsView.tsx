import React, { useState } from 'react';
import { useAppStore } from '../store';
import { generateTimetableNoticeHtml } from '../../templates/timetableNotice';
import { Calendar, Plus, Printer, Trash2, Clock, BookOpen } from 'lucide-react';

export const SessionsView: React.FC = () => {
  const { currentSession, timetable, openPreview } = useAppStore();

  const [sessionForm, setSessionForm] = useState(currentSession);
  const [timetableEntries, setTimetableEntries] = useState(timetable);

  const [newEntry, setNewEntry] = useState({
    date: '09/10/2026',
    sessionSlot: 'FN' as 'FN' | 'AN',
    timeRange: '10.15 AM - 12.15 PM',
    groupId: 'S3 CS A',
    subjectCode: 'CST 201',
    subjectName: 'Data Structures',
  });

  const handleAddTimetableEntry = () => {
    if (!newEntry.subjectCode) return;
    setTimetableEntries([
      ...timetableEntries,
      {
        id: `tt-${Date.now()}`,
        sessionId: currentSession.id,
        ...newEntry,
      },
    ]);
    setNewEntry({
      ...newEntry,
      subjectCode: '',
      subjectName: '',
    });
  };

  const handlePrintQpNotice = () => {
    const html = generateTimetableNoticeHtml({
      collegeName: 'COLLEGE OF ENGINEERING POONJAR',
      subtitle: 'A Unit of IHRD, Government of Kerala',
      noticeNo: 'CEP/EXAM/ST-REM/2026-27/01',
      noticeDate: '01/10/2026',
      academicYear: sessionForm.academicYear,
      seriesType: sessionForm.sessionType,
      scheduleItems: [
        { programmeDept: 'B.Tech — S3 / S5 / S7', firstSeriesDeadline: '19-08-2026 (Wed)', secondSeriesDeadline: '16-10-2026 (Fri)' },
        { programmeDept: 'BCA — S3', firstSeriesDeadline: '19-08-2026 (Wed)', secondSeriesDeadline: '16-10-2026 (Fri)' },
        { programmeDept: 'MCA — S3 / S1', firstSeriesDeadline: '19-08-2026 (Wed)', secondSeriesDeadline: '16-10-2026 (Fri)' },
        { programmeDept: 'Diploma — S1 / S3 / S5', firstSeriesDeadline: '21-08-2026 (Fri)', secondSeriesDeadline: '16-10-2026 (Fri)' },
      ],
      submissionDeadline: '05/10/2026',
      convenerName: sessionForm.signatoryConvener,
      principalName: sessionForm.signatoryHod,
    });

    openPreview('Timetable & QP Submission Circular to Faculty', html);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto flex flex-col h-full overflow-y-auto">
      {/* Session Parameters */}
      <div className="bg-white border border-gov-border rounded p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-navy-950">
              Exam Session Configuration
            </h2>
            <p className="text-xs text-slate-500">
              Set the university exam window, series cycle, and signatory details.
            </p>
          </div>

          <button
            onClick={handlePrintQpNotice}
            className="flex items-center space-x-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print QP & Timetable Request Notice</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Session Name</label>
            <input
              type="text"
              value={sessionForm.name}
              onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-bold text-navy-950"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Academic Year</label>
            <input
              type="text"
              value={sessionForm.academicYear}
              onChange={(e) => setSessionForm({ ...sessionForm, academicYear: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Series Cycle</label>
            <select
              value={sessionForm.sessionType}
              onChange={(e) => setSessionForm({ ...sessionForm, sessionType: e.target.value as any })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5"
            >
              <option value="First Series">First Series Exam</option>
              <option value="Second Series">Second Series Exam</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Default Slot Time</label>
            <input
              type="text"
              value={sessionForm.defaultTime}
              onChange={(e) => setSessionForm({ ...sessionForm, defaultTime: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs pt-1">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Exam Start Date</label>
            <input
              type="text"
              value={sessionForm.startDate}
              onChange={(e) => setSessionForm({ ...sessionForm, startDate: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Exam End Date</label>
            <input
              type="text"
              value={sessionForm.endDate}
              onChange={(e) => setSessionForm({ ...sessionForm, endDate: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Exam Cell Convener</label>
            <input
              type="text"
              value={sessionForm.signatoryConvener}
              onChange={(e) => setSessionForm({ ...sessionForm, signatoryConvener: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Head of Institution / HOD</label>
            <input
              type="text"
              value={sessionForm.signatoryHod}
              onChange={(e) => setSessionForm({ ...sessionForm, signatoryHod: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5"
            />
          </div>
        </div>
      </div>

      {/* Timetable Entries Section */}
      <div className="bg-white border border-gov-border rounded p-5 space-y-4 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-navy-950">
          Timetable Schedule per Group
        </h2>

        {/* Add Entry Row */}
        <div className="bg-slate-50 border border-slate-200 rounded p-3 grid grid-cols-1 md:grid-cols-6 gap-3 text-xs items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Date</label>
            <input
              type="text"
              value={newEntry.date}
              onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Slot</label>
            <select
              value={newEntry.sessionSlot}
              onChange={(e) => setNewEntry({ ...newEntry, sessionSlot: e.target.value as any })}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5"
            >
              <option value="FN">FN (Morning)</option>
              <option value="AN">AN (Afternoon)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Group</label>
            <input
              type="text"
              value={newEntry.groupId}
              onChange={(e) => setNewEntry({ ...newEntry, groupId: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Subject Code</label>
            <input
              type="text"
              placeholder="e.g. CST 201"
              value={newEntry.subjectCode}
              onChange={(e) => setNewEntry({ ...newEntry, subjectCode: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Subject Name</label>
            <input
              type="text"
              placeholder="e.g. Data Structures"
              value={newEntry.subjectName}
              onChange={(e) => setNewEntry({ ...newEntry, subjectName: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5"
            />
          </div>

          <button
            onClick={handleAddTimetableEntry}
            className="bg-navy-900 hover:bg-navy-800 text-white px-3 py-1.5 rounded font-semibold flex items-center justify-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Slot</span>
          </button>
        </div>

        {/* Timetable List Table */}
        <div className="border border-gov-border rounded overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gov-header text-navy-950 font-bold uppercase border-b border-gov-border">
              <tr>
                <th className="px-4 py-2 w-28">Date</th>
                <th className="px-4 py-2 w-20">Slot</th>
                <th className="px-4 py-2 w-32">Group</th>
                <th className="px-4 py-2 w-32">Subject Code</th>
                <th className="px-4 py-2">Subject Name</th>
                <th className="px-4 py-2 w-16 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timetableEntries.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono">{item.date}</td>
                  <td className="px-4 py-2 font-bold">{item.sessionSlot}</td>
                  <td className="px-4 py-2 font-semibold text-navy-900">{item.groupId}</td>
                  <td className="px-4 py-2 font-mono font-bold">{item.subjectCode}</td>
                  <td className="px-4 py-2">{item.subjectName}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setTimetableEntries(timetableEntries.filter((t) => t.id !== item.id))}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {timetableEntries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No individual subject timetable entered yet. Default dates (09/10/2026 - 16/10/2026) are applied for series seating.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

