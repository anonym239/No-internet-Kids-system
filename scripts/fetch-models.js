/* Wird von GitHub Actions ausgeführt (dort gibt es Internet).
 * 1) Fragt für jedes Modell im Katalog die Dateiliste bei Hugging Face ab und wählt die passende Variante (dtype).
 * 2) Lädt die „vorinstallierten“ Modelle nach models/<id>/ herunter.
 * 3) Schreibt models/catalog.json (Größen + Dateilisten), damit die App ohne Internet weiß, was installierbar ist. */
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'models');
const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'ai-catalog.json'), 'utf8'));
const HF = 'https://huggingface.co';
const SUFFIX = { fp32: '', fp16: '_fp16', q8: '_quantized', int8: '_int8', uint8: '_uint8', q4: '_q4', q4f16: '_q4f16', bnb4: '_bnb4' };
const WASM_PREF = ['q4', 'q8', 'int8', 'uint8', 'q4f16', 'fp16', 'fp32'];
const GPU_PREF = ['q4f16', 'q4', 'fp16', 'q8', 'fp32'];
const MAX_BUNDLE = 1.6 * 1024 ** 3;

const isMeta = (p) => !p.includes('/') && /\.(json|jinja|txt|model)$/i.test(p) && !/^(README|LICENSE)/i.test(p);

/* Je ONNX-Bauteil (z. B. model, vision_encoder, decoder_model_merged) die verfügbaren Varianten sammeln */
function components(files) {
  const onnx = files.filter((f) => f.path.startsWith('onnx/') && /\.onnx$/.test(f.path));
  const sufs = Object.entries(SUFFIX).filter(([, s]) => s).sort((a, b) => b[1].length - a[1].length);
  const comps = {};
  for (const f of onnx) {
    let name = f.path.slice(5, -5), dtype = 'fp32';
    for (const [d, s] of sufs) if (name.endsWith(s)) { name = name.slice(0, -s.length); dtype = d; break; }
    const list = [f, ...files.filter((x) => x.path.startsWith(f.path + '_data'))];
    (comps[name] = comps[name] || {})[dtype] = list.map((x) => ({ path: x.path, size: x.size }));
  }
  return comps;
}
/* Wählt pro Bauteil die erste Variante aus der Wunschliste. dtype ist ein String (alle gleich) oder ein Objekt. */
function choose(comps, pref) {
  const dt = {}, files = [];
  for (const [name, vars] of Object.entries(comps)) {
    const d = pref.find((x) => vars[x]);
    if (!d) return null;
    dt[name] = d; files.push(...vars[d]);
  }
  const uniq = new Set(Object.values(dt));
  return { dtype: uniq.size === 1 ? [...uniq][0] : dt, files, size: files.reduce((s, f) => s + f.size, 0) };
}

async function tree(id) {
  const r = await fetch(`${HF}/api/models/${id}/tree/main?recursive=true`);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const items = await r.json();
  return items.filter((x) => x.type === 'file').map((x) => ({ path: x.path, size: x.lfs ? x.lfs.size : x.size }));
}

async function download(id, file) {
  const dest = path.join(outDir, id, file.path);
  if (fs.existsSync(dest) && fs.statSync(dest).size === file.size) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(`${HF}/${id}/resolve/main/${file.path}`);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(dest + '.part'));
      fs.renameSync(dest + '.part', dest);
      return;
    } catch (e) {
      console.warn(`  Versuch ${attempt} für ${file.path}: ${e.message}`);
      await new Promise((res) => setTimeout(res, 2000 * attempt));
    }
  }
  throw new Error('Download fehlgeschlagen: ' + id + '/' + file.path);
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const catalog = [];
  for (const m of src.models) {
    const entry = { ...m, ok: false };
    try {
      const files = await tree(m.id);
      const meta = files.filter((f) => isMeta(f.path));
      const comps = components(files);
      if (!Object.keys(comps).length) throw new Error('keine ONNX-Dateien gefunden');
      const wasm = choose(comps, WASM_PREF);
      const gpu = choose(comps, GPU_PREF);
      if (!wasm) throw new Error('keine passende ONNX-Variante');
      const metaSize = meta.reduce((s, f) => s + f.size, 0);
      entry.meta = meta;
      entry.wasm = wasm;
      entry.gpu = gpu || wasm;
      entry.size = metaSize + wasm.size;
      entry.gpuSize = metaSize + (gpu || wasm).size;
      entry.ok = true;
      const desc = (c) => (typeof c.dtype === 'string' ? c.dtype : JSON.stringify(c.dtype));
      console.log(`✓ ${m.id}: wasm=${desc(wasm)} (${(entry.size / 1e6).toFixed(0)} MB), gpu=${gpu ? desc(gpu) : '-'} (${(entry.gpuSize / 1e6).toFixed(0)} MB); Bauteile: ${Object.entries(comps).map(([n, v]) => n + '[' + Object.keys(v).join('/') + ']').join(' ')}`);
      if (m.bundled) {
        if (entry.size > MAX_BUNDLE) throw new Error('zu groß zum Vorinstallieren');
        console.log(`  → lade vorinstalliertes Modell (${(entry.size / 1e6).toFixed(0)} MB) …`);
        for (const f of [...meta, ...wasm.files]) await download(m.id, f);
        entry.bundledDtype = wasm.dtype;
      }
    } catch (e) {
      console.warn(`✗ ${m.id}: ${e.message}`);
      entry.error = e.message;
      if (m.bundled) entry.bundled = false;
    }
    catalog.push(entry);
  }
  fs.writeFileSync(path.join(outDir, 'catalog.json'), JSON.stringify({ generated: new Date().toISOString(), models: catalog }, null, 1));
  const bundled = catalog.filter((c) => c.bundled && c.ok);
  console.log(`\nKatalog geschrieben: ${catalog.filter((c) => c.ok).length}/${catalog.length} verfügbar, ${bundled.length} vorinstalliert.`);
  if (!bundled.length) { console.error('FEHLER: Kein vorinstalliertes Modell verfügbar.'); process.exit(1); }
})();
