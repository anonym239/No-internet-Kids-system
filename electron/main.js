/* Nova OS – Windows/PC-Hülle (Electron)
 * - Startet Nova als eigenes Programm (offline, keine Browserleiste)
 * - Lädt die App über das sichere Protokoll nova:// (nötig für die lokale KI: Worker, Speicher, Mehrkern)
 * - Beim Schließen (X, Alt+F4) fragt Nova nach Passwort/PIN des angemeldeten Kontos
 * - Optionaler Kiosk-Modus (Vollbild ohne Fensterleiste)
 * - Internet komplett gesperrt – außer kurz für erlaubte KI-Modell-Downloads
 */
const { app, BrowserWindow, ipcMain, Menu, shell, session, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const WWW = path.join(__dirname, '..', 'www');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.jinja': 'text/plain; charset=utf-8' };
const ALLOWED_DOWNLOAD_HOSTS = /(^|\.)(huggingface\.co|hf\.co|xethub\.hf\.co)$/i;
let netAllowed = false;

protocol.registerSchemesAsPrivileged([{ scheme: 'nova', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } }]);

const safeName = (n) => String(n).replace(/[^\w.\-äöüÄÖÜß ]+/g, '_').slice(0, 120);
const backupDir = () => path.join(app.getPath('documents'), 'Nova');

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
  win.loadURL('nova://app/index.html');
  win.once('ready-to-show', () => { win.maximize(); win.show(); });

  // Neue Fenster/Links nie in Nova öffnen
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('nova://')) e.preventDefault(); });

  // Schließen nur mit Passwort (Nova fragt danach)
  win.on('close', (e) => {
    if (allowClose || win.webContents.isCrashed()) return;
    e.preventDefault();
    win.webContents.send('nova:exit-request');
  });
  win.on('closed', () => { win = null; });
}

ipcMain.on('nova:exit', () => { allowClose = true; app.quit(); });

// Konto-Token speichern (mit Dialog), automatische Sicherung in Dokumente\Nova, Sicherungen finden
ipcMain.handle('nova:save-file', async (_e, name, text) => {
  fs.mkdirSync(backupDir(), { recursive: true });
  const r = await dialog.showSaveDialog(win, {
    title: 'Konto-Token speichern',
    defaultPath: path.join(backupDir(), safeName(name)),
    filters: [{ name: 'Nova Konto-Token', extensions: ['novakey'] }]
  });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, text, 'utf8');
  return { path: r.filePath };
});
ipcMain.handle('nova:backup-write', async (_e, name, text) => {
  fs.mkdirSync(backupDir(), { recursive: true });
  fs.writeFileSync(path.join(backupDir(), safeName(name)), text, 'utf8');
  return true;
});
ipcMain.handle('nova:backup-list', async () => {
  const dirs = [backupDir(), app.getPath('downloads')];
  const out = [];
  for (const d of dirs) {
    try {
      for (const f of fs.readdirSync(d)) {
        if (!/\.novakey$/i.test(f)) continue;
        const p = path.join(d, f);
        const st = fs.statSync(p);
        if (st.size > 20 * 1024 * 1024) continue;
        out.push({ name: f, text: fs.readFileSync(p, 'utf8'), mtime: st.mtimeMs, path: p });
      }
    } catch (e) { /* Ordner fehlt */ }
  }
  return out;
});
ipcMain.on('nova:kiosk', (_e, on) => { if (win) { win.setKiosk(!!on); win.setAlwaysOnTop(!!on, 'screen-saver'); } });
ipcMain.on('nova:open-external', (_e, url) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); });

ipcMain.handle('nova:net', (_e, on) => { netAllowed = !!on; return netAllowed; });

/* ---- Umzug der Daten aus der alten Version (file://) in die neue (nova://) ---- */
let migrated = null;
function migrateOldData() {
  const marker = path.join(app.getPath('userData'), 'nova-migrated-v2');
  if (fs.existsSync(marker)) return Promise.resolve();
  return new Promise((resolve) => {
    const hidden = new BrowserWindow({ show: false, webPreferences: { preload: path.join(__dirname, 'migrate-preload.js'), contextIsolation: true, sandbox: true } });
    let finished = false;
    const done = (data) => {
      if (finished) return;
      finished = true;
      try { fs.writeFileSync(marker, new Date().toISOString()); } catch (e) {}
      migrated = data && Object.keys(data).length ? data : null;
      if (!hidden.isDestroyed()) hidden.destroy();
      resolve();
    };
    ipcMain.once('nova:migrate-data', (_e, data) => done(data));
    setTimeout(() => done(null), 8000);
    hidden.loadFile(path.join(__dirname, 'migrate.html')).catch(() => done(null));
  });
}
ipcMain.on('nova:take-migration', (e) => { e.returnValue = migrated; migrated = null; });

app.whenReady().then(async () => {
  // App-Dateien über nova:// ausliefern (mit Isolation für schnelle Mehrkern-KI)
  protocol.handle('nova', async (req) => {
    const url = new URL(req.url);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.normalize(path.join(WWW, rel));
    if (!file.startsWith(WWW) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return new Response('Nicht gefunden', { status: 404 });
    const res = await net.fetch(pathToFileURL(file).toString());
    return new Response(res.body, {
      status: 200,
      headers: {
        'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'content-length': String(fs.statSync(file).size),
        'cross-origin-opener-policy': 'same-origin',
        'cross-origin-embedder-policy': 'require-corp',
        'cross-origin-resource-policy': 'same-origin'
      }
    });
  });
  // Komplett offline: alle Netzwerkanfragen blockieren – außer erlaubte KI-Downloads
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
    const u = details.url;
    if (/^(nova|file|devtools|data|blob):/.test(u)) return cb({ cancel: false });
    if (netAllowed) { try { if (ALLOWED_DOWNLOAD_HOSTS.test(new URL(u).hostname)) return cb({ cancel: false }); } catch (e) {} }
    cb({ cancel: true });
  });
  await migrateOldData();
  mainCreated = true;
  createWindow();
});
// Erst beenden, wenn das Hauptfenster existiert hat (nicht beim Schließen des unsichtbaren Umzugsfensters)
let mainCreated = false;
app.on('window-all-closed', () => { if (mainCreated) app.quit(); });
