/* Liest einmalig die Daten der alten Version (file://) aus und gibt sie an die neue weiter */
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('novaMigrate', { send: (data) => ipcRenderer.send('nova:migrate-data', data) });
