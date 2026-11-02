/* Nova OS – Konten, Speicher, Offline-Token & Sync
 *
 * Alles liegt lokal im Gerät (localStorage). Es gibt KEINEN Server.
 * Der "Konto-Token" enthält das komplette Konto (komprimiert + Prüfsumme).
 * Wer den Token (Text oder .novakey-Datei) aufhebt, kann sein Konto jederzeit
 * wiederherstellen – auch nach Deinstallation, auf einem neuen Gerät oder
 * nach dem Löschen der App-Daten. Importiert man einen Token für ein Konto,
 * das schon auf dem Gerät existiert, werden beide Stände zusammengeführt (Sync).
 */
(function () {
  'use strict';
  const Nova = window.Nova;
  const C = window.NovaCrypto;
  const LS = window.localStorage;
  const IDX = 'nova.accounts';
  const SESSION = 'nova.session';
  const COLS = ['todos', 'notes', 'drawings', 'pixels', 'beats', 'decks', 'calc'];
  const TOKEN_PREFIX = 'NOVA1';

  const COLORS = [
    ['#7c5cff', '#4f8cff'], ['#ff5c8a', '#ff9f43'], ['#00c2a8', '#4f8cff'], ['#ff6b3d', '#ffb800'],
    ['#2ecc71', '#00b4d8'], ['#a855f7', '#ec4899'], ['#64748b', '#334155'], ['#0ea5e9', '#6366f1']
  ];

  function readJSON(k, d) { try { const v = LS.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function writeJSON(k, v) {
    try { LS.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { Nova.ui && Nova.ui.toast('Speicher voll! Bitte alte Zeichnungen löschen.', 'err'); return false; }
  }

  const hashPin = (salt, pin) => C.sha256hex('nova-pin:' + salt + ':' + pin);

  const DEFAULT_PROFILE = { lastName: '', age: 12, birthday: '', status: 'school', grade: null, schoolType: '', state: '', interests: [], subjects: [] };

  function newAccount({ name, pin, color, auth, profile, internet }) {
    const salt = Nova.randB32(12);
    const now = Date.now();
    return {
      v: 1,
      id: Nova.randB32(8),
      name: name.trim(),
      color: color || 0,
      salt,
      pin: hashPin(salt, pin),
      auth: auth === 'password' ? 'password' : 'pin',
      profile: Object.assign({}, DEFAULT_PROFILE, profile || {}),
      internet: internet === 'store' ? 'store' : 'offline',
      created: now,
      updated: now,
      lastBackup: 0,
      settings: { theme: 'dark', accent: 'auto', wallpaper: 'mono', icons: 'mono', bw: false, fx: false, v3: true, sound: true, kiosk: false, simple: null, u: now },
      folders: [],
      dock: ['mathe', 'deutsch', 'todo', 'notes', 'calc', 'runner'],
      recent: [],
      data: { todos: [], notes: [], drawings: [], pixels: [], beats: [], decks: [], calc: [], scores: {} },
      st: { limit: 0, bedtime: { on: false, from: '21:00', to: '07:00' }, usage: {}, bonus: {}, locked: {}, unlocked: {}, parentKey: null, usedCodes: [], u: now }
    };
  }

  /* Fehlende Felder bei älteren Konten ergänzen */
  function normalize(a) {
    const d = newAccount({ name: a.name || 'Konto', pin: '0000' });
    for (const k of ['settings', 'st', 'data']) a[k] = Object.assign({}, d[k], a[k] || {});
    a.st.bedtime = Object.assign({}, d.st.bedtime, a.st.bedtime || {});
    for (const c of COLS) if (!Array.isArray(a.data[c])) a.data[c] = [];
    if (!a.data.scores) a.data.scores = {};
    if (!Array.isArray(a.folders)) a.folders = [];
    if (!Array.isArray(a.dock)) a.dock = d.dock;
    if (!Array.isArray(a.recent)) a.recent = [];
    a.profile = Object.assign({}, DEFAULT_PROFILE, a.profile || {});
    if (!a.auth) a.auth = 'pin';
    if (!a.internet) a.internet = 'offline';
    if (!a.settings.v3) Object.assign(a.settings, { accent: 'auto', wallpaper: 'mono', icons: 'mono', bw: false, v3: true });
    return a;
  }

  const store = {
    COLORS,
    current: null,

    ids() { return readJSON(IDX, []); },
    list() { return this.ids().map((id) => this.load(id)).filter(Boolean); },
    load(id) { const a = readJSON('nova.acc.' + id, null); return a ? normalize(a) : null; },
    write(acc) {
      const ids = this.ids();
      if (!ids.includes(acc.id)) { ids.push(acc.id); writeJSON(IDX, ids); }
      return writeJSON('nova.acc.' + acc.id, acc);
    },

    create(opts) {
      const acc = newAccount(opts);
      this.write(acc);
      return acc;
    },
    remove(id) {
      LS.removeItem('nova.acc.' + id);
      writeJSON(IDX, this.ids().filter((x) => x !== id));
      if (this.current && this.current.id === id) this.logout();
    },
    checkPin(acc, pin) { return acc.pin === hashPin(acc.salt, pin); },
    setPin(acc, pin) { acc.salt = Nova.randB32(12); acc.pin = hashPin(acc.salt, pin); this.save(true); },

    login(acc) {
      this.current = acc;
      LS.setItem(SESSION, acc.id);
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    },
    logout() { this.flush(); this.current = null; LS.removeItem(SESSION); },
    resume() {
      const id = LS.getItem(SESSION);
      const a = id && this.load(id);
      if (a) this.current = a;
      return a;
    },

    _t: null,
    save(now) {
      if (!this.current) return;
      this.current.updated = Date.now();
      clearTimeout(this._t);
      if (now) this.write(this.current);
      else this._t = setTimeout(() => this.current && this.write(this.current), 400);
    },
    flush() { clearTimeout(this._t); if (this.current) this.write(this.current); },

    /* ---- Sammlungen (mit Löschmarkierung, damit Sync Löschungen kennt) ---- */
    items(col) { return (this.current.data[col] || []).filter((x) => !x.del); },
    get(col, id) { return this.items(col).find((x) => x.id === id); },
    put(col, item) {
      const arr = this.current.data[col];
      item.u = Date.now();
      if (!item.id) item.id = Nova.uid();
      const i = arr.findIndex((x) => x.id === item.id);
      if (i >= 0) arr[i] = item; else arr.unshift(item);
      this.save();
      return item;
    },
    del(col, id) {
      const arr = this.current.data[col];
      const i = arr.findIndex((x) => x.id === id);
      if (i >= 0) arr[i] = { id, del: true, u: Date.now() };
      this.save();
    },
    score(game, val) {
      const s = this.current.data.scores;
      if (val == null) return s[game] || 0;
      if (val > (s[game] || 0)) { s[game] = val; this.save(); return true; }
      return false;
    },

    /* ---- Token ---- */
    async exportToken(acc = this.current) {
      acc.lastBackup = Date.now();
      if (acc === this.current) this.save(true);
      const json = new TextEncoder().encode(JSON.stringify(acc));
      let mode = 'p', bytes = json;
      if (window.CompressionStream) {
        try {
          const s = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
          bytes = new Uint8Array(await new Response(s).arrayBuffer());
          mode = 'z';
        } catch (e) { mode = 'p'; bytes = json; }
      }
      const body = mode + Nova.b64u(bytes);
      return TOKEN_PREFIX + '.' + body + '.' + C.sha256hex(body).slice(0, 8);
    },

    async parseToken(text) {
      text = String(text || '').replace(/\s+/g, '');
      const parts = text.split('.');
      if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) throw new Error('Das ist kein gültiger Nova-Token.');
      const [, body, sum] = parts;
      if (C.sha256hex(body).slice(0, 8) !== sum) throw new Error('Der Token ist beschädigt oder unvollständig.');
      const mode = body[0];
      let bytes = Nova.unb64u(body.slice(1));
      if (mode === 'z') {
        if (!window.DecompressionStream) throw new Error('Dieser Browser kann den Token nicht entpacken. Bitte aktuellen Browser verwenden.');
        const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        bytes = new Uint8Array(await new Response(s).arrayBuffer());
      }
      const acc = JSON.parse(new TextDecoder().decode(bytes));
      if (!acc || !acc.id || !acc.pin) throw new Error('Token enthält kein Konto.');
      return normalize(acc);
    },

    /* Importiert einen Token. Existiert das Konto schon -> Sync (Zusammenführen). */
    async importToken(text) {
      const inc = await this.parseToken(text);
      const local = this.load(inc.id);
      const merged = local ? merge(local, inc) : inc;
      this.write(merged);
      if (this.current && this.current.id === merged.id) this.current = merged;
      return { acc: merged, synced: !!local };
    }
  };

  /* ---- Sync-Logik ---- */
  function mergeCol(a = [], b = []) {
    const m = new Map();
    for (const x of a) m.set(x.id, x);
    for (const y of b) { const x = m.get(y.id); if (!x || (y.u || 0) > (x.u || 0)) m.set(y.id, y); }
    return Array.from(m.values()).sort((p, q) => (q.u || 0) - (p.u || 0));
  }
  const maxMap = (a = {}, b = {}) => { const o = Object.assign({}, a); for (const k in b) o[k] = Math.max(o[k] || 0, b[k] || 0); return o; };

  function merge(local, inc) {
    const newer = (inc.updated || 0) > (local.updated || 0) ? inc : local;
    const out = JSON.parse(JSON.stringify(newer));
    for (const c of COLS) out.data[c] = mergeCol(local.data[c], inc.data[c]);
    out.data.scores = maxMap(local.data.scores, inc.data.scores);
    out.folders = mergeCol(local.folders, inc.folders);
    const stBase = (inc.st.u || 0) > (local.st.u || 0) ? inc.st : local.st;
    out.st = JSON.parse(JSON.stringify(stBase));
    out.st.usage = maxMap(local.st.usage, inc.st.usage);
    out.st.bonus = maxMap(local.st.bonus, inc.st.bonus);
    out.st.locked = maxMap(local.st.locked, inc.st.locked);
    out.st.unlocked = maxMap(local.st.unlocked, inc.st.unlocked);
    out.st.usedCodes = Array.from(new Set([...(local.st.usedCodes || []), ...(inc.st.usedCodes || [])])).slice(-300);
    out.settings = (inc.settings.u || 0) > (local.settings.u || 0) ? inc.settings : local.settings;
    out.lastBackup = Math.max(local.lastBackup || 0, inc.lastBackup || 0);
    out.updated = Date.now();
    return out;
  }
  store.merge = merge;

  document.addEventListener('visibilitychange', () => { if (document.hidden) store.flush(); });
  window.addEventListener('pagehide', () => store.flush());

  Nova.store = store;
})();
