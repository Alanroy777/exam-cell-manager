import React from 'react';
import { useAppStore, ViewTab } from '../store';
import { api } from '../api';
import { HardDrive, Printer, Calendar } from 'lucide-react';

export const TopBar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    currentSession,
  } = useAppStore();

  const tabLabels: Record<ViewTab, string> = {
    dashboard: 'Dashboard',
    students: 'Students Roster',
    halls: 'Exam Halls',
    sessions: 'Sessions & Timetable',
    seating: 'Seating Arrangement',
    invigilators: 'Invigilator Duty',
    documents: 'Print Documents',
    settings: 'Settings & Backup',
  };

  return (
    <header className="h-12 bg-white border-b border-gov-border px-4 flex items-center justify-between shrink-0 select-none shadow-xs w-full min-w-0">
      {/* Left: Active Session Badge & Breadcrumb */}
      <div className="flex items-center space-x-2.5 min-w-0">
        <button
          onClick={() => setCurrentTab('sessions')}
          className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-navy-950 border border-slate-200 transition-colors truncate"
          title="Click to view & configure Exam Session & Timetable"
        >
          <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="truncate">{currentSession.name}</span>
          <span className="text-[10px] text-slate-500 font-mono hidden md:inline shrink-0">
            ({currentSession.startDate} - {currentSession.endDate})
          </span>
        </button>

        <span className="text-slate-300 hidden sm:inline">/</span>

        <span className="text-xs font-bold text-navy-900 hidden sm:inline">
          {tabLabels[currentTab]}
        </span>
      </div>

      {/* Right: DB Status & Print Docs Action */}
      <div className="flex items-center space-x-2.5 shrink-0">
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 font-medium bg-slate-50 border border-slate-200 px-2 py-1 rounded shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <HardDrive className="w-3 h-3 text-navy-700 shrink-0" />
          <span className="hidden sm:inline">
            {api.isElectron ? 'SQLite DB Active' : 'Local Storage Active (Auto-saved)'}
          </span>
        </div>

        <button
          onClick={() => setCurrentTab('documents')}
          className="flex items-center space-x-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1 rounded text-xs font-semibold shadow-xs transition-colors shrink-0 whitespace-nowrap"
          title="Print Exam Documents"
        >
          <Printer className="w-3.5 h-3.5 shrink-0" />
          <span>Print Docs</span>
        </button>
      </div>
    </header>
  );
};
