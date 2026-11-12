import React from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  Grid3X3,
  UserCheck,
  FileText,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAppStore, ViewTab } from '../store';
import logoImg from '../assets/logo-mark.webp';

interface NavItem {
  id: ViewTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students', label: 'Students Roster', icon: Users },
  { id: 'halls', label: 'Exam Halls', icon: Building2 },
  { id: 'sessions', label: 'Sessions & Timetable', icon: Calendar },
  { id: 'seating', label: 'Seating Arrangement', icon: Grid3X3 },
  { id: 'invigilators', label: 'Invigilator Duty', icon: UserCheck },
  { id: 'documents', label: 'Print Documents', icon: FileText },
  { id: 'settings', label: 'Settings & Backup', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { currentTab, setCurrentTab, currentSession } = useAppStore();

  return (
    <aside className="w-64 bg-navy-900 border-r border-navy-800 text-slate-200 flex flex-col justify-between select-none shrink-0 h-full">
      {/* Brand Header */}
      <div>
        <div className="p-4 border-b border-navy-800 flex items-center space-x-3 bg-navy-950/40">
          <img
            src={logoImg}
            alt="CEP Logo"
            className="w-10 h-10 object-contain p-1 bg-white/10 rounded"
          />
          <div>
            <h1 className="text-xs font-bold tracking-wider text-white uppercase leading-tight">
              College of Engineering
            </h1>
            <p className="text-[11px] font-semibold text-accent-border uppercase tracking-tight">
              Poonjar • Exam Cell
            </p>
            <p className="text-[9px] text-slate-400 leading-tight">Unit of IHRD, Govt of Kerala</p>
          </div>
        </div>

        {/* Current Session indicator */}
        <div className="px-4 py-2.5 bg-navy-800/60 border-b border-navy-700/50">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Active Session
          </div>
          <div className="text-xs font-semibold text-white truncate" title={currentSession.name}>
            {currentSession.name}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="p-3 border-t border-navy-800 bg-navy-950/50 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>100% Offline Mode</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">v1.0 (KTU)</span>
      </div>
    </aside>
  );
};

