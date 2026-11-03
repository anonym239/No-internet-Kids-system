/* Kopiert die Web-App nach www/ (für Electron & Capacitor) */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
require('./vendor.js');
fs.rmSync(out, { recursive: true, force: true });
for (const item of ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons', 'vendor', 'models']) {
  if (fs.existsSync(path.join(root, item))) fs.cpSync(path.join(root, item), path.join(out, item), { recursive: true });
}
console.log('Web-App nach www/ kopiert');
