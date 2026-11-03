/* Nova KI – Verwaltung der lokalen KI-Modelle
 * - Vorinstallierte Modelle liegen in /models/ (beim Build von GitHub Actions geladen)
 * - Weitere Modelle können mit Erlaubnis (Passwort) einmalig heruntergeladen werden.
 *   Nur während des Downloads wird das Internet freigeschaltet – danach ist es wieder gesperrt.
 * - Gerechnet wird komplett auf dem Gerät (Web Worker + WebAssembly bzw. Grafikkarte).
 */
(function () {
  'use strict';
  const Nova = window.Nova;
  const LS = window.localStorage;
  const HF = 'https://huggingface.co/';
  const CACHE = 'transformers-cache';
  const read = (k, d) => { try { return JSON.parse(LS.getItem(k)) ?? d; } catch (e) { return d; } };
  const write = (k, v) => { try { LS.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let worker = null, reqSeq = 0;
  const pending = new Map();
  let loadWaiters = [];

  const ai = {
    supported: typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined',
    catalog: [],
    catalogLoaded: false,
    state: 'idle', // idle | loading | ready | error
    loadedId: null,
    device: null,
    progress: { loaded: 0, total: 0, files: {} },
    error: null,
    listeners: new Set(),
    on(fn) { ai.listeners.add(fn); return () => ai.listeners.delete(fn); },
    emit() { ai.listeners.forEach((fn) => { try { fn(ai); } catch (e) { console.error(e); } }); },

    async loadCatalog() {
      if (ai.catalogLoaded) return ai.catalog;
      try {
        const r = await fetch('models/catalog.json', { cache: 'no-store' });
        if (r.ok) ai.catalog = ((await r.json()).models || []).filter((m) => m.ok);
      } catch (e) { ai.catalog = []; }
      ai.catalogLoaded = true;
      return ai.catalog;
    },
    installedMap: () => read('nova.ai.installed', {}),
    isInstalled(m) { return !!(m.bundled || ai.installedMap()[m.id]); },
    installedModels() { return ai.catalog.filter((m) => ai.isInstalled(m)); },
    gpuWanted() { const v = read('nova.ai.gpu', null); return v == null ? (Nova.native.platform !== 'android' && !!navigator.gpu) : v && !!navigator.gpu; },
    setGpu(v) { write('nova.ai.gpu', !!v); },
    activeModel() {
      const inst = ai.installedModels();
      const id = read('nova.ai.active', null);
      return inst.find((m) => m.id === id) || inst.find((m) => m.bundled) || inst[0] || null;
    },
    setActive(id) { write('nova.ai.active', id); ai.state = 'idle'; ai.loadedId = null; ai.emit(); },
    canSee(m = ai.activeModel()) { return !!m && m.kind === 'vlm'; },

    /* ---------- Worker ---------- */
    getWorker() {
      if (worker) return worker;
      worker = new Worker(new URL('js/ai/worker.js', location.href), { type: 'module' });
      worker.onmessage = (e) => {
        const m = e.data;
        if (m.type === 'progress') {
          if (m.file) ai.progress.files[m.file] = { loaded: m.loaded, total: m.total };
          const fs = Object.values(ai.progress.files);
          ai.progress.loaded = fs.reduce((s, f) => s + f.loaded, 0);
          ai.progress.total = fs.reduce((s, f) => s + f.total, 0);
          ai.emit();
        } else if (m.type === 'ready') {
          ai.state = 'ready'; ai.loadedId = m.id; ai.device = m.device; ai.error = null; ai.emit();
          loadWaiters.forEach((w) => w.resolve()); loadWaiters = [];
        } else if (m.type === 'token') {
          const p = pending.get(m.reqId); if (p && p.onToken) p.onToken(m.t);
        } else if (m.type === 'done') {
          const p = pending.get(m.reqId); if (p) { pending.delete(m.reqId); p.resolve(m); }
        } else if (m.type === 'error') {
          if (m.reqId != null && pending.has(m.reqId)) { const p = pending.get(m.reqId); pending.delete(m.reqId); p.reject(new Error(m.message)); }
          else { ai.state = 'error'; ai.error = m.message; ai.emit(); loadWaiters.forEach((w) => w.reject(new Error(m.message))); loadWaiters = []; }
        } else if (m.type === 'log') console.info('[Nova KI]', m.message);
      };
      worker.onerror = (e) => { ai.state = 'error'; ai.error = e.message || 'KI konnte nicht gestartet werden'; ai.emit(); loadWaiters.forEach((w) => w.reject(new Error(ai.error))); loadWaiters = []; };
      return worker;
    },

    /* Lädt das aktive Modell in den Speicher */
    ensureReady() {
      const m = ai.activeModel();
      if (!m) return Promise.reject(new Error('Kein KI-Modell installiert.'));
      if (ai.state === 'ready' && ai.loadedId === m.id) return Promise.resolve();
      return new Promise((resolve, reject) => {
        loadWaiters.push({ resolve, reject });
        if (ai.state === 'loading') return;
        ai.state = 'loading'; ai.error = null; ai.progress = { loaded: 0, total: 0, files: {} }; ai.emit();
        const rec = ai.installedMap()[m.id];
        const gpu = ai.gpuWanted();
        const dtype = m.bundled ? m.bundledDtype : rec.dtype;
        const device = m.bundled ? (gpu ? 'webgpu' : 'wasm') : rec.device === 'webgpu' && gpu ? 'webgpu' : 'wasm';
        ai.getWorker().postMessage({ type: 'load', id: m.id, kind: m.kind, dtype, device });
      });
    },

    /* Chat: liefert { done: Promise, stop() } */
    chat({ messages, image, onToken, maxTokens, temperature }) {
      const reqId = ++reqSeq;
      const done = ai.ensureReady().then(() => new Promise((resolve, reject) => {
        pending.set(reqId, { resolve, reject, onToken });
        ai.getWorker().postMessage({ type: 'generate', reqId, messages, image: image || null, maxTokens: maxTokens || 400, temperature: temperature ?? 0.6 });
      }));
      return { done, stop: () => worker && worker.postMessage({ type: 'stop' }) };
    },

    /* ---------- Kindgerechte Regeln ---------- */
    systemPrompt(acc) {
      const P = Nova.persona(acc);
      const p = acc.profile || {};
      const style = {
        1: 'Benutze sehr kurze, einfache Sätze und Beispiele mit Dingen zum Anfassen.',
        2: 'Benutze einfache Sprache und Beispiele aus dem Alltag.',
        3: 'Erkläre klar und Schritt für Schritt.',
        4: 'Erkläre kompakt und verwende die richtigen Fachbegriffe.',
        5: 'Antworte sachlich und präzise.'
      }[P.level];
      return [
        'Du bist „Nova", ein freundlicher KI-Helfer in der App Nova OS.',
        `Du sprichst mit ${acc.name} (${P.age} Jahre${p.status === 'school' && p.grade ? ', Klasse ' + p.grade : ''}${p.state ? ', ' + p.state : ''}).`,
        'Antworte immer auf Deutsch, freundlich und eher kurz. ' + style,
        'Du läufst komplett offline auf diesem Gerät und hast keinen Zugang zum Internet.',
        'Regeln: Keine Inhalte für Erwachsene, keine brutalen Gewalt-Details, keine gefährlichen Anleitungen, frag nie nach Adresse, Telefonnummer oder Passwörtern.',
        'Bei Hausaufgaben: erkläre den Weg und gib Tipps, statt nur die fertige Lösung zu verraten.',
        'Wenn du etwas nicht sicher weißt, sag das ehrlich.',
        'Wenn jemand traurig ist, Angst hat oder gemobbt wird: sei einfühlsam und ermutige, mit Eltern oder einer Vertrauensperson zu sprechen (Nummer gegen Kummer: 116 111, kostenlos).'
      ].join('\n');
    },
    /* Grober Schutzfilter für eindeutig ungeeignete Anfragen */
    blocked(text) {
      return /\b(porno|sex(ting)?|nackt|nacktbilder|bombe bauen|waffe bauen|drogen kaufen|selbstmord anleitung|töten wie)\b/i.test(text || '');
    },
    blockedAnswer: 'Darüber kann ich leider nicht sprechen. Wenn dich etwas beschäftigt oder dir Sorgen macht, sprich am besten mit deinen Eltern oder einer Vertrauensperson. Die Nummer gegen Kummer erreichst du kostenlos unter 116 111.',
    cleanOutput(t) { return String(t || '').replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim(); },

    /* Hilfsfunktion für andere Apps: kurze Aufgabe ohne Chatverlauf */
    task(instruction, text, { onToken } = {}) {
      const acc = Nova.store.current;
      return ai.chat({
        messages: [{ role: 'system', content: ai.systemPrompt(acc) }, { role: 'user', content: instruction + '\n\n"""\n' + text + '\n"""' }],
        onToken, maxTokens: 500, temperature: 0.3
      });
    },
    TEXT_ACTIONS: [
      ['fix', 'Rechtschreibung korrigieren', 'Korrigiere Rechtschreibung, Grammatik und Zeichensetzung im folgenden Text. Ändere sonst nichts. Gib nur den korrigierten Text aus, ohne Erklärung.'],
      ['nicer', 'Schöner formulieren', 'Formuliere den folgenden Text schöner, klarer und flüssiger. Behalte die Bedeutung. Gib nur den neuen Text aus, ohne Erklärung.'],
      ['shorter', 'Kürzer machen', 'Kürze den folgenden Text auf das Wichtigste. Gib nur den gekürzten Text aus.'],
      ['longer', 'Ausführlicher', 'Schreibe den folgenden Text etwas ausführlicher und anschaulicher weiter. Gib nur den neuen Text aus.'],
      ['summary', 'Zusammenfassen', 'Fasse den folgenden Text in 3 bis 5 kurzen Stichpunkten zusammen.'],
      ['explain', 'Erklären', 'Erkläre mir den folgenden Text einfach und verständlich.']
    ],

    /* ---------- Installieren / Löschen ---------- */
    remoteURL: (id, path) => HF + id + '/resolve/main/' + path,
    async install(m, onProgress, signal) {
      if (!('caches' in window)) throw new Error('Dieses Gerät kann keine Modelle speichern.');
      const gpu = ai.gpuWanted() && m.gpu && m.gpu !== m.wasm;
      const variant = gpu ? m.gpu : m.wasm;
      const files = [...(m.meta || []), ...variant.files];
      const total = files.reduce((s, f) => s + f.size, 0);
      let done = 0;
      await Nova.native.setNetwork(true);
      try {
        const cache = await caches.open(CACHE);
        for (const f of files) {
          const url = ai.remoteURL(m.id, f.path);
          if (await cache.match(url)) { done += f.size; onProgress && onProgress(done, total, f.path); continue; }
          const r = await fetch(url, { signal });
          if (!r.ok) throw new Error('Download fehlgeschlagen (' + r.status + ') bei ' + f.path);
          const counter = new TransformStream({ transform(chunk, ctl) { done += chunk.byteLength; onProgress && onProgress(done, total, f.path); ctl.enqueue(chunk); } });
          const body = r.body.pipeThrough(counter);
          await cache.put(url, new Response(body, { headers: { 'content-type': r.headers.get('content-type') || 'application/octet-stream', 'content-length': String(f.size) } }));
        }
      } finally {
        await Nova.native.setNetwork(false);
      }
      const map = ai.installedMap();
      map[m.id] = { dtype: variant.dtype, device: gpu ? 'webgpu' : 'wasm', files: files.map((f) => f.path), size: total, at: Date.now() };
      write('nova.ai.installed', map);
      ai.emit();
    },
    async uninstall(m) {
      const rec = ai.installedMap()[m.id];
      if (!rec) return;
      try { const cache = await caches.open(CACHE); for (const p of rec.files) await cache.delete(ai.remoteURL(m.id, p)); } catch (e) {}
      const map = ai.installedMap(); delete map[m.id]; write('nova.ai.installed', map);
      if (ai.loadedId === m.id) { ai.state = 'idle'; ai.loadedId = null; if (worker) worker.postMessage({ type: 'unload' }); }
      ai.emit();
    },
    /* Prüft, ob heruntergeladene Modelle noch im Speicher sind (z. B. nach „Daten löschen") */
    async verify() {
      const map = ai.installedMap();
      if (!('caches' in window)) return;
      try {
        const cache = await caches.open(CACHE);
        let changed = false;
        for (const [id, rec] of Object.entries(map)) {
          const ok = await cache.match(ai.remoteURL(id, rec.files[rec.files.length - 1]));
          if (!ok) { delete map[id]; changed = true; }
        }
        if (changed) { write('nova.ai.installed', map); ai.emit(); }
      } catch (e) {}
    },
    fmtSize: (b) => (b >= 1e9 ? (b / 1e9).toFixed(1).replace('.', ',') + ' GB' : Math.round(b / 1e6) + ' MB'),

    /* Bild verkleinern (spart Rechenzeit) */
    async prepareImage(file) {
      const img = await createImageBitmap(file);
      const max = 768, s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.88));
      return { blob, url: c.toDataURL('image/jpeg', 0.6) };
    },

    /* Öffnet den Assistenten (optional mit Frage) – von anderen Apps genutzt */
    open(prompt, autoSend) {
      Nova.aiPending = prompt ? { prompt, autoSend: !!autoSend } : null;
      Nova.shell.launch('assistant');
    }
  };

  Nova.ai = ai;
})();
