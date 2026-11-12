import React, { useState } from 'react';
import { useAppStore } from '../store';
import { FurnitureType, Hall } from '../../core/types';
import {
  Building2,
  Plus,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  X,
  Armchair,
  Layers,
  HelpCircle,
} from 'lucide-react';

export const HallsView: React.FC = () => {
  const { halls, updateHall, addHall, deleteHall } = useAppStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [deletingHallId, setDeletingHallId] = useState<string | null>(null);

  const [newHall, setNewHall] = useState<Partial<Hall>>({
    name: '',
    department: 'CS',
    furnitureType: 'bench_desk',
    studentsPerBench: 2,
    threeSeaterBenchCount: 0,
    columnCount: 4,
    rowCount: 5,
    benchCount: 20,
    textpadChairCount: 0,
    deskCount: 20,
    chairCount: 0,
    capacity: 40,
    isAvailable: true,
  });

  const availableCount = halls.filter((h) => h.isAvailable).length;
  const totalCapacity = halls
    .filter((h) => h.isAvailable)
    .reduce((sum, h) => sum + (h.capacity || 0), 0);

  const handleToggleAvailability = (hall: Hall) => {
    updateHall({ ...hall, isAvailable: !hall.isAvailable });
  };

  const handleFurnitureTypeChange = (
    type: FurnitureType,
    current: Partial<Hall>,
    setter: (val: Partial<Hall>) => void
  ) => {
    if (type === 'mixed') {
      // Mixed: benches + textpad chairs in back rows
      const benches = current.benchCount !== undefined ? current.benchCount : 8;
      const textpads = current.textpadChairCount !== undefined ? current.textpadChairCount : 2;
      const cols = current.columnCount || 2;
      const rows = current.rowCount || 5;
      const studentsPerBench = current.studentsPerBench || 2;
      const threeSeaterBenchCount = current.threeSeaterBenchCount || 0;
      let benchCap = 0;
      if (studentsPerBench === 3) {
        benchCap = benches * 3;
      } else if (threeSeaterBenchCount > 0) {
        const threeCnt = Math.min(threeSeaterBenchCount, benches);
        benchCap = (benches - threeCnt) * 2 + threeCnt * 3;
      } else {
        benchCap = benches * 2;
      }
      setter({
        ...current,
        furnitureType: type,
        columnCount: cols,
        rowCount: rows,
        benchCount: benches,
        textpadChairCount: textpads,
        deskCount: current.deskCount !== undefined ? current.deskCount : benches,
        chairCount: current.chairCount !== undefined ? current.chairCount : 0,
        studentsPerBench,
        threeSeaterBenchCount,
        capacity: current.capacity !== undefined ? current.capacity : Math.min(benchCap + textpads, 40),
      });
    } else if (type === 'writing_pad_chair') {
      // Chairs attached with book placers / writing tablets
      const chairs = current.chairCount !== undefined ? current.chairCount : 30;
      setter({
        ...current,
        furnitureType: type,
        columnCount: current.columnCount || 4,
        rowCount: current.rowCount || 5,
        benchCount: 0,
        textpadChairCount: chairs,
        deskCount: 0,
        chairCount: chairs,
        capacity: current.capacity !== undefined ? current.capacity : Math.min(chairs, 40),
      });
    } else if (type === 'desk_chair') {
      // Desks with individual chairs
      const desks = current.deskCount !== undefined ? current.deskCount : 18;
      const chairs = current.chairCount !== undefined ? current.chairCount : desks * 2;
      setter({
        ...current,
        furnitureType: type,
        columnCount: current.columnCount || 4,
        rowCount: current.rowCount || 5,
        benchCount: 0,
        textpadChairCount: 0,
        deskCount: desks,
        chairCount: chairs,
        capacity: current.capacity !== undefined ? current.capacity : Math.min(desks * 2, 40),
      });
    } else {
      // Traditional Bench & Desk
      const benches = current.benchCount !== undefined ? current.benchCount : 20;
      setter({
        ...current,
        furnitureType: type,
        columnCount: current.columnCount || 4,
        rowCount: current.rowCount || 5,
        benchCount: benches,
        textpadChairCount: 0,
        deskCount: current.deskCount !== undefined ? current.deskCount : benches,
        chairCount: current.chairCount !== undefined ? current.chairCount : 0,
        capacity: current.capacity !== undefined ? current.capacity : Math.min(benches * 2, 40),
      });
    }
  };

  const handleSaveNewHall = async () => {
    if (!newHall.name) return;
    const fType = newHall.furnitureType || 'bench_desk';
    const bCount = Number(newHall.benchCount) || 0;
    const dCount = Number(newHall.deskCount) || 0;
    const cCount = Number(newHall.chairCount) || 0;
    const colCount = Number(newHall.columnCount) || 4;
    const rowCount = Number(newHall.rowCount) || 5;
    const textpadCount = Number(newHall.textpadChairCount) || 0;
    const cap = Math.min(Math.max(Number(newHall.capacity) || 1, 1), 40);

    const hall: Hall = {
      id: `hall-${Date.now()}`,
      name: newHall.name.trim(),
      department: newHall.department || 'CS',
      furnitureType: fType,
      studentsPerBench: newHall.studentsPerBench || 2,
      threeSeaterBenchCount: newHall.threeSeaterBenchCount || 0,
      columnCount: colCount,
      rowCount: rowCount,
      benchCount: bCount,
      textpadChairCount: textpadCount,
      deskCount: dCount,
      chairCount: cCount,
      capacity: cap,
      isAvailable: Boolean(newHall.isAvailable),
      priorityOrder: halls.length + 1,
    };
    await addHall(hall);
    setIsAddModalOpen(false);
    setNewHall({
      name: '',
      department: 'CS',
      furnitureType: 'bench_desk',
      studentsPerBench: 2,
      threeSeaterBenchCount: 0,
      columnCount: 4,
      rowCount: 5,
      benchCount: 20,
      textpadChairCount: 0,
      deskCount: 20,
      chairCount: 0,
      capacity: 40,
      isAvailable: true,
    });
  };

  const getFurnitureBadge = (
    type?: FurnitureType,
    bCount?: number,
    cCount?: number,
    tCount?: number,
    studentsPerBench?: number,
    threeSeaterCount?: number
  ) => {
    if (type === 'mixed') {
      const benchDesc =
        studentsPerBench === 3
          ? `${bCount || 0} 3-Seater Benches`
          : threeSeaterCount && threeSeaterCount > 0
          ? `${bCount || 0} Benches (${threeSeaterCount} 3-S)`
          : `${bCount || 0} Benches`;
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Building2 className="w-3 h-3 text-indigo-600" />
          <span>Mixed ({benchDesc} + {tCount || 0} Textpads)</span>
        </span>
      );
    }
    if (type === 'writing_pad_chair') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Armchair className="w-3 h-3" />
          <span>Chairs w/ Book Placers</span>
        </span>
      );
    }
    if (type === 'desk_chair') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Layers className="w-3 h-3" />
          <span>Desks & Chairs</span>
        </span>
      );
    }
    const benchLabel =
      studentsPerBench === 3
        ? 'Benches (3-Seater)'
        : threeSeaterCount && threeSeaterCount > 0
        ? `Benches (${threeSeaterCount} 3-Seaters)`
        : 'Benches (2-Seater)';
    return (
      <span
        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
          studentsPerBench === 3
            ? 'bg-purple-50 text-purple-800 border-purple-300'
            : threeSeaterCount && threeSeaterCount > 0
            ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
            : 'bg-slate-100 text-slate-700 border-slate-200'
        }`}
      >
        <Building2 className="w-3 h-3" />
        <span>{benchLabel}</span>
      </span>
    );
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-navy-950 uppercase tracking-tight">
            Examination Halls Catalog
          </h1>
          <p className="text-xs text-slate-500">
            {halls.length} halls configured ({availableCount} active for exam seating &bull; Total Available Capacity: {totalCapacity} seats).
            KTU maximum capacity is 40 students per hall.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center space-x-1.5 bg-navy-900 hover:bg-navy-800 text-white px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Exam Hall</span>
        </button>
      </div>

      {/* Halls Table */}
      <div className="bg-white border border-gov-border rounded flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gov-header text-navy-950 font-bold uppercase sticky top-0 z-10 border-b border-gov-border tracking-wider">
            <tr>
              <th className="px-3 py-2.5 w-10 text-center">#</th>
              <th className="px-3 py-2.5 w-24">Hall Name</th>
              <th className="px-3 py-2.5 w-24">Home Dept</th>
              <th className="px-3 py-2.5 w-36">Furniture Setup</th>
              <th className="px-3 py-2.5 w-24 text-center">Layout</th>
              <th className="px-3 py-2.5 w-16 text-center">Benches</th>
              <th className="px-3 py-2.5 w-16 text-center">Desks</th>
              <th className="px-3 py-2.5 w-16 text-center">Chairs</th>
              <th className="px-3 py-2.5 w-16 text-center">Textpads</th>
              <th className="px-3 py-2.5 w-20 text-center">Capacity</th>
              <th className="px-3 py-2.5 w-28 text-center">Availability</th>
              <th className="px-3 py-2.5 w-16 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {halls.map((hall, idx) => (
              <tr key={hall.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-3 py-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                <td className="px-3 py-2.5 font-bold text-navy-950 text-sm">{hall.name}</td>
                <td className="px-3 py-2.5 text-slate-700 font-semibold">{hall.department} Dept</td>
                <td className="px-3 py-2.5">
                  {getFurnitureBadge(
                    hall.furnitureType,
                    hall.benchCount,
                    hall.chairCount,
                    hall.textpadChairCount,
                    hall.studentsPerBench,
                    hall.threeSeaterBenchCount
                  )}
                </td>
                <td className="px-3 py-2.5 text-center font-mono text-slate-600 text-[11px]">
                  {hall.columnCount || 4} Cols &times; {hall.rowCount || 5} Rows
                </td>
                <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                  {hall.furnitureType === 'writing_pad_chair' ? '-' : hall.benchCount}
                </td>
                <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                  {hall.furnitureType === 'writing_pad_chair' ? '-' : (hall.deskCount || hall.benchCount || '-')}
                </td>
                <td className="px-3 py-2.5 text-center font-mono">
                  {hall.chairCount && hall.chairCount > 0 ? (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300"
                      title={`${hall.chairCount} extra chairs assigned (short bench)`}
                    >
                      {hall.chairCount}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-semibold">0</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                  {hall.furnitureType === 'mixed'
                    ? (hall.textpadChairCount || 0)
                    : hall.furnitureType === 'writing_pad_chair'
                    ? (hall.textpadChairCount || hall.chairCount || hall.capacity)
                    : '-'}
                </td>
                <td className="px-3 py-2.5 text-center font-mono font-bold text-navy-900">
                  <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                    {hall.capacity}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <button
                    onClick={() => handleToggleAvailability(hall)}
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer transition-colors ${
                      hall.isAvailable
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {hall.isAvailable ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Available</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Unavailable</span>
                      </>
                    )}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-right space-x-1">
                  <button
                    onClick={() => {
                      const fType = hall.furnitureType || 'bench_desk';
                      setEditingHall({
                        ...hall,
                        furnitureType: fType,
                        studentsPerBench: hall.studentsPerBench || 2,
                        threeSeaterBenchCount: hall.threeSeaterBenchCount || 0,
                        columnCount: hall.columnCount || (fType === 'mixed' ? 2 : 4),
                        rowCount: hall.rowCount || 5,
                        benchCount: hall.benchCount !== undefined ? hall.benchCount : 20,
                        deskCount: hall.deskCount !== undefined ? hall.deskCount : (hall.benchCount !== undefined ? hall.benchCount : 20),
                        chairCount: hall.chairCount !== undefined ? hall.chairCount : 0,
                        textpadChairCount: hall.textpadChairCount || 0,
                        capacity: hall.capacity || 40,
                      });
                    }}
                    className="p-1 rounded text-slate-500 hover:text-navy-900 hover:bg-slate-100"
                    title="Edit hall details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingHallId(hall.id)}
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete hall"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Hall Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 w-full max-w-lg p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-navy-950 flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-navy-800" />
                <span>Add Examination Hall</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Hall Name / Room No</label>
                  <input
                    type="text"
                    placeholder="e.g. D 104, B 208, A 201"
                    value={newHall.name}
                    onChange={(e) => setNewHall({ ...newHall, name: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-bold focus:border-navy-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Home Department</label>
                  <select
                    value={newHall.department}
                    onChange={(e) => setNewHall({ ...newHall, department: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-navy-700 focus:outline-none"
                  >
                    <option value="CS">Computer Science (CS)</option>
                    <option value="EC">Electronics & Comm (EC)</option>
                    <option value="Diploma">Diploma (EEE/AU/CT)</option>
                    <option value="MCA">MCA / Computer Applications</option>
                    <option value="General">General / Main Block</option>
                  </select>
                </div>
              </div>

              {/* Furniture Type Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Furniture & Seating Setup
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFurnitureTypeChange('bench_desk', newHall, setNewHall)}
                    className={`p-2 rounded border text-left flex flex-col justify-between transition-colors ${
                      (newHall.furnitureType || 'bench_desk') === 'bench_desk'
                        ? 'border-navy-900 bg-navy-50/60 text-navy-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-[11px]">Benches & Desks</span>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">2 students per bench</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFurnitureTypeChange('desk_chair', newHall, setNewHall)}
                    className={`p-2 rounded border text-left flex flex-col justify-between transition-colors ${
                      newHall.furnitureType === 'desk_chair'
                        ? 'border-navy-900 bg-navy-50/60 text-navy-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-[11px]">Desks & Chairs</span>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">Separate desk & chairs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFurnitureTypeChange('writing_pad_chair', newHall, setNewHall)}
                    className={`p-2 rounded border text-left flex flex-col justify-between transition-colors ${
                      newHall.furnitureType === 'writing_pad_chair'
                        ? 'border-navy-900 bg-navy-50/60 text-navy-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-[11px]">Writing Pad Chairs</span>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">Attached book placers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFurnitureTypeChange('mixed', newHall, setNewHall)}
                    className={`p-2 rounded border text-left flex flex-col justify-between transition-colors ${
                      newHall.furnitureType === 'mixed'
                        ? 'border-navy-900 bg-navy-50/60 text-navy-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-[11px]">Mixed Layout</span>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">Benches + Textpad chairs</span>
                  </button>
                </div>
              </div>

              {/* Quantities & Layout based on furniture setup */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
                {newHall.furnitureType === 'mixed' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Columns Layout
                        </label>
                        <select
                          value={newHall.columnCount || 2}
                          onChange={(e) => setNewHall({ ...newHall, columnCount: parseInt(e.target.value, 10) || 2 })}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold"
                        >
                          <option value={2}>2 Columns (A, B)</option>
                          <option value={3}>3 Columns (A, B, C)</option>
                          <option value={4}>4 Columns (A, B, C, D)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Total Rows
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={newHall.rowCount || 5}
                          onChange={(e) => setNewHall({ ...newHall, rowCount: parseInt(e.target.value, 10) || 5 })}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                    </div>

                    {/* Bench Seating Capacity Selector (Mixed Layout) */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Bench Seating Capacity (Students Per Bench)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const b = typeof newHall.benchCount === 'number' ? newHall.benchCount : 8;
                            const t = typeof newHall.textpadChairCount === 'number' ? newHall.textpadChairCount : 2;
                            const c = typeof newHall.chairCount === 'number' ? newHall.chairCount : 0;
                            setNewHall({
                              ...newHall,
                              studentsPerBench: 2,
                              threeSeaterBenchCount: 0,
                              capacity: Math.min(b * 2 + t + c, 40),
                            });
                          }}
                          className={`p-2 rounded border text-left text-xs ${
                            (newHall.studentsPerBench || 2) === 2 && !newHall.threeSeaterBenchCount
                              ? 'border-navy-900 bg-navy-50 text-navy-950 font-bold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px]">2 per Bench (Standard)</div>
                          <div className="text-[10px] text-slate-500 font-normal">Left & Right (2 seats)</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const b = typeof newHall.benchCount === 'number' ? newHall.benchCount : 8;
                            const t = typeof newHall.textpadChairCount === 'number' ? newHall.textpadChairCount : 2;
                            const c = typeof newHall.chairCount === 'number' ? newHall.chairCount : 0;
                            setNewHall({
                              ...newHall,
                              studentsPerBench: 3,
                              threeSeaterBenchCount: b,
                              capacity: Math.min(b * 3 + t + c, 40),
                            });
                          }}
                          className={`p-2 rounded border text-left text-xs ${
                            newHall.studentsPerBench === 3
                              ? 'border-purple-800 bg-purple-50 text-purple-950 font-bold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px] text-purple-900">3 per Bench (All Large)</div>
                          <div className="text-[10px] text-slate-500 font-normal">Left, Middle & Right</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const b = typeof newHall.benchCount === 'number' ? newHall.benchCount : 8;
                            const threeCount = Math.max(1, Math.floor(b / 2));
                            const t = typeof newHall.textpadChairCount === 'number' ? newHall.textpadChairCount : 2;
                            const c = typeof newHall.chairCount === 'number' ? newHall.chairCount : 0;
                            const cap = (b - threeCount) * 2 + threeCount * 3 + t + c;
                            setNewHall({
                              ...newHall,
                              studentsPerBench: 2,
                              threeSeaterBenchCount: threeCount,
                              capacity: Math.min(cap, 40),
                            });
                          }}
                          className={`p-2 rounded border text-left text-xs ${
                            (newHall.threeSeaterBenchCount || 0) > 0 && newHall.studentsPerBench !== 3
                              ? 'border-indigo-800 bg-indigo-50 text-indigo-950 font-bold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px] text-indigo-900">Partial Large Benches</div>
                          <div className="text-[10px] text-slate-500 font-normal">Mix of 2-seat & 3-seat</div>
                        </button>
                      </div>
                    </div>

                    {(newHall.threeSeaterBenchCount || 0) > 0 && newHall.studentsPerBench !== 3 && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded p-2 text-xs flex items-center justify-between">
                        <span className="text-indigo-950 font-semibold text-[11px]">
                          Number of Larger 3-Seater Benches:
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            min="1"
                            max={newHall.benchCount || 20}
                            value={newHall.threeSeaterBenchCount || 1}
                            onChange={(e) => {
                              const cnt = parseInt(e.target.value, 10) || 0;
                              const b = typeof newHall.benchCount === 'number' ? newHall.benchCount : 8;
                              const t = typeof newHall.textpadChairCount === 'number' ? newHall.textpadChairCount : 2;
                              const c = typeof newHall.chairCount === 'number' ? newHall.chairCount : 0;
                              const cap = (b - cnt) * 2 + cnt * 3 + t + c;
                              setNewHall({
                                ...newHall,
                                threeSeaterBenchCount: cnt,
                                capacity: Math.min(cap, 40),
                              });
                            }}
                            className="w-20 bg-white border border-indigo-300 rounded px-2 py-1 font-mono text-center font-bold"
                          />
                          <span className="text-slate-500 text-[10px]">benches</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Benches
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={newHall.benchCount ?? ''}
                          onChange={(e) => {
                            const b = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0;
                            const t = typeof newHall.textpadChairCount === 'number' ? newHall.textpadChairCount : 0;
                            const c = typeof newHall.chairCount === 'number' ? newHall.chairCount : 0;
                            let autoCap = newHall.capacity;
                            if (typeof b === 'number') {
                              if (newHall.studentsPerBench === 3) {
                                autoCap = Math.min(40, b * 3 + t + c);
                              } else if ((newHall.threeSeaterBenchCount || 0) > 0) {
                                const threeCnt = Math.min(newHall.threeSeaterBenchCount || 0, b);
                                autoCap = Math.min(40, (b - threeCnt) * 2 + threeCnt * 3 + t + c);
                              } else {
                                autoCap = Math.min(40, b * 2 + t + c);
                              }
                            }
                            setNewHall({
                              ...newHall,
                              benchCount: b,
                              deskCount: typeof b === 'number' ? b : newHall.deskCount,
                              capacity: autoCap,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                          placeholder="e.g. 8"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Desks
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newHall.deskCount ?? ''}
                          onChange={(e) =>
                            setNewHall({
                              ...newHall,
                              deskCount: e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                          placeholder="e.g. 10"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Chairs
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newHall.chairCount ?? ''}
                          onChange={(e) => {
                            const c = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0;
                            const b = typeof newHall.benchCount === 'number' ? newHall.benchCount : 0;
                            const t = typeof newHall.textpadChairCount === 'number' ? newHall.textpadChairCount : 0;
                            const cNum = typeof c === 'number' ? c : 0;
                            let autoCap = newHall.capacity;
                            if (newHall.studentsPerBench === 3) {
                              autoCap = Math.min(40, b * 3 + t + cNum);
                            } else if ((newHall.threeSeaterBenchCount || 0) > 0) {
                              const threeCnt = Math.min(newHall.threeSeaterBenchCount || 0, b);
                              autoCap = Math.min(40, (b - threeCnt) * 2 + threeCnt * 3 + t + cNum);
                            } else {
                              autoCap = Math.min(40, b * 2 + t + cNum);
                            }
                            setNewHall({
                              ...newHall,
                              chairCount: c,
                              capacity: autoCap,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                          placeholder="e.g. 2"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Textpads
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={newHall.textpadChairCount ?? ''}
                          onChange={(e) => {
                            const t = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0;
                            const b = typeof newHall.benchCount === 'number' ? newHall.benchCount : 0;
                            const c = typeof newHall.chairCount === 'number' ? newHall.chairCount : 0;
                            const tNum = typeof t === 'number' ? t : 0;
                            let autoCap = newHall.capacity;
                            if (newHall.studentsPerBench === 3) {
                              autoCap = Math.min(40, b * 3 + tNum + c);
                            } else if ((newHall.threeSeaterBenchCount || 0) > 0) {
                              const threeCnt = Math.min(newHall.threeSeaterBenchCount || 0, b);
                              autoCap = Math.min(40, (b - threeCnt) * 2 + threeCnt * 3 + tNum + c);
                            } else {
                              autoCap = Math.min(40, b * 2 + tNum + c);
                            }
                            setNewHall({
                              ...newHall,
                              textpadChairCount: t,
                              capacity: autoCap,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                          placeholder="e.g. 2"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-navy-950 uppercase mb-1">
                          Capacity
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="40"
                          value={newHall.capacity ?? ''}
                          onChange={(e) =>
                            setNewHall({
                              ...newHall,
                              capacity: e.target.value === '' ? ('' as any) : Math.min(40, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-full bg-white border border-navy-300 font-bold text-navy-900 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                    </div>
                  </>
                ) : newHall.furnitureType === 'desk_chair' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Columns Layout
                        </label>
                        <select
                          value={newHall.columnCount || 4}
                          onChange={(e) => {
                            const newCols = parseInt(e.target.value, 10) || 4;
                            const rows = newHall.rowCount || 5;
                            const defaultDesks = Math.min(newCols * rows, 20);
                            const defaultChairs = defaultDesks * 2;
                            setNewHall({
                              ...newHall,
                              columnCount: newCols,
                              deskCount: defaultDesks,
                              chairCount: defaultChairs,
                              capacity: Math.min(defaultChairs, 40),
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold"
                        >
                          <option value={4}>4 Columns (A, B, C, D) - Standard</option>
                          <option value={3}>3 Columns (A, B, C)</option>
                          <option value={2}>2 Columns (A, B)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Rows
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={newHall.rowCount || 5}
                          onChange={(e) => {
                            const newRows = parseInt(e.target.value, 10) || 5;
                            const cols = newHall.columnCount || 4;
                            const defaultDesks = Math.min(cols * newRows, 20);
                            const defaultChairs = defaultDesks * 2;
                            setNewHall({
                              ...newHall,
                              rowCount: newRows,
                              deskCount: defaultDesks,
                              chairCount: defaultChairs,
                              capacity: Math.min(defaultChairs, 40),
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Desk Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newHall.deskCount ?? ''}
                          onChange={(e) => {
                            const d = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0;
                            setNewHall({
                              ...newHall,
                              deskCount: d,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                          placeholder="e.g. 20"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Chair Count (Total)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newHall.chairCount ?? ''}
                          onChange={(e) => {
                            const c = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0;
                            const autoCap = typeof c === 'number' ? Math.min(40, c) : newHall.capacity;
                            setNewHall({
                              ...newHall,
                              chairCount: c,
                              capacity: autoCap,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                          placeholder="e.g. 40"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-navy-950 uppercase mb-1">
                          Exam Capacity
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="40"
                          value={newHall.capacity ?? ''}
                          onChange={(e) =>
                            setNewHall({
                              ...newHall,
                              capacity: e.target.value === '' ? ('' as any) : Math.min(40, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-full bg-white border border-navy-300 font-bold text-navy-900 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 bg-blue-50/60 border border-blue-200 rounded p-2 flex items-start space-x-1.5">
                      <Layers className="w-3.5 h-3.5 mt-0.5 text-blue-700 shrink-0" />
                      <span>
                        <strong>Desks & Separate Chairs:</strong> Students sit on independent chairs placed at desks (typically 2 chairs per desk). No wooden benches are used in this setup.
                      </span>
                    </div>
                  </>
                ) : newHall.furnitureType !== 'writing_pad_chair' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Columns Layout
                        </label>
                        <select
                          value={newHall.columnCount || 4}
                          onChange={(e) => {
                            const newCols = parseInt(e.target.value, 10) || 4;
                            const rows = newHall.rowCount || 5;
                            const defaultDesks = Math.min(newCols * rows, 20);
                            const perBench = newHall.studentsPerBench || 2;
                            setNewHall({
                              ...newHall,
                              columnCount: newCols,
                              deskCount: defaultDesks,
                              benchCount: defaultDesks,
                              chairCount: 0,
                              capacity: Math.min(defaultDesks * perBench, 40),
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold"
                        >
                          <option value={4}>4 Columns (A, B, C, D) - Standard</option>
                          <option value={3}>3 Columns (A, B, C)</option>
                          <option value={2}>2 Columns (A, B)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Rows
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={newHall.rowCount || 5}
                          onChange={(e) => {
                            const newRows = parseInt(e.target.value, 10) || 5;
                            const cols = newHall.columnCount || 4;
                            const defaultDesks = Math.min(cols * newRows, 20);
                            const perBench = newHall.studentsPerBench || 2;
                            setNewHall({
                              ...newHall,
                              rowCount: newRows,
                              deskCount: defaultDesks,
                              benchCount: defaultDesks,
                              chairCount: 0,
                              capacity: Math.min(defaultDesks * perBench, 40),
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                    </div>

                    {/* Bench Seating Capacity Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Bench Seating Capacity (Students Per Bench)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const b = typeof newHall.benchCount === 'number' ? newHall.benchCount : 20;
                            const c = typeof newHall.chairCount === 'number' ? newHall.chairCount : 0;
                            setNewHall({
                              ...newHall,
                              studentsPerBench: 2,
                              threeSeaterBenchCount: 0,
                              capacity: Math.min(b * 2 + c, 40),
                            });
                          }}
                          className={`p-2 rounded border text-left text-xs ${
                            (newHall.studentsPerBench || 2) === 2 && !newHall.threeSeaterBenchCount
                              ? 'border-navy-900 bg-navy-50 text-navy-950 font-bold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px]">2 per Bench (Standard)</div>
                          <div className="text-[10px] text-slate-500 font-normal">Left & Right (2 seats)</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const b = typeof newHall.benchCount === 'number' ? newHall.benchCount : 20;
                            const c = typeof newHall.chairCount === 'number' ? newHall.chairCount : 0;
                            setNewHall({
                              ...newHall,
                              studentsPerBench: 3,
                              threeSeaterBenchCount: b,
                              capacity: Math.min(b * 3 + c, 40),
                            });
                          }}
                          className={`p-2 rounded border text-left text-xs ${
                            newHall.studentsPerBench === 3
                              ? 'border-purple-800 bg-purple-50 text-purple-950 font-bold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px] text-purple-900">3 per Bench (All Large)</div>
                          <div className="text-[10px] text-slate-500 font-normal">Left, Middle & Right</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const b = typeof newHall.benchCount === 'number' ? newHall.benchCount : 20;
                            const threeCount = Math.max(1, Math.floor(b / 2));
                            const c = typeof newHall.chairCount === 'number' ? newHall.chairCount : 0;
                            const cap = (b - threeCount) * 2 + threeCount * 3 + c;
                            setNewHall({
                              ...newHall,
                              studentsPerBench: 2,
                              threeSeaterBenchCount: threeCount,
                              capacity: Math.min(cap, 40),
                            });
                          }}
                          className={`p-2 rounded border text-left text-xs ${
                            (newHall.threeSeaterBenchCount || 0) > 0 && newHall.studentsPerBench !== 3
                              ? 'border-indigo-800 bg-indigo-50 text-indigo-950 font-bold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px] text-indigo-900">Partial Large Benches</div>
                          <div className="text-[10px] text-slate-500 font-normal">Mix of 2-seat & 3-seat</div>
                        </button>
                      </div>
                    </div>

                    {(newHall.threeSeaterBenchCount || 0) > 0 && newHall.studentsPerBench !== 3 && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded p-2 text-xs flex items-center justify-between">
                        <span className="text-indigo-950 font-semibold text-[11px]">
                          How many benches are larger 3-seaters?
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            min="1"
                            max={newHall.benchCount || 20}
                            value={newHall.threeSeaterBenchCount || 1}
                            onChange={(e) => {
                              const cnt = parseInt(e.target.value, 10) || 0;
                              const b = typeof newHall.benchCount === 'number' ? newHall.benchCount : 20;
                              const c = typeof newHall.chairCount === 'number' ? newHall.chairCount : 0;
                              const cap = (b - cnt) * 2 + cnt * 3 + c;
                              setNewHall({
                                ...newHall,
                                threeSeaterBenchCount: cnt,
                                capacity: Math.min(cap, 40),
                              });
                            }}
                            className="w-20 bg-white border border-indigo-300 rounded px-2 py-1 font-mono text-center font-bold"
                          />
                          <span className="text-slate-500 text-[10px]">benches</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Bench Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={newHall.benchCount ?? ''}
                          onChange={(e) => {
                            const b = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0;
                            const currentChairs = typeof newHall.chairCount === 'number' ? newHall.chairCount : 0;
                            let autoCap = newHall.capacity;
                            if (typeof b === 'number') {
                              if (newHall.studentsPerBench === 3) {
                                autoCap = Math.min(40, b * 3 + currentChairs);
                              } else if ((newHall.threeSeaterBenchCount || 0) > 0) {
                                const threeCnt = Math.min(newHall.threeSeaterBenchCount || 0, b);
                                autoCap = Math.min(40, (b - threeCnt) * 2 + threeCnt * 3 + currentChairs);
                              } else {
                                autoCap = Math.min(40, b * 2 + currentChairs);
                              }
                            }
                            setNewHall({
                              ...newHall,
                              benchCount: b,
                              capacity: autoCap,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Desk Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newHall.deskCount ?? ''}
                          onChange={(e) =>
                            setNewHall({
                              ...newHall,
                              deskCount: e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Chair Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newHall.chairCount ?? ''}
                          onChange={(e) => {
                            const c = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0;
                            const b = typeof newHall.benchCount === 'number' ? newHall.benchCount : 0;
                            let autoCap = newHall.capacity;
                            if (typeof c === 'number') {
                              if (newHall.studentsPerBench === 3) {
                                autoCap = Math.min(40, b * 3 + c);
                              } else if ((newHall.threeSeaterBenchCount || 0) > 0) {
                                const threeCnt = Math.min(newHall.threeSeaterBenchCount || 0, b);
                                autoCap = Math.min(40, (b - threeCnt) * 2 + threeCnt * 3 + c);
                              } else {
                                autoCap = Math.min(40, b * 2 + c);
                              }
                            }
                            setNewHall({
                              ...newHall,
                              chairCount: c,
                              capacity: autoCap,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                          placeholder="0 if all benches"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-navy-950 uppercase mb-1">
                          Exam Capacity
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="40"
                          value={newHall.capacity ?? ''}
                          onChange={(e) =>
                            setNewHall({
                              ...newHall,
                              capacity: e.target.value === '' ? ('' as any) : Math.min(40, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-full bg-white border border-navy-300 font-bold text-navy-900 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                    </div>

                    {/* Short Bench Assistant for Add Modal */}
                    {(() => {
                      const bCount = typeof newHall.benchCount === 'number' ? newHall.benchCount : 0;
                      const dCount = typeof newHall.deskCount === 'number' ? newHall.deskCount : bCount;
                      const cCount = typeof newHall.chairCount === 'number' ? newHall.chairCount : 0;
                      const missing = Math.max(0, dCount - bCount);
                      if (missing > 0) {
                        const neededChairs = missing * 2;
                        return (
                          <div className="bg-amber-50 border border-amber-300 rounded p-2 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-center space-x-1.5 text-amber-900">
                              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>
                                <strong>Short Bench:</strong> {missing} {missing === 1 ? 'desk has no bench' : 'desks have no benches'} ({dCount} desks, {bCount} benches). Needs {neededChairs} chairs.
                              </span>
                            </div>
                            {cCount !== neededChairs && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewHall({
                                    ...newHall,
                                    chairCount: neededChairs,
                                    capacity: Math.min(bCount * 2 + neededChairs, 40),
                                  });
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-2.5 py-1 rounded transition-colors shrink-0"
                              >
                                + Set Chairs to {neededChairs} (Cap: {Math.min(bCount * 2 + neededChairs, 40)})
                              </button>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded p-2 flex items-start space-x-1.5">
                      <HelpCircle className="w-3.5 h-3.5 mt-0.5 text-navy-700 shrink-0" />
                      <span>
                        <strong>Seating & Short Bench Rule:</strong> 1 bench seats 2 students at 1 desk. For 20 students (2 cols &times; 5 rows = 10 desks), if 1 bench is short (9 benches), assign 2 chairs for that 10th desk so Chair Count = 2 and Capacity = 20. If all benches are present, Chair Count is 0.
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Columns Layout
                      </label>
                      <select
                        value={newHall.columnCount || 4}
                        onChange={(e) => setNewHall({ ...newHall, columnCount: parseInt(e.target.value, 10) || 4 })}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold"
                      >
                        <option value={4}>4 Columns (A, B, C, D)</option>
                        <option value={3}>3 Columns (A, B, C)</option>
                        <option value={2}>2 Columns (A, B)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Writing Pad Chairs Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="40"
                        value={newHall.chairCount || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setNewHall({
                            ...newHall,
                            chairCount: val,
                            textpadChairCount: val,
                            capacity: Math.min(val, 40),
                          });
                        }}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                        placeholder="e.g. 30 or 36"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-navy-950 uppercase mb-1">
                        Exam Capacity
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="40"
                        value={newHall.capacity}
                        onChange={(e) =>
                          setNewHall({
                            ...newHall,
                            capacity: Math.min(40, parseInt(e.target.value, 10) || 1),
                          })
                        }
                        className="w-full bg-white border border-navy-300 font-bold text-navy-900 rounded px-2 py-1.5 font-mono text-center"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 flex items-start space-x-1">
                <HelpCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                <span>
                  KTU examination norms enforce a hard maximum of 40 students per examination hall.
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2 border-t">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewHall}
                className="px-4 py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded text-xs font-semibold shadow-xs"
              >
                Save Hall
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Hall Modal */}
      {editingHall && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 w-full max-w-lg p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-navy-950 flex items-center space-x-1.5">
                <Edit3 className="w-4 h-4 text-navy-800" />
                <span>Edit Hall: {editingHall.name}</span>
              </h3>
              <button onClick={() => setEditingHall(null)} className="text-slate-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Hall Name / Number</label>
                  <input
                    type="text"
                    value={editingHall.name}
                    onChange={(e) => setEditingHall({ ...editingHall, name: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Department</label>
                  <input
                    type="text"
                    value={editingHall.department}
                    onChange={(e) => setEditingHall({ ...editingHall, department: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              {/* Furniture Type Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Furniture & Seating Setup
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFurnitureTypeChange('bench_desk', editingHall, (h) => setEditingHall(h as Hall))}
                    className={`p-2 rounded border text-left flex flex-col justify-between transition-colors ${
                      (editingHall.furnitureType || 'bench_desk') === 'bench_desk'
                        ? 'border-navy-900 bg-navy-50/60 text-navy-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-[11px]">Benches & Desks</span>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">2 students per bench</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFurnitureTypeChange('desk_chair', editingHall, (h) => setEditingHall(h as Hall))}
                    className={`p-2 rounded border text-left flex flex-col justify-between transition-colors ${
                      editingHall.furnitureType === 'desk_chair'
                        ? 'border-navy-900 bg-navy-50/60 text-navy-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-[11px]">Desks & Chairs</span>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">Separate desk & chairs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFurnitureTypeChange('writing_pad_chair', editingHall, (h) => setEditingHall(h as Hall))}
                    className={`p-2 rounded border text-left flex flex-col justify-between transition-colors ${
                      editingHall.furnitureType === 'writing_pad_chair'
                        ? 'border-navy-900 bg-navy-50/60 text-navy-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-[11px]">Writing Pad Chairs</span>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">Attached book placers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFurnitureTypeChange('mixed', editingHall, (h) => setEditingHall(h as Hall))}
                    className={`p-2 rounded border text-left flex flex-col justify-between transition-colors ${
                      editingHall.furnitureType === 'mixed'
                        ? 'border-navy-900 bg-navy-50/60 text-navy-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-[11px]">Mixed Layout</span>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">Benches + Textpad chairs</span>
                  </button>
                </div>
              </div>

              {/* Quantities & Layout based on furniture setup */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
                {editingHall.furnitureType === 'mixed' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Columns Layout
                        </label>
                        <select
                          value={editingHall.columnCount || 2}
                          onChange={(e) => setEditingHall({ ...editingHall, columnCount: parseInt(e.target.value, 10) || 2 })}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold"
                        >
                          <option value={2}>2 Columns (A, B)</option>
                          <option value={3}>3 Columns (A, B, C)</option>
                          <option value={4}>4 Columns (A, B, C, D)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Total Rows
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editingHall.rowCount || 5}
                          onChange={(e) => setEditingHall({ ...editingHall, rowCount: parseInt(e.target.value, 10) || 5 })}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                    </div>

                    {/* Bench Seating Capacity Selector (Mixed Layout - Edit Modal) */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Bench Seating Capacity (Students Per Bench)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const b = typeof editingHall.benchCount === 'number' ? editingHall.benchCount : 8;
                            const t = typeof editingHall.textpadChairCount === 'number' ? editingHall.textpadChairCount : 2;
                            const c = typeof editingHall.chairCount === 'number' ? editingHall.chairCount : 0;
                            setEditingHall({
                              ...editingHall,
                              studentsPerBench: 2,
                              threeSeaterBenchCount: 0,
                              capacity: Math.min(b * 2 + t + c, 40),
                            });
                          }}
                          className={`p-2 rounded border text-left text-xs ${
                            (editingHall.studentsPerBench || 2) === 2 && !editingHall.threeSeaterBenchCount
                              ? 'border-navy-900 bg-navy-50 text-navy-950 font-bold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px]">2 per Bench (Standard)</div>
                          <div className="text-[10px] text-slate-500 font-normal">Left & Right (2 seats)</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const b = typeof editingHall.benchCount === 'number' ? editingHall.benchCount : 8;
                            const t = typeof editingHall.textpadChairCount === 'number' ? editingHall.textpadChairCount : 2;
                            const c = typeof editingHall.chairCount === 'number' ? editingHall.chairCount : 0;
                            setEditingHall({
                              ...editingHall,
                              studentsPerBench: 3,
                              threeSeaterBenchCount: b,
                              capacity: Math.min(b * 3 + t + c, 40),
                            });
                          }}
                          className={`p-2 rounded border text-left text-xs ${
                            editingHall.studentsPerBench === 3
                              ? 'border-purple-800 bg-purple-50 text-purple-950 font-bold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px] text-purple-900">3 per Bench (All Large)</div>
                          <div className="text-[10px] text-slate-500 font-normal">Left, Middle & Right</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const b = typeof editingHall.benchCount === 'number' ? editingHall.benchCount : 8;
                            const threeCount = Math.max(1, Math.floor(b / 2));
                            const t = typeof editingHall.textpadChairCount === 'number' ? editingHall.textpadChairCount : 2;
                            const c = typeof editingHall.chairCount === 'number' ? editingHall.chairCount : 0;
                            const cap = (b - threeCount) * 2 + threeCount * 3 + t + c;
                            setEditingHall({
                              ...editingHall,
                              studentsPerBench: 2,
                              threeSeaterBenchCount: threeCount,
                              capacity: Math.min(cap, 40),
                            });
                          }}
                          className={`p-2 rounded border text-left text-xs ${
                            (editingHall.threeSeaterBenchCount || 0) > 0 && editingHall.studentsPerBench !== 3
                              ? 'border-indigo-800 bg-indigo-50 text-indigo-950 font-bold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px] text-indigo-900">Partial Large Benches</div>
                          <div className="text-[10px] text-slate-500 font-normal">Mix of 2-seat & 3-seat</div>
                        </button>
                      </div>
                    </div>

                    {(editingHall.threeSeaterBenchCount || 0) > 0 && editingHall.studentsPerBench !== 3 && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded p-2 text-xs flex items-center justify-between">
                        <span className="text-indigo-950 font-semibold text-[11px]">
                          Number of Larger 3-Seater Benches:
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            min="1"
                            max={editingHall.benchCount || 20}
                            value={editingHall.threeSeaterBenchCount || 1}
                            onChange={(e) => {
                              const cnt = parseInt(e.target.value, 10) || 0;
                              const b = typeof editingHall.benchCount === 'number' ? editingHall.benchCount : 8;
                              const t = typeof editingHall.textpadChairCount === 'number' ? editingHall.textpadChairCount : 2;
                              const c = typeof editingHall.chairCount === 'number' ? editingHall.chairCount : 0;
                              const cap = (b - cnt) * 2 + cnt * 3 + t + c;
                              setEditingHall({
                                ...editingHall,
                                threeSeaterBenchCount: cnt,
                                capacity: Math.min(cap, 40),
                              });
                            }}
                            className="w-20 bg-white border border-indigo-300 rounded px-2 py-1 font-mono text-center font-bold"
                          />
                          <span className="text-slate-500 text-[10px]">benches</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Benches
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={editingHall.benchCount ?? ''}
                          onChange={(e) => {
                            const b = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0;
                            const t = typeof editingHall.textpadChairCount === 'number' ? editingHall.textpadChairCount : 0;
                            const c = typeof editingHall.chairCount === 'number' ? editingHall.chairCount : 0;
                            let autoCap = editingHall.capacity;
                            if (typeof b === 'number') {
                              if (editingHall.studentsPerBench === 3) {
                                autoCap = Math.min(40, b * 3 + t + c);
                              } else if ((editingHall.threeSeaterBenchCount || 0) > 0) {
                                const threeCnt = Math.min(editingHall.threeSeaterBenchCount || 0, b);
                                autoCap = Math.min(40, (b - threeCnt) * 2 + threeCnt * 3 + t + c);
                              } else {
                                autoCap = Math.min(40, b * 2 + t + c);
                              }
                            }
                            setEditingHall({
                              ...editingHall,
                              benchCount: b,
                              deskCount: typeof b === 'number' ? b : editingHall.deskCount,
                              capacity: autoCap,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                          placeholder="e.g. 8"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Desks
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editingHall.deskCount ?? ''}
                          onChange={(e) =>
                            setEditingHall({
                              ...editingHall,
                              deskCount: e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                          placeholder="e.g. 10"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Chairs
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editingHall.chairCount ?? ''}
                          onChange={(e) => {
                            const c = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0;
                            const b = typeof editingHall.benchCount === 'number' ? editingHall.benchCount : 0;
                            const t = typeof editingHall.textpadChairCount === 'number' ? editingHall.textpadChairCount : 0;
                            const cNum = typeof c === 'number' ? c : 0;
                            let autoCap = editingHall.capacity;
                            if (editingHall.studentsPerBench === 3) {
                              autoCap = Math.min(40, b * 3 + t + cNum);
                            } else if ((editingHall.threeSeaterBenchCount || 0) > 0) {
                              const threeCnt = Math.min(editingHall.threeSeaterBenchCount || 0, b);
                              autoCap = Math.min(40, (b - threeCnt) * 2 + threeCnt * 3 + t + cNum);
                            } else {
                              autoCap = Math.min(40, b * 2 + t + cNum);
                            }
                            setEditingHall({
                              ...editingHall,
                              chairCount: c,
                              capacity: autoCap,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                          placeholder="e.g. 2"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Textpads
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={editingHall.textpadChairCount ?? ''}
                          onChange={(e) => {
                            const t = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0;
                            const b = typeof editingHall.benchCount === 'number' ? editingHall.benchCount : 0;
                            const c = typeof editingHall.chairCount === 'number' ? editingHall.chairCount : 0;
                            const tNum = typeof t === 'number' ? t : 0;
                            let autoCap = editingHall.capacity;
                            if (editingHall.studentsPerBench === 3) {
                              autoCap = Math.min(40, b * 3 + tNum + c);
                            } else if ((editingHall.threeSeaterBenchCount || 0) > 0) {
                              const threeCnt = Math.min(editingHall.threeSeaterBenchCount || 0, b);
                              autoCap = Math.min(40, (b - threeCnt) * 2 + threeCnt * 3 + tNum + c);
                            } else {
                              autoCap = Math.min(40, b * 2 + tNum + c);
                            }
                            setEditingHall({
                              ...editingHall,
                              textpadChairCount: t,
                              capacity: autoCap,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                          placeholder="e.g. 2"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-navy-950 uppercase mb-1">
                          Capacity
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="40"
                          value={editingHall.capacity ?? ''}
                          onChange={(e) =>
                            setEditingHall({
                              ...editingHall,
                              capacity: e.target.value === '' ? ('' as any) : Math.min(40, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-full bg-white border border-navy-300 font-bold text-navy-900 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                    </div>
                  </>
                ) : editingHall.furnitureType === 'desk_chair' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Columns Layout
                        </label>
                        <select
                          value={editingHall.columnCount || 4}
                          onChange={(e) => {
                            const newCols = parseInt(e.target.value, 10) || 4;
                            const rows = editingHall.rowCount || 5;
                            const defaultDesks = Math.min(newCols * rows, 20);
                            const defaultChairs = defaultDesks * 2;
                            setEditingHall({
                              ...editingHall,
                              columnCount: newCols,
                              deskCount: defaultDesks,
                              chairCount: defaultChairs,
                              capacity: Math.min(defaultChairs, 40),
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold"
                        >
                          <option value={4}>4 Columns (A, B, C, D) - Standard</option>
                          <option value={3}>3 Columns (A, B, C)</option>
                          <option value={2}>2 Columns (A, B)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Rows
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editingHall.rowCount || 5}
                          onChange={(e) => {
                            const newRows = parseInt(e.target.value, 10) || 5;
                            const cols = editingHall.columnCount || 4;
                            const defaultDesks = Math.min(cols * newRows, 20);
                            const defaultChairs = defaultDesks * 2;
                            setEditingHall({
                              ...editingHall,
                              rowCount: newRows,
                              deskCount: defaultDesks,
                              chairCount: defaultChairs,
                              capacity: Math.min(defaultChairs, 40),
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Desk Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editingHall.deskCount ?? ''}
                          onChange={(e) => {
                            const d = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0;
                            setEditingHall({
                              ...editingHall,
                              deskCount: d,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                          placeholder="e.g. 20"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Chair Count (Total)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editingHall.chairCount ?? ''}
                          onChange={(e) => {
                            const c = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0;
                            const autoCap = typeof c === 'number' ? Math.min(40, c) : editingHall.capacity;
                            setEditingHall({
                              ...editingHall,
                              chairCount: c,
                              capacity: autoCap,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                          placeholder="e.g. 40"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-navy-950 uppercase mb-1">
                          Exam Capacity
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="40"
                          value={editingHall.capacity ?? ''}
                          onChange={(e) =>
                            setEditingHall({
                              ...editingHall,
                              capacity: e.target.value === '' ? ('' as any) : Math.min(40, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-full bg-white border border-navy-300 font-bold text-navy-900 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 bg-blue-50/60 border border-blue-200 rounded p-2 flex items-start space-x-1.5">
                      <Layers className="w-3.5 h-3.5 mt-0.5 text-blue-700 shrink-0" />
                      <span>
                        <strong>Desks & Separate Chairs:</strong> Students sit on independent chairs placed at desks (typically 2 chairs per desk). No wooden benches are used in this setup.
                      </span>
                    </div>
                  </>
                ) : editingHall.furnitureType !== 'writing_pad_chair' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Columns Layout
                        </label>
                        <select
                          value={editingHall.columnCount || 4}
                          onChange={(e) => {
                            const newCols = parseInt(e.target.value, 10) || 4;
                            const rows = editingHall.rowCount || 5;
                            const defaultDesks = Math.min(newCols * rows, 20);
                            setEditingHall({
                              ...editingHall,
                              columnCount: newCols,
                              deskCount: defaultDesks,
                              benchCount: defaultDesks,
                              chairCount: 0,
                              capacity: Math.min(defaultDesks * 2, 40),
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold"
                        >
                          <option value={4}>4 Columns (A, B, C, D) - Standard</option>
                          <option value={3}>3 Columns (A, B, C)</option>
                          <option value={2}>2 Columns (A, B)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Rows
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editingHall.rowCount || 5}
                          onChange={(e) => {
                            const newRows = parseInt(e.target.value, 10) || 5;
                            const cols = editingHall.columnCount || 4;
                            const defaultDesks = Math.min(cols * newRows, 20);
                            setEditingHall({
                              ...editingHall,
                              rowCount: newRows,
                              deskCount: defaultDesks,
                              benchCount: defaultDesks,
                              chairCount: 0,
                              capacity: Math.min(defaultDesks * 2, 40),
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                    </div>
                    {/* Bench Seating Capacity Selector (Edit Modal) */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Bench Seating Capacity (Students Per Bench)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const b = typeof editingHall.benchCount === 'number' ? editingHall.benchCount : 20;
                            const c = typeof editingHall.chairCount === 'number' ? editingHall.chairCount : 0;
                            setEditingHall({
                              ...editingHall,
                              studentsPerBench: 2,
                              threeSeaterBenchCount: 0,
                              capacity: Math.min(b * 2 + c, 40),
                            });
                          }}
                          className={`p-2 rounded border text-left text-xs ${
                            (editingHall.studentsPerBench || 2) === 2 && !editingHall.threeSeaterBenchCount
                              ? 'border-navy-900 bg-navy-50 text-navy-950 font-bold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px]">2 per Bench (Standard)</div>
                          <div className="text-[10px] text-slate-500 font-normal">Left & Right (2 seats)</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const b = typeof editingHall.benchCount === 'number' ? editingHall.benchCount : 20;
                            const c = typeof editingHall.chairCount === 'number' ? editingHall.chairCount : 0;
                            setEditingHall({
                              ...editingHall,
                              studentsPerBench: 3,
                              threeSeaterBenchCount: b,
                              capacity: Math.min(b * 3 + c, 40),
                            });
                          }}
                          className={`p-2 rounded border text-left text-xs ${
                            editingHall.studentsPerBench === 3
                              ? 'border-purple-800 bg-purple-50 text-purple-950 font-bold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px] text-purple-900">3 per Bench (All Large)</div>
                          <div className="text-[10px] text-slate-500 font-normal">Left, Middle & Right</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const b = typeof editingHall.benchCount === 'number' ? editingHall.benchCount : 20;
                            const threeCount = Math.max(1, Math.floor(b / 2));
                            const c = typeof editingHall.chairCount === 'number' ? editingHall.chairCount : 0;
                            const cap = (b - threeCount) * 2 + threeCount * 3 + c;
                            setEditingHall({
                              ...editingHall,
                              studentsPerBench: 2,
                              threeSeaterBenchCount: threeCount,
                              capacity: Math.min(cap, 40),
                            });
                          }}
                          className={`p-2 rounded border text-left text-xs ${
                            (editingHall.threeSeaterBenchCount || 0) > 0 && editingHall.studentsPerBench !== 3
                              ? 'border-indigo-800 bg-indigo-50 text-indigo-950 font-bold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-[11px] text-indigo-900">Partial Large Benches</div>
                          <div className="text-[10px] text-slate-500 font-normal">Mix of 2-seat & 3-seat</div>
                        </button>
                      </div>
                    </div>

                    {(editingHall.threeSeaterBenchCount || 0) > 0 && editingHall.studentsPerBench !== 3 && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded p-2 text-xs flex items-center justify-between">
                        <span className="text-indigo-950 font-semibold text-[11px]">
                          Number of Larger 3-Seater Benches:
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            min="1"
                            max={editingHall.benchCount || 20}
                            value={editingHall.threeSeaterBenchCount || 1}
                            onChange={(e) => {
                              const cnt = parseInt(e.target.value, 10) || 0;
                              const b = typeof editingHall.benchCount === 'number' ? editingHall.benchCount : 20;
                              const c = typeof editingHall.chairCount === 'number' ? editingHall.chairCount : 0;
                              const cap = (b - cnt) * 2 + cnt * 3 + c;
                              setEditingHall({
                                ...editingHall,
                                threeSeaterBenchCount: cnt,
                                capacity: Math.min(cap, 40),
                              });
                            }}
                            className="w-20 bg-white border border-indigo-300 rounded px-2 py-1 font-mono text-center font-bold"
                          />
                          <span className="text-slate-500 text-[10px]">benches</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Bench Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={editingHall.benchCount ?? ''}
                          onChange={(e) => {
                            const b = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0;
                            const currentChairs = typeof editingHall.chairCount === 'number' ? editingHall.chairCount : 0;
                            let autoCap = editingHall.capacity;
                            if (typeof b === 'number') {
                              if (editingHall.studentsPerBench === 3) {
                                autoCap = Math.min(40, b * 3 + currentChairs);
                              } else if ((editingHall.threeSeaterBenchCount || 0) > 0) {
                                const threeCnt = Math.min(editingHall.threeSeaterBenchCount || 0, b);
                                autoCap = Math.min(40, (b - threeCnt) * 2 + threeCnt * 3 + currentChairs);
                              } else {
                                autoCap = Math.min(40, b * 2 + currentChairs);
                              }
                            }
                            setEditingHall({
                              ...editingHall,
                              benchCount: b,
                              capacity: autoCap,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Desk Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editingHall.deskCount ?? ''}
                          onChange={(e) =>
                            setEditingHall({
                              ...editingHall,
                              deskCount: e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Chair Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editingHall.chairCount ?? ''}
                          onChange={(e) => {
                            const c = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) || 0;
                            const b = typeof editingHall.benchCount === 'number' ? editingHall.benchCount : 0;
                            let autoCap = editingHall.capacity;
                            if (typeof c === 'number') {
                              if (editingHall.studentsPerBench === 3) {
                                autoCap = Math.min(40, b * 3 + c);
                              } else if ((editingHall.threeSeaterBenchCount || 0) > 0) {
                                const threeCnt = Math.min(editingHall.threeSeaterBenchCount || 0, b);
                                autoCap = Math.min(40, (b - threeCnt) * 2 + threeCnt * 3 + c);
                              } else {
                                autoCap = Math.min(40, b * 2 + c);
                              }
                            }
                            setEditingHall({
                              ...editingHall,
                              chairCount: c,
                              capacity: autoCap,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-center"
                          placeholder="0 if all benches"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-navy-950 uppercase mb-1">
                          Exam Capacity
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="40"
                          value={editingHall.capacity ?? ''}
                          onChange={(e) =>
                            setEditingHall({
                              ...editingHall,
                              capacity: e.target.value === '' ? ('' as any) : Math.min(40, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-full bg-white border border-navy-300 font-bold text-navy-900 rounded px-2 py-1.5 font-mono text-center"
                        />
                      </div>
                    </div>

                    {/* Short Bench Assistant for Edit Modal */}
                    {(() => {
                      const bCount = typeof editingHall.benchCount === 'number' ? editingHall.benchCount : 0;
                      const dCount = typeof editingHall.deskCount === 'number' ? editingHall.deskCount : bCount;
                      const cCount = typeof editingHall.chairCount === 'number' ? editingHall.chairCount : 0;
                      const missing = Math.max(0, dCount - bCount);
                      if (missing > 0) {
                        const neededChairs = missing * 2;
                        return (
                          <div className="bg-amber-50 border border-amber-300 rounded p-2 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-center space-x-1.5 text-amber-900">
                              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>
                                <strong>Short Bench:</strong> {missing} {missing === 1 ? 'desk has no bench' : 'desks have no benches'} ({dCount} desks, {bCount} benches). Needs {neededChairs} chairs.
                              </span>
                            </div>
                            {cCount !== neededChairs && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingHall({
                                    ...editingHall,
                                    chairCount: neededChairs,
                                    capacity: Math.min(bCount * 2 + neededChairs, 40),
                                  });
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-2.5 py-1 rounded transition-colors shrink-0"
                              >
                                + Set Chairs to {neededChairs} (Cap: {Math.min(bCount * 2 + neededChairs, 40)})
                              </button>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded p-2 flex items-start space-x-1.5">
                      <HelpCircle className="w-3.5 h-3.5 mt-0.5 text-navy-700 shrink-0" />
                      <span>
                        <strong>Seating & Short Bench Rule:</strong> 1 bench seats 2 students at 1 desk. For 20 students (2 cols &times; 5 rows = 10 desks), if 1 bench is short (9 benches), assign 2 chairs for that 10th desk so Chair Count = 2 and Capacity = 20. If all benches are present, Chair Count is 0.
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Columns Layout
                      </label>
                      <select
                        value={editingHall.columnCount || 4}
                        onChange={(e) => setEditingHall({ ...editingHall, columnCount: parseInt(e.target.value, 10) || 4 })}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold"
                      >
                        <option value={4}>4 Columns (A, B, C, D)</option>
                        <option value={3}>3 Columns (A, B, C)</option>
                        <option value={2}>2 Columns (A, B)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Writing Pad Chairs Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="40"
                        value={editingHall.chairCount || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setEditingHall({
                            ...editingHall,
                            chairCount: val,
                            textpadChairCount: val,
                            capacity: Math.min(val, 40),
                          });
                        }}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-navy-950 uppercase mb-1">
                        Exam Capacity
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="40"
                        value={editingHall.capacity}
                        onChange={(e) =>
                          setEditingHall({
                            ...editingHall,
                            capacity: Math.min(40, parseInt(e.target.value, 10) || 1),
                          })
                        }
                        className="w-full bg-white border border-navy-300 font-bold text-navy-900 rounded px-2 py-1.5 font-mono text-center"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2 border-t">
              <button
                onClick={() => setEditingHall(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await updateHall(editingHall);
                  setEditingHall(null);
                }}
                className="px-4 py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingHallId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-red-200 w-full max-w-sm p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-navy-950">Remove Hall?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this hall from the examination catalog?
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t">
              <button
                onClick={() => setDeletingHallId(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteHall(deletingHallId);
                  setDeletingHallId(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold"
              >
                Delete Hall
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
