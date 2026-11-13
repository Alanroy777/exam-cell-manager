import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { Hall, HallSeatingPlan, SeatAssignment } from '../../core/types';
import { getWorkingDatesInRange } from '../../core/dateUtils';
import { normalizeBranch, normalizeSemester, normalizeGroupId } from '../../core/validator';
import {
  Grid3X3,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  ArrowLeftRight,
  ShieldAlert,
  Info,
  Calendar,
  Clock,
  Building2,
  Users,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';

export const SeatingView: React.FC = () => {
  const {
    currentSession,
    timetable,
    students,
    halls,
    selectedExamDate,
    selectedExamSlot,
    slotHallSelections,
    slotSeatingResults,
    seatingResult,
    setSelectedExamDate,
    setSelectedExamSlot,
    toggleHallForSlot,
    setHallsForSlot,
    autoSelectHallsForSlot,
    generateSeatingForSlot,
    swapSeats,
  } = useAppStore();

  const seatingSectionRef = useRef<HTMLDivElement>(null);

  const [activeHallIndex, setActiveHallIndex] = useState<number>(0);
  const [selectedSeatForSwap, setSelectedSeatForSwap] = useState<SeatAssignment | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Available dates from timetable or default
  const availableDates = useMemo(() => {
    const datesFromTimetable = Array.from(new Set(timetable.map((t) => t.date)));
    if (datesFromTimetable.length > 0) return datesFromTimetable;
    return getWorkingDatesInRange(currentSession.startDate, currentSession.endDate);
  }, [timetable, currentSession.startDate, currentSession.endDate]);

  useEffect(() => {
    if (availableDates.length > 0 && !availableDates.includes(selectedExamDate)) {
      setSelectedExamDate(availableDates[0]);
    }
  }, [availableDates, selectedExamDate, setSelectedExamDate]);

  // Current slot key
  const slotKey = `${selectedExamDate}_${selectedExamSlot}`;

  // Scheduled timetable entries for this slot
  const slotTimetableEntries = useMemo(() => {
    return timetable.filter(
      (t) => t.date === selectedExamDate && t.sessionSlot === selectedExamSlot
    );
  }, [timetable, selectedExamDate, selectedExamSlot]);

  // Groups scheduled for this slot
  const scheduledGroupIds = useMemo(() => {
    if (slotTimetableEntries.length > 0) {
      return Array.from(new Set(slotTimetableEntries.map((t) => normalizeGroupId(t.groupId))));
    }
    // Fallback: all active groups
    return Array.from(
      new Set(students.filter((s) => s.status === 'active').map((s) => normalizeGroupId(s.groupId)))
    );
  }, [slotTimetableEntries, students]);

  // Active students taking exams in this slot
  const scheduledStudents = useMemo(() => {
    return students.filter(
      (s) => s.status === 'active' && scheduledGroupIds.includes(normalizeGroupId(s.groupId))
    );
  }, [students, scheduledGroupIds]);

  const studentCountForSlot = scheduledStudents.length;

  // Selected halls for this slot
  const selectedHallIdsForSlot = useMemo(() => {
    if (slotHallSelections[slotKey] && slotHallSelections[slotKey].length > 0) {
      return slotHallSelections[slotKey];
    }
    // Default: all available halls if nothing selected yet
    return halls.filter((h) => h.isAvailable).map((h) => h.id);
  }, [slotHallSelections, slotKey, halls]);

  const selectedHalls = useMemo(() => {
    return halls.filter((h) => selectedHallIdsForSlot.includes(h.id));
  }, [halls, selectedHallIdsForSlot]);

  const totalSelectedCapacity = useMemo(() => {
    return selectedHalls.reduce((sum, h) => sum + Math.min(h.capacity || 40, 40), 0);
  }, [selectedHalls]);

  // Maximum students in any single conflict group
  const maxGroupStudents = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of scheduledStudents) {
      const b = normalizeBranch(s.branch);
      const sem = normalizeSemester(s.semester);
      const k = `${b}_${sem}`;
      counts[k] = (counts[k] || 0) + 1;
    }
    return Math.max(0, ...Object.values(counts));
  }, [scheduledStudents]);

  // Single-clique non-adjacent capacity of currently selected halls
  const singleCliqueSelectedCapacity = useMemo(() => {
    return selectedHalls.reduce((sum, h) => {
      const cap = Math.min(h.capacity || 40, 40);
      const single = Math.floor(cap / 2);
      return sum + single;
    }, 0);
  }, [selectedHalls]);

  const hasSingleGroupDeficit = maxGroupStudents > singleCliqueSelectedCapacity;
  const isCapacitySufficient = totalSelectedCapacity >= studentCountForSlot && !hasSingleGroupDeficit;
  const capacityDelta = totalSelectedCapacity - studentCountForSlot;

  // Current active plan
  const hallPlans = seatingResult?.hallPlans || [];
  const hasPlan = hallPlans.length > 0;

  // Check if current seating plan is out of sync with scheduled students in this slot
  const isPlanOutOfSync = useMemo(() => {
    if (scheduledStudents.length === 0) return false;
    if (!seatingResult) return true;
    const scheduledIds = new Set(scheduledStudents.map((s) => s.id));
    const seatedIds = new Set(
      seatingResult.hallPlans.flatMap((hp) => hp.seats.map((s) => s.studentId).filter(Boolean))
    );
    if (scheduledIds.size !== seatedIds.size) return true;
    for (const id of scheduledIds) {
      if (!seatedIds.has(id)) return true;
    }
    return false;
  }, [seatingResult, scheduledStudents]);

  // Auto-collapse hall picker if plan already exists for this slot
  const [isHallPickerExpanded, setIsHallPickerExpanded] = useState<boolean>(!hasPlan);

  // When slot changes or seating is loaded for this slot, collapse hall picker if seating exists
  useEffect(() => {
    const plan = slotSeatingResults[slotKey];
    if (plan && plan.hallPlans.length > 0) {
      setIsHallPickerExpanded(false);
    }
  }, [slotKey, slotSeatingResults]);

  // Auto-generate or re-sync when slot changes and no plan exists or plan is out of sync with timetable
  useEffect(() => {
    if (isPlanOutOfSync && scheduledStudents.length > 0 && !isGenerating) {
      generateSeatingForSlot(selectedExamDate, selectedExamSlot);
    }
  }, [slotKey, isPlanOutOfSync, scheduledStudents.length, isGenerating]);

  const safeHallIndex = Math.min(activeHallIndex, Math.max(0, hallPlans.length - 1));
  const currentHall = hallPlans[safeHallIndex];
  const currentHallObj = currentHall ? halls.find((h) => h.id === currentHall.hallId) : undefined;
  const isWritingPad = currentHallObj?.furnitureType === 'writing_pad_chair';

  const maxBenchNo = currentHall
    ? Math.max(5, ...currentHall.seats.map((s) => s.benchNo || 0))
    : 5;
  const benchNumbers = Array.from({ length: maxBenchNo }, (_, i) => i + 1);

  const errors = seatingResult?.violations.filter((v) => v.severity === 'error') || [];
  const warnings = seatingResult?.violations.filter((v) => v.severity === 'warning') || [];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateSeatingForSlot(selectedExamDate, selectedExamSlot);
      setActiveHallIndex(0);
      setSelectedSeatForSwap(null);
      setIsHallPickerExpanded(false); // Auto-collapse to show seating arrangement prominently!
      setTimeout(() => {
        seatingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSeatClick = (seat: SeatAssignment) => {
    if (isLocked) return;

    if (!selectedSeatForSwap) {
      setSelectedSeatForSwap(seat);
    } else {
      if (currentHall) {
        swapSeats(currentHall.hallId, selectedSeatForSwap.seatNumber, seat.seatNumber);
      }
      setSelectedSeatForSwap(null);
    }
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 max-w-7xl mx-auto flex flex-col h-full overflow-y-auto min-h-0 pb-16 w-full">
      {/* 1. Exam Schedule & Slot Selector Bar */}
      <div className="bg-white border border-gov-border rounded p-4 shadow-xs space-y-3 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-navy-100 text-navy-900 uppercase tracking-wider">
                {currentSession.sessionType}
              </span>
              <h1 className="text-sm font-bold text-navy-950 uppercase tracking-tight">
                {currentSession.name}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the exam date and session slot to view available halls and plan seating.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
                isLocked
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isLocked ? 'Slot Locked' : 'Unlocked'}</span>
            </button>

            <button
              onClick={handleGenerate}
              disabled={isLocked || isGenerating || !isCapacitySufficient}
              className="flex items-center space-x-1.5 bg-accent hover:bg-accent-hover text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Calculating...' : 'Generate Seating for this Slot'}</span>
            </button>
          </div>
        </div>

        {/* Date & Slot Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 text-xs items-center">
          {/* Date Selector */}
          <div className="lg:col-span-5 flex items-center space-x-2 min-w-0">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-bold text-slate-600 uppercase text-[10px] shrink-0">Exam Date:</span>
            <select
              value={selectedExamDate}
              onChange={(e) => {
                setSelectedExamDate(e.target.value);
                setActiveHallIndex(0);
                setSelectedSeatForSwap(null);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-navy-950 min-w-0"
            >
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>

          {/* Slot Toggle */}
          <div className="lg:col-span-4 flex items-center space-x-2 min-w-0">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-bold text-slate-600 uppercase text-[10px] shrink-0">Session Slot:</span>
            <div className="flex rounded border border-slate-300 p-0.5 bg-slate-100 flex-1 min-w-0">
              <button
                onClick={() => {
                  setSelectedExamSlot('FN');
                  setActiveHallIndex(0);
                  setSelectedSeatForSwap(null);
                }}
                className={`flex-1 py-1 text-center font-bold text-xs rounded transition-all truncate ${
                  selectedExamSlot === 'FN'
                    ? 'bg-white text-navy-950 shadow-xs'
                    : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                FN (10:15 - 12:15)
              </button>
              <button
                onClick={() => {
                  setSelectedExamSlot('AN');
                  setActiveHallIndex(0);
                  setSelectedSeatForSwap(null);
                }}
                className={`flex-1 py-1 text-center font-bold text-xs rounded transition-all truncate ${
                  selectedExamSlot === 'AN'
                    ? 'bg-white text-navy-950 shadow-xs'
                    : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                AN (01:30 - 03:30)
              </button>
            </div>
          </div>

          {/* Slot Scheduled Overview */}
          <div className="sm:col-span-2 lg:col-span-3 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-slate-600 text-[11px]">
              <Users className="w-3.5 h-3.5 text-navy-800 shrink-0" />
              <span>Students in Slot:</span>
            </div>
            <span className="font-mono font-bold text-navy-950 text-xs">
              {studentCountForSlot} Students
            </span>
          </div>
        </div>

        {/* Classes Scheduled for this Slot */}
        <div className="bg-slate-50 rounded p-2.5 border border-slate-200 text-xs flex flex-wrap items-center gap-2">
          <span className="font-bold text-[10px] text-slate-500 uppercase">
            Scheduled in this Slot:
          </span>
          {slotTimetableEntries.length > 0 ? (
            slotTimetableEntries.map((tt) => {
              const count = students.filter(
                (s) => normalizeGroupId(s.groupId) === normalizeGroupId(tt.groupId) && s.status === 'active'
              ).length;
              return (
                <span
                  key={tt.id}
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-[11px] font-medium text-navy-950 shadow-2xs flex items-center space-x-1"
                >
                  <strong className="text-accent">{tt.groupId}</strong>
                  <span className="text-slate-400 font-mono">({count} students)</span>
                  <span className="text-slate-500 font-mono text-[10px] ml-1">[{tt.subjectCode}]</span>
                </span>
              );
            })
          ) : (
            <span className="text-slate-500 italic text-[11px]">
              No individual subject timetable entry found for {selectedExamDate} ({selectedExamSlot}).
              All active groups will be considered.
            </span>
          )}
        </div>
      </div>

      {/* 2. Choose Available Halls for this Slot (Workflow Step 2) */}
      <div className="bg-white border border-gov-border rounded shadow-xs shrink-0 overflow-hidden">
        <div
          onClick={() => setIsHallPickerExpanded(!isHallPickerExpanded)}
          className="p-3 bg-gov-header cursor-pointer flex flex-wrap sm:flex-nowrap items-center justify-between border-b border-gov-border hover:bg-slate-100 transition-colors gap-2"
        >
          <div className="flex items-center space-x-2 min-w-0">
            <Building2 className="w-4 h-4 text-navy-900 shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-navy-950 whitespace-nowrap">
              Step 2: Available Halls
            </h2>
            <span className="bg-navy-100 text-navy-900 px-2 py-0.5 rounded text-[10px] font-bold tracking-tight shrink-0">
              {selectedHalls.length} Selected
            </span>
            {selectedHalls.length > 0 && (
              <span
                className="hidden xl:inline text-[10px] text-slate-500 font-mono truncate max-w-[200px]"
                title={selectedHalls.map((h) => h.name).join(', ')}
              >
                ({selectedHalls.map((h) => h.name).join(', ')})
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-xs shrink-0">
            <div
              className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center space-x-1 shrink-0 ${
                isCapacitySufficient
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              <span>{totalSelectedCapacity}/{studentCountForSlot} seats</span>
              <span className="hidden sm:inline">
                {hasSingleGroupDeficit
                  ? `(⚠️ Max group ${maxGroupStudents} • Need ≥${Math.ceil(maxGroupStudents / 20)} halls)`
                  : capacityDelta >= 0
                  ? `(+${capacityDelta} surplus)`
                  : `(${capacityDelta} deficit)`}
              </span>
            </div>

            <button
              type="button"
              className="text-xs text-accent font-semibold flex items-center space-x-1 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs hover:bg-slate-50 shrink-0"
            >
              <span>{isHallPickerExpanded ? 'Hide' : 'Change Halls'}</span>
              {isHallPickerExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
          </div>
        </div>

        {isHallPickerExpanded && (
          <div className="p-4 space-y-3 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
              <p className="text-slate-500 text-[11px]">
                Toggle the halls available for this exam time. Halls with sufficient capacity and alternating rows will be filled.
              </p>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => autoSelectHallsForSlot(selectedExamDate, selectedExamSlot)}
                  className="flex items-center space-x-1 bg-navy-900 hover:bg-navy-800 text-white px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Auto-Select Optimal Halls</span>
                </button>

                <button
                  onClick={() =>
                    setHallsForSlot(
                      halls.filter((h) => h.isAvailable).map((h) => h.id),
                      selectedExamDate,
                      selectedExamSlot
                    )
                  }
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-[11px] font-medium"
                >
                  Select All
                </button>

                <button
                  onClick={() => setHallsForSlot([], selectedExamDate, selectedExamSlot)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-[11px] font-medium"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Hall Grid Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
              {halls.map((hall) => {
                const isSelected = selectedHallIdsForSlot.includes(hall.id);
                const isHallAvail = hall.isAvailable;

                return (
                  <div
                    key={hall.id}
                    onClick={() => {
                      if (!isLocked) toggleHallForSlot(hall.id, selectedExamDate, selectedExamSlot);
                    }}
                    className={`border rounded p-2.5 cursor-pointer transition-all flex flex-col justify-between ${
                      !isHallAvail
                        ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                        : isSelected
                        ? 'bg-blue-50/70 border-navy-900 ring-1 ring-navy-900 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-navy-950 text-xs">{hall.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{hall.department} Dept</div>
                      </div>
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-navy-900 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                    </div>

                    <div className="mt-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-slate-700">Cap: {hall.capacity || 40}</span>
                      <span className="text-slate-400 truncate ml-1 font-mono">
                        {hall.furnitureType === 'mixed'
                          ? 'Mixed'
                          : hall.furnitureType === 'writing_pad_chair'
                          ? 'Textpad'
                          : `${hall.benchCount || 20} Benches`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isCapacitySufficient && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {hasSingleGroupDeficit ? (
                      <>
                        <strong>KTU Non-Adjacent Seating Requirement:</strong> The largest group has <strong>{maxGroupStudents} students</strong>. Under KTU rules, students from the same class cannot sit adjacent to each other on a bench (maximum 20 per 40-capacity hall). At least <strong>{Math.ceil(maxGroupStudents / 20)} halls</strong> must be selected.
                      </>
                    ) : (
                      <>
                        <strong>Capacity Deficit:</strong> {studentCountForSlot} students need seats, but selected halls only accommodate {totalSelectedCapacity}. Please select more halls.
                      </>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    autoSelectHallsForSlot(selectedExamDate, selectedExamSlot);
                    handleGenerate();
                  }}
                  className="bg-navy-900 hover:bg-navy-800 text-white px-3 py-1 rounded text-xs font-semibold shrink-0 transition-colors flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Auto-Select Optimal Halls</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Seating Plan & Classroom Arrangement Section (Step 3) */}
      <div ref={seatingSectionRef} className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <Grid3X3 className="w-4 h-4 text-navy-950 shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-navy-950 truncate">
              Step 3: Seating Plan & Classroom Arrangement ({selectedExamDate} • {selectedExamSlot})
            </h2>
          </div>

          {hallPlans.length > 0 && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded shrink-0 self-start sm:self-auto">
              ✓ {seatingResult?.summary.assignedStudents} Students Seated across {hallPlans.length} Halls
            </span>
          )}
        </div>

        {/* Unassigned Students Alert Banner */}
        {seatingResult && seatingResult.unassignedStudents.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded p-3 text-xs space-y-2 text-amber-900 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {seatingResult.unassignedStudents.length} Students Could Not Be Seated (Insufficient Non-Adjacent Hall Capacity)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  autoSelectHallsForSlot(selectedExamDate, selectedExamSlot);
                  handleGenerate();
                }}
                className="bg-amber-800 hover:bg-amber-900 text-white px-3 py-1 rounded text-[11px] font-bold shadow-xs flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Select More Halls & Re-Seat</span>
              </button>
            </div>
            <p className="text-[11px] text-amber-800">
              Under KTU exam rules, students from the same class cannot sit adjacent to each other on a bench (maximum 20 students per 40-capacity hall).
              The currently selected halls cannot seat all {studentCountForSlot} students without violating exam rules.
            </p>
          </div>
        )}

        {/* Validation Status Banner */}
        {seatingResult && (
          <div className="shrink-0">
            {errors.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs flex items-center justify-between text-emerald-800">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">
                    Valid KTU Allocation: Zero Adjacency Conflicts • Max 40 Capacity • Balanced Split
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-700">
                  {seatingResult.summary.assignedStudents} Students Seated
                </span>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs space-y-1 text-red-800">
                <div className="flex items-center space-x-2 font-bold text-red-900">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errors.length} Hard Rule Violations Detected (Printing Blocked)</span>
                </div>
                <ul className="list-disc pl-6 space-y-0.5 text-[11px]">
                  {errors.map((err, i) => (
                    <li key={i}>{err.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {warnings.length > 0 && errors.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800 flex items-center space-x-2 mt-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{warnings[0].message}</span>
              </div>
            )}
          </div>
        )}

        {/* Hall Selector Tabs for this Slot */}
        {hallPlans.length > 0 && (
          <div className="flex items-center space-x-1.5 border-b border-gov-border shrink-0 overflow-x-auto pb-1">
            {hallPlans.map((plan, idx) => {
              const isActive = idx === safeHallIndex;
              return (
                <button
                  key={plan.hallId}
                  onClick={() => {
                    setActiveHallIndex(idx);
                    setSelectedSeatForSwap(null);
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-t border-t border-l border-r transition-all ${
                    isActive
                      ? 'bg-white text-navy-950 border-gov-border border-b-white -mb-px shadow-xs'
                      : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'
                  }`}
                >
                  <span>Hall {plan.hallName}</span>
                  <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-200 text-slate-700">
                    {plan.totalStudents}/40
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Hall Seating Grid Layout */}
        {currentHall ? (
          <div className="bg-white border border-gov-border rounded p-5 flex flex-col space-y-4 shadow-xs min-h-[480px]">
            {/* Hall Meta Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <span className="text-slate-500 font-medium">Exam Hall:</span>
                  <strong className="text-navy-950 ml-1 text-sm">{currentHall.hallName}</strong>
                </div>
                <span className="text-slate-300">|</span>
                <div className="text-[11px] font-medium text-slate-600">
                  Setup:{' '}
                  <strong className="text-navy-900">
                    {currentHallObj?.furnitureType === 'mixed'
                      ? `Mixed Layout (${currentHallObj?.benchCount || 0} Benches + ${currentHallObj?.textpadChairCount || 0} Textpad Chairs)`
                      : isWritingPad
                      ? 'Writing Pad Chairs (Attached Book Placers)'
                      : `${currentHallObj?.benchCount || Math.ceil(currentHall.capacity / 2)} Benches (2/bench)`}
                  </strong>
                </div>
                <span className="text-slate-300">|</span>
                <div>
                  <span className="text-slate-500 font-medium">Groups Seated:</span>
                  <strong className="text-slate-800 ml-1">{currentHall.groupsPresent.join(', ')}</strong>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-[11px] text-slate-500">
                  {selectedSeatForSwap ? (
                    <span className="text-accent font-semibold flex items-center space-x-1">
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>Seat #{selectedSeatForSwap.seatNumber} selected. Click another seat to swap!</span>
                    </span>
                  ) : (
                    'Click any seat to select and swap students.'
                  )}
                </span>
              </div>
            </div>

            {/* Classroom Furniture Visualizer: Dynamic Columns */}
            {(() => {
              const activeCols = (['A', 'B', 'C', 'D'] as const).filter((c) =>
                currentHall.seats.some((s) => s.column === c)
              );
              const colsToDisplay = activeCols.length > 0 ? activeCols : (['A', 'B', 'C', 'D'] as const);
              const gridColsClass =
                colsToDisplay.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : colsToDisplay.length === 3
                  ? 'grid-cols-1 md:grid-cols-3'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

              return (
                <div className={`grid ${gridColsClass} gap-4`}>
                  {colsToDisplay.map((col) => (
                    <div key={col} className="bg-slate-50/70 border border-slate-200 rounded p-3 flex flex-col space-y-2.5">
                      <div className="text-center font-bold text-xs text-navy-900 border-b border-slate-200 pb-1 uppercase tracking-wider">
                        Column {col}
                      </div>

                      <div className="space-y-2.5">
                        {benchNumbers.map((benchNo) => {
                          const leftSeat = currentHall.seats.find(
                            (s) => s.column === col && s.benchNo === benchNo && s.position === 'left'
                          );
                          const middleSeat = currentHall.seats.find(
                            (s) => s.column === col && s.benchNo === benchNo && s.position === 'middle'
                          );
                          const rightSeat = currentHall.seats.find(
                            (s) => s.column === col && s.benchNo === benchNo && s.position === 'right'
                          );

                          if (!leftSeat && !middleSeat && !rightSeat) return null;

                          // Single writing pad chair row
                          const singleTextpad =
                            leftSeat && !rightSeat && !middleSeat && leftSeat.seatType === 'writing_pad'
                              ? leftSeat
                              : !leftSeat && rightSeat && !middleSeat && rightSeat.seatType === 'writing_pad'
                              ? rightSeat
                              : isWritingPad
                              ? leftSeat || rightSeat
                              : null;

                          if (singleTextpad) {
                            const isSelected = selectedSeatForSwap?.seatNumber === singleTextpad.seatNumber;
                            return (
                              <div
                                key={benchNo}
                                className="bg-white border border-purple-200 rounded p-2 text-xs shadow-xs space-y-1.5"
                              >
                                <div className="text-[10px] font-bold text-purple-700 uppercase flex justify-between">
                                  <span>Textpad Chair {col}-{benchNo}</span>
                                  <span className="text-purple-400 font-mono text-[9px]">#{singleTextpad.seatNumber}</span>
                                </div>
                                <div
                                  onClick={() => handleSeatClick(singleTextpad)}
                                  className={`p-2 rounded border text-left cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-red-50 border-accent ring-2 ring-accent'
                                      : singleTextpad.student
                                      ? 'bg-purple-50 hover:bg-purple-100 border-purple-200'
                                      : 'bg-slate-100/50 border-dashed border-slate-300 text-slate-400'
                                  }`}
                                >
                                  {singleTextpad.student ? (
                                    <div>
                                      <div className="font-bold text-navy-950 truncate text-[11px]">
                                        {singleTextpad.student.rollNo}
                                      </div>
                                      <div className="font-semibold text-accent-hover text-[10px] truncate">
                                        {singleTextpad.student.groupId}
                                      </div>
                                      <div className="text-[10px] text-slate-600 truncate">
                                        {singleTextpad.student.name}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-400 py-1 text-center">Empty</div>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          // Standard Bench (Left, Middle, Right)
                          const isLeftSelected = selectedSeatForSwap?.seatNumber === leftSeat?.seatNumber;
                          const isMiddleSelected = selectedSeatForSwap?.seatNumber === middleSeat?.seatNumber;
                          const isRightSelected = selectedSeatForSwap?.seatNumber === rightSeat?.seatNumber;

                          return (
                            <div
                              key={benchNo}
                              className="bg-white border border-slate-200 rounded p-2 text-xs shadow-xs space-y-1.5"
                            >
                              <div className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                                <span>Bench {col}-{benchNo}</span>
                                <span className="text-slate-400 font-mono text-[9px]">
                                  #{leftSeat?.seatNumber || ' '}{middleSeat ? ` • #${middleSeat.seatNumber}` : ''} • #{rightSeat?.seatNumber || ' '}
                                </span>
                              </div>

                              <div className={`grid ${middleSeat ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5`}>
                                {/* Left Seat */}
                                <div
                                  onClick={() => leftSeat && handleSeatClick(leftSeat)}
                                  className={`p-1.5 rounded border text-left cursor-pointer transition-all ${
                                    isLeftSelected
                                      ? 'bg-red-50 border-accent ring-2 ring-accent'
                                      : leftSeat?.student
                                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                                      : 'bg-slate-100/50 border-dashed border-slate-300 text-slate-400'
                                  }`}
                                >
                                  <div className="text-[9px] font-bold text-slate-400 uppercase">Left</div>
                                  {leftSeat?.student ? (
                                    <div>
                                      <div className="font-bold text-navy-950 truncate text-[11px]">
                                        {leftSeat.student.rollNo}
                                      </div>
                                      <div className="font-semibold text-accent-hover text-[10px] truncate">
                                        {leftSeat.student.groupId}
                                      </div>
                                      <div className="text-[10px] text-slate-600 truncate">
                                        {leftSeat.student.name}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-400 py-1 text-center">Empty</div>
                                  )}
                                </div>

                                {/* Middle Seat */}
                                {middleSeat && (
                                  <div
                                    onClick={() => handleSeatClick(middleSeat)}
                                    className={`p-1.5 rounded border text-left cursor-pointer transition-all ${
                                      isMiddleSelected
                                        ? 'bg-red-50 border-accent ring-2 ring-accent'
                                        : middleSeat?.student
                                        ? 'bg-amber-50 hover:bg-amber-100 border-amber-200'
                                        : 'bg-slate-100/50 border-dashed border-slate-300 text-slate-400'
                                    }`}
                                  >
                                    <div className="text-[9px] font-bold text-amber-700 uppercase">Mid</div>
                                    {middleSeat?.student ? (
                                      <div>
                                        <div className="font-bold text-navy-950 truncate text-[11px]">
                                          {middleSeat.student.rollNo}
                                        </div>
                                        <div className="font-semibold text-amber-800 text-[10px] truncate">
                                          {middleSeat.student.groupId}
                                        </div>
                                        <div className="text-[10px] text-slate-600 truncate">
                                          {middleSeat.student.name}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-[10px] text-slate-400 py-1 text-center">Empty</div>
                                    )}
                                  </div>
                                )}

                                {/* Right Seat */}
                                <div
                                  onClick={() => rightSeat && handleSeatClick(rightSeat)}
                                  className={`p-1.5 rounded border text-left cursor-pointer transition-all ${
                                    isRightSelected
                                      ? 'bg-red-50 border-accent ring-2 ring-accent'
                                      : rightSeat?.student
                                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                                      : 'bg-slate-100/50 border-dashed border-slate-300 text-slate-400'
                                  }`}
                                >
                                  <div className="text-[9px] font-bold text-slate-400 uppercase">Right</div>
                                  {rightSeat?.student ? (
                                    <div>
                                      <div className="font-bold text-navy-950 truncate text-[11px]">
                                        {rightSeat.student.rollNo}
                                      </div>
                                      <div className="font-semibold text-accent-hover text-[10px] truncate">
                                        {rightSeat.student.groupId}
                                      </div>
                                      <div className="text-[10px] text-slate-600 truncate">
                                        {rightSeat.student.name}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-400 py-1 text-center">Empty</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="bg-white border border-gov-border rounded p-12 text-center text-slate-500 space-y-3 flex flex-col items-center justify-center">
            <Grid3X3 className="w-12 h-12 text-slate-300" />
            <h3 className="text-sm font-bold text-navy-950">
              No Seating Plan Generated Yet for {selectedExamDate} ({selectedExamSlot})
            </h3>
            <p className="text-xs text-slate-500 max-w-md">
              Check the available halls in Step 2 above and click <strong>"Generate Seating for this Slot"</strong> to allocate seats for the {studentCountForSlot} scheduled students.
            </p>
            <button
              onClick={handleGenerate}
              disabled={!isCapacitySufficient || isGenerating}
              className="mt-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              Generate Seating Plan Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
