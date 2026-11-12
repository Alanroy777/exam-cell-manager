import React, { useState } from 'react';
import { useAppStore } from '../store';
import { HallSeatingPlan, SeatAssignment } from '../../core/types';
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
} from 'lucide-react';

export const SeatingView: React.FC = () => {
  const { seatingResult, generateSeating, swapSeats, halls } = useAppStore();

  const [activeHallIndex, setActiveHallIndex] = useState<number>(0);
  const [selectedSeatForSwap, setSelectedSeatForSwap] = useState<SeatAssignment | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const hallPlans = seatingResult?.hallPlans || [];
  const currentHall = hallPlans[activeHallIndex];
  const currentHallObj = currentHall ? halls.find((h) => h.id === currentHall.hallId) : undefined;
  const isWritingPad = currentHallObj?.furnitureType === 'writing_pad_chair';

  const maxBenchNo = currentHall
    ? Math.max(5, ...currentHall.seats.map((s) => s.benchNo || 0))
    : 5;
  const benchNumbers = Array.from({ length: maxBenchNo }, (_, i) => i + 1);

  const errors = seatingResult?.violations.filter((v) => v.severity === 'error') || [];
  const warnings = seatingResult?.violations.filter((v) => v.severity === 'warning') || [];

  const handleSeatClick = (seat: SeatAssignment) => {
    if (isLocked) return;

    if (!selectedSeatForSwap) {
      // First seat selected
      setSelectedSeatForSwap(seat);
    } else {
      // Second seat selected - perform swap if in same hall
      if (currentHall) {
        swapSeats(currentHall.hallId, selectedSeatForSwap.seatNumber, seat.seatNumber);
      }
      setSelectedSeatForSwap(null);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto flex flex-col h-full overflow-hidden">
      {/* Top Controls & Generation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-navy-950 uppercase tracking-tight flex items-center space-x-2">
            <span>Series Examination Seating Engine</span>
          </h1>
          <p className="text-xs text-slate-500">
            Automated conflict-free allocation with live KTU rule enforcement & manual swap.
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
            <span>{isLocked ? 'Arrangement Locked' : 'Unlocked (Editable)'}</span>
          </button>

          <button
            onClick={generateSeating}
            disabled={isLocked}
            className="flex items-center space-x-1.5 bg-accent hover:bg-accent-hover text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generate / Recalculate</span>
          </button>
        </div>
      </div>

      {/* Validation Status Banner */}
      {seatingResult && (
        <div className="shrink-0">
          {errors.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs flex items-center justify-between text-emerald-800">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  All Rules Validated: Zero Adjacency Conflicts • Max 40 Capacity Respected • Balanced Split
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-700">
                {seatingResult.summary.assignedStudents} Students Seated in {seatingResult.hallPlans.length} Halls
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
            <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-800 flex items-center space-x-2 mt-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{warnings[0].message}</span>
            </div>
          )}
        </div>
      )}

      {/* Hall Selector Tabs */}
      {hallPlans.length > 0 && (
        <div className="flex items-center space-x-1.5 border-b border-gov-border shrink-0 overflow-x-auto pb-1">
          {hallPlans.map((plan, idx) => {
            const isActive = idx === activeHallIndex;
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
                <span>{plan.hallName}</span>
                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-200 text-slate-700">
                  {plan.totalStudents}/40
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Hall Classroom Bench Layout */}
      {currentHall ? (
        <div className="bg-white border border-gov-border rounded flex-1 flex flex-col p-5 overflow-y-auto">
          {/* Hall Meta Header */}
          <div className="flex items-center justify-between border-b pb-3 mb-4 shrink-0 text-xs">
            <div className="flex items-center space-x-3">
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

          {/* Classroom Furniture Visualizer: Dynamic Columns (e.g. 2, 3, or 4 columns) */}
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
              <div className={`grid ${gridColsClass} gap-4 flex-1`}>
                {colsToDisplay.map((col) => (
                  <div key={col} className="bg-slate-50/70 border border-slate-200 rounded p-3 flex flex-col space-y-2.5">
                    <div className="text-center font-bold text-xs text-navy-900 border-b border-slate-200 pb-1 uppercase tracking-wider">
                      Column {col}
                    </div>

                    <div className="space-y-2.5 flex-1">
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

                        // Check if this row is an individual writing pad chair
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
                                    ? 'bg-purple-100 border-purple-600 ring-2 ring-purple-600'
                                    : singleTextpad.student
                                    ? 'bg-purple-50/40 hover:bg-purple-50 border-purple-200'
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

                        // Bench / Desk (2-seater or 3-seater)
                        const isLeftSelected = selectedSeatForSwap?.seatNumber === leftSeat?.seatNumber;
                        const isMiddleSelected = selectedSeatForSwap?.seatNumber === middleSeat?.seatNumber;
                        const isRightSelected = selectedSeatForSwap?.seatNumber === rightSeat?.seatNumber;
                        const isDeskChair = leftSeat?.seatType === 'desk_chair' || rightSeat?.seatType === 'desk_chair';
                        const is3Seater = Boolean(middleSeat);

                        return (
                          <div
                            key={benchNo}
                            className={`bg-white rounded p-2 text-xs shadow-xs space-y-1.5 border ${
                              is3Seater
                                ? 'border-purple-300 ring-1 ring-purple-100'
                                : isDeskChair
                                ? 'border-amber-300 ring-1 ring-amber-200'
                                : 'border-slate-300'
                            }`}
                          >
                            <div className="text-[10px] font-bold uppercase flex justify-between">
                              {isDeskChair ? (
                                <>
                                  <span className="text-amber-800">Desk & Chairs {col}-{benchNo}</span>
                                  <span className="bg-amber-100 text-amber-800 px-1 rounded text-[9px] border border-amber-300 font-semibold">
                                    2 Chairs
                                  </span>
                                </>
                              ) : is3Seater ? (
                                <>
                                  <span className="text-purple-900 font-bold">Bench {col}-{benchNo}</span>
                                  <span className="bg-purple-100 text-purple-800 px-1.5 rounded text-[9px] border border-purple-200 font-semibold">
                                    3-Seater Bench
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-slate-400">Bench {col}-{benchNo}</span>
                                  <span className="text-slate-400">2 Seats</span>
                                </>
                              )}
                            </div>

                            {/* Bench Surface: 2-seater or 3-seater */}
                            <div className={`grid ${is3Seater ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5`}>
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

                              {/* Middle Seat (if 3-seater bench) */}
                              {is3Seater && middleSeat && (
                                <div
                                  onClick={() => handleSeatClick(middleSeat)}
                                  className={`p-1.5 rounded border text-left cursor-pointer transition-all ${
                                    isMiddleSelected
                                      ? 'bg-red-50 border-accent ring-2 ring-accent'
                                      : middleSeat.student
                                      ? 'bg-purple-50/40 hover:bg-purple-50 border-purple-200'
                                      : 'bg-slate-100/50 border-dashed border-slate-300 text-slate-400'
                                  }`}
                                >
                                  <div className="text-[9px] font-bold text-purple-600 uppercase">Middle</div>
                                  {middleSeat.student ? (
                                    <div>
                                      <div className="font-bold text-navy-950 truncate text-[11px]">
                                        {middleSeat.student.rollNo}
                                      </div>
                                      <div className="font-semibold text-accent-hover text-[10px] truncate">
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
        <div className="bg-white border border-gov-border rounded p-12 text-center text-slate-500 space-y-3">
          <Grid3X3 className="w-10 h-10 mx-auto text-slate-400" />
          <p className="text-sm font-semibold">No Seating Plan Generated Yet</p>
          <p className="text-xs text-slate-400">
            Click "Generate / Recalculate" above to seat students across all available halls.
          </p>
        </div>
      )}
    </div>
  );
};

