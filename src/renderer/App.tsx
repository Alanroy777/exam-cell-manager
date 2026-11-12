import React, { useEffect } from 'react';
import { useAppStore } from './store';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { DashboardView } from './views/DashboardView';
import { StudentsView } from './views/StudentsView';
import { HallsView } from './views/HallsView';
import { SessionsView } from './views/SessionsView';
import { SeatingView } from './views/SeatingView';
import { InvigilatorsView } from './views/InvigilatorsView';
import { DocumentsView } from './views/DocumentsView';
import { SettingsView } from './views/SettingsView';

export const App: React.FC = () => {
  const { currentTab, loadInitialData } = useAppStore();

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'students':
        return <StudentsView />;
      case 'halls':
        return <HallsView />;
      case 'sessions':
        return <SessionsView />;
      case 'seating':
        return <SeatingView />;
      case 'invigilators':
        return <InvigilatorsView />;
      case 'documents':
        return <DocumentsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gov-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden">{renderActiveView()}</main>
      </div>
      <PrintPreviewModal />
    </div>
  );
};

