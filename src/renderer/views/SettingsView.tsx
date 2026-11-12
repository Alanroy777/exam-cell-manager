import React, { useState } from 'react';
import { useAppStore } from '../store';
import { api } from '../api';
import { HardDrive, Save, Upload, Download, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import logoImg from '../assets/logo.png';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useAppStore();

  const [form, setForm] = useState(settings);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSave = () => {
    updateSettings(form);
    setStatusMessage('Settings updated successfully!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleBackup = async () => {
    const res = await api.backupDatabase();
    if (res.success) {
      setStatusMessage(`Database successfully backed up to: ${res.filePath}`);
    }
  };

  const handleRestore = async () => {
    if (confirm('Warning: Restoring a database file will replace the current data. Do you wish to continue?')) {
      const res = await api.restoreDatabase();
      if (res.success) {
        setStatusMessage('Database restored successfully!');
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto flex flex-col h-full overflow-y-auto">
      <div>
        <h1 className="text-base font-bold text-navy-950 uppercase tracking-tight">
          System Settings & Database Maintenance
        </h1>
        <p className="text-xs text-slate-500">
          Configure institutional header text, signatories, and manage SQLite database backups.
        </p>
      </div>

      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* College Branding & Signatories */}
      <div className="bg-white border border-gov-border rounded p-5 space-y-4 shadow-xs">
        <div className="flex items-center space-x-3 border-b pb-3">
          <img src={logoImg} alt="Logo" className="w-12 h-12 object-contain" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-navy-950">
              Institutional Header & Signatories
            </h2>
            <p className="text-xs text-slate-500">These details appear on all printed notices and sheets.</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">College Name</label>
            <input
              type="text"
              value={form.collegeName}
              onChange={(e) => setForm({ ...form, collegeName: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-bold text-navy-950"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Subtitle / Unit Designation</label>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Exam Cell Convener Signatory</label>
              <input
                type="text"
                value={form.convenerName}
                onChange={(e) => setForm({ ...form, convenerName: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Head of Institution / HOD Signatory</label>
              <input
                type="text"
                value={form.hodName}
                onChange={(e) => setForm({ ...form, hodName: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-semibold"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center space-x-1.5 bg-navy-900 hover:bg-navy-800 text-white px-4 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Header Settings</span>
          </button>
        </div>
      </div>

      {/* Database Backup & Restore */}
      <div className="bg-white border border-gov-border rounded p-5 space-y-4 shadow-xs">
        <div className="flex items-center space-x-2 border-b pb-3 text-navy-950 font-bold text-xs uppercase tracking-wider">
          <HardDrive className="w-4 h-4 text-accent" />
          <span>SQLite Database Backup & Restore</span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          The application stores all student rosters, halls, sessions, and seating history in a single SQLite database file in your application data directory. You can create safe offline backup copies or restore an existing backup file at any time.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleBackup}
            className="flex items-center space-x-1.5 bg-navy-900 hover:bg-navy-800 text-white px-4 py-2 rounded text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Backup Database to File</span>
          </button>

          <button
            onClick={handleRestore}
            className="flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-xs font-semibold shadow-xs transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Restore Database from File</span>
          </button>
        </div>
      </div>

      {/* Offline Security & Compliance Card */}
      <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs space-y-2 text-slate-700">
        <div className="flex items-center space-x-2 font-bold text-navy-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>100% Offline Operational Security</span>
        </div>
        <p className="text-[11px] text-slate-600">
          Exam Cell Manager runs entirely within your local machine. No student information, timetables, or confidential question paper details ever leave this computer. All assets and fonts are bundled locally.
        </p>
      </div>
    </div>
  );
};

