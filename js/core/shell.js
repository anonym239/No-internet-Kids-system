/* Nova OS – Shell: Anmeldung, Startbildschirm, Ordner, Fenster, Sperrbildschirm */
(function () {
  'use strict';
  const Nova = window.Nova;
  const { h, $, $$, ui, icon } = Nova;
  const store = Nova.store;

  /* ================= App-Registry ================= */
  const APPS = [];
  const FOLDERS = [
    { id: 'games', name: 'Spiele', icon: 'gamepad', grad: ['#ff5c8a', '#7c5cff'] },
    { id: 'creative', name: 'Kreativ', icon: 'sparkle', grad: ['#ff9f43', '#ff5c8a'] },
    { id: 'learn', name: 'Lernen', icon: 'school', grad: ['#22c55e', '#0ea5e9'] },
    { id: 'tools', name: 'Werkzeuge', icon: 'tool', grad: ['#4f8cff', '#00c2a8'] },
    { id: 'system', name: 'System', icon: 'cpu', grad: ['#64748b', '#334155'] }
  ];
    Nova.registerApp = (def) => APPS.push(def);
  const app = (id) => APPS.find((a) => a.id === id);

  const WALLPAPERS = {
    mono: 'Schlicht', graphite: 'Graphit', aurora: 'Aurora', ocean: 'Ozean', sunset: 'Abendrot', forest: 'Wald'
  };
  const ACCENTS = ['auto', '#3b82f6', '#6d5dfc', '#0d9488', '#16a34a', '#d97706', '#dc2626', '#db2777'];

  const root = () => $('#app');
  let ticker = null, lockEl = null, currentWin = null, tickCount = 0, warned = {};

  /* ================= Theme ================= */
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  function applyTheme(acc) {
    const s = acc ? acc.settings : { theme: 'dark', accent: 'auto', wallpaper: 'mono', icons: 'tint', bw: false };
    let theme = s.theme;
    if (theme === 'auto') theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    const de = document.documentElement;
    de.dataset.theme = theme;
    de.dataset.bw = s.bw ? '1' : '0';
    de.dataset.fx = s.fx ? '1' : '0';
    const accent = s.bw || !s.accent || s.accent === 'auto' ? (theme === 'light' ? '#111113' : '#ededee') : s.accent;
    de.style.setProperty('--accent', accent);
    de.style.setProperty('--accent-fg', lum(accent) > 0.45 ? '#111113' : '#ffffff');
    document.body.dataset.wp = s.bw ? 'mono' : s.wallpaper || 'mono';
    document.body.dataset.icons = s.bw ? 'mono' : s.icons || 'tint';
    const meta = $('meta[name=theme-color]');
    if (meta) meta.content = theme === 'light' ? '#f7f7f8' : '#0b0b0c';
  }

  function avatar(acc, size = 'md') {
    const g = store.COLORS[acc.color % store.COLORS.length];
    return h('div', { class: 'avatar ' + size, style: { background: g[0] } }, (acc.name || '?').trim().charAt(0).toUpperCase());
  }
  /* Eindeutige Erkennungsfarbe pro App (für „Dezent") */
  const TINT = {
    runner: '#f97316', pulse: '#7c3aed', snake: '#16a34a', memory: '#db2777', four: '#ca8a04', bricks: '#0284c7', realgames: '#059669',
    mathe: '#2563eb', deutsch: '#dc2626', calc: '#475569', todo: '#65a30d', notes: '#d97706', timer: '#e11d48', cards: '#4f46e5',
    draw: '#c026d3', pixel: '#0d9488', beats: '#9333ea', gallery: '#0891b2', settings: '#52525b', screentime: '#6d28d9'
  };
  function appIcon(a, size = '') {
    return h('div', { class: 'app-ic ' + size, style: { background: `linear-gradient(145deg, ${a.grad[0]}, ${a.grad[1]})`, '--ic': TINT[a.id] || a.grad[0] }, html: icon(a.icon) });
  }

  /* ================= Login ================= */
  function showLogin() {
    stopTicker();
    closeWin(true);
    hideLock();
    store.current = null;
    applyTheme(null);
    const r = root();
    r.innerHTML = '';
    const clock = h('div', { class: 'login-clock' }, Nova.fmtTime());
    const date = h('div', { class: 'login-date' }, Nova.fmtDate());
    const clockT = setInterval(() => { if (!document.body.contains(clock)) return clearInterval(clockT); clock.textContent = Nova.fmtTime(); date.textContent = Nova.fmtDate(); }, 5000);

    const panel = h('div', { class: 'login-panel glass' });
    const scr = h('div', { class: 'screen login' },
      h('div', { class: 'login-hero' },
        h('div', { class: 'brand' }, h('div', { class: 'brand-mark' }), h('span', null, 'Nova'), h('span', { class: 'badge', html: icon('wifiOff') + ' Offline' })),
        clock, date
      ),
      panel
    );
    r.append(scr);
    renderProfiles(panel);
  }

  function renderProfiles(panel) {
    panel.innerHTML = '';
    const accs = store.list();
    panel.append(...[
      h('h2', null, accs.length ? 'Wer bist du?' : 'Willkommen bei Nova'),
      h('p', { class: 'muted' }, accs.length ? 'Wähle dein Konto aus.' : 'Dein eigenes System – komplett ohne Internet. Erstelle zuerst ein Konto oder stelle eins mit deinem Token wieder her.'),
      accs.length ? h('div', { class: 'profiles' }, accs.map((a) =>
        h('button', { class: 'profile', onclick: () => renderPin(panel, a) }, avatar(a, 'lg'), h('span', null, a.name))
      )) : null,
      h('div', { class: 'login-actions' },
        h('button', { class: 'btn primary', onclick: () => renderCreate(panel), html: icon('plus') + ' Neues Konto' }),
        h('button', { class: 'btn', onclick: () => importDialog(panel), html: icon('sync') + ' Token / Sync' })
      ),
      h('button', { class: 'link-btn', onclick: remoteDialog, html: icon('remote') + ' Eltern-Fernsteuerung' })
    ].filter(Boolean));
  }

  function renderPin(panel, acc) {
    panel.innerHTML = '';
    let tries = 0;
    const isPw = acc.auth === 'password';
    const fail = (api) => { tries++; const m = tries >= 3 ? (isPw ? 'Falsches Passwort.' : 'Falsche PIN.') + ' Vergessen? Eltern können es zurücksetzen.' : isPw ? 'Falsches Passwort' : 'Falsche PIN'; if (api) api.error(m); else ui.toast(m, 'err'); };
    const ok = () => { store.login(store.load(acc.id)); showHome(); };
    let entry;
    if (isPw) {
      const inp = h('input', { class: 'input', type: 'password', placeholder: 'Passwort', autocomplete: 'current-password' });
      const go = () => { if (store.checkPin(acc, inp.value)) ok(); else { inp.value = ''; inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 400); fail(); } };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      entry = h('div', { class: 'stack pw-entry' }, inp, h('button', { class: 'btn primary wide', onclick: go }, 'Anmelden'));
      setTimeout(() => inp.focus(), 60);
    } else {
      entry = ui.pinPad({ hint: 'PIN eingeben', onDone: (pin, api) => { if (store.checkPin(acc, pin)) ok(); else fail(api); } }).el;
    }
    panel.append(
      h('button', { class: 'icon-btn back', onclick: () => renderProfiles(panel), html: icon('back') }),
      h('div', { class: 'pin-head' }, avatar(acc, 'xl'), h('h2', null, acc.name)),
      entry,
      h('button', { class: 'link-btn', onclick: () => forgotPin(panel, acc) }, isPw ? 'Passwort vergessen?' : 'PIN vergessen?')
    );
  }

  async function forgotPin(panel, acc) {
    const what = acc.auth === 'password' ? 'das Passwort' : 'die PIN';
    if (!acc.st.parentKey) return ui.dialog({ title: 'Vergessen?', text: 'Für dieses Konto wurde keine Eltern-PIN eingerichtet. Ohne Eltern-PIN kann ' + what + ' nicht zurückgesetzt werden – du kannst das Konto aber mit einem gespeicherten Token neu importieren.' });
    const pin = await askPin('Eltern-PIN', 'Eltern können hier ' + what + ' für ' + acc.name + ' neu festlegen.', 8);
    if (pin == null) return;
    if (!Nova.st.checkParent(acc, pin)) return ui.toast('Eltern-PIN falsch', 'err');
    const np = acc.auth === 'password' ? await askPassword('Neues Passwort', 'Mindestens 6 Zeichen', 6) : await askPin('Neue PIN', 'Neue 4-stellige PIN für ' + acc.name, 4, 4);
    if (!np) return;
    const a = store.load(acc.id);
    store.current = a; store.setPin(a, np); store.current = null;
    ui.toast('Geändert');
    renderPin(panel, a);
  }

  /* PIN per Dialog abfragen (für Eltern-PIN usw.) */
  function askPin(title, text, max = 8, min = 4) {
    const inp = h('input', { class: 'input pin-input', type: 'password', inputmode: 'numeric', autocomplete: 'off', maxlength: max, placeholder: '••••' });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.closest('.dialog').querySelector('.btn.primary').click(); });
    return ui.dialog({
      title, text, body: inp,
      actions: [
        { label: 'Abbrechen', ghost: true, value: null },
        { label: 'OK', primary: true, onClick: () => { const v = inp.value.trim(); if (!/^\d+$/.test(v) || v.length < min || v.length > max) { ui.toast('Bitte ' + (min === max ? min : min + '–' + max) + ' Ziffern eingeben', 'err'); return false; } return v; } }
      ]
    });
  }
  function askPassword(title, text, min = 1) {
    const inp = h('input', { class: 'input', type: 'password', autocomplete: 'off', placeholder: 'Passwort' });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.closest('.dialog').querySelector('.btn.primary').click(); });
    return ui.dialog({
      title, text, body: inp,
      actions: [
        { label: 'Abbrechen', ghost: true, value: null },
        { label: 'OK', primary: true, onClick: () => { if (inp.value.length < min) { ui.toast('Mindestens ' + min + ' Zeichen', 'err'); return false; } return inp.value; } }
      ]
    });
  }
  /* Fragt das Konto-Passwort / die PIN ab. Die Eltern-PIN wird ebenfalls akzeptiert. */
  async function askSecret(acc, title, text) {
    const v = acc.auth === 'password' ? await askPassword(title, text) : await askPin(title, text, 8, 4);
    if (v == null) return false;
    if (store.checkPin(acc, v) || (acc.st.parentKey && Nova.st.checkParent(acc, v))) return true;
    ui.toast(acc.auth === 'password' ? 'Falsches Passwort' : 'Falsche PIN', 'err');
    return false;
  }

  /* Verlassen/Abmelden: Eltern-PIN (falls eingerichtet und so eingestellt), sonst Konto-Passwort */
  function exitNeedsParent(acc) { return Nova.st.hasParent(acc) && (acc.settings.exitAuth || 'parent') === 'parent'; }
  async function askExitAuth(acc, title, text) {
    if (exitNeedsParent(acc)) {
      const p = await askPin(title, text + ' Dafür ist die Eltern-PIN nötig.');
      if (p == null) return false;
      if (Nova.st.checkParent(acc, p)) return true;
      ui.toast('Eltern-PIN falsch', 'err');
      return false;
    }
    return askSecret(acc, title, text + ' Gib ' + (acc.auth === 'password' ? 'dein Passwort' : 'deine PIN') + ' ein.');
  }

  async function logout() {
    const acc = store.current;
    if (acc && !(await askExitAuth(acc, 'Abmelden', 'Du möchtest dich abmelden.'))) return;
    Nova.native.setKiosk(false, true);
    if (Nova.native.isAndroid) Nova.native.guard.stop();
    store.logout(); showLogin();
  }

  /* App verlassen – nur mit Passwort/PIN */
  let exiting = false;
  async function requestExit() {
    if (exiting) return;
    const acc = store.current;
    if (!acc) return Nova.native.exit();
    exiting = true;
    try {
      if (await askExitAuth(acc, 'Nova verlassen?', 'Du möchtest Nova verlassen.')) { allowUnload = true; Nova.native.exit(); }
    } finally { exiting = false; }
  }
  let allowUnload = false;
  window.addEventListener('beforeunload', (e) => {
    if (Nova.native.platform !== 'web' || allowUnload || !store.current) return;
    e.preventDefault(); e.returnValue = '';
  });

  function renderCreate(panel) {
    Nova.onboarding(panel, {
      onBack: () => renderProfiles(panel),
      onDone: (d) => {
        const profile = { lastName: d.lastName.trim(), age: d.age, birthday: d.birthday, status: d.status, grade: d.status === 'school' ? d.grade : null, schoolType: d.status === 'school' ? d.schoolType : '', state: d.state, interests: d.interests, subjects: d.subjects };
        const acc = store.create({ name: d.name.trim(), pin: d.secret, color: d.color, auth: d.auth, profile, internet: d.internet });
        store.login(acc);
        if (d.parentPin) {
          Nova.st.setParent(acc, d.parentPin);
          const sug = Nova.persona(acc).suggestMinutes;
          if (d.useLimit && sug) { acc.st.limit = sug; acc.st.u = Date.now(); store.save(true); }
        }
        showHome();
        setTimeout(() => welcome(acc), 400);
      }
    });
  }

  async function welcome(acc) {
    const r = await ui.dialog({
      title: 'Willkommen, ' + acc.name + '!',
      body: h('div', { class: 'stack' },
        h('div', { class: 'info-row', html: icon('key') + '<div><b>Dein Konto-Token</b><br><span class="muted">Speichere deinen Token als Datei oder kopiere ihn. Damit bekommst du dein Konto jederzeit zurück – auch nach dem Löschen der App oder auf einem anderen Gerät.</span></div>' }),
        h('div', { class: 'info-row', html: icon('shield') + '<div><b>Eltern-PIN</b><br><span class="muted">Lass deine Eltern in „Bildschirmzeit" eine Eltern-PIN einrichten. Damit können sie dir per Code Zeit freigeben.</span></div>' })
      ),
      actions: [{ label: 'Später', ghost: true, value: false }, { label: 'Token jetzt sichern', primary: true, value: true }]
    });
    if (r) tokenDialog();
  }

  /* ================= Token / Sync ================= */
  async function tokenDialog() {
    const acc = store.current;
    const token = await store.exportToken(acc);
    const ta = h('textarea', { class: 'input token-box', readonly: true, rows: 4 });
    ta.value = token;
    const fname = 'nova-' + acc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Nova.dayKey() + '.novakey';
    await ui.dialog({
      title: 'Konto-Token',
      wide: true,
      body: h('div', { class: 'stack' },
        h('p', { class: 'muted' }, 'Dieser Token ist dein komplettes Konto (Einstellungen, Aufgaben, Notizen, Zeichnungen, Highscores, Bildschirmzeit). Er funktioniert für immer – auch wenn die App gelöscht oder neu installiert wird. Bewahre ihn gut auf und teile ihn mit niemandem.'),
        h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Konto-ID'), h('b', { class: 'mono' }, fmtId(acc.id))),
        ta,
        h('div', { class: 'row gap' },
          h('button', { class: 'btn', onclick: async () => ui.toast((await Nova.copyText(token)) ? 'Token kopiert' : 'Kopieren nicht möglich'), html: icon('copy') + ' Kopieren' }),
          h('button', { class: 'btn primary', onclick: () => { Nova.download(fname, token, 'text/plain'); ui.toast('Datei gespeichert (Downloads)'); }, html: icon('download') + ' Als Datei speichern' })
        ),
        h('p', { class: 'small muted' }, 'Tipp: Speichere die .novakey-Datei in deinem Downloads-Ordner, auf einem USB-Stick oder schicke sie dir selbst. Zum Synchronisieren mit einem zweiten Gerät dort „Token / Sync" öffnen und den Token einfügen – beide Stände werden zusammengeführt.')
      ),
      actions: [{ label: 'Fertig', primary: true }]
    });
    if (lastHome) refreshHome();
  }

  function importDialog(panel) {
    const ta = h('textarea', { class: 'input token-box', rows: 5, placeholder: 'NOVA1.…  Token hier einfügen' });
    const file = h('input', { type: 'file', accept: '.novakey,.txt,text/plain', style: { display: 'none' } });
    file.addEventListener('change', async () => { const f = file.files[0]; if (f) ta.value = (await f.text()).trim(); });
    return ui.dialog({
      title: 'Token importieren / Sync',
      wide: true,
      body: h('div', { class: 'stack' },
        h('p', { class: 'muted' }, 'Füge deinen Konto-Token ein oder öffne deine .novakey-Datei. Gibt es das Konto auf diesem Gerät schon, werden beide Stände synchronisiert.'),
        ta, file,
        h('button', { class: 'btn', onclick: () => file.click(), html: icon('upload') + ' Datei öffnen' })
      ),
      actions: [
        { label: 'Abbrechen', ghost: true },
        { label: 'Importieren', primary: true, onClick: async () => {
          try {
            const { acc, synced } = await store.importToken(ta.value);
            ui.toast(synced ? 'Konto synchronisiert ✓' : 'Konto importiert ✓');
            if (panel) renderPin(panel, acc);
            else if (store.current && store.current.id === acc.id) { applyTheme(store.current); refreshHome(); }
            return true;
          } catch (e) { ui.toast(e.message || 'Import fehlgeschlagen', 'err'); return false; }
        } }
      ]
    });
  }

  const fmtId = (id) => id.slice(0, 4) + '-' + id.slice(4);

  /* ================= Eltern-Fernsteuerung (läuft auf dem Eltern-Gerät) ================= */
  function remoteDialog() {
    const saved = (() => { try { return JSON.parse(localStorage.getItem('nova.remote.kids') || '[]'); } catch (e) { return []; } })();
    const idIn = h('input', { class: 'input mono', placeholder: 'XXXX-XXXX', maxlength: 9, autocomplete: 'off' });
    const nameIn = h('input', { class: 'input', placeholder: 'Name (optional, zum Merken)', maxlength: 20 });
    const pinIn = h('input', { class: 'input', type: 'password', inputmode: 'numeric', placeholder: 'Eltern-PIN', maxlength: 8 });
    let action = 0, value = 30;
    const out = h('div', { class: 'code-out' });
    const valWrap = h('div');
    const renderVal = () => {
      valWrap.innerHTML = '';
      const a = Nova.st.ACTIONS[action];
      if (a.value === 'minutes' || a.value === 'limit') {
        const max = a.value === 'minutes' ? 240 : 480;
        const min = a.value === 'minutes' ? 5 : 0;
        if (value > max) value = max;
        if (value < min) value = min;
        const lab = h('b');
        const upd = () => { lab.textContent = a.value === 'limit' && !value ? 'Unbegrenzt' : Nova.fmtDur(value * 60, true); };
        const rng = h('input', { type: 'range', min, max, step: 5, value, class: 'range', oninput: (e) => { value = +e.target.value; upd(); } });
        upd();
        valWrap.append(h('div', { class: 'field' }, h('span', null, a.value === 'minutes' ? 'Zusätzliche Zeit' : 'Neues Tageslimit (0 = unbegrenzt)'), h('div', { class: 'row gap' }, rng, lab)));
      } else if (a.value === 'toggle') {
        valWrap.append(seg([['Einschalten', 1], ['Ausschalten', 0]], value ? 1 : 0, (v) => (value = v)));
        value = value ? 1 : 0;
      }
    };
    const acts = h('div', { class: 'chip-grid' }, Nova.st.ACTIONS.map((a) =>
      h('button', { class: 'chip' + (a.id === action ? ' on' : ''), onclick: (e) => { action = a.id; $$('.chip', acts).forEach((c) => c.classList.remove('on')); e.currentTarget.classList.add('on'); if (a.value === 'toggle') value = 1; else if (a.value) value = a.value === 'limit' ? 120 : 30; renderVal(); out.innerHTML = ''; }, html: icon(a.icon) + a.short })
    ));
    renderVal();
    const kids = h('div', { class: 'row gap wrap' }, saved.map((k) =>
      h('button', { class: 'chip', onclick: () => { idIn.value = fmtId(k.id); nameIn.value = k.name; } }, k.name)
    ));
    ui.dialog({
      title: 'Eltern-Fernsteuerung',
      wide: true,
      body: h('div', { class: 'stack' },
        h('p', { class: 'muted' }, 'Erzeuge hier – auf deinem eigenen Gerät – einen Code für das Gerät deines Kindes. Es wird kein Internet benötigt. Die Konto-ID steht beim Kind unter „Bildschirmzeit".'),
        saved.length ? kids : null,
        h('div', { class: 'grid2' }, h('label', { class: 'field' }, h('span', null, 'Konto-ID des Kindes'), idIn), h('label', { class: 'field' }, h('span', null, 'Eltern-PIN'), pinIn)),
        nameIn,
        h('div', { class: 'field' }, h('span', null, 'Aktion'), acts),
        valWrap,
        out
      ),
      actions: [
        { label: 'Schließen', ghost: true },
        { label: 'Code erzeugen', primary: true, onClick: () => {
          const id = Nova.normCode(idIn.value);
          if (id.length !== 8) { ui.toast('Konto-ID muss 8 Zeichen haben', 'err'); return false; }
          if (!/^\d{4,8}$/.test(pinIn.value)) { ui.toast('Eltern-PIN: 4–8 Ziffern', 'err'); return false; }
          const code = Nova.st.genCode(id, pinIn.value, action, value);
          out.innerHTML = '';
          out.append(
            h('div', { class: 'code-big mono' }, code),
            h('div', { class: 'muted small' }, Nova.st.describe(action, action <= 1 ? Math.round(value / 5) * 5 : value) + ' · gültig heute, einmalig'),
            h('button', { class: 'btn ghost', onclick: async () => ui.toast((await Nova.copyText(code)) ? 'Code kopiert' : 'Kopieren nicht möglich'), html: icon('copy') + ' Kopieren' })
          );
          if (nameIn.value.trim() || !saved.some((k) => k.id === id)) {
            const list = saved.filter((k) => k.id !== id);
            list.unshift({ id, name: nameIn.value.trim() || fmtId(id) });
            localStorage.setItem('nova.remote.kids', JSON.stringify(list.slice(0, 8)));
          }
          return false; // Dialog offen lassen
        } }
      ]
    });
  }

  function seg(opts, val, onChange) {
    const el = h('div', { class: 'seg' }, opts.map(([label, v]) =>
      h('button', { class: v === val ? 'on' : '', onclick: (e) => { $$('button', el).forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); onChange(v); } }, label)
    ));
    return el;
  }

  /* ================= Home ================= */
  let lastHome = null, view = 'start';
  function showHome() {
    const acc = store.current;
    applyTheme(acc);
    root().innerHTML = '';
    const scr = h('div', { class: 'screen home' });
    root().append(scr);
    lastHome = scr;
    view = 'start';
    refreshHome();
    startTicker();
    Nova.native.setKiosk(!!acc.settings.kiosk);
    checkLock();
    ensureGuard(true);
  }

  /* ---- Nova-Schutz (Android) ---- */
  let guardPrompted = false;
  async function ensureGuard(prompt) {
    const acc = store.current;
    if (!acc || !Nova.native.guard.available || acc.settings.guard === false) return;
    const st = await Nova.native.guard.status();
    if (st.usage && st.overlay) { if (!st.running) Nova.native.guard.start(); return; }
    if (prompt && !guardPrompted) { guardPrompted = true; setTimeout(guardSetupDialog, 900); }
  }
  async function guardSetupDialog() {
    const st = await Nova.native.guard.status();
    const step = (n, done, title, text, onClick) => h('div', { class: 'guard-step' + (done ? ' done' : '') },
      h('span', { class: 'guard-n' }, done ? '✓' : n), h('div', { class: 'grow' }, h('b', null, title), h('div', { class: 'muted small' }, text)),
      done ? null : h('button', { class: 'btn sm primary', onclick: onClick }, 'Öffnen'));
    await ui.dialog({
      title: 'Verlassen-Schutz einrichten',
      text: 'Damit Nova (und Spiele) nicht über Home oder Übersicht verlassen werden können, braucht Nova zwei Berechtigungen. Am besten richten das die Eltern ein.',
      body: h('div', { class: 'stack' },
        step(1, st.usage, 'Nutzungszugriff', 'In der Liste „Nova OS" auswählen und erlauben.', () => Nova.native.guard.openUsage()),
        step(2, st.overlay, 'Über anderen Apps einblenden', 'Für „Nova OS" einschalten.', () => Nova.native.guard.openOverlay())),
      actions: [{ label: 'Später', ghost: true, value: false }, { label: 'Fertig', primary: true, value: true }]
    });
    ensureGuard(false);
  }
  async function onGuardReturn(reason) {
    const acc = store.current;
    if (!acc || !reason) return;
    if (reason === 'timeup') { updatePill(); checkLock(); ui.toast('Deine Bildschirmzeit ist abgelaufen'); return; }
    ui.toast(reason === 'closed' ? 'Nova kann nicht einfach geschlossen werden' : 'Zum Verlassen ist ' + (exitNeedsParent(acc) ? 'die Eltern-PIN' : 'dein Passwort') + ' nötig');
    if (!$('.dialog-wrap')) requestExit();
  }

  function refreshHome() {
    const acc = store.current;
    const scr = lastHome;
    if (!acc || !scr || !document.body.contains(scr)) return;
    const prevQ = scr.querySelector('.search-in');
    const qv = prevQ ? prevQ.value : '';
    const scrollTop = scr.scrollTop;
    scr.innerHTML = '';
    const userFolders = acc.folders.filter((f) => !f.del);
    if (view.startsWith('u:') && !userFolders.some((f) => 'u:' + f.id === view)) view = 'start';

    const q = h('input', { class: 'search-in', placeholder: 'Suchen', type: 'search', value: qv });
    const main = h('main', { class: 'home-main' });
    const go = (id) => { view = id; q.value = ''; refreshHome(); scr.scrollTop = 0; };
    const navItem = (id, ic, label, count) => h('button', { class: 'nav-item' + (view === id ? ' on' : ''), onclick: () => go(id) },
      h('span', { class: 'nav-ic', html: icon(ic) }), h('span', { class: 'nav-label-txt' }, label), count != null ? h('span', { class: 'nav-count' }, count) : null);
    const nav = h('nav', { class: 'home-nav' },
      navItem('start', 'home', 'Übersicht'),
      navItem('all', 'grid', 'Alle Apps', APPS.length),
      h('div', { class: 'nav-sep' }),
      FOLDERS.map((f) => navItem(f.id, f.icon, f.name, APPS.filter((a) => a.folder === f.id).length)),
      h('div', { class: 'nav-head' }, 'Meine Ordner'),
      userFolders.map((f) => {
        const b = navItem('u:' + f.id, 'folder', f.name, f.apps.length);
        ui.onContext(b, (x, y) => ui.menu(x, y, [
          { label: 'Umbenennen', icon: 'edit', onClick: () => renameFolder(f.id) },
          { label: 'Ordner löschen', icon: 'trash', danger: true, onClick: () => deleteFolder(f.id) }
        ]));
        return b;
      }),
      h('button', { class: 'nav-item add', onclick: createFolder }, h('span', { class: 'nav-ic', html: icon('plus') }), h('span', { class: 'nav-label-txt' }, 'Neuer Ordner'))
    );

    const grid = (apps, opts) => apps.length ? h('div', { class: 'app-grid' }, apps.map((a) => appTile(a, opts))) : h('div', { class: 'empty sm' }, h('p', null, 'Hier ist noch nichts.'));
    const head = (title, sub, actions) => h('div', { class: 'page-head' }, h('div', null, h('h1', null, title), sub ? h('div', { class: 'muted' }, sub) : null), actions ? h('div', { class: 'row gap wrap' }, actions) : null);

    const renderMain = () => {
      main.innerHTML = '';
      const _append = main.append.bind(main);
      main.append = (...items) => _append(...items.flat(Infinity).filter((x) => x != null && x !== false));
      const term = q.value.trim().toLowerCase();
      if (term) {
        const res = APPS.filter((a) => a.name.toLowerCase().includes(term) || (a.desc || '').toLowerCase().includes(term));
        main.append(head('Suche', res.length + (res.length === 1 ? ' Ergebnis' : ' Ergebnisse') + ' für „' + q.value.trim() + '"'), grid(res));
        return;
      }
      if (view === 'start') {
        const rem = Nova.st.remaining(acc);
        const openTodos = store.items('todos').filter((t) => !t.done).length;
        const xp = (acc.data.scores['xp:mathe'] || 0) + (acc.data.scores['xp:deutsch'] || 0);
        main.append(
          head((Nova.isBirthday(acc) ? 'Alles Gute zum Geburtstag' : Nova.greeting()) + ', ' + acc.name, Nova.fmtDate()),
          h('div', { class: 'stats-row' },
            stat('Bildschirmzeit', rem === Infinity ? 'Unbegrenzt' : Nova.fmtDur(rem, true), 'heute übrig', () => launch('screentime')),
            stat('Aufgaben', String(openTodos), openTodos === 1 ? 'offen' : 'offen', () => launch('todo')),
            stat('Lernen', xp + ' XP', 'Mathe & Deutsch', () => launch('mathe'))),
          (!acc.lastBackup || Date.now() - acc.lastBackup > 7 * 86400000) ? h('div', { class: 'notice' },
            h('span', { class: 'notice-ic', html: icon('key') }),
            h('div', { class: 'grow' }, h('b', null, acc.lastBackup ? 'Zeit für eine neue Sicherung' : 'Konto noch nicht gesichert'), h('div', { class: 'muted small' }, 'Mit dem Konto-Token geht nichts verloren – auch nach dem Löschen der App nicht.')),
            h('button', { class: 'btn sm', onclick: tokenDialog }, 'Sichern')) : null,
          section('Favoriten', grid(acc.dock.map(app).filter(Boolean), { fav: true }), h('span', { class: 'muted xs' }, 'Rechtsklick / lange drücken zum Anpassen')),
          acc.recent.length ? section('Zuletzt verwendet', grid(acc.recent.map(app).filter(Boolean).slice(0, 6))) : null
        );
      } else if (view === 'all') {
        main.append(head('Alle Apps', APPS.length + ' Apps'), FOLDERS.map((f) => section(f.name, grid(APPS.filter((a) => a.folder === f.id)))));
      } else if (view.startsWith('u:')) {
        const f = userFolders.find((x) => 'u:' + x.id === view);
        main.append(
          head(f.name, f.apps.length + (f.apps.length === 1 ? ' App' : ' Apps'), [
            h('button', { class: 'btn sm primary', onclick: () => manageFolderApps(f), html: icon('plus') + ' Apps auswählen' }),
            h('button', { class: 'btn sm', onclick: () => renameFolder(f.id) }, 'Umbenennen'),
            h('button', { class: 'btn sm ghost danger', onclick: () => deleteFolder(f.id) }, 'Löschen')]),
          f.apps.length ? grid(f.apps.map(app).filter(Boolean), { folder: { ...f, user: true } }) :
            h('div', { class: 'empty' }, h('p', null, 'Dieser Ordner ist leer.'), h('button', { class: 'btn primary', onclick: () => manageFolderApps(f) }, 'Apps auswählen')));
      } else {
        const f = FOLDERS.find((x) => x.id === view);
        const apps = APPS.filter((a) => a.folder === view);
        main.append(head(f.name, apps.length + ' Apps'), grid(apps));
      }
    };
    q.addEventListener('input', renderMain);

    const stPill = h('button', { class: 'pill', id: 'st-pill', onclick: () => launch('screentime') });
    const clock = h('div', { class: 'top-clock', id: 'top-clock' }, Nova.fmtTime());
    scr.append(
      h('header', { class: 'topbar' },
        h('div', { class: 'brand sm' }, h('div', { class: 'brand-mark' }), h('span', null, 'Nova')),
        h('div', { class: 'top-right' },
          stPill, clock,
          h('button', { class: 'avatar-btn', title: acc.name, onclick: (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            ui.menu(r.right - 220, r.bottom + 8, [
              { label: 'Einstellungen', icon: 'settings', onClick: () => launch('settings') },
              { label: 'Bildschirmzeit', icon: 'hourglass', onClick: () => launch('screentime') },
              { label: 'Konto-Token sichern', icon: 'key', onClick: tokenDialog },
              { label: 'Token importieren / Sync', icon: 'sync', onClick: () => importDialog() },
              '-',
              { label: 'Abmelden', icon: 'logout', onClick: logout },
              { label: 'Nova verlassen', icon: 'x', onClick: requestExit }
            ]);
          } }, avatar(acc, 'sm'))
        )
      ),
      h('div', { class: 'home-layout' },
        h('aside', { class: 'home-side' }, h('div', { class: 'search', html: icon('search') }, q), nav),
        main)
    );
    renderMain();
    updatePill();
    scr.scrollTop = scrollTop;
  }

  function stat(label, value, sub, onClick) {
    return h('button', { class: 'stat', onclick: onClick }, h('span', { class: 'stat-label' }, label), h('b', { class: 'stat-value' }, value), h('span', { class: 'muted xs' }, sub));
  }
  function section(title, content, extra) {
    return h('section', { class: 'sec' }, h('div', { class: 'sec-head' }, h('h2', { class: 'sec-title' }, title), extra || null), content);
  }

  function appTile(a, opts = {}) {
    const t = h('button', { class: 'tile', onclick: () => launch(a.id), title: a.desc || a.name },
      appIcon(a), h('span', { class: 'tile-txt' }, h('span', { class: 'tile-name' }, a.name), a.desc ? h('span', { class: 'tile-desc' }, a.desc) : null));
    ui.onContext(t, (x, y) => tileMenu(a, x, y, opts.folder));
    return t;
  }

  function tileMenu(a, x, y, folder) {
    const acc = store.current;
    const fav = acc.dock.includes(a.id);
    ui.menu(x, y, [
      { label: 'Öffnen', icon: 'play', onClick: () => launch(a.id) },
      { label: fav ? 'Aus Favoriten entfernen' : 'Zu Favoriten', icon: 'star', onClick: () => {
        if (fav) acc.dock = acc.dock.filter((x) => x !== a.id);
        else { if (acc.dock.length >= 9) return ui.toast('Maximal 9 Favoriten', 'err'); acc.dock.push(a.id); }
        store.save(); refreshHome();
      } },
      { label: 'Zu Ordner hinzufügen…', icon: 'folder', onClick: () => addToFolderDialog(a) },
      folder && folder.user ? { label: 'Aus Ordner entfernen', icon: 'x', onClick: () => {
        const f = acc.folders.find((x) => x.id === folder.id);
        f.apps = f.apps.filter((x) => x !== a.id); f.u = Date.now(); store.save(); refreshHome();
      } } : null
    ]);
  }

  async function createFolder() {
    const name = await ui.prompt('Neuer Ordner', { placeholder: 'z. B. Schule, Lieblinge…', label: 'Erstellen' });
    if (!name) return null;
    const acc = store.current;
    const f = { id: Nova.uid(), name: name.slice(0, 24), apps: [], c: acc.folders.length, u: Date.now() };
    acc.folders.push(f);
    store.save();
    view = 'u:' + f.id;
    refreshHome();
    ui.toast('Ordner „' + f.name + '" erstellt');
    return f;
  }
  async function renameFolder(id) {
    const f = store.current.folders.find((x) => x.id === id);
    const name = await ui.prompt('Ordner umbenennen', { value: f.name });
    if (!name) return;
    f.name = name.slice(0, 24); f.u = Date.now(); store.save(); refreshHome();
  }
  async function deleteFolder(id) {
    const f = store.current.folders.find((x) => x.id === id);
    if (!(await ui.confirm('Ordner löschen?', '„' + f.name + '" wird gelöscht. Die Apps bleiben erhalten.', { label: 'Löschen', danger: true }))) return;
    Object.assign(f, { del: true, apps: [], u: Date.now() }); store.save(); view = 'start'; refreshHome();
  }

  async function addToFolderDialog(a) {
    const acc = store.current;
    const folders = acc.folders.filter((f) => !f.del);
    const pick = await ui.dialog({
      title: '„' + a.name + '" hinzufügen zu…',
      body: (close) => h('div', { class: 'list' },
        folders.length ? null : h('p', { class: 'muted' }, 'Du hast noch keine eigenen Ordner.'),
        folders.map((f) => h('button', { class: 'list-item', onclick: () => close(f.id) },
          h('span', { class: 'li-ic', html: icon('folder') }), h('span', { class: 'grow' }, f.name),
          f.apps.includes(a.id) ? h('span', { class: 'muted small' }, 'schon drin') : null))
      ),
      actions: [
        { label: 'Abbrechen', ghost: true, value: null },
        { label: 'Neuer Ordner', primary: true, value: 'new' }
      ]
    });
    if (!pick) return;
    const f = pick === 'new' ? await createFolder() : acc.folders.find((x) => x.id === pick);
    if (!f) return;
    if (!f.apps.includes(a.id)) f.apps.push(a.id);
    f.u = Date.now(); store.save(); refreshHome();
    ui.toast(a.name + ' → ' + f.name);
  }

  async function manageFolderApps(folder) {
    const acc = store.current;
    const f = acc.folders.find((x) => x.id === folder.id);
    const sel = new Set(f.apps);
    const list = h('div', { class: 'pick-grid' }, APPS.map((a) =>
      h('button', { class: 'pick' + (sel.has(a.id) ? ' on' : ''), onclick: (e) => { sel.has(a.id) ? sel.delete(a.id) : sel.add(a.id); e.currentTarget.classList.toggle('on'); } }, appIcon(a, 'sm'), h('span', null, a.name), h('i', { html: icon('check') }))
    ));
    const ok = await ui.dialog({ title: 'Apps in „' + f.name + '"', wide: true, body: list, actions: [{ label: 'Abbrechen', ghost: true, value: false }, { label: 'Übernehmen', primary: true, value: true }] });
    if (!ok) return;
    f.apps = APPS.map((a) => a.id).filter((id) => sel.has(id));
    f.u = Date.now(); store.save(); refreshHome();
  }

  /* ================= Ordner-Ansicht (Sheet) ================= */
  let sheetEl = null;
  function openSheet(f, content) {
    closeSheet();
    const sheet = h('div', { class: 'sheet glass' },
      h('div', { class: 'sheet-head' },
        h('div', { class: 'app-ic sm', style: { background: `linear-gradient(145deg, ${f.grad[0]}, ${f.grad[1]})` }, html: icon(f.icon) }),
        h('h2', null, f.name),
        h('button', { class: 'icon-btn', onclick: closeSheet, html: icon('x') })
      ),
      h('div', { class: 'sheet-body' }, content())
    );
    sheetEl = h('div', { class: 'sheet-wrap', onclick: (e) => { if (e.target === sheetEl) closeSheet(); } }, sheet);
    document.body.append(sheetEl);
    requestAnimationFrame(() => sheetEl && sheetEl.classList.add('show'));
  }
  function closeSheet() {
    if (!sheetEl) return;
    const s = sheetEl; sheetEl = null;
    s.classList.remove('show'); setTimeout(() => s.remove(), 220);
  }

  /* ================= App-Fenster ================= */
  function launch(id) {
    const a = app(id);
    if (!a || !store.current) return;
    if (Nova.st.blockReason(store.current) && !a.alwaysAllowed) return checkLock();
    closeSheet();
    closeWin(true);
    const acc = store.current;
    acc.recent = [id, ...acc.recent.filter((x) => x !== id)].slice(0, 10);
    store.save();

    const actions = h('div', { class: 'win-actions' });
    const body = h('div', { class: 'win-body' + (a.full ? ' full' : '') });
    const cleanups = [];
    const win = h('div', { class: 'win' },
      h('div', { class: 'win-head' },
        h('button', { class: 'icon-btn', onclick: () => closeWin(), html: icon('back'), title: 'Zurück' }),
        appIcon(a, 'xs'),
        h('h2', null, a.name),
        h('div', { class: 'grow' }),
        actions
      ),
      body
    );
    const wrap = h('div', { class: 'win-wrap' }, win);
    document.body.append(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    const ctx = {
      acc, store, body, win,
      setActions: (...nodes) => { actions.innerHTML = ''; actions.append(...nodes.flat()); },
      onClose: (fn) => cleanups.push(fn),
      close: () => closeWin(),
      refreshHome,
      launch
    };
    currentWin = { id, wrap, cleanups };
    try {
      const c = a.mount(body, ctx);
      if (typeof c === 'function') cleanups.push(c);
    } catch (e) {
      console.error(e);
      body.append(h('div', { class: 'empty' }, h('p', null, 'Die App konnte nicht gestartet werden: ' + e.message)));
    }
  }
  function closeWin(instant) {
    if (!currentWin) return;
    const w = currentWin; currentWin = null;
    w.cleanups.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    store.save();
    if (instant) w.wrap.remove();
    else { w.wrap.classList.remove('show'); setTimeout(() => w.wrap.remove(), 220); }
    refreshHome();
  }
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || $('.dialog-wrap') || $('.ctx-menu')) return;
    if (currentWin && !currentWin.wrap.querySelector('.game-running')) closeWin();
    else if (sheetEl) closeSheet();
  });

  /* ================= Bildschirmzeit: Ticker & Sperre ================= */
  function startTicker() {
    stopTicker();
    tickCount = 0; warned = {};
    ticker = setInterval(() => {
      const acc = store.current;
      if (!acc) return;
      const clk = $('#top-clock');
      if (clk) clk.textContent = Nova.fmtTime();
      if (document.hidden || lockEl) return;
      Nova.st.tick(acc);
      if (++tickCount % 15 === 0) store.save(true);
      updatePill();
      const rem = Nova.st.remaining(acc);
      if (rem <= 300 && rem > 60 && !warned.five) { warned.five = true; ui.toast('Noch 5 Minuten Bildschirmzeit'); }
      if (rem <= 60 && rem > 0 && !warned.one) { warned.one = true; ui.toast('Noch 1 Minute – speichere deine Sachen!'); }
      if (rem > 300) warned = {};
      checkLock();
    }, 1000);
  }
  function stopTicker() { clearInterval(ticker); ticker = null; }

  function updatePill() {
    const p = $('#st-pill');
    const acc = store.current;
    if (!p || !acc) return;
    const rem = Nova.st.remaining(acc);
    const all = Nova.st.allowance(acc);
    const pct = all === Infinity ? 1 : Math.max(0, rem / all);
    p.className = 'pill' + (rem !== Infinity && rem < 600 ? ' warn' : '');
    p.innerHTML = `<svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="ring-bg"/><circle cx="18" cy="18" r="15" class="ring-fg" stroke-dasharray="${(pct * 94.25).toFixed(1)} 94.25"/></svg>` +
      '<span>' + (rem === Infinity ? 'Unbegrenzt' : Nova.fmtDur(rem, true) + ' übrig') + '</span>';
  }

  function checkLock() {
    const acc = store.current;
    if (!acc) return;
    const reason = Nova.st.blockReason(acc);
    if (reason && !lockEl) showLock(reason);
    else if (!reason && lockEl) hideLock();
  }

  function showLock(reason) {
    if (currentWin && !app(currentWin.id).alwaysAllowed) closeWin(true);
    closeSheet();
    store.save(true);
    const acc = store.current;
    const T = {
      time: ['Bildschirmzeit aufgebraucht', 'Deine Zeit für heute ist vorbei. Mach eine Pause – oder frag deine Eltern nach einem Code.', 'hourglass'],
      bedtime: ['Nachtruhe', 'Jetzt ist Schlafenszeit (' + acc.st.bedtime.from + ' – ' + acc.st.bedtime.to + ' Uhr). Gute Nacht!', 'moon'],
      locked: ['Gesperrt', 'Deine Eltern haben das Gerät für heute gesperrt.', 'lock']
    }[reason];
    const codeIn = h('input', { class: 'input code-in mono', placeholder: 'XXX-XXX-XXX', maxlength: 11, autocomplete: 'off' });
    const redeem = () => {
      const r = Nova.st.redeem(acc, codeIn.value);
      if (r.ok) { ui.toast('✓ ' + r.msg); hideLock(); refreshHome(); checkLock(); }
      else ui.toast(r.msg, 'err');
    };
    codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') redeem(); });
    lockEl = h('div', { class: 'lock-wrap' },
      h('div', { class: 'lock glass' },
        h('div', { class: 'lock-ic', html: icon(T[2]) }),
        h('h2', null, T[0]),
        h('p', { class: 'muted' }, T[1]),
        h('div', { class: 'kv center' }, h('span', { class: 'muted' }, 'Heute genutzt'), h('b', null, Nova.fmtDur(Nova.st.used(acc), true))),
        h('div', { class: 'row gap' }, codeIn, h('button', { class: 'btn primary', onclick: redeem }, 'Einlösen')),
        h('div', { class: 'muted small' }, 'Konto-ID für deine Eltern: ', h('b', { class: 'mono' }, fmtId(acc.id))),
        h('div', { class: 'row gap center' },
          h('button', { class: 'btn ghost', onclick: () => parentQuick(acc), html: icon('shield') + ' Eltern-PIN' }),
          h('button', { class: 'btn ghost', onclick: logout, html: icon('logout') + ' Abmelden' })
        )
      )
    );
    document.body.append(lockEl);
    requestAnimationFrame(() => lockEl && lockEl.classList.add('show'));
  }
  function hideLock() { if (lockEl) { lockEl.remove(); lockEl = null; } }

  async function parentQuick(acc) {
    if (!Nova.st.hasParent(acc)) return ui.toast('Keine Eltern-PIN eingerichtet', 'err');
    const pin = await askPin('Eltern-PIN', 'Bitte gib die Eltern-PIN ein.');
    if (pin == null) return;
    if (!Nova.st.checkParent(acc, pin)) return ui.toast('Eltern-PIN falsch', 'err');
    const v = await ui.dialog({
      title: 'Zeit freigeben',
      actions: [
        { label: '+15 min', value: 15 }, { label: '+30 min', value: 30 }, { label: '+60 min', value: 60 },
        { label: 'Heute unbegrenzt', primary: true, value: -1 }
      ]
    });
    if (v == null) return;
    if (v === -1) Nova.st.apply(acc, 3); else Nova.st.apply(acc, 0, v);
    ui.toast('Freigegeben');
    hideLock(); refreshHome(); checkLock();
  }

  /* ---- Android-Zurück-Taste, externe Spiele, Fortsetzen ---- */
  function handleBack() {
    if ($('.dialog-wrap') || $('.ctx-menu') || (currentWin && !lockEl) || sheetEl) {
      if ($('.ctx-menu')) { $$('.ctx-menu').forEach((m) => m.remove()); return; }
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      return;
    }
    requestExit();
  }
  let externalAt = 0;
  function markExternal() { externalAt = Date.now(); store.save(true); }
  function onResume() {
    const acc = store.current;
    if (acc && externalAt) {
      const sec = Math.min(6 * 3600, Math.round((Date.now() - externalAt) / 1000));
      const d = Nova.dayKey();
      acc.st.usage[d] = (acc.st.usage[d] || 0) + sec;
      externalAt = 0;
      store.save(true);
      if (sec > 30) ui.toast('Spielzeit ' + Nova.fmtDur(sec, true) + ' zur Bildschirmzeit gezählt');
    }
    if (acc && acc.settings.kiosk) Nova.native.restoreKiosk();
    if (acc && Nova.native.isAndroid) { Nova.native.guard.setGame(null, 0); ensureGuard(false); }
    updatePill(); checkLock();
  }

  Nova.shell = { handleBack, markExternal, onResume, onGuardReturn, ensureGuard, guardSetupDialog, exitNeedsParent, askExitAuth, logout, requestExit, askSecret, askPassword, showLogin, showHome, refreshHome, launch, closeWin, tokenDialog, importDialog, remoteDialog, applyTheme, askPin, avatar, appIcon, seg, fmtId, checkLock, hideLock, updatePill, APPS, FOLDERS, WALLPAPERS, ACCENTS };
})();
