import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { generateDutyListNoticeHtml } from '../../templates/dutyListNotice';
import { Programme, InvigilatorDutyAssignment } from '../../core/types';
import { getWorkingDatesInRange, getDayOfWeekShort } from '../../core/dateUtils';
import { getStaffProgrammes, getHallProgrammes } from '../../core/invigilator';
import {
  UserCheck,
  RefreshCw,
  Printer,
  CheckCircle2,
  Trash2,
  GraduationCap,
  Sparkles,
  Info,
  Plus,
  PlusCircle,
  AlertTriangle,
  X,
  Edit2,
  Calendar,
  Clock,
  Building2,
  User,
  ShieldAlert,
} from 'lucide-react';

const ALL_PROGRAMMES: Programme[] = ['B.Tech', 'Diploma', 'MCA', 'BCA'];

interface ModalState {
  isOpen: boolean;
  editingDutyId?: string;
  staffId: string;
  date: string;
  slot: 'FN' | 'AN';
  hallId: string;
  overrideTutorConflict?: boolean;
}

export const InvigilatorsView: React.FC = () => {
  const {
    staff,
    halls,
    seatingResult,
    slotSeatingResults,
    invigilatorAssignments,
    currentSession,
    timetable,
    assignInvigilators,
    addDutyAssignment,
    removeDutyAssignment,
    clearAllInvigilatorAssignments,
    toggleStaffProgramme,
    openPreview,
  } = useAppStore();

  const [selectedProgrammeFilter, setSelectedProgrammeFilter] = useState<
    'All' | Programme | 'ExamCell'
  >('All');
  const [slotFilter, setSlotFilter] = useState<'ALL' | 'FN' | 'AN'>('ALL');
  const [modalState, setModalState] = useState<ModalState | null>(null);

  // Dynamic exam dates from timetable or session window
  const examDates = useMemo(() => {
    const datesFromTt = Array.from(new Set(timetable.map((t) => t.date)));
    if (datesFromTt.length > 0) return datesFromTt;
    return getWorkingDatesInRange(currentSession.startDate, currentSession.endDate);
  }, [timetable, currentSession.startDate, currentSession.endDate]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staff.filter((st) => {
      if (selectedProgrammeFilter === 'All') return true;
      if (selectedProgrammeFilter === 'ExamCell') return st.isExamCellMember;
      const progs = getStaffProgrammes(st);
      return progs.includes(selectedProgrammeFilter);
    });
  }, [staff, selectedProgrammeFilter]);

  // Programme counts
  const progCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: staff.length,
      'B.Tech': 0,
      Diploma: 0,
      MCA: 0,
      BCA: 0,
      ExamCell: staff.filter((s) => s.isExamCellMember).length,
    };
    for (const s of staff) {
      const progs = getStaffProgrammes(s);
      for (const p of progs) {
        counts[p] = (counts[p] || 0) + 1;
      }
    }
    return counts;
  }, [staff]);

  // --- Modal Helpers & Actions ---
  const openAssignModal = (prefilledStaffId?: string, prefilledDate?: string, prefilledSlot?: 'FN' | 'AN') => {
    const staffId = prefilledStaffId || (filteredStaff[0]?.id || staff[0]?.id || '');
    const date = prefilledDate || (examDates[0] || currentSession.startDate || '09/10/2026');
    const slot = prefilledSlot || (slotFilter !== 'ALL' ? slotFilter : 'FN');

    const slotKey = `${date}_${slot}`;
    const slotPlans = slotSeatingResults[slotKey]?.hallPlans || seatingResult?.hallPlans || [];
    const hallId = slotPlans[0]?.hallId || halls[0]?.id || '';

    setModalState({
      isOpen: true,
      staffId,
      date,
      slot,
      hallId,
      overrideTutorConflict: false,
    });
  };

  const openEditModal = (duty: InvigilatorDutyAssignment) => {
    setModalState({
      isOpen: true,
      editingDutyId: duty.id,
      staffId: duty.staffId,
      date: duty.date,
      slot: duty.sessionSlot,
      hallId: duty.hallId,
      overrideTutorConflict: false,
    });
  };

  const closeModal = () => {
    setModalState(null);
  };

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalState?.isOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState?.isOpen]);

  // Selected faculty & hall for the modal
  const modalSelectedStaff = useMemo(() => {
    if (!modalState) return null;
    return staff.find((s) => s.id === modalState.staffId) || null;
  }, [modalState?.staffId, staff]);

  const modalSelectedHall = useMemo(() => {
    if (!modalState) return null;
    return halls.find((h) => h.id === modalState.hallId) || null;
  }, [modalState?.hallId, halls]);

  const modalSlotPlans = useMemo(() => {
    if (!modalState) return [];
    const slotKey = `${modalState.date}_${modalState.slot}`;
    return slotSeatingResults[slotKey]?.hallPlans || seatingResult?.hallPlans || [];
  }, [modalState?.date, modalState?.slot, slotSeatingResults, seatingResult]);

  const modalHallPlan = useMemo(() => {
    if (!modalState) return undefined;
    return modalSlotPlans.find((p) => p.hallId === modalState.hallId);
  }, [modalSlotPlans, modalState?.hallId]);

  // Conflict Checks
  const tutorConflict = useMemo(() => {
    if (!modalSelectedStaff?.tutorOfGroup || !modalHallPlan) return null;
    const normTutor = modalSelectedStaff.tutorOfGroup.replace(/\s+/g, '').toUpperCase();
    const hasOwnGroup = modalHallPlan.groupsPresent.some((grp) => {
      const normGrp = grp.replace(/\s+/g, '').toUpperCase();
      return normTutor === normGrp || normGrp.includes(normTutor) || normTutor.includes(normGrp);
    });
    if (hasOwnGroup) {
      return `${modalSelectedStaff.name} is the Class Tutor for ${modalSelectedStaff.tutorOfGroup}, which is seated in ${modalSelectedHall?.name || modalHallPlan.hallName}. Under KTU guidelines, faculty are strictly excluded from invigilating their own classes.`;
    }
    return null;
  }, [modalSelectedStaff, modalHallPlan, modalSelectedHall]);

  const doubleBookingWarning = useMemo(() => {
    if (!modalSelectedStaff || !modalState) return null;
    const existing = invigilatorAssignments.find(
      (a) =>
        a.staffId === modalState.staffId &&
        a.date === modalState.date &&
        a.sessionSlot === modalState.slot &&
        a.id !== modalState.editingDutyId
    );
    if (existing) {
      return `${modalSelectedStaff.name} is already assigned to Hall ${existing.hallName} in ${modalState.slot}. Saving will reassign them to this hall.`;
    }
    return null;
  }, [modalSelectedStaff, modalState, invigilatorAssignments]);

  const hallOccupancyNotice = useMemo(() => {
    if (!modalState) return null;
    const existing = invigilatorAssignments.find(
      (a) =>
        a.hallId === modalState.hallId &&
        a.date === modalState.date &&
        a.sessionSlot === modalState.slot &&
        a.id !== modalState.editingDutyId
    );
    if (existing && existing.staffId !== modalState.staffId) {
      return `Hall ${modalSelectedHall?.name || modalState.hallId} is currently assigned to ${existing.staffName}. Saving will replace their assignment.`;
    }
    return null;
  }, [modalState, modalSelectedHall, invigilatorAssignments]);

  const programmeMatchInfo = useMemo(() => {
    if (!modalSelectedStaff || !modalHallPlan) return null;
    const sProgs = getStaffProgrammes(modalSelectedStaff);
    const hProgs = getHallProgrammes(modalHallPlan.groupsPresent);
    if (hProgs.length === 0) return null;
    const matches = sProgs.some((p) => hProgs.includes(p));
    return {
      matches,
      staffProgs: sProgs.join(', '),
      hallProgs: hProgs.join(', '),
    };
  }, [modalSelectedStaff, modalHallPlan]);

  const handleSaveDuty = async () => {
    if (!modalState || !modalState.staffId || !modalState.hallId) return;

    const targetStaff = staff.find((s) => s.id === modalState.staffId);
    const targetHall = halls.find((h) => h.id === modalState.hallId);
    if (!targetStaff || !targetHall) return;

    // If editing existing duty, remove previous record
    if (modalState.editingDutyId) {
      await removeDutyAssignment(modalState.editingDutyId);
    }

    const dutyId =
      modalState.editingDutyId ||
      `duty-manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newDuty: InvigilatorDutyAssignment = {
      id: dutyId,
      sessionId: currentSession.id,
      date: modalState.date,
      sessionSlot: modalState.slot,
      hallId: targetHall.id,
      hallName: targetHall.name,
      staffId: targetStaff.id,
      staffName: targetStaff.name,
      staffDepartment: targetStaff.department,
    };

    await addDutyAssignment(newDuty);
    closeModal();
  };

  const handleRemoveCurrentDuty = async () => {
    if (!modalState?.editingDutyId) return;
    if (confirm('Remove this invigilation duty assignment?')) {
      await removeDutyAssignment(modalState.editingDutyId);
      closeModal();
    }
  };

  const handlePrintDutyListNotice = () => {
    const html = generateDutyListNoticeHtml({
      collegeName: 'COLLEGE OF ENGINEERING POONJAR',
      examTitle: `${currentSession.name.toUpperCase()} (${currentSession.academicYear})`,
      dateRangeText: `${examDates[0] || currentSession.startDate} - ${
        examDates[examDates.length - 1] || currentSession.endDate
      }`,
      noticeDate: currentSession.startDate || '08/12/2026',
      timeRangeText: currentSession.defaultTime || 'FN: 10.15 am - 12.15 pm',
      dates: examDates,
      staffList: staff,
      assignments: invigilatorAssignments,
      signatoryText: currentSession.signatoryHod || 'Principal',
    });

    openPreview('Invigilation Duty List Notice', html);
  };

  return (
    <div className="p-3 sm:p-4 space-y-2.5 max-w-7xl mx-auto flex flex-col h-full overflow-hidden w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-navy-900" />
            <h1 className="text-base font-bold text-navy-950 uppercase tracking-tight">
              Invigilator Duty Assignment & Roster
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Programme-matched allocation (Diploma → Diploma, B.Tech → B.Tech) • Class tutors excluded • Click cell to assign
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            onClick={() => openAssignModal()}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-navy-950 border border-slate-300 px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            title="Manually allocate an invigilator duty to any faculty member"
          >
            <PlusCircle className="w-3.5 h-3.5 text-accent" />
            <span>Manual Assign</span>
          </button>

          <button
            onClick={assignInvigilators}
            className="flex items-center space-x-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            title="Automatically assign faculty to all exam halls"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Auto-Assign Duties</span>
          </button>

          <button
            onClick={handlePrintDutyListNotice}
            className="flex items-center space-x-1.5 bg-navy-900 hover:bg-navy-800 text-white px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            title="Generate and print official duty list notice"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Duty Notice</span>
          </button>

          {invigilatorAssignments.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all assigned invigilator duties?')) {
                  clearAllInvigilatorAssignments();
                }
              }}
              className="flex items-center space-x-1 bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-300 px-2 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap"
              title="Clear all duty assignments"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Streamlined Filter & Status Bar (De-congested) */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs">
        {/* Left: Faculty Programme Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Faculty:</span>
          {(['All', 'B.Tech', 'Diploma', 'MCA', 'BCA', 'ExamCell'] as const).map((tab) => {
            const isActive = selectedProgrammeFilter === tab;
            const label = tab === 'ExamCell' ? 'Exam Cell' : tab;
            const count = progCounts[tab] || 0;
            return (
              <button
                key={tab}
                onClick={() => setSelectedProgrammeFilter(tab)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center space-x-1 ${
                  isActive
                    ? 'bg-navy-900 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[9px] px-1 py-0.1 rounded-full font-mono ${
                    isActive ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Slot View Toggle & Duty Counter */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex items-center space-x-1 bg-white p-0.5 rounded border border-slate-200 text-xs">
            {(['ALL', 'FN', 'AN'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSlotFilter(s)}
                className={`px-2 py-0.5 rounded font-bold text-[10px] transition-all ${
                  slotFilter === s
                    ? 'bg-navy-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                {s === 'ALL' ? 'All Slots' : s}
              </button>
            ))}
          </div>

          <span className="font-mono font-bold text-navy-950 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] shadow-2xs">
            {invigilatorAssignments.length} Duties Assigned
          </span>
        </div>
      </div>

      {/* De-congested Invigilation Matrix Table */}
      <div className="bg-white border border-gov-border rounded flex-1 overflow-x-auto overflow-y-auto shadow-xs min-h-0">
        <table className="w-full text-left text-xs border-collapse min-w-[760px]">
          <thead className="bg-gov-header text-navy-950 font-bold uppercase sticky top-0 z-20 border-b border-gov-border tracking-wider shadow-2xs">
            <tr>
              <th className="px-2 py-2 w-8 text-center sticky left-0 bg-gov-header z-30">#</th>
              <th className="px-3 py-2 w-48 min-w-[170px] whitespace-nowrap sticky left-8 bg-gov-header z-30 shadow-[1px_0_0_0_#e2e8f0]">
                Faculty Member
              </th>
              <th className="px-2 py-2 w-24 text-center whitespace-nowrap">Programmes</th>
              <th className="px-2 py-2 w-20 text-center whitespace-nowrap">Class Tutor</th>
              {examDates.map((d) => (
                <th
                  key={d}
                  className="px-1.5 py-2 text-center min-w-[85px] w-24 whitespace-nowrap"
                  title={d}
                >
                  <div className="font-bold text-navy-950">{d.slice(0, 5)}</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {getDayOfWeekShort(d)}
                  </div>
                </th>
              ))}
              <th className="px-2 py-2 text-center w-12 whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStaff.map((st, idx) => {
              const staffProgs = getStaffProgrammes(st);
              const staffDuties = invigilatorAssignments.filter((a) => {
                if (a.staffId !== st.id) return false;
                if (slotFilter === 'ALL') return true;
                return a.sessionSlot === slotFilter;
              });

              return (
                <tr key={st.id} className="group/row hover:bg-slate-50/80 transition-colors">
                  {/* # */}
                  <td className="px-2 py-1.5 text-center font-mono text-slate-400 sticky left-0 bg-white group-hover/row:bg-slate-50 z-10 text-[11px]">
                    {idx + 1}
                  </td>

                  {/* Faculty Member (Name + Dept/Desig in 2 neat lines) */}
                  <td className="px-3 py-1.5 font-bold text-navy-950 whitespace-nowrap sticky left-8 bg-white group-hover/row:bg-slate-50 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                    <div className="flex items-center space-x-1.5">
                      <span className="truncate max-w-[140px] text-xs" title={st.name}>
                        {st.name}
                      </span>
                      {st.isExamCellMember && (
                        <span className="px-1 py-0.2 rounded text-[8px] bg-red-100 text-red-700 font-bold border border-red-200 shrink-0">
                          Cell
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-normal text-slate-500 truncate max-w-[150px]">
                      {st.designation === 'Assistant Professor' ? 'Asst. Prof' : st.designation} •{' '}
                      {st.department}
                    </div>
                  </td>

                  {/* Compact Programme Badges */}
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      {staffProgs.map((prog) => (
                        <button
                          key={prog}
                          onClick={() => toggleStaffProgramme(st.id, prog)}
                          className={`px-1 py-0.2 rounded text-[9px] font-bold border transition-all ${
                            prog === 'B.Tech'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : prog === 'Diploma'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : prog === 'MCA'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                          title={`Click to toggle ${prog}`}
                        >
                          {prog === 'Diploma' ? 'Dip' : prog}
                        </button>
                      ))}
                      {ALL_PROGRAMMES.filter((p) => !staffProgs.includes(p)).length > 0 && (
                        <button
                          onClick={() => {
                            const next = ALL_PROGRAMMES.find((p) => !staffProgs.includes(p));
                            if (next) toggleStaffProgramme(st.id, next);
                          }}
                          className="text-[9px] text-slate-400 hover:text-navy-900 border border-dashed border-slate-300 px-1 py-0.2 rounded hover:bg-slate-100"
                          title="Click to add another programme"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Class Tutor */}
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    {st.tutorOfGroup ? (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200 inline-block text-[10px]">
                        {st.tutorOfGroup}
                      </span>
                    ) : (
                      <span className="text-slate-300 font-mono">-</span>
                    )}
                  </td>

                  {/* Date Columns */}
                  {examDates.map((d) => {
                    const dutiesOnDate = staffDuties.filter((a) => a.date === d);
                    return (
                      <td
                        key={d}
                        className={`px-1.5 py-1.5 text-center whitespace-nowrap transition-colors ${
                          dutiesOnDate.length === 0
                            ? 'group/cell hover:bg-blue-50/70 cursor-pointer'
                            : ''
                        }`}
                        onClick={() => {
                          if (dutiesOnDate.length === 0) {
                            openAssignModal(st.id, d, slotFilter !== 'ALL' ? slotFilter : 'FN');
                          }
                        }}
                      >
                        {dutiesOnDate.length > 0 ? (
                          <div className="flex flex-col items-center gap-1 py-0.5">
                            {dutiesOnDate.map((duty) => (
                              <button
                                key={duty.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(duty);
                                }}
                                className="group/badge inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-navy-900 hover:bg-navy-800 text-white shadow-2xs transition-all hover:ring-1 hover:ring-accent cursor-pointer"
                                title={`Click to edit: Hall ${duty.hallName} (${duty.sessionSlot})`}
                              >
                                <span>{duty.hallName}</span>
                                <span className="text-[8px] text-amber-300 font-mono">
                                  [{duty.sessionSlot}]
                                </span>
                              </button>
                            ))}
                            {/* Fast add button for second slot */}
                            {dutiesOnDate.length < 2 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const otherSlot =
                                    dutiesOnDate[0]?.sessionSlot === 'FN' ? 'AN' : 'FN';
                                  openAssignModal(st.id, d, otherSlot);
                                }}
                                className="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-semibold opacity-0 group-hover/row:opacity-100 transition-opacity"
                                title={`Add ${
                                  dutiesOnDate[0]?.sessionSlot === 'FN' ? 'AN' : 'FN'
                                } duty`}
                              >
                                + {dutiesOnDate[0]?.sessionSlot === 'FN' ? 'AN' : 'FN'}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-0.5">
                            <span className="text-slate-300 font-mono group-hover/cell:hidden">
                              -
                            </span>
                            <span className="hidden group-hover/cell:inline-flex items-center space-x-0.5 px-1 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold shadow-2xs">
                              <Plus className="w-2.5 h-2.5" />
                              <span>Duty</span>
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Total Duties */}
                  <td className="px-2 py-1.5 text-center font-mono font-bold text-navy-950 whitespace-nowrap text-[11px]">
                    {staffDuties.length}
                  </td>
                </tr>
              );
            })}
            {filteredStaff.length === 0 && (
              <tr>
                <td colSpan={5 + examDates.length} className="px-4 py-8 text-center text-slate-500">
                  No faculty members match the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Manual Duty Assignment / Edit Modal */}
      {modalState?.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-navy-950 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-accent" />
                <div>
                  <h2 className="text-sm font-bold tracking-tight">
                    {modalState.editingDutyId
                      ? 'Edit Invigilation Duty'
                      : 'Manual Invigilator Duty Allocation'}
                  </h2>
                  <p className="text-[11px] text-slate-300">
                    {modalState.editingDutyId
                      ? 'Modify or remove this assigned duty'
                      : 'Allocate a faculty member to a specific hall and slot'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* 1. Faculty Member */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center justify-between">
                  <span>Faculty Member *</span>
                  {modalSelectedStaff?.isExamCellMember && (
                    <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded font-bold">
                      Exam Cell Member
                    </span>
                  )}
                </label>
                <select
                  value={modalState.staffId}
                  onChange={(e) =>
                    setModalState((prev) => (prev ? { ...prev, staffId: e.target.value } : null))
                  }
                  className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-accent focus:outline-none"
                >
                  {staff.map((s) => {
                    const progs = getStaffProgrammes(s);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.designation}, {s.department}) - [{progs.join('/')}]
                        {s.tutorOfGroup ? ` • Tutor: ${s.tutorOfGroup}` : ''}
                      </option>
                    );
                  })}
                </select>

                {/* Selected Faculty Details Pill */}
                {modalSelectedStaff && (
                  <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-800">Dept:</span>{' '}
                      {modalSelectedStaff.department}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Designation:</span>{' '}
                      {modalSelectedStaff.designation}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Programmes:</span>{' '}
                      <span className="font-semibold text-navy-900">
                        {getStaffProgrammes(modalSelectedStaff).join(', ')}
                      </span>
                    </div>
                    {modalSelectedStaff.tutorOfGroup && (
                      <div className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                        Class Tutor: {modalSelectedStaff.tutorOfGroup}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Exam Date & Slot in 2 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Exam Date */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Exam Date *</span>
                  </label>
                  <select
                    value={modalState.date}
                    onChange={(e) =>
                      setModalState((prev) => (prev ? { ...prev, date: e.target.value } : null))
                    }
                    className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-accent focus:outline-none"
                  >
                    {examDates.map((d) => (
                      <option key={d} value={d}>
                        {d} ({getDayOfWeekShort(d)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Session Slot */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Session Slot *</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['FN', 'AN'] as const).map((s) => {
                      const isSelected = modalState.slot === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setModalState((prev) => (prev ? { ...prev, slot: s } : null))
                          }
                          className={`py-1.5 px-2 rounded text-center border font-bold text-xs transition-all ${
                            isSelected
                              ? 'bg-navy-900 text-white border-navy-900 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div>{s}</div>
                          <div
                            className={`text-[9px] font-normal ${
                              isSelected ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {s === 'FN' ? '10:15 - 12:15' : '01:30 - 03:30'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Exam Hall */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Assigned Exam Hall *</span>
                  </span>
                  {modalHallPlan && (
                    <span className="text-[10px] font-bold text-navy-900 bg-slate-100 px-2 py-0.5 rounded">
                      {modalHallPlan.totalStudents} Seated Students
                    </span>
                  )}
                </label>
                <select
                  value={modalState.hallId}
                  onChange={(e) =>
                    setModalState((prev) => (prev ? { ...prev, hallId: e.target.value } : null))
                  }
                  className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-accent focus:outline-none"
                >
                  {halls.map((h) => {
                    const plan = modalSlotPlans.find((p) => p.hallId === h.id);
                    const assignedDuty = invigilatorAssignments.find(
                      (a) =>
                        a.hallId === h.id &&
                        a.date === modalState.date &&
                        a.sessionSlot === modalState.slot
                    );
                    const planText = plan
                      ? ` • ${plan.totalStudents} students: ${plan.groupsPresent.join(', ')}`
                      : ' • (no seating generated)';
                    const dutyText = assignedDuty
                      ? ` [Assigned: ${assignedDuty.staffName}]`
                      : ' [Unassigned]';

                    return (
                      <option key={h.id} value={h.id}>
                        {h.name} (Cap: {h.capacity}){planText}{dutyText}
                      </option>
                    );
                  })}
                </select>

                {/* Hall Exam Details Card */}
                {modalHallPlan ? (
                  <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[11px] space-y-1 text-slate-600">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div>
                        <span className="font-semibold text-slate-800">Students Writing:</span>{' '}
                        <span className="font-mono font-bold text-navy-950">
                          {modalHallPlan.totalStudents}
                        </span>{' '}
                        / {modalSelectedHall?.capacity || 40} capacity
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Hall Programmes:</span>{' '}
                        <span className="font-bold text-navy-900">
                          {getHallProgrammes(modalHallPlan.groupsPresent).join(', ')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Scheduled Groups:</span>{' '}
                      {modalHallPlan.groupsPresent.map((g) => (
                        <span
                          key={g}
                          className="inline-block bg-white border border-slate-200 px-1.5 py-0.2 rounded text-[10px] font-bold text-slate-700 mr-1"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">
                    No seating plan generated for this hall on {modalState.date} ({modalState.slot})
                    yet. Duty can still be manually allocated.
                  </div>
                )}
              </div>

              {/* 4. Live Conflict & Validation Feedback */}
              <div className="space-y-2 pt-1">
                {/* Strict Tutor Conflict (Red) */}
                {tutorConflict && (
                  <div className="bg-red-50 border border-red-300 text-red-900 p-3 rounded text-xs space-y-2">
                    <div className="flex items-start space-x-2">
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-red-950">
                          Strict KTU Norm Violation: Class Tutor Conflict
                        </div>
                        <div className="text-[11px] text-red-800 mt-0.5">{tutorConflict}</div>
                      </div>
                    </div>
                    <label className="flex items-center space-x-2 pt-1.5 border-t border-red-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modalState.overrideTutorConflict || false}
                        onChange={(e) =>
                          setModalState((prev) =>
                            prev ? { ...prev, overrideTutorConflict: e.target.checked } : null
                          )
                        }
                        className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                      />
                      <span className="text-[11px] font-bold text-red-950">
                        Emergency Convener Override (Proceed despite tutor conflict)
                      </span>
                    </label>
                  </div>
                )}

                {/* Double Booking Warning (Amber) */}
                {doubleBookingWarning && (
                  <div className="bg-amber-50 border border-amber-300 text-amber-900 p-2.5 rounded text-xs flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-[11px]">
                      <div className="font-bold">Double Booking Warning</div>
                      <div>{doubleBookingWarning}</div>
                    </div>
                  </div>
                )}

                {/* Hall Reassignment Notice (Blue) */}
                {hallOccupancyNotice && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-900 p-2.5 rounded text-xs flex items-start space-x-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-[11px]">
                      <div className="font-bold">Hall Reassignment Notice</div>
                      <div>{hallOccupancyNotice}</div>
                    </div>
                  </div>
                )}

                {/* Programme Matching Indicator */}
                {programmeMatchInfo && (
                  <div
                    className={`p-2.5 rounded text-xs flex items-start space-x-2 border ${
                      programmeMatchInfo.matches
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        programmeMatchInfo.matches ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    />
                    <div className="text-[11px]">
                      <span className="font-bold">
                        {programmeMatchInfo.matches
                          ? 'Programme Compatible: '
                          : 'Programme Cross-Allocation: '}
                      </span>
                      <span>
                        Faculty ({programmeMatchInfo.staffProgs}){' '}
                        {programmeMatchInfo.matches ? 'matches' : 'differs from'} hall exam (
                        {programmeMatchInfo.hallProgs}).
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
              <div>
                {modalState.editingDutyId && (
                  <button
                    type="button"
                    onClick={handleRemoveCurrentDuty}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-red-50 text-red-700 border border-red-300 transition-colors shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Duty</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDuty}
                  disabled={
                    Boolean(tutorConflict && !modalState.overrideTutorConflict) ||
                    !modalState.hallId
                  }
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded text-xs font-bold text-white bg-navy-900 hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{modalState.editingDutyId ? 'Update Duty' : 'Save Duty Assignment'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
