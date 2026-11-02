/* Nova OS – Windows/PC-Hülle (Electron)
 * - Startet Nova als eigenes Programm (offline, keine Browserleiste)
 * - Beim Schließen (X, Alt+F4) fragt Nova nach Passwort/PIN des angemeldeten Kontos
 * - Optionaler Kiosk-Modus (Vollbild ohne Fensterleiste)
 */
const { app, BrowserWindow, ipcMain, Menu, shell, session } = require('electron');
const path = require('path');

let win = null;
let allowClose = false;

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: '#0b0d12',
    title: 'Nova OS',
    icon: path.join(__dirname, '..', 'www', 'icons', 'icon-512.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
  win.once('ready-to-show', () => { win.maximize(); win.show(); });

  // Neue Fenster/Links nie in Nova öffnen
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) e.preventDefault(); });

  // Schließen nur mit Passwort (Nova fragt danach)
  win.on('close', (e) => {
    if (allowClose || win.webContents.isCrashed()) return;
    e.preventDefault();
    win.webContents.send('nova:exit-request');
  });
  win.on('closed', () => { win = null; });
}

ipcMain.on('nova:exit', () => { allowClose = true; app.quit(); });
ipcMain.on('nova:kiosk', (_e, on) => { if (win) { win.setKiosk(!!on); win.setAlwaysOnTop(!!on, 'screen-saver'); } });
ipcMain.on('nova:open-external', (_e, url) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); });

app.whenReady().then(() => {
  // Komplett offline: alle Netzwerkanfragen außer lokalen Dateien blockieren
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
    cb({ cancel: !/^(file|devtools|data|blob):/.test(details.url) });
  });
  createWindow();
});
app.on('window-all-closed', () => app.quit());
