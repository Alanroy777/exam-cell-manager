import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { backupDatabase, getDbPath, getSqliteDb, initDatabase, restoreDatabase } from './db';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 1100,
    minHeight: 700,
    title: 'Exam Cell Manager - College of Engineering Poonjar',
    backgroundColor: '#0f0c29',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.removeMenu();

  // In production load dist/index.html, in dev load localhost:5173
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '../../dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize Database in user app data directory
  const dbPath = getDbPath(app.getPath('userData'));
  initDatabase(dbPath);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Helper to render HTML in a hidden window for printing / PDF generation
async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const base64Html = Buffer.from(html, 'utf8').toString('base64');
  await printWindow.loadURL(`data:text/html;charset=utf-8;base64,${base64Html}`);

  // Wait briefly for CSS and layout rendering
  await new Promise((resolve) => setTimeout(resolve, 250));

  const pdfData = await printWindow.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margins: {
      marginType: 'none',
    },
  });

  printWindow.close();
  return pdfData;
}

// IPC Handlers
ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('db:rawQuery', async (_, { sql, params = [] }) => {
  try {
    const db = getSqliteDb();
    const rows = db.prepare(sql).all(params);
    return { success: true, data: rows };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:rawRun', async (_, { sql, params = [] }) => {
  try {
    const db = getSqliteDb();
    const result = db.prepare(sql).run(params);
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('doc:print', async (_, { html, options = {} }) => {
  try {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const base64Html = Buffer.from(html, 'utf8').toString('base64');
    await printWindow.loadURL(`data:text/html;charset=utf-8;base64,${base64Html}`);
    await new Promise((resolve) => setTimeout(resolve, 250));

    printWindow.webContents.print({
      silent: options.silent || false,
      printBackground: options.printBackground !== false,
    }, (success, failureReason) => {
      printWindow.close();
      if (!success) {
        console.warn('Print canceled or failed:', failureReason);
      }
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('doc:savePdf', async (_, { html, defaultFilename }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow!, {
      title: 'Save Document as PDF',
      defaultPath: defaultFilename.endsWith('.pdf') ? defaultFilename : `${defaultFilename}.pdf`,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    const pdfBuffer = await renderHtmlToPdf(html);
    fs.writeFileSync(filePath, pdfBuffer);

    return { success: true, filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('doc:saveAllPdf', async (_, { docs }) => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow!, {
      title: 'Select Destination Folder for All Documents',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (canceled || !filePaths || filePaths.length === 0) return { success: false, canceled: true };

    const folder = filePaths[0];
    let count = 0;

    for (const doc of docs) {
      const cleanName = doc.filename.replace(/[/\\?%*:|"<>]/g, '_');
      const targetPath = path.join(folder, cleanName.endsWith('.pdf') ? cleanName : `${cleanName}.pdf`);
      const pdfBuffer = await renderHtmlToPdf(doc.html);
      fs.writeFileSync(targetPath, pdfBuffer);
      count++;
    }

    return { success: true, folderPath: folder, count };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:importExcel', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow!, {
      title: 'Select Excel Student List File',
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile'],
    });

    if (canceled || !filePaths || filePaths.length === 0) return { success: false, canceled: true };

    const filePath = filePaths[0];
    const buffer = fs.readFileSync(filePath);

    return {
      success: true,
      buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      filename: path.basename(filePath),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:exportExcel', async (_, { defaultFilename, buffer }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export Excel File',
      defaultPath: defaultFilename,
      filters: [{ name: 'Excel Spreadsheet', extensions: ['xlsx'] }],
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:exportDocx', async (_, { defaultFilename, buffer }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export Notice as Word Document (.docx)',
      defaultPath: defaultFilename,
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:backup', async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const defaultFilename = `exam_cell_backup_${timestamp}.db`;

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow!, {
      title: 'Backup Exam Cell Database',
      defaultPath: defaultFilename,
      filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }],
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    const success = backupDatabase(filePath);
    return { success, filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:restore', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow!, {
      title: 'Select Backup Database to Restore',
      filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }],
      properties: ['openFile'],
    });

    if (canceled || !filePaths || filePaths.length === 0) return { success: false, canceled: true };

    const success = restoreDatabase(filePaths[0]);
    if (success && mainWindow) {
      mainWindow.reload();
    }
    return { success };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

