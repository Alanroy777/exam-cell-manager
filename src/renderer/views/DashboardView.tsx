import React from 'react';
import { useAppStore } from '../store';
import { normalizeGroupId } from '../../core/validator';
import {
  Users,
  Building2,
  Grid3X3,
  UserCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    students,
    halls,
    staff,
    currentSession,
    timetable,
    seatingResult,
    setCurrentTab,
    generateSeating,
  } = useAppStore();

  const activeStudents = students.filter((s) => s.status === 'active');
  const droppedCount = students.filter((s) => s.status === 'dropped').length;
  const availableHalls = halls.filter((h) => h.isAvailable);

  // Group breakdown
  const groupCounts: Record<string, number> = {};
  for (const s of activeStudents) {
    const gid = normalizeGroupId(s.groupId);
    groupCounts[gid] = (groupCounts[gid] || 0) + 1;
  }

  const seatingErrors = seatingResult?.violations.filter((v) => v.severity === 'error') || [];
  const scheduledDates = Array.from(new Set(timetable.map((t) => t.date)));

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto overflow-y-auto h-full">
      {/* Session Hero Banner */}
      <div className="bg-navy-900 border border-navy-800 text-white rounded p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-accent-border text-xs font-bold uppercase tracking-wider mb-1">
              <Calendar className="w-4 h-4" />
              <span>Series Examination Portal • Academic Year {currentSession.academicYear}</span>
            </div>
            <h1 className="text-xl font-bold">{currentSession.name}</h1>
            <p className="text-xs text-slate-300 mt-1">
              Dates: <strong>{currentSession.startDate}</strong> to <strong>{currentSession.endDate}</strong> • Default Slot: <strong>{currentSession.defaultTime}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setCurrentTab('sessions')}
              className="bg-navy-800 hover:bg-navy-700 border border-navy-700 text-white px-3.5 py-2 rounded text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Calendar className="w-4 h-4 text-accent" />
              <span>Sessions & Timetable</span>
            </button>
            <button
              onClick={() => {
                generateSeating();
                setCurrentTab('seating');
              }}
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Grid3X3 className="w-4 h-4" />
              <span>Generate Seating</span>
            </button>
            <button
              onClick={() => setCurrentTab('documents')}
              className="bg-navy-700 hover:bg-navy-600 border border-navy-600 text-white px-4 py-2 rounded text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Print Documents</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Students */}
        <div
          onClick={() => setCurrentTab('students')}
          className="bg-white border border-gov-border rounded p-4 cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Students</span>
            <Users className="w-4 h-4 text-navy-800" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-navy-950">
            {activeStudents.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {droppedCount > 0 ? `${droppedCount} dropped` : '0 dropouts'} across {Object.keys(groupCounts).length} groups
          </div>
        </div>

        {/* Metric 2: Halls */}
        <div
          onClick={() => setCurrentTab('halls')}
          className="bg-white border border-gov-border rounded p-4 cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Exam Halls</span>
            <Building2 className="w-4 h-4 text-navy-800" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-navy-950">
            {availableHalls.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {availableHalls.length * 40} max seats capacity
          </div>
        </div>

        {/* Metric 3: Timetable */}
        <div
          onClick={() => setCurrentTab('sessions')}
          className="bg-white border border-gov-border rounded p-4 cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Timetable Slots</span>
            <Calendar className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-navy-950">
            {timetable.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {scheduledDates.length} exam dates scheduled
          </div>
        </div>

        {/* Metric 4: Seating */}
        <div
          onClick={() => setCurrentTab('seating')}
          className="bg-white border border-gov-border rounded p-4 cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Seating Status</span>
            <Grid3X3 className="w-4 h-4 text-navy-800" />
          </div>
          <div className="text-sm font-bold flex items-center space-x-1.5 mt-1.5">
            {seatingResult ? (
              seatingErrors.length === 0 ? (
                <span className="text-emerald-700 flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valid & Ready</span>
                </span>
              ) : (
                <span className="text-red-600 flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{seatingErrors.length} Violations</span>
                </span>
              )
            ) : (
              <span className="text-slate-500">Not Generated Yet</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {seatingResult ? `${seatingResult.hallPlans.length} halls allocated` : 'Strict non-adjacent rule'}
          </div>
        </div>

        {/* Metric 5: Faculty */}
        <div
          onClick={() => setCurrentTab('invigilators')}
          className="bg-white border border-gov-border rounded p-4 cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Faculty Roster</span>
            <UserCheck className="w-4 h-4 text-navy-800" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-navy-950">
            {staff.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {staff.filter((s) => s.isExamCellMember).length} Exam Cell members
          </div>
        </div>
      </div>

      {/* Main Grid: Student Groups List & Workflow Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Student Groups Table */}
        <div className="lg:col-span-2 bg-white border border-gov-border rounded overflow-hidden">
          <div className="p-4 border-b border-gov-border flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-navy-950">
              Active Student Groups in Current Exam
            </h2>
            <button
              onClick={() => setCurrentTab('students')}
              className="text-xs font-semibold text-accent hover:text-accent-hover flex items-center space-x-1"
            >
              <span>Manage Roster</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-gov-border uppercase font-semibold">
              <tr>
                <th className="px-5 py-2.5">Group ID</th>
                <th className="px-4 py-2.5">Programme & Branch</th>
                <th className="px-4 py-2.5">Semester</th>
                <th className="px-4 py-2.5 text-right">Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(groupCounts).map(([gid, count]) => {
                const sample = students.find((s) => normalizeGroupId(s.groupId) === gid);
                return (
                  <tr key={gid} className="hover:bg-slate-50/80">
                    <td className="px-5 py-2.5 font-bold text-navy-950">{gid}</td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {sample?.programme} - {sample?.branch} {sample?.batch ? `(Batch ${sample.batch})` : ''}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{sample?.semester}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-navy-900">
                      {count}
                    </td>
                  </tr>
                );
              })}
              {Object.keys(groupCounts).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-slate-500">
                    No students loaded. Click "Manage Roster" or import an Excel spreadsheet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Column: Workflow Steps */}
        <div className="bg-white border border-gov-border rounded p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-navy-950">
            Series Exam Preparation Workflow
          </h3>

          <div className="space-y-2.5 text-xs">
            <div
              onClick={() => setCurrentTab('students')}
              className="p-3 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between font-semibold text-navy-950">
                <span>1. Students Roster</span>
                <span className="text-emerald-700 font-bold">Done ({activeStudents.length})</span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Verify batches, roll numbers, and mark any dropouts.
              </p>
            </div>

            <div
              onClick={() => setCurrentTab('halls')}
              className="p-3 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between font-semibold text-navy-950">
                <span>2. Halls Availability</span>
                <span className="text-emerald-700 font-bold">Ready ({availableHalls.length} halls)</span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Ensure home department classes have no exam during slot.
              </p>
            </div>

            <div
              onClick={() => setCurrentTab('sessions')}
              className="p-3 bg-blue-50/60 rounded border border-blue-200 cursor-pointer hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between font-semibold text-navy-950">
                <span className="text-navy-950">3. Sessions & Timetable</span>
                <span className={timetable.length > 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                  {timetable.length > 0 ? `Scheduled (${timetable.length})` : 'Pending'}
                </span>
              </div>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Set series exam cycle, dates, & group subject timetable slots.
              </p>
            </div>

            <div
              onClick={() => setCurrentTab('seating')}
              className="p-3 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between font-semibold text-navy-950">
                <span>4. Seating Allocation</span>
                <span className={seatingResult ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                  {seatingResult ? 'Generated' : 'Pending'}
                </span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Slot-based hall chooser & KTU alternating bench allocation.
              </p>
            </div>

            <div
              onClick={() => setCurrentTab('invigilators')}
              className="p-3 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between font-semibold text-navy-950">
                <span>5. Invigilators Duty</span>
                <span className="text-slate-500 font-semibold">Tutor Exclusion</span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Automatic fair distribution without class tutor conflicts.
              </p>
            </div>

            <div
              onClick={() => setCurrentTab('documents')}
              className="p-3 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between font-semibold text-navy-950">
                <span>6. Documents Printing</span>
                <span className="text-accent font-bold">A4 Print Ready</span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Allocation notices, bench sheets, and per-group attendance sheets.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
