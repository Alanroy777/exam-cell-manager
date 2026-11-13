import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore, DEFAULT_TIMETABLE } from '../store';
import { generateTimetableNoticeHtml } from '../../templates/timetableNotice';
import { normalizeGroupId } from '../../core/validator';
import {
  normalizeDateStr,
  getWorkingDatesInRange,
  getDayOfWeekShort,
  shiftTimetableDates,
} from '../../core/dateUtils';
import {
  Calendar,
  Plus,
  Printer,
  Trash2,
  Clock,
  BookOpen,
  Save,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  Info,
  Sparkles,
} from 'lucide-react';

export const SessionsView: React.FC = () => {
  const {
    currentSession,
    timetable,
    students,
    openPreview,
    updateSession,
    syncTimetableDates,
    addTimetableEntry,
    updateTimetableEntryDate,
    deleteTimetableEntry,
    setTimetable,
  } = useAppStore();

  const [sessionForm, setSessionForm] = useState(currentSession);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    setSessionForm(currentSession);
  }, [currentSession]);

  const uniqueGroups = useMemo(() => {
    return Array.from(new Set(students.map((s) => normalizeGroupId(s.groupId)))).filter(Boolean).sort();
  }, [students]);

  // Compute all institutional working exam dates in the current session window
  const workingExamDates = useMemo(() => {
    return getWorkingDatesInRange(sessionForm.startDate, sessionForm.endDate);
  }, [sessionForm.startDate, sessionForm.endDate]);

  // Check if there are imported groups that have not yet been scheduled in the timetable
  const unscheduledGroups = useMemo(() => {
    return uniqueGroups.filter(
      (g) => !timetable.some((t) => normalizeGroupId(t.groupId) === g)
    );
  }, [uniqueGroups, timetable]);

  const [newEntry, setNewEntry] = useState({
    date: workingExamDates[0] || '08/12/2026',
    sessionSlot: 'FN' as 'FN' | 'AN',
    timeRange: '10.15 AM - 12.15 PM',
    groupId: uniqueGroups[0] || 'S3 CS A',
    subjectCode: 'CST 201',
    subjectName: 'Data Structures',
  });

  // When working exam dates change, make sure newEntry.date is valid
  useEffect(() => {
    if (workingExamDates.length > 0 && !workingExamDates.includes(newEntry.date)) {
      setNewEntry((prev) => ({ ...prev, date: workingExamDates[0] }));
    }
  }, [workingExamDates]);

  // When unique groups change, update newEntry.groupId
  useEffect(() => {
    if (uniqueGroups.length > 0 && !uniqueGroups.includes(newEntry.groupId)) {
      setNewEntry((prev) => ({ ...prev, groupId: uniqueGroups[0] }));
    }
  }, [uniqueGroups]);

  const handleSaveSession = async () => {
    const oldStartDate = currentSession.startDate;
    const oldEndDate = currentSession.endDate;
    await updateSession(sessionForm);

    const normStart = normalizeDateStr(sessionForm.startDate);
    const normEnd = normalizeDateStr(sessionForm.endDate);

    if (
      normalizeDateStr(oldStartDate) !== normStart ||
      normalizeDateStr(oldEndDate) !== normEnd
    ) {
      setSaveSuccess(
        `Exam session saved! Shifted timetable slots to match new exam window (${normStart} – ${normEnd}).`
      );
    } else {
      setSaveSuccess('Exam session configuration saved successfully!');
    }
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  const handleAddTimetableEntry = async () => {
    if (!newEntry.subjectCode) return;
    const targetDate = normalizeDateStr(newEntry.date) || newEntry.date;
    await addTimetableEntry({
      id: `tt-${Date.now()}`,
      sessionId: currentSession.id,
      ...newEntry,
      date: targetDate,
    });
    setSaveSuccess(
      `Slot added: ${targetDate} (${newEntry.sessionSlot}) — ${newEntry.groupId}. Seating arrangement updated automatically!`
    );
    setTimeout(() => setSaveSuccess(null), 3500);
    setNewEntry({
      ...newEntry,
      subjectCode: '',
      subjectName: '',
    });
  };

  const handleLoadDefaultSchedule = async () => {
    if (
      confirm(
        `Load standard series exam timetable schedule across the ${workingExamDates.length} exam dates (${workingExamDates[0]} to ${workingExamDates[workingExamDates.length - 1]})?`
      )
    ) {
      const seeded = shiftTimetableDates(
        DEFAULT_TIMETABLE,
        sessionForm.startDate,
        sessionForm.endDate
      ).map((t) => ({ ...t, sessionId: currentSession.id }));
      await setTimetable(seeded);
    }
  };

  const handleAutoScheduleImportedGroups = async () => {
    if (unscheduledGroups.length === 0) return;
    const dates = workingExamDates.length > 0 ? workingExamDates : [sessionForm.startDate];
    const newEntries = unscheduledGroups.map((group, idx) => {
      const targetDate = dates[idx % dates.length];
      const slot: 'FN' | 'AN' = idx % 2 === 0 ? 'FN' : 'AN';
      const timeRange = slot === 'FN' ? '10.15 AM - 12.15 PM' : '01.30 PM - 03.30 PM';
      return {
        id: `tt-auto-${Date.now()}-${idx}`,
        sessionId: currentSession.id,
        date: targetDate,
        sessionSlot: slot,
        timeRange,
        groupId: group,
        subjectCode: `${group.replace(/\s+/g, '')} 101`,
        subjectName: `${group} Examination Course`,
      };
    });

    const updated = [...timetable, ...newEntries];
    await setTimetable(updated);
    setSaveSuccess(`Auto-scheduled ${unscheduledGroups.length} imported group(s) across exam dates!`);
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  const handlePrintQpNotice = () => {
    const html = generateTimetableNoticeHtml({
      collegeName: 'COLLEGE OF ENGINEERING POONJAR',
      subtitle: 'A Unit of IHRD, Government of Kerala',
      noticeNo: 'CEP/EXAM/ST-REM/2026-27/01',
      noticeDate: sessionForm.startDate || '01/10/2026',
      academicYear: sessionForm.academicYear,
      seriesType: sessionForm.sessionType,
      scheduleItems: [
        { programmeDept: 'B.Tech — S3 / S5 / S7', firstSeriesDeadline: '19-08-2026 (Wed)', secondSeriesDeadline: sessionForm.endDate },
        { programmeDept: 'BCA — S3', firstSeriesDeadline: '19-08-2026 (Wed)', secondSeriesDeadline: sessionForm.endDate },
        { programmeDept: 'MCA — S3 / S1', firstSeriesDeadline: '19-08-2026 (Wed)', secondSeriesDeadline: sessionForm.endDate },
        { programmeDept: 'Diploma — S1 / S3 / S5', firstSeriesDeadline: '21-08-2026 (Fri)', secondSeriesDeadline: sessionForm.endDate },
      ],
      submissionDeadline: sessionForm.startDate,
      convenerName: sessionForm.signatoryConvener,
      principalName: sessionForm.signatoryHod,
    });

    openPreview('Timetable & QP Submission Circular to Faculty', html);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto flex flex-col h-full overflow-y-auto">
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

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveSession}
              className="flex items-center space-x-1.5 bg-navy-900 hover:bg-navy-800 text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Configuration</span>
            </button>

            <button
              onClick={handlePrintQpNotice}
              className="flex items-center space-x-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print QP & Timetable Notice</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs text-emerald-800 flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{saveSuccess}</span>
          </div>
        )}

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
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Exam Start Date <span className="text-slate-400 font-normal">(DD/MM/YYYY)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 08/12/2026"
              value={sessionForm.startDate}
              onChange={(e) => setSessionForm({ ...sessionForm, startDate: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-navy-950"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Exam End Date <span className="text-slate-400 font-normal">(DD/MM/YYYY)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 16/12/2026"
              value={sessionForm.endDate}
              onChange={(e) => setSessionForm({ ...sessionForm, endDate: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-navy-950"
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

        {/* Exam Window Summary Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-accent shrink-0" />
            <span>
              Exam Window: <strong>{workingExamDates.length} Working Days</strong> ({workingExamDates[0] || '—'} to {workingExamDates[workingExamDates.length - 1] || '—'}, Sundays excluded)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {workingExamDates.join(', ')}
          </span>
        </div>
      </div>

      {/* Timetable Entries Section */}
      <div className="bg-white border border-gov-border rounded p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-navy-950">
              Timetable Schedule per Group (Dates & Slots)
            </h2>
            <p className="text-xs text-slate-500">
              Classes scheduled here determine which students write exams in each slot.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {unscheduledGroups.length > 0 && (
              <button
                onClick={handleAutoScheduleImportedGroups}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors"
                title={`Auto-schedule ${unscheduledGroups.join(', ')} into timetable slots`}
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>Auto-Schedule {unscheduledGroups.length} Imported Group{unscheduledGroups.length > 1 ? 's' : ''}</span>
              </button>
            )}

            {timetable.length > 0 && (
              <button
                onClick={async () => {
                  await syncTimetableDates(sessionForm.startDate, sessionForm.endDate);
                  setSaveSuccess(
                    `Synchronized timetable schedule with exam window: ${sessionForm.startDate} – ${sessionForm.endDate}`
                  );
                  setTimeout(() => setSaveSuccess(null), 3000);
                }}
                className="flex items-center space-x-1.5 bg-navy-50 hover:bg-navy-100 text-navy-900 border border-navy-200 px-3 py-1.5 rounded text-xs font-semibold transition-colors"
                title="Shift all existing timetable slots to align with current exam start & end dates"
              >
                <RefreshCw className="w-3.5 h-3.5 text-accent" />
                <span>Sync Schedule to Exam Window</span>
              </button>
            )}

            <button
              onClick={handleLoadDefaultSchedule}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold transition-colors"
              title="Load standard timetable schedule across all exam dates"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{timetable.length === 0 ? 'Load Sample Schedule' : 'Reset to Sample'}</span>
            </button>
          </div>
        </div>

        {/* Add Entry Row */}
        <div className="bg-slate-50 border border-slate-200 rounded p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 text-xs items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Exam Date
            </label>
            <select
              value={newEntry.date}
              onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono font-bold text-navy-950"
            >
              {workingExamDates.map((d, i) => (
                <option key={d} value={d}>
                  {d} ({getDayOfWeekShort(d)} - Day {i + 1})
                </option>
              ))}
              {!workingExamDates.includes(newEntry.date) && (
                <option value={newEntry.date}>{newEntry.date}</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Slot</label>
            <select
              value={newEntry.sessionSlot}
              onChange={(e) => {
                const slot = e.target.value as 'FN' | 'AN';
                setNewEntry({
                  ...newEntry,
                  sessionSlot: slot,
                  timeRange: slot === 'FN' ? '10.15 AM - 12.15 PM' : '01.30 PM - 03.30 PM',
                });
              }}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-semibold"
            >
              <option value="FN">FN (Morning)</option>
              <option value="AN">AN (Afternoon)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Group</label>
            {uniqueGroups.length > 0 ? (
              <select
                value={newEntry.groupId}
                onChange={(e) => setNewEntry({ ...newEntry, groupId: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-semibold"
              >
                {uniqueGroups.map((g) => {
                  const count = students.filter(
                    (s) => normalizeGroupId(s.groupId) === g && s.status === 'active'
                  ).length;
                  return (
                    <option key={g} value={g}>
                      {g} ({count} students)
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                type="text"
                value={newEntry.groupId}
                onChange={(e) => setNewEntry({ ...newEntry, groupId: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-semibold"
              />
            )}
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
            disabled={!newEntry.subjectCode}
            className="bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white px-3 py-1.5 rounded font-semibold flex items-center justify-center space-x-1"
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
                <th className="px-4 py-2 w-48">Exam Date</th>
                <th className="px-4 py-2 w-24">Slot</th>
                <th className="px-4 py-2 w-36">Group</th>
                <th className="px-4 py-2 w-32">Subject Code</th>
                <th className="px-4 py-2">Subject Name</th>
                <th className="px-4 py-2 w-16 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timetable.map((item) => {
                const groupCount = students.filter(
                  (s) => normalizeGroupId(s.groupId) === normalizeGroupId(item.groupId) && s.status === 'active'
                ).length;
                const isWithinRange = workingExamDates.includes(item.date);

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <div className="flex items-center space-x-1.5">
                        <select
                          value={item.date}
                          onChange={(e) => updateTimetableEntryDate(item.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded px-2 py-1 font-mono font-semibold text-navy-950 cursor-pointer"
                          title="Click to move this subject to another exam date"
                        >
                          {workingExamDates.map((d, i) => (
                            <option key={d} value={d}>
                              {d} ({getDayOfWeekShort(d)} - Day {i + 1})
                            </option>
                          ))}
                          {!workingExamDates.includes(item.date) && (
                            <option value={item.date}>{item.date} (Outside Window)</option>
                          )}
                        </select>
                        {!isWithinRange && (
                          <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                            Old Date
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.sessionSlot === 'FN'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.sessionSlot}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-semibold text-navy-900">
                      {item.groupId}
                      {groupCount > 0 && (
                        <span className="text-[10px] font-normal text-slate-500 ml-1.5">
                          ({groupCount} students)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono font-bold text-accent">{item.subjectCode}</td>
                    <td className="px-4 py-2">{item.subjectName}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => deleteTimetableEntry(item.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Delete slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {timetable.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No individual subject timetable entered yet. Click "Load Sample Schedule" or add slots above.
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
