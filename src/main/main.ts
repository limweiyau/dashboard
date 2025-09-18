import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);

let mainWindow: BrowserWindow;
const dataPath = path.join(__dirname, '../../data');

async function createWindow(): Promise<void> {
  await ensureDataDirectory();

  mainWindow = new BrowserWindow({
    height: 900,
    width: 1400,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    app.quit();
  });

  createMenu();
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-project');
          }
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-open-project');
          }
        },
        { type: 'separator' },
        {
          label: 'Import Data',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('menu-import-data');
          }
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('menu-settings');
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function ensureDataDirectory(): Promise<void> {
  try {
    await mkdir(dataPath, { recursive: true });
  } catch (error) {
    console.error('Failed to create data directory:', error);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  // Force quit all processes
  if (mainWindow) {
    mainWindow.removeAllListeners('closed');
    mainWindow.destroy();
  }
});

app.on('window-all-closed', () => {
  // Force quit the app on all platforms
  app.quit();
});

// Handle app termination more aggressively
process.on('SIGTERM', () => {
  app.quit();
});

process.on('SIGINT', () => {
  app.quit();
});

// IPC handlers
ipcMain.handle('get-projects', async () => {
  try {
    const projectsPath = path.join(dataPath, 'projects.json');
    if (!fs.existsSync(projectsPath)) {
      return [];
    }
    const data = await readFile(projectsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to get projects:', error);
    return [];
  }
});

ipcMain.handle('save-projects', async (_, projects) => {
  try {
    const projectsPath = path.join(dataPath, 'projects.json');
    await writeFile(projectsPath, JSON.stringify(projects, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save projects:', error);
    return false;
  }
});

ipcMain.handle('get-project-data', async (_, projectId) => {
  try {
    const projectPath = path.join(dataPath, `${projectId}.json`);
    if (!fs.existsSync(projectPath)) {
      return null;
    }
    const data = await readFile(projectPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to get project data:', error);
    return null;
  }
});

ipcMain.handle('save-project-data', async (_, projectId, data) => {
  try {
    const projectPath = path.join(dataPath, `${projectId}.json`);
    await writeFile(projectPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save project data:', error);
    return false;
  }
});

ipcMain.handle('get-settings', async () => {
  try {
    const settingsPath = path.join(dataPath, 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      return { apiKeys: {}, connectedApis: {} };
    }
    const data = await readFile(settingsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to get settings:', error);
    return { apiKeys: {}, connectedApis: {} };
  }
});

ipcMain.handle('save-settings', async (_, settings) => {
  try {
    const settingsPath = path.join(dataPath, 'settings.json');
    await writeFile(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Data Files', extensions: ['csv', 'xlsx', 'xls', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('read-file', async (_, filePath) => {
  try {
    const data = await readFile(filePath, 'utf-8');
    return data;
  } catch (error) {
    console.error('Failed to read file:', error);
    throw error;
  }
});