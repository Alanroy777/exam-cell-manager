import React from 'react';
import { useAppStore, ViewTab } from '../store';
import { CheckCircle2, ChevronRight, HardDrive, Printer } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { currentTab, setCurrentTab, currentSession, students, seatingResult } = useAppStore();

  const steps: { id: ViewTab; label: string; isComplete: boolean }[] = [
    { id: 'students', label: '1. Students', isComplete: students.length > 0 },
    { id: 'halls', label: '2. Halls', isComplete: true },
    { id: 'seating', label: '3. Seating', isComplete: Boolean(seatingResult?.isValid) },
    { id: 'invigilators', label: '4. Invigilators', isComplete: false },
    { id: 'documents', label: '5. Print', isComplete: false },
  ];

  return (
    <header className="h-14 bg-white border-b border-gov-border px-6 flex items-center justify-between shrink-0 select-none shadow-xs">
      {/* Title & Affiliation info */}
      <div className="flex items-center space-x-3">
        <span className="font-bold text-navy-900 text-sm tracking-tight">
          COLLEGE OF ENGINEERING POONJAR
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-xs text-slate-500 font-medium">
          APJ Abdul Kalam Technological University & State Board Norms
        </span>
      </div>

      {/* Workflow Step Wizard */}
      <div className="hidden lg:flex items-center space-x-1.5 bg-slate-100/80 px-3 py-1.5 rounded border border-slate-200 text-xs">
        {steps.map((step, idx) => {
          const isActive = currentTab === step.id;
          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setCurrentTab(step.id)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded transition-all font-medium ${
                  isActive
                    ? 'bg-navy-900 text-white font-semibold'
                    : step.isComplete
                    ? 'text-emerald-700 hover:bg-slate-200'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {step.isComplete && !isActive && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                <span>{step.label}</span>
              </button>
              {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 text-slate-400" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Quick Print & DB Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-medium bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
          <HardDrive className="w-3.5 h-3.5 text-navy-700" />
          <span>SQLite DB Active</span>
        </div>

        <button
          onClick={() => setCurrentTab('documents')}
          className="flex items-center space-x-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Docs</span>
        </button>
      </div>
    </header>
  );
};

