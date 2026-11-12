import React, { useState } from 'react';
import { useAppStore } from '../store';
import { generateDutyListNoticeHtml } from '../../templates/dutyListNotice';
import {
  UserCheck,
  RefreshCw,
  Printer,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

export const InvigilatorsView: React.FC = () => {
  const {
    staff,
    seatingResult,
    invigilatorAssignments,
    currentSession,
    assignInvigilators,
    openPreview,
  } = useAppStore();

  const dates = ['09/10/2026', '12/10/2026', '13/10/2026', '14/10/2026', '15/10/2026'];
  const activeHalls = seatingResult?.hallPlans.filter((h) => h.totalStudents > 0) || [];

  const handlePrintDutyListNotice = () => {
    const html = generateDutyListNoticeHtml({
      collegeName: 'COLLEGE OF ENGINEERING POONJAR',
      examTitle: `SECOND INTERNAL EXAMINATION B.TECH (S3,S5), MCA S3, BCA S3 OCTOBER - 2026\nFIRST INTERNAL EXAMINATION B.TECH S1 & MCA S1 OCTOBER 2026`,
      dateRangeText: `${dates[0]} - ${dates[dates.length - 1]}`,
      noticeDate: '08-10-2026',
      timeRangeText: 'FN: 10.15 am - 12.15 pm',
      dates,
      staffList: staff,
      assignments: invigilatorAssignments,
      signatoryText: currentSession.signatoryHod || 'Principal',
    });

    openPreview('Invigilation Duty List Notice', html);
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-navy-950 uppercase tracking-tight">
            Invigilator Duty Assignment & Rules
          </h1>
          <p className="text-xs text-slate-500">
            Automated conflict-free roster. Class tutors are strictly excluded from halls containing their own students.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={assignInvigilators}
            className="flex items-center space-x-1.5 bg-accent hover:bg-accent-hover text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Auto-Assign Duties</span>
          </button>

          <button
            onClick={handlePrintDutyListNotice}
            className="flex items-center space-x-1.5 bg-navy-900 hover:bg-navy-800 text-white px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Duty Notice</span>
          </button>
        </div>
      </div>

      {/* Rules Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs flex items-center justify-between text-slate-700 shrink-0">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Enforced Rules:</strong> 1) Class tutor cannot invigilate a hall containing their class. 2) No faculty on 2 halls at same time slot. 3) Fair load balancing across faculty pool.
          </span>
        </div>
        <span className="font-mono font-bold text-navy-900">
          {invigilatorAssignments.length} Hall Duties Assigned
        </span>
      </div>

      {/* Invigilation Matrix Table */}
      <div className="bg-white border border-gov-border rounded flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gov-header text-navy-950 font-bold uppercase sticky top-0 z-10 border-b border-gov-border tracking-wider">
            <tr>
              <th className="px-4 py-2.5 w-12 text-center">#</th>
              <th className="px-4 py-2.5 w-48">Staff Name</th>
              <th className="px-4 py-2.5 w-36">Designation</th>
              <th className="px-4 py-2.5 w-24">Dept</th>
              <th className="px-4 py-2.5 w-32">Class Tutor Of</th>
              {dates.map((d) => (
                <th key={d} className="px-3 py-2.5 text-center w-28">
                  {d}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center w-20">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((st, idx) => {
              const staffDuties = invigilatorAssignments.filter((a) => a.staffId === st.id);
              return (
                <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-2 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-2 font-bold text-navy-950">
                    {st.name}
                    {st.isExamCellMember && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-red-100 text-red-700 font-bold">
                        Exam Cell
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{st.designation}</td>
                  <td className="px-4 py-2 font-semibold text-slate-800">{st.department}</td>
                  <td className="px-4 py-2">
                    {st.tutorOfGroup ? (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                        {st.tutorOfGroup}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  {dates.map((d) => {
                    const duty = staffDuties.find((a) => a.date === d);
                    return (
                      <td key={d} className="px-3 py-2 text-center">
                        {duty ? (
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-navy-900 text-white shadow-xs"
                            title={`Invigilator for Hall ${duty.hallName}`}
                          >
                            {duty.hallName}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-mono font-bold text-navy-950">
                    {staffDuties.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

