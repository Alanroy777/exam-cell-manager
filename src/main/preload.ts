import { contextBridge, ipcRenderer } from 'electron';

export interface IElectronAPI {
  // Database API
  dbQuery: (table: string, method: string, args?: any) => Promise<any>;
  rawQuery: (sql: string, params?: any[]) => Promise<any>;
  rawRun: (sql: string, params?: any[]) => Promise<any>;

  // Printing & Document API
  printDocument: (html: string, options?: { silent?: boolean; printBackground?: boolean }) => Promise<{ success: boolean; error?: string }>;
  saveDocumentAsPdf: (html: string, defaultFilename: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  saveAllDocumentsAsPdf: (docs: { filename: string; html: string }[]) => Promise<{ success: boolean; folderPath?: string; count?: number; canceled?: boolean }>;

  // Excel & File API
  importExcelFile: () => Promise<{ success: boolean; buffer?: ArrayBuffer; filename?: string; canceled?: boolean; error?: string }>;
  exportExcelFile: (defaultFilename: string, buffer: ArrayBuffer) => Promise<{ success: boolean; filePath?: string; canceled?: boolean }>;
  exportDocxFile: (defaultFilename: string, buffer: ArrayBuffer) => Promise<{ success: boolean; filePath?: string; canceled?: boolean }>;

  // Backup & Restore
  backupDatabase: () => Promise<{ success: boolean; filePath?: string; canceled?: boolean }>;
  restoreDatabase: () => Promise<{ success: boolean; error?: string; canceled?: boolean }>;

  // App info
  getAppVersion: () => Promise<string>;
}

const api: IElectronAPI = {
  dbQuery: (table, method, args) => ipcRenderer.invoke('db:query', { table, method, args }),
  rawQuery: (sql, params) => ipcRenderer.invoke('db:rawQuery', { sql, params }),
  rawRun: (sql, params) => ipcRenderer.invoke('db:rawRun', { sql, params }),

  printDocument: (html, options) => ipcRenderer.invoke('doc:print', { html, options }),
  saveDocumentAsPdf: (html, defaultFilename) => ipcRenderer.invoke('doc:savePdf', { html, defaultFilename }),
  saveAllDocumentsAsPdf: (docs) => ipcRenderer.invoke('doc:saveAllPdf', { docs }),

  importExcelFile: () => ipcRenderer.invoke('file:importExcel'),
  exportExcelFile: (defaultFilename, buffer) => ipcRenderer.invoke('file:exportExcel', { defaultFilename, buffer }),
  exportDocxFile: (defaultFilename, buffer) => ipcRenderer.invoke('file:exportDocx', { defaultFilename, buffer }),

  backupDatabase: () => ipcRenderer.invoke('db:backup'),
  restoreDatabase: () => ipcRenderer.invoke('db:restore'),

  getAppVersion: () => ipcRenderer.invoke('app:version'),
};

contextBridge.exposeInMainWorld('electronAPI', api);

