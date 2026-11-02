/* Sichere Brücke zwischen Nova (Webseite) und Windows */
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('novaElectron', {
  exit: () => ipcRenderer.send('nova:exit'),
  setKiosk: (on) => ipcRenderer.send('nova:kiosk', !!on),
  openExternal: (url) => ipcRenderer.send('nova:open-external', String(url)),
  onExitRequest: (cb) => ipcRenderer.on('nova:exit-request', () => cb())
});
