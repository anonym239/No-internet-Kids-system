/* Kopiert die KI-Bibliothek (Transformers.js + ONNX-Runtime-WebAssembly) nach vendor/transformers/.
 * So lädt Nova nichts aus dem Internet (kein CDN). */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'vendor', 'transformers');
fs.mkdirSync(out, { recursive: true });
const tjs = path.join(root, 'node_modules', '@huggingface', 'transformers', 'dist');
const ort = path.join(root, 'node_modules', 'onnxruntime-web', 'dist');
if (!fs.existsSync(tjs)) { console.warn('Transformers.js nicht installiert – KI wird übersprungen (npm install ausführen).'); process.exit(0); }
fs.copyFileSync(path.join(tjs, 'transformers.min.js'), path.join(out, 'transformers.min.js'));
for (const f of ['ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
  if (fs.existsSync(path.join(ort, f))) fs.copyFileSync(path.join(ort, f), path.join(out, f));
}
console.log('KI-Bibliothek nach vendor/transformers kopiert');
