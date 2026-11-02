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
  const USER_GRADS = [['#7c5cff', '#4f8cff'], ['#00c2a8', '#2ecc71'], ['#ff6b3d', '#ffb800'], ['#ec4899', '#a855f7'], ['#0ea5e9', '#6366f1']];
  Nova.registerApp = (def) => APPS.push(def);
  const app = (id) => APPS.find((a) => a.id === id);

  const WALLPAPERS = {
    aurora: 'Aurora', ocean: 'Ozean', sunset: 'Sonnenuntergang', forest: 'Wald', graphite: 'Graphit', mono: 'Schlicht'
  };
  const ACCENTS = ['#7c5cff', '#4f8cff', '#00c2a8', '#2ecc71', '#ffb800', '#ff6b3d', '#ff5c8a', '#a855f7'];

  const root = () => $('#app');
  let ticker = null, lockEl = null, currentWin = null, tickCount = 0, warned = {};

  /* ================= Theme ================= */
  function applyTheme(acc) {
    const s = acc ? acc.settings : { theme: 'dark', accent: '#7c5cff', wallpaper: 'aurora' };
    let theme = s.theme;
    if (theme === 'auto') theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--accent', s.accent);
    document.body.dataset.wp = s.wallpaper;
    const meta = $('meta[name=theme-color]');
    if (meta) meta.content = theme === 'light' ? '#f4f5f9' : '#0b0d12';
  }

  function avatar(acc, size = 'md') {
    const g = store.COLORS[acc.color % store.COLORS.length];
    return h('div', { class: 'avatar ' + size, style: { background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` } }, (acc.name || '?').trim().charAt(0).toUpperCase());
  }
  function appIcon(a, size = '') {
    return h('div', { class: 'app-ic ' + size, style: { background: `linear-gradient(145deg, ${a.grad[0]}, ${a.grad[1]})` }, html: icon(a.icon) });
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

  async function logout() {
    const acc = store.current;
    if (acc && !(await askSecret(acc, 'Abmelden', 'Gib ' + (acc.auth === 'password' ? 'dein Passwort' : 'deine PIN') + ' ein, um dich abzumelden.'))) return;
    Nova.native.setKiosk(false, true);
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
      if (await askSecret(acc, 'Nova verlassen?', 'Zum Verlassen der App brauchst du ' + (acc.auth === 'password' ? 'dein Passwort' : 'deine PIN') + '.')) { allowUnload = true; Nova.native.exit(); }
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
  let lastHome = null;
  function showHome() {
    const acc = store.current;
    applyTheme(acc);
    root().innerHTML = '';
    const scr = h('div', { class: 'screen home' });
    root().append(scr);
    lastHome = scr;
    refreshHome();
    startTicker();
    Nova.native.setKiosk(!!acc.settings.kiosk);
    checkLock();
  }

  function refreshHome() {
    const acc = store.current;
    const scr = lastHome;
    if (!acc || !scr || !document.body.contains(scr)) return;
    scr.innerHTML = '';
    const q = h('input', { class: 'search-in', placeholder: 'Apps suchen…', type: 'search' });
    const body = h('div', { class: 'home-body' });
    const renderBody = () => {
      body.innerHTML = '';
      const term = q.value.trim().toLowerCase();
      if (term) {
        const res = APPS.filter((a) => a.name.toLowerCase().includes(term) || (a.desc || '').toLowerCase().includes(term));
        body.append(section('Suchergebnisse', res.length ? h('div', { class: 'app-grid' }, res.map((a) => appTile(a))) : h('p', { class: 'muted' }, 'Keine App gefunden.')));
        return;
      }
      if (!acc.lastBackup || Date.now() - acc.lastBackup > 7 * 86400000) {
        body.append(h('div', { class: 'banner glass' },
          h('div', { class: 'banner-ic', html: icon('key') }),
          h('div', { class: 'grow' }, h('b', null, acc.lastBackup ? 'Zeit für eine neue Sicherung' : 'Sichere dein Konto'), h('div', { class: 'muted small' }, 'Mit deinem Konto-Token geht nichts verloren – auch nicht nach dem Löschen der App.')),
          h('button', { class: 'btn primary sm', onclick: tokenDialog }, 'Sichern')
        ));
      }
      const userFolders = acc.folders.filter((f) => !f.del);
      body.append(section('Ordner', h('div', { class: 'folder-grid' },
        FOLDERS.map((f) => folderCard(f, APPS.filter((a) => a.folder === f.id))),
        userFolders.map((f, i) => folderCard({ ...f, icon: 'folder', grad: USER_GRADS[(f.c || i) % USER_GRADS.length], user: true }, f.apps.map(app).filter(Boolean))),
        h('button', { class: 'folder-card add', onclick: createFolder }, h('div', { class: 'add-ic', html: icon('plus') }), h('span', null, 'Neuer Ordner'))
      )));
      const recent = acc.recent.map(app).filter(Boolean).slice(0, 8);
      if (recent.length) body.append(section('Zuletzt verwendet', h('div', { class: 'app-row' }, recent.map((a) => appTile(a)))));
    };
    q.addEventListener('input', renderBody);

    const stPill = h('button', { class: 'pill', id: 'st-pill', onclick: () => launch('screentime') });
    const clock = h('div', { class: 'top-clock', id: 'top-clock' }, Nova.fmtTime());
    scr.append(
      h('header', { class: 'topbar' },
        h('div', { class: 'top-left' },
          h('div', { class: 'brand sm' }, h('div', { class: 'brand-mark' }), h('span', null, 'Nova')),
        ),
        h('div', { class: 'top-right' },
          stPill, clock,
          h('button', { class: 'avatar-btn', onclick: (e) => {
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
      h('div', { class: 'home-inner' },
        h('div', { class: 'hello' },
          h('h1', null, (Nova.isBirthday(acc) ? 'Alles Gute zum Geburtstag' : Nova.greeting()) + ', ' + acc.name + (Nova.isBirthday(acc) ? ' 🎂' : '')),
          h('div', { class: 'muted' }, Nova.fmtDate())
        ),
        h('div', { class: 'search', html: icon('search') }, q),
        body
      ),
      dock()
    );
    renderBody();
    updatePill();
  }

  function section(title, content) {
    return h('section', { class: 'sec' }, h('h2', { class: 'sec-title' }, title), content);
  }

  function dock() {
    const acc = store.current;
    const items = acc.dock.map(app).filter(Boolean);
    return h('nav', { class: 'dock glass' },
      items.map((a) => appTile(a, { dock: true })),
      items.length ? h('div', { class: 'dock-sep' }) : null,
      h('button', { class: 'tile dock-tile', title: 'Alle Apps', onclick: allApps }, h('div', { class: 'app-ic ghost', html: icon('grid') }), h('span', null, 'Alle'))
    );
  }

  function allApps() {
    openSheet({ name: 'Alle Apps', icon: 'grid', grad: ['#7c5cff', '#4f8cff'] }, () =>
      FOLDERS.map((f) => h('div', null, h('h3', { class: 'sheet-sub' }, f.name), h('div', { class: 'app-grid' }, APPS.filter((a) => a.folder === f.id).map((a) => appTile(a)))))
    );
  }

  function folderCard(f, apps) {
    const card = h('button', { class: 'folder-card glass', onclick: () => openFolder(f) },
      h('div', { class: 'folder-prev' }, apps.slice(0, 4).map((a) => appIcon(a, 'mini')), apps.length === 0 ? h('div', { class: 'folder-empty', html: icon(f.icon) }) : null),
      h('div', { class: 'folder-meta' },
        h('span', { class: 'folder-name' }, f.name),
        h('span', { class: 'muted small' }, apps.length + (apps.length === 1 ? ' App' : ' Apps'))
      )
    );
    if (f.user) ui.onContext(card, (x, y) => ui.menu(x, y, [
      { label: 'Umbenennen', icon: 'edit', onClick: () => renameFolder(f.id) },
      { label: 'Ordner löschen', icon: 'trash', danger: true, onClick: () => deleteFolder(f.id) }
    ]));
    return card;
  }

  function appTile(a, opts = {}) {
    const t = h('button', { class: 'tile' + (opts.dock ? ' dock-tile' : ''), onclick: () => launch(a.id), title: a.desc || a.name },
      appIcon(a), h('span', null, a.name));
    ui.onContext(t, (x, y) => tileMenu(a, x, y, opts.folder));
    return t;
  }

  function tileMenu(a, x, y, folder) {
    const acc = store.current;
    const inDock = acc.dock.includes(a.id);
    ui.menu(x, y, [
      { label: 'Öffnen', icon: 'play', onClick: () => launch(a.id) },
      { label: inDock ? 'Aus dem Dock entfernen' : 'Zum Dock hinzufügen', icon: 'pin', onClick: () => {
        if (inDock) acc.dock = acc.dock.filter((x) => x !== a.id);
        else { if (acc.dock.length >= 6) return ui.toast('Das Dock ist voll (max. 6)', 'err'); acc.dock.push(a.id); }
        store.save(); refreshHome();
      } },
      { label: 'Zu Ordner hinzufügen…', icon: 'folder', onClick: () => addToFolderDialog(a) },
      folder && folder.user ? { label: 'Aus Ordner entfernen', icon: 'x', onClick: () => {
        const f = acc.folders.find((x) => x.id === folder.id);
        f.apps = f.apps.filter((x) => x !== a.id); f.u = Date.now(); store.save(); refreshHome(); openFolder(folder);
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
    refreshHome();
    ui.toast('Ordner „' + f.name + '" erstellt');
    return f;
  }
  async function renameFolder(id) {
    const f = store.current.folders.find((x) => x.id === id);
    const name = await ui.prompt('Ordner umbenennen', { value: f.name });
    if (!name) return;
    f.name = name.slice(0, 24); f.u = Date.now(); store.save(); refreshHome(); closeSheet();
  }
  async function deleteFolder(id) {
    const f = store.current.folders.find((x) => x.id === id);
    if (!(await ui.confirm('Ordner löschen?', '„' + f.name + '" wird gelöscht. Die Apps bleiben erhalten.', { label: 'Löschen', danger: true }))) return;
    Object.assign(f, { del: true, apps: [], u: Date.now() }); store.save(); refreshHome(); closeSheet();
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
    let f = pick === 'new' ? await createFolder() : acc.folders.find((x) => x.id === pick);
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
    f.u = Date.now(); store.save(); refreshHome(); openFolder({ ...folder, apps: f.apps });
  }

  /* ================= Ordner-Ansicht (Sheet) ================= */
  let sheetEl = null;
  function openFolder(f) {
    const apps = f.user ? (store.current.folders.find((x) => x.id === f.id) || f).apps.map(app).filter(Boolean) : APPS.filter((a) => a.folder === f.id);
    openSheet(f, () => [
      apps.length ? h('div', { class: 'app-grid' }, apps.map((a) => appTile(a, { folder: f }))) :
        h('div', { class: 'empty' }, h('div', { html: icon('folder') }), h('p', null, 'Dieser Ordner ist noch leer.')),
      f.user ? h('div', { class: 'row gap sheet-foot' },
        h('button', { class: 'btn primary', onclick: () => manageFolderApps(f), html: icon('plus') + ' Apps auswählen' }),
        h('button', { class: 'btn', onclick: () => renameFolder(f.id), html: icon('edit') + ' Umbenennen' }),
        h('button', { class: 'btn danger ghost', onclick: () => deleteFolder(f.id), html: icon('trash') + ' Löschen' })
      ) : null
    ]);
  }
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
    updatePill(); checkLock();
  }

  Nova.shell = { handleBack, markExternal, onResume, logout, requestExit, askSecret, askPassword, showLogin, showHome, refreshHome, launch, closeWin, tokenDialog, importDialog, remoteDialog, applyTheme, askPin, avatar, appIcon, seg, fmtId, checkLock, hideLock, updatePill, APPS, FOLDERS, WALLPAPERS, ACCENTS };
})();
