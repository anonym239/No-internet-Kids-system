/* Sichere Brücke zwischen Nova (Webseite) und Windows */
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('novaElectron', {
  exit: () => ipcRenderer.send('nova:exit'),
  setKiosk: (on) => ipcRenderer.send('nova:kiosk', !!on),
  openExternal: (url) => ipcRenderer.send('nova:open-external', String(url)),
  onExitRequest: (cb) => ipcRenderer.on('nova:exit-request', () => cb()),
  saveFile: (name, text) => ipcRenderer.invoke('nova:save-file', String(name), String(text)),
  backupWrite: (name, text) => ipcRenderer.invoke('nova:backup-write', String(name), String(text)),
  backupList: () => ipcRenderer.invoke('nova:backup-list')
});
