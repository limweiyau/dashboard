import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  getProjects: () => Promise<any[]>;
  saveProjects: (projects: any[]) => Promise<boolean>;
  getProjectData: (projectId: string) => Promise<any>;
  saveProjectData: (projectId: string, data: any) => Promise<boolean>;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<boolean>;
  selectFile: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<string>;
  readFileAsBuffer: (filePath: string) => Promise<ArrayBuffer>;
  onMenuAction: (callback: (action: string) => void) => void;
  removeAllListeners: (channel: string) => void;
}

const electronAPI: ElectronAPI = {
  getProjects: () => ipcRenderer.invoke('get-projects'),
  saveProjects: (projects) => ipcRenderer.invoke('save-projects', projects),
  getProjectData: (projectId) => ipcRenderer.invoke('get-project-data', projectId),
  saveProjectData: (projectId, data) => ipcRenderer.invoke('save-project-data', projectId, data),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  selectFile: () => ipcRenderer.invoke('select-file'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  readFileAsBuffer: (filePath) => ipcRenderer.invoke('read-file-as-buffer', filePath),
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new-project', () => callback('new-project'));
    ipcRenderer.on('menu-open-project', () => callback('open-project'));
    ipcRenderer.on('menu-import-data', () => callback('import-data'));
    ipcRenderer.on('menu-settings', () => callback('settings'));
  },
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}