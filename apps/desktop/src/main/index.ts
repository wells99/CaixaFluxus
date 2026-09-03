import { app, BrowserWindow } from 'electron';
import path from 'path';
import dotenv from 'dotenv';
import { registerVendaHandlers } from './ipc/vendaHandler';

// Carrega as variáveis do .env da raiz do projeto ou da pasta desktop
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (!app.isPackaged || process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    const loadUrlWithRetry = () => {
      if (!mainWindow) return;
      mainWindow.loadURL(devServerUrl).catch(() => {
        setTimeout(loadUrlWithRetry, 500);
      });
    };
    loadUrlWithRetry();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerVendaHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
