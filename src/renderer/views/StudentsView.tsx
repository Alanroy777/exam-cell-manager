import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Student, Programme } from '../../core/types';
import { parseStudentsFromExcel, ParseResult } from '../../core/excelParser';
import { exportStudentsToExcelBuffer } from '../../core/excelExporter';
import { api } from '../api';
import {
  Upload,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Edit2,
  X,
  Download,
} from 'lucide-react';

export const StudentsView: React.FC = () => {
  const { students, addStudents, updateStudent, toggleStudentStatus, deleteStudent, clearAllStudents } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'dropped'>('all');

  // Clear All Confirmation State
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileBuffer, setImportFileBuffer] = useState<ArrayBuffer | null>(null);
  const [importFilename, setImportFilename] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headerRow, setHeaderRow] = useState<number>(2);

  // Class / Group Target Settings for Import
  const [importProgramme, setImportProgramme] = useState<Programme>('B.Tech');
  const [importBranch, setImportBranch] = useState<string>('CS');
  const [importSemester, setImportSemester] = useState<string>('S5');
  const [importBatch, setImportBatch] = useState<string>('');

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Compute unique groups
  const groupIds = Array.from(new Set(students.map((s) => s.groupId))).sort();

  // Filter students
  const filteredStudents = students.filter((s) => {
    if (selectedGroup !== 'all' && s.groupId !== selectedGroup) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q) ||
        (s.registerNo && s.registerNo.toLowerCase().includes(q)) ||
        s.groupId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenExcel = async () => {
    const res = await api.importExcelFile();
    if (res.success && res.buffer) {
      setImportFileBuffer(res.buffer);
      const fname = res.filename || 'Students.xlsx';
      setImportFilename(fname);
      const parsed = await parseStudentsFromExcel(res.buffer, { filename: fname });
      setParseResult(parsed);
      if (parsed.sheetNames.length > 0) {
        setSelectedSheet(parsed.sheetNames[0]);
      }
      if (parsed.detectedMeta) {
        setImportProgramme(parsed.detectedMeta.programme || 'B.Tech');
        setImportBranch(parsed.detectedMeta.branch || 'CS');
        setImportSemester(parsed.detectedMeta.semester || 'S5');
        setImportBatch(parsed.detectedMeta.batch || '');
      }
      setIsImportModalOpen(true);
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (importFileBuffer) {
      const parsed = await parseStudentsFromExcel(importFileBuffer, {
        filename: importFilename,
        sheetName,
        headerRowIndex: headerRow,
      });
      setParseResult(parsed);
      if (parsed.detectedMeta) {
        setImportProgramme(parsed.detectedMeta.programme || 'B.Tech');
        setImportBranch(parsed.detectedMeta.branch || 'CS');
        setImportSemester(parsed.detectedMeta.semester || 'S5');
        setImportBatch(parsed.detectedMeta.batch || '');
      }
    }
  };

  const handleHeaderRowChange = async (r: number) => {
    setHeaderRow(r);
    if (importFileBuffer) {
      const parsed = await parseStudentsFromExcel(importFileBuffer, {
        filename: importFilename,
        sheetName: selectedSheet,
        headerRowIndex: r,
        defaultProgramme: importProgramme,
        defaultBranch: importBranch,
        defaultSemester: importSemester,
        defaultBatch: importBatch,
      });
      setParseResult(parsed);
    }
  };

  const handleMetaOverride = async (
    prog: Programme,
    branch: string,
    sem: string,
    batch: string
  ) => {
    setImportProgramme(prog);
    setImportBranch(branch);
    setImportSemester(sem);
    setImportBatch(batch);
    if (importFileBuffer) {
      const parsed = await parseStudentsFromExcel(importFileBuffer, {
        filename: importFilename,
        sheetName: selectedSheet,
        headerRowIndex: headerRow,
        defaultProgramme: prog,
        defaultBranch: branch,
        defaultSemester: sem,
        defaultBatch: batch,
      });
      setParseResult(parsed);
    }
  };

  const handleConfirmImport = async () => {
    if (parseResult && parseResult.students.length > 0) {
      await addStudents(parseResult.students);
      setIsImportModalOpen(false);
      setParseResult(null);
      setImportFileBuffer(null);
    }
  };

  const handleExportExcel = async () => {
    if (students.length === 0) return;
    const buffer = await exportStudentsToExcelBuffer(students);
    await api.exportExcelFile(buffer, `CEP_Students_Roster_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto flex flex-col h-full overflow-hidden">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-navy-950 uppercase tracking-tight">
            Student Roster Management
          </h1>
          <p className="text-xs text-slate-500">
            Total {students.length} students enrolled ({students.filter((s) => s.status === 'active').length} active,{' '}
            {students.filter((s) => s.status === 'dropped').length} dropouts excluded)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {students.length > 0 && (
            <>
              <button
                onClick={handleExportExcel}
                className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors"
                title="Export student roster to Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={() => setIsClearConfirmOpen(true)}
                className="flex items-center space-x-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors"
                title="Remove all students from database"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </>
          )}
          <button
            onClick={handleOpenExcel}
            className="flex items-center space-x-1.5 bg-navy-900 hover:bg-navy-800 text-white px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-gov-border rounded p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, roll, or KTU ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-navy-700"
            />
          </div>

          {/* Group dropdown */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Group:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="text-xs border border-slate-200 bg-slate-50 rounded px-2 py-1 focus:outline-none font-semibold"
            >
              <option value="all">All Groups ({students.length})</option>
              {groupIds.map((gid) => {
                const count = students.filter((s) => s.groupId === gid).length;
                return (
                  <option key={gid} value={gid}>
                    {gid} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs border border-slate-200 bg-slate-50 rounded px-2 py-1 focus:outline-none"
            >
              <option value="all">All Students</option>
              <option value="active">Active Only</option>
              <option value="dropped">Dropouts Only</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{filteredStudents.length}</strong> records
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white border border-gov-border rounded flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gov-header text-navy-950 font-bold uppercase sticky top-0 z-10 border-b border-gov-border tracking-wider">
            <tr>
              <th className="px-4 py-2.5 w-12 text-center">#</th>
              <th className="px-4 py-2.5 w-24">Roll No</th>
              <th className="px-4 py-2.5 w-32">Register / KTU ID</th>
              <th className="px-4 py-2.5">Student Name</th>
              <th className="px-4 py-2.5 w-28">Programme</th>
              <th className="px-4 py-2.5 w-28">Group</th>
              <th className="px-4 py-2.5 w-24 text-center">Status</th>
              <th className="px-4 py-2.5 w-32 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((st, idx) => {
              const isDropped = st.status === 'dropped';
              return (
                <tr
                  key={st.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isDropped ? 'bg-red-50/40 text-slate-400' : 'text-slate-800'
                  }`}
                >
                  <td className="px-4 py-2 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-2 font-bold font-mono text-navy-950">{st.rollNo}</td>
                  <td className="px-4 py-2 font-mono text-slate-600">{st.registerNo || '-'}</td>
                  <td className={`px-4 py-2 font-semibold ${isDropped ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {st.name}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{st.programme}</td>
                  <td className="px-4 py-2 font-semibold text-navy-900">{st.groupId}</td>
                  <td className="px-4 py-2 text-center">
                    {isDropped ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                        <XCircle className="w-3 h-3" />
                        <span>Dropout</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right space-x-1">
                    <button
                      onClick={() => toggleStudentStatus(st.id)}
                      title={isDropped ? 'Mark as Active (Include in exam)' : 'Mark as Dropout (Exclude from exam)'}
                      className={`px-2 py-1 rounded text-[11px] font-medium border ${
                        isDropped
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {isDropped ? 'Include' : 'Dropout'}
                    </button>
                    <button
                      onClick={() => setEditingStudent(st)}
                      className="p-1 rounded text-slate-500 hover:text-navy-900 hover:bg-slate-100"
                      title="Edit student details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteStudent(st.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete student"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  No students matched your search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Excel Import Modal */}
      {isImportModalOpen && parseResult && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 w-full max-w-3xl flex flex-col shadow-2xl max-h-[90vh] overflow-hidden">
            <div className="bg-navy-900 text-white px-5 py-3 flex items-center justify-between border-b border-navy-800">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Excel Import: {importFilename}
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Sheet & Header row controls */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Select Worksheet
                  </label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-medium"
                  >
                    {parseResult.sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Header Row Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={headerRow}
                    onChange={(e) => handleHeaderRowChange(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Class / Group Target Settings */}
              <div className="bg-navy-50/70 border border-navy-200 rounded p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-navy-950 flex items-center space-x-1.5">
                    <span>Class / Group Target Assignment</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-500">Resulting Group:</span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-navy-900 text-white shadow-2xs">
                      {importSemester} {importBranch}{importBatch ? ' ' + importBatch : ''}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Programme
                    </label>
                    <select
                      value={importProgramme}
                      onChange={(e) =>
                        handleMetaOverride(
                          e.target.value as Programme,
                          importBranch,
                          importSemester,
                          importBatch
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-semibold text-navy-950 focus:border-navy-700 focus:outline-none"
                    >
                      <option value="B.Tech">B.Tech (KTU)</option>
                      <option value="Diploma">Diploma (Board)</option>
                      <option value="MCA">MCA (PG)</option>
                      <option value="BCA">BCA (Degree)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Branch
                    </label>
                    <select
                      value={importBranch}
                      onChange={(e) =>
                        handleMetaOverride(
                          importProgramme,
                          e.target.value,
                          importSemester,
                          importBatch
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-semibold text-navy-950 focus:border-navy-700 focus:outline-none"
                    >
                      <option value="CS">CS (Computer Science)</option>
                      <option value="EC">EC (Electronics)</option>
                      <option value="EEE">EEE (Electrical)</option>
                      <option value="AU">AU (Automobile)</option>
                      <option value="CT">CT (Computer)</option>
                      <option value="MCA">MCA</option>
                      <option value="BCA">BCA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Semester
                    </label>
                    <select
                      value={importSemester}
                      onChange={(e) =>
                        handleMetaOverride(
                          importProgramme,
                          importBranch,
                          e.target.value,
                          importBatch
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-semibold text-navy-950 focus:border-navy-700 focus:outline-none font-mono"
                    >
                      <option value="S1">S1 (Semester 1)</option>
                      <option value="S2">S2 (Semester 2)</option>
                      <option value="S3">S3 (Semester 3)</option>
                      <option value="S4">S4 (Semester 4)</option>
                      <option value="S5">S5 (Semester 5)</option>
                      <option value="S6">S6 (Semester 6)</option>
                      <option value="S7">S7 (Semester 7)</option>
                      <option value="S8">S8 (Semester 8)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Batch
                    </label>
                    <select
                      value={importBatch}
                      onChange={(e) =>
                        handleMetaOverride(
                          importProgramme,
                          importBranch,
                          importSemester,
                          e.target.value
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-semibold text-navy-950 focus:border-navy-700 focus:outline-none"
                    >
                      <option value="">None (Single Batch)</option>
                      <option value="A">Batch A</option>
                      <option value="B">Batch B</option>
                      <option value="C">Batch C</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Status summary */}
              <div className="flex items-center justify-between text-xs px-1">
                <div className="text-slate-700">
                  Detected <strong>{parseResult.students.length}</strong> students ready to import.
                </div>
                {parseResult.warnings.length > 0 && (
                  <div className="text-amber-700 flex items-center space-x-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{parseResult.warnings.length} Warnings</span>
                  </div>
                )}
              </div>

              {/* Preview table (first 5 rows) */}
              <div className="border border-gov-border rounded overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                  Data Preview (First 5 Rows)
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Roll</th>
                      <th className="px-3 py-2">Reg No</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Programme</th>
                      <th className="px-3 py-2">Group</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parseResult.students.slice(0, 5).map((s, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-1.5 font-bold font-mono">{s.rollNo}</td>
                        <td className="px-3 py-1.5 font-mono">{s.registerNo || '-'}</td>
                        <td className="px-3 py-1.5 font-semibold text-navy-950">{s.name}</td>
                        <td className="px-3 py-1.5">{s.programme}</td>
                        <td className="px-3 py-1.5 font-semibold">{s.groupId}</td>
                        <td className="px-3 py-1.5">
                          {s.status === 'active' ? (
                            <span className="text-emerald-700 font-semibold">Active</span>
                          ) : (
                            <span className="text-red-600 font-semibold">Dropout</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded text-xs font-semibold shadow-xs flex items-center space-x-1.5"
              >
                <span>Import {parseResult.students.length} Students into {importSemester} {importBranch}{importBatch ? ' ' + importBatch : ''}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 w-full max-w-md p-5 space-y-4 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-950">
              Edit Student Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Roll No</label>
                  <input
                    type="text"
                    value={editingStudent.rollNo}
                    onChange={(e) => setEditingStudent({ ...editingStudent, rollNo: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Register / KTU ID</label>
                  <input
                    type="text"
                    value={editingStudent.registerNo || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, registerNo: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Branch</label>
                  <input
                    type="text"
                    value={editingStudent.branch}
                    onChange={(e) => setEditingStudent({ ...editingStudent, branch: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Semester</label>
                  <input
                    type="text"
                    value={editingStudent.semester}
                    onChange={(e) => setEditingStudent({ ...editingStudent, semester: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Batch</label>
                  <input
                    type="text"
                    value={editingStudent.batch || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, batch: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2 py-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                onClick={() => setEditingStudent(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const updatedGroupId = `${editingStudent.semester} ${editingStudent.branch}${editingStudent.batch ? ' ' + editingStudent.batch : ''}`;
                  await updateStudent({ ...editingStudent, groupId: updatedGroupId });
                  setEditingStudent(null);
                }}
                className="px-4 py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Students Confirmation Modal */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-red-200 w-full max-w-md p-5 space-y-4 shadow-xl">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-red-100 text-red-700 rounded shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-navy-950 uppercase tracking-tight">
                  Clear All Students?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to remove all <strong className="text-red-700">{students.length}</strong> students from the database?
                </p>
                <p className="text-[11px] text-slate-500 bg-amber-50 border border-amber-200 p-2 rounded mt-2">
                  <strong>Warning:</strong> This action cannot be undone. Any active seating plans and allocations generated for these students will also be cleared.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
              <button
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await clearAllStudents();
                  setIsClearConfirmOpen(false);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Clear All Students</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

