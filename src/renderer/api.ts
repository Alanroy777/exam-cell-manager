import { Student, Hall, Staff, ExamSession, TimetableEntry, HallSeatingPlan, InvigilatorDutyAssignment } from '../core/types';

// Detect if running inside Electron
const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

export const api = {
  isElectron,

  async rawQuery(sql: string, params: any[] = []): Promise<any[]> {
    if (isElectron) {
      const res = await (window as any).electronAPI.rawQuery(sql, params);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    // Fallback: localStorage/in-memory for standalone dev
    return [];
  },

  async rawRun(sql: string, params: any[] = []): Promise<any> {
    if (isElectron) {
      const res = await (window as any).electronAPI.rawRun(sql, params);
      if (!res.success) throw new Error(res.error);
      return res.result;
    }
    return { changes: 1 };
  },

  async printDocument(html: string) {
    if (isElectron) {
      return (window as any).electronAPI.printDocument(html);
    }
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
    return { success: true };
  },

  async saveDocumentAsPdf(html: string, defaultFilename: string) {
    if (isElectron) {
      return (window as any).electronAPI.saveDocumentAsPdf(html, defaultFilename);
    }
    alert('PDF saving is enabled in the Electron desktop app. In browser mode, use Print -> Save as PDF.');
    return { success: false };
  },

  async saveAllDocumentsAsPdf(docs: { filename: string; html: string }[]) {
    if (isElectron) {
      return (window as any).electronAPI.saveAllDocumentsAsPdf(docs);
    }
    alert('Batch PDF saving is enabled in the Electron desktop app.');
    return { success: false };
  },

  async importExcelFile() {
    if (isElectron) {
      return (window as any).electronAPI.importExcelFile();
    }
    // HTML file input fallback for browser dev
    return new Promise<{ success: boolean; buffer?: ArrayBuffer; filename?: string }>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx, .xls';
      input.onchange = async () => {
        if (input.files && input.files[0]) {
          const file = input.files[0];
          const buf = await file.arrayBuffer();
          resolve({ success: true, buffer: buf, filename: file.name });
        } else {
          resolve({ success: false });
        }
      };
      input.click();
    });
  },

  async exportExcelFile(buffer: ArrayBuffer | Uint8Array, defaultFilename: string) {
    if (isElectron) {
      const arrayBuffer = buffer instanceof ArrayBuffer ? buffer : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      return (window as any).electronAPI.exportExcelFile(defaultFilename, arrayBuffer);
    }
    // Browser fallback
    const blob = new Blob([buffer as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true };
  },

  async backupDatabase() {
    if (isElectron) {
      return (window as any).electronAPI.backupDatabase();
    }
    alert('Database backup creates a direct copy of your SQLite file in the Electron desktop app.');
    return { success: false };
  },

  async restoreDatabase() {
    if (isElectron) {
      return (window as any).electronAPI.restoreDatabase();
    }
    alert('Database restore reloads your SQLite database file in the Electron desktop app.');
    return { success: false };
  },
};

