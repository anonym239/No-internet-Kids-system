/* Nova OS – System: Einstellungen & Bildschirmzeit */
(function () {
  'use strict';
  const Nova = window.Nova;
  const { h, $$, ui, icon, store } = Nova;
  const shell = () => Nova.shell;

  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });

  function row(label, sub, control) {
    return h('div', { class: 'set-row' }, h('div', { class: 'grow' }, h('div', null, label), sub ? h('div', { class: 'muted small' }, sub) : null), control);
  }
  function group(title, ...rows) { return h('section', { class: 'set-group' }, h('h3', null, title), h('div', { class: 'card set-card' }, rows)); }

  /* ======================= EINSTELLUNGEN ======================= */
  Nova.registerApp({
    id: 'settings', name: 'Einstellungen', icon: 'settings', folder: 'system', grad: ['#64748b', '#334155'], desc: 'Profil, Aussehen, Konto-Token & Sync',
    mount(body, ctx) {
      const acc = ctx.acc;
      const wrap = h('div', { class: 'settings' });
      body.append(wrap);
      const saveSettings = () => { acc.settings.u = Date.now(); store.save(true); shell().applyTheme(acc); };
      const render = () => {
        wrap.innerHTML = '';
        const wp = h('div', { class: 'wp-grid' }, Object.entries(shell().WALLPAPERS).map(([k, name]) =>
          h('button', { class: 'wp' + (acc.settings.wallpaper === k ? ' on' : ''), 'data-wp': k, onclick: () => { acc.settings.wallpaper = k; saveSettings(); render(); } }, h('span', null, name))));
        const accents = h('div', { class: 'swatches' }, shell().ACCENTS.map((c) =>
          h('button', { class: 'swatch' + (acc.settings.accent === c || (c === 'auto' && !acc.settings.accent) ? ' on' : '') + (c === 'auto' ? ' auto' : ''), title: c === 'auto' ? 'Neutral' : c, style: { background: c === 'auto' ? '' : c }, onclick: () => { acc.settings.accent = c; saveSettings(); render(); } })));
        const used = (() => { let n = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || '').length; } } catch (e) {} return n * 2; })();
        wrap.append(
          h('div', { class: 'profile-head card' },
            shell().avatar(acc, 'xl'),
            h('div', { class: 'grow' }, h('h2', null, (acc.name + ' ' + (acc.profile.lastName || '')).trim()), h('div', { class: 'muted small' }, acc.profile.age + ' Jahre' + (acc.profile.grade ? ' · Klasse ' + acc.profile.grade : '') + (acc.profile.state ? ' · ' + acc.profile.state : '')), h('div', { class: 'muted small' }, 'Konto-ID ', h('b', { class: 'mono' }, shell().fmtId(acc.id))), h('div', { class: 'muted xs' }, 'Erstellt am ' + new Date(acc.created).toLocaleDateString('de-DE'))),
            h('button', { class: 'btn sm', onclick: async () => { const n = await ui.prompt('Name ändern', { value: acc.name }); if (n && n.length >= 2) { acc.name = n.slice(0, 20); store.save(true); render(); } } }, 'Name ändern')
          ),
          group('Profil & Lernen',
            row('Alter', 'Bestimmt, wie Nova dir Dinge erklärt', h('div', { class: 'row gap' },
              h('button', { class: 'icon-btn sm', onclick: () => setAge(acc.profile.age - 1), html: '−' }),
              h('b', { class: 'mono age-small' }, acc.profile.age),
              h('button', { class: 'icon-btn sm', onclick: () => setAge(acc.profile.age + 1), html: '+' }))),
            row('Klassenstufe', acc.profile.schoolType || null, (() => { const sel = h('select', { class: 'input sel-sm', onchange: (e) => { acc.profile.grade = e.target.value ? +e.target.value : null; acc.profile.status = e.target.value ? 'school' : acc.profile.status; store.save(true); render(); } },
              h('option', { value: '' }, 'Keine / automatisch'), Array.from({ length: 13 }, (_, i) => h('option', { value: i + 1, selected: acc.profile.grade === i + 1 }, 'Klasse ' + (i + 1)))); return sel; })()),
            row('Erklär-Stil', 'Automatisch: ' + Nova.LEVELS[Nova.persona(Object.assign({}, acc, { settings: Object.assign({}, acc.settings, { simple: null }) })).level].name, shell().seg([['Auto', 0], ['1', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5]], acc.settings.simple || 0, (v) => { acc.settings.simple = v || null; saveSettings(); render(); }))
          ),
          group('Internet & Schutz',
            row('Internet-Modus', acc.internet === 'store' ? 'Echte Spiele dürfen einmalig aus dem Play Store installiert werden' : 'Nova nutzt nie das Internet', shell().seg([['Internetfrei', 'offline'], ['Einmalige Installation', 'store']], acc.internet, async (v) => { await Nova.setInternetMode(acc, v); render(); })),
            row(Nova.native.isAndroid ? 'App fixieren (Kiosk)' : 'Vollbild-Kiosk', Nova.native.isAndroid ? 'Andere Apps & Home-Taste sind gesperrt, bis man Nova mit Passwort verlässt' : Nova.native.isElectron ? 'Nova läuft im Vollbild ohne Fensterleiste' : 'Nur in der installierten PC-/Android-App', h('input', { type: 'checkbox', class: 'switch', checked: !!acc.settings.kiosk, disabled: Nova.native.platform === 'web', onchange: async (e) => {
              const want = e.target.checked; e.target.checked = !want;
              const ok = Nova.st.hasParent(acc) ? await (async () => { const p = await shell().askPin('Eltern-PIN', 'Kiosk-Modus ändern'); return p != null && Nova.st.checkParent(acc, p); })() : await shell().askSecret(acc, 'Bestätigen', 'Kiosk-Modus ändern');
              if (!ok) return;
              acc.settings.kiosk = want; saveSettings(); Nova.native.setKiosk(want); render();
            } })),
            Nova.native.isAndroid ? row('Nova als Startbildschirm', 'Beim Drücken der Home-Taste öffnet sich Nova', h('button', { class: 'btn sm', onclick: () => Nova.native.openHomeSettings() }, 'Einstellen')) : null,
            Nova.st.hasParent(acc)
              ? row('Zum Verlassen & Abmelden nötig', 'Gilt auch, wenn ein Spiel über Home/Übersicht verlassen wird', shell().seg([['Eltern-PIN', 'parent'], ['Eigenes ' + (acc.auth === 'password' ? 'Passwort' : 'PIN'), 'account']], acc.settings.exitAuth || 'parent', async (v) => {
                  const p = await shell().askPin('Eltern-PIN', 'Diese Einstellung dürfen nur Eltern ändern.');
                  if (p != null && Nova.st.checkParent(acc, p)) { acc.settings.exitAuth = v; saveSettings(); } else if (p != null) ui.toast('Eltern-PIN falsch', 'err');
                  render();
                }))
              : row('Verlassen-Schutz', 'Abmelden und Beenden nur mit ' + (acc.auth === 'password' ? 'deinem Passwort' : 'deiner PIN') + '. Tipp: Mit Eltern-PIN (Bildschirmzeit) lässt sich das noch strenger einstellen.', h('span', { class: 'tag ok' }, 'aktiv')),
            Nova.native.isAndroid ? guardRow() : null
          ),
          group('Aussehen',
            row('Design', null, shell().seg([['Dunkel', 'dark'], ['Hell', 'light'], ['System', 'auto']], acc.settings.theme, (v) => { acc.settings.theme = v; saveSettings(); })),
            row('Effekte', 'Glas & Unschärfe, Schatten, Animationen und farbige Hintergründe', h('input', { type: 'checkbox', class: 'switch', checked: !!acc.settings.fx, onchange: (e) => { acc.settings.fx = e.target.checked; if (acc.settings.fx && (!acc.settings.wallpaper || acc.settings.wallpaper === 'mono')) acc.settings.wallpaper = 'aurora'; saveSettings(); render(); } })),
            row('Schwarz-Weiß', 'Alles in Graustufen – ohne Farben', h('input', { type: 'checkbox', class: 'switch', checked: !!acc.settings.bw, onchange: (e) => { acc.settings.bw = e.target.checked; saveSettings(); render(); } })),
            acc.settings.bw ? null : row('App-Symbole', null, shell().seg([['Schlicht', 'mono'], ['Dezent farbig', 'tint'], ['Bunt', 'color']], acc.settings.icons || 'tint', (v) => { acc.settings.icons = v; saveSettings(); })),
            acc.settings.bw ? null : row('Akzentfarbe', null, accents),
            acc.settings.bw ? null : h('div', { class: 'set-row col' }, h('div', null, 'Hintergrund'), wp),
            row('Profilfarbe', null, h('div', { class: 'swatches' }, store.COLORS.map((gr, i) => h('button', { class: 'swatch' + (acc.color === i ? ' on' : ''), style: { background: `linear-gradient(135deg, ${gr[0]}, ${gr[1]})` }, onclick: () => { acc.color = i; store.save(true); render(); } }))))
          ),
          group('Allgemein',
            row('Töne & Effekte', 'Sounds in Spielen und Apps', h('input', { type: 'checkbox', class: 'switch', checked: acc.settings.sound !== false, onchange: (e) => { acc.settings.sound = e.target.checked; saveSettings(); } })),
            row('PIN / Passwort ändern', 'Aktuell: ' + (acc.auth === 'password' ? 'Passwort' : 'PIN'), h('button', { class: 'btn sm', onclick: changePin }, 'Ändern'))
          ),
          group('Konto-Token & Sync',
            row('Konto-Token sichern', acc.lastBackup ? 'Zuletzt gesichert: ' + Nova.relTime(acc.lastBackup) : 'Noch nie gesichert – bitte jetzt sichern!', h('button', { class: 'btn sm primary', onclick: shell().tokenDialog, html: icon('key') + ' Sichern' })),
            row('Mit anderem Gerät synchronisieren', 'Token vom anderen Gerät einfügen – beide Stände werden zusammengeführt', h('button', { class: 'btn sm', onclick: () => shell().importDialog(), html: icon('sync') + ' Sync' })),
            h('div', { class: 'set-note muted small', html: icon('info') + '<span>Nova braucht kein Internet. Dein Konto liegt nur auf diesem Gerät. Der Token ist dein Schlüssel: Mit ihm stellst du das Konto nach einer Neuinstallation wieder her oder überträgst es auf ein anderes Gerät.</span>' })
          ),
          group('Gerät',
            row('Speicher', (used / 1024 / 1024).toFixed(2) + ' MB von ca. 5 MB belegt', h('div', { class: 'progress sm' }, h('i', { style: { width: Math.min(100, (used / (5 * 1024 * 1024)) * 100) + '%' } }))),
            installEvt ? row('Als App installieren', 'Nova auf dem Startbildschirm / Desktop ablegen', h('button', { class: 'btn sm primary', onclick: async () => { installEvt.prompt(); installEvt = null; render(); } }, 'Installieren')) :
              row('Als App installieren', 'Im Browser-Menü „Zum Startbildschirm hinzufügen" bzw. „App installieren" wählen', h('span', { class: 'muted small' }, ''))
          ),
          group('Gefahrenzone',
            row('Konto von diesem Gerät löschen', 'Sichere vorher deinen Token, sonst ist alles weg', h('button', { class: 'btn sm danger', onclick: deleteAccount }, 'Löschen'))
          ),
          h('div', { class: 'muted xs center about' }, 'Nova OS · Version 1.1.0 · ' + ({ web: 'Web', electron: 'Windows/PC', android: 'Android' })[Nova.native.platform] + ' · 100 % offline · Keine Werbung · Keine Datensammlung')
        );
      };
      function guardRow() {
        const status = h('span', { class: 'muted small' }, 'Wird geprüft…');
        const ctrl = h('div', { class: 'row gap' });
        const r = row('Schutz vor Home & Übersicht', null, ctrl);
        r.querySelector('.grow').append(status);
        Nova.native.guard.status().then((st) => {
          const ready = st.usage && st.overlay;
          const on = acc.settings.guard !== false;
          status.textContent = !on ? 'Ausgeschaltet – Home/Übersicht verlassen Nova ohne Passwort.' : ready ? (st.running ? 'Aktiv: Wer Nova oder ein Spiel über Home/Übersicht verlässt, wird sofort zurückgeholt.' : 'Bereit – startet gleich.') : 'Noch nicht eingerichtet – 2 Berechtigungen fehlen.';
          if (on && !ready) ctrl.append(h('button', { class: 'btn sm primary', onclick: () => shell().guardSetupDialog().then(render) }, 'Einrichten'));
          ctrl.append(h('input', { type: 'checkbox', class: 'switch', checked: on, onchange: async (e) => {
            const want = e.target.checked; e.target.checked = !want;
            if (!want && !(await shell().askExitAuth(acc, 'Schutz ausschalten', 'Du möchtest den Verlassen-Schutz ausschalten.'))) return;
            acc.settings.guard = want; saveSettings();
            if (want) shell().ensureGuard(true); else Nova.native.guard.stop();
            render();
          } }));
        });
        return r;
      }
      function setAge(a) {
        acc.profile.age = Nova.clamp(a, 0, 100); acc.profile.birthday = ''; store.save(true); render();
      }
      async function changePin() {
        if (!(await shell().askSecret(acc, 'Aktuelles ' + (acc.auth === 'password' ? 'Passwort' : 'PIN'), null))) return;
        const type = await ui.dialog({ title: 'Neue Anmeldung', text: 'Was möchtest du verwenden?', actions: [{ label: 'Abbrechen', ghost: true, value: null }, { label: 'PIN (4 Ziffern)', value: 'pin' }, { label: 'Passwort', primary: true, value: 'password' }] });
        if (!type) return;
        const ask = (t) => type === 'pin' ? shell().askPin(t, '4 Ziffern', 4, 4) : shell().askPassword(t, 'Mindestens 6 Zeichen', 6);
        const p1 = await ask('Neu'); if (!p1) return;
        const p2 = await ask('Wiederholen'); if (p1 !== p2) return ui.toast('Stimmt nicht überein', 'err');
        acc.auth = type; store.setPin(acc, p1); ui.toast('Geändert'); render();
      }
      async function deleteAccount() {
        if (Nova.st.hasParent(acc)) {
          const pp = await shell().askPin('Eltern-PIN', 'Zum Löschen ist die Eltern-PIN nötig.'); if (pp == null) return;
          if (!Nova.st.checkParent(acc, pp)) return ui.toast('Eltern-PIN falsch', 'err');
        } else {
          if (!(await shell().askSecret(acc, 'Bestätigen', null))) return;
        }
        if (!(await ui.confirm('Konto wirklich löschen?', 'Alle Daten von ' + acc.name + ' werden von diesem Gerät entfernt. Mit einem gespeicherten Token kannst du es wiederherstellen.', { label: 'Endgültig löschen', danger: true }))) return;
        const id = acc.id;
        ctx.close();
        store.remove(id);
        shell().showLogin();
        ui.toast('Konto gelöscht');
      }
      render();
    }
  });

  /* ======================= BILDSCHIRMZEIT ======================= */
  Nova.registerApp({
    id: 'screentime', name: 'Bildschirmzeit', icon: 'hourglass', folder: 'system', grad: ['#7c5cff', '#ec4899'], desc: 'Zeitlimit, Nachtruhe & Eltern-Codes',
    mount(body, ctx) {
      const acc = ctx.acc;
      const wrap = h('div', { class: 'stapp' });
      body.append(wrap);
      let iv;
      const render = () => {
        wrap.innerHTML = '';
        const used = Nova.st.used(acc), all = Nova.st.allowance(acc), rem = Nova.st.remaining(acc);
        const pct = all === Infinity ? 0 : Math.min(1, used / Math.max(1, all));
        const hist = Nova.st.history(acc, 7);
        const maxH = Math.max(3600, ...hist.map((d) => d.sec));
        const codeIn = h('input', { class: 'input mono code-in', placeholder: 'XXX-XXX-XXX', maxlength: 11, autocomplete: 'off' });
        const redeem = () => { const r = Nova.st.redeem(acc, codeIn.value); ui.toast(r.ok ? '✓ ' + r.msg : r.msg, r.ok ? '' : 'err'); if (r.ok) { render(); shell().updatePill(); shell().checkLock(); } };
        codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') redeem(); });
        const stateTxt = { locked: 'Heute gesperrt', free: 'Heute freigegeben', normal: acc.st.limit ? 'Limit: ' + Nova.fmtDur(acc.st.limit * 60, true) + ((acc.st.bonus[Nova.dayKey()] || 0) ? ' + ' + acc.st.bonus[Nova.dayKey()] + ' min Bonus' : '') : 'Kein Limit' }[Nova.st.state(acc)];
        wrap.append(
          h('div', { class: 'st-top' },
            h('div', { class: 'st-ring card' },
              h('div', { class: 'big-ring', style: { '--p': pct } }, h('div', null, h('b', null, Nova.fmtDur(used, true)), h('span', { class: 'muted small' }, 'heute genutzt'))),
              h('div', { class: 'st-facts' },
                h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Übrig'), h('b', null, rem === Infinity ? 'Unbegrenzt' : Nova.fmtDur(rem, true))),
                h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Regel'), h('b', null, stateTxt)),
                h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Nachtruhe'), h('b', null, acc.st.bedtime.on ? acc.st.bedtime.from + ' – ' + acc.st.bedtime.to : 'Aus')))
            ),
            h('div', { class: 'st-week card' },
              h('h3', null, 'Diese Woche'),
              h('div', { class: 'bars' }, hist.map((d, i) => h('div', { class: 'bar' + (i === 6 ? ' today' : '') },
                h('div', { class: 'bar-v', title: Nova.fmtDur(d.sec, true), style: { height: Math.max(2, (d.sec / maxH) * 100) + '%' } }),
                h('span', { class: 'xs muted' }, Nova.WD[d.date.getDay()])))),
              h('div', { class: 'muted small' }, 'Ø ' + Nova.fmtDur(hist.reduce((s, d) => s + d.sec, 0) / 7, true) + ' pro Tag')
            )
          ),
          h('div', { class: 'card stack' },
            h('h3', null, 'Code von den Eltern einlösen'),
            h('div', { class: 'row gap' }, codeIn, h('button', { class: 'btn primary', onclick: redeem }, 'Einlösen')),
            h('div', { class: 'muted small' }, 'Deine Konto-ID für die Eltern-Fernsteuerung: ',
              h('b', { class: 'mono' }, shell().fmtId(acc.id)), ' ',
              h('button', { class: 'icon-btn sm inline', title: 'Kopieren', onclick: async () => ui.toast((await Nova.copyText(shell().fmtId(acc.id))) ? 'Konto-ID kopiert' : 'Kopieren nicht möglich'), html: icon('copy') }))
          ),
          h('div', { class: 'card stack parent-card' },
            h('div', { class: 'row gap' }, h('div', { class: 'app-ic sm', style: { background: 'linear-gradient(145deg,#334155,#0f172a)' }, html: icon('shield') }),
              h('div', { class: 'grow' }, h('h3', null, 'Eltern-Bereich'), h('div', { class: 'muted small' }, Nova.st.hasParent(acc) ? 'Geschützt mit Eltern-PIN' : 'Noch nicht eingerichtet'))),
            Nova.st.hasParent(acc)
              ? h('button', { class: 'btn', onclick: parentArea, html: icon('lock') + ' Eltern-Einstellungen öffnen' })
              : h('button', { class: 'btn primary', onclick: setupParent, html: icon('shield') + ' Eltern-PIN einrichten' }),
            h('div', { class: 'muted small' }, 'Fernsteuerung ohne Internet: Eltern öffnen auf ihrem eigenen Gerät Nova → „Eltern-Fernsteuerung" (Anmeldebildschirm), geben Konto-ID + Eltern-PIN ein und erhalten einen Code, den du hier einlöst.')
          )
        );
      };
      async function setupParent() {
        const ok = await ui.confirm('Eltern-PIN einrichten', 'Diesen Schritt sollten deine Eltern machen. Mit der Eltern-PIN können sie Zeitlimits festlegen und dir per Code Zeit freigeben – auch aus der Ferne.', { label: 'Weiter' });
        if (!ok) return;
        const p1 = await shell().askPin('Eltern-PIN wählen', '4–8 Ziffern. Bitte gut merken!'); if (!p1) return;
        const p2 = await shell().askPin('Eltern-PIN wiederholen'); if (p1 !== p2) return ui.toast('PINs stimmen nicht überein', 'err');
        Nova.st.setParent(acc, p1);
        ui.toast('Eltern-PIN eingerichtet');
        render();
        parentArea(true);
      }
      async function parentArea(skipPin) {
        let pin;
        if (skipPin !== true) {
          pin = await shell().askPin('Eltern-PIN', 'Bitte Eltern-PIN eingeben.'); if (pin == null) return;
          if (!Nova.st.checkParent(acc, pin)) return ui.toast('Eltern-PIN falsch', 'err');
        }
        let limit = acc.st.limit;
        const limLab = h('b');
        const updLab = () => (limLab.textContent = limit ? Nova.fmtDur(limit * 60, true) : 'Unbegrenzt');
        updLab();
        const rng = h('input', { type: 'range', class: 'range', min: 0, max: 480, step: 15, value: limit, oninput: (e) => { limit = +e.target.value; updLab(); } });
        const bOn = h('input', { type: 'checkbox', class: 'switch', checked: acc.st.bedtime.on });
        const bFrom = h('input', { type: 'time', class: 'input time-in', value: acc.st.bedtime.from });
        const bTo = h('input', { type: 'time', class: 'input time-in', value: acc.st.bedtime.to });
        const quick = (a, v, label) => h('button', { class: 'chip', onclick: () => { Nova.st.apply(acc, a, v); ui.toast(Nova.st.describe(a, v)); render(); shell().updatePill(); shell().checkLock(); } }, label);
        const r = await ui.dialog({
          title: 'Eltern-Einstellungen', wide: true,
          body: h('div', { class: 'stack' },
            h('div', { class: 'field' }, h('span', null, 'Tägliches Limit'), h('div', { class: 'row gap' }, rng, limLab)),
            h('div', { class: 'row gap wrap' }, [30, 60, 90, 120, 180].map((m) => h('button', { class: 'chip', onclick: () => { limit = m; rng.value = m; updLab(); } }, Nova.fmtDur(m * 60, true))), h('button', { class: 'chip', onclick: () => { limit = 0; rng.value = 0; updLab(); } }, 'Unbegrenzt')),
            h('div', { class: 'set-row' }, h('div', { class: 'grow' }, 'Nachtruhe', h('div', { class: 'muted small' }, 'Gerät ist in dieser Zeit gesperrt')), bOn),
            h('div', { class: 'row gap' }, h('label', { class: 'field grow' }, h('span', null, 'Von'), bFrom), h('label', { class: 'field grow' }, h('span', null, 'Bis'), bTo)),
            h('div', { class: 'field' }, h('span', null, 'Schnellaktionen für heute'),
              h('div', { class: 'row gap wrap' }, quick(0, 15, '+15 min'), quick(0, 30, '+30 min'), quick(0, 60, '+60 min'), quick(3, 0, 'Heute freigeben'), quick(2, 0, 'Heute sperren'), quick(4, 0, 'Nutzung zurücksetzen'))),
            h('div', { class: 'row gap wrap' },
              h('button', { class: 'btn sm', onclick: async () => { const p1 = await shell().askPin('Neue Eltern-PIN'); if (!p1) return; const p2 = await shell().askPin('Wiederholen'); if (p1 !== p2) return ui.toast('Stimmt nicht überein', 'err'); Nova.st.setParent(acc, p1); ui.toast('Eltern-PIN geändert'); } }, 'Eltern-PIN ändern'),
              h('button', { class: 'btn sm danger ghost', onclick: async () => { if (await ui.confirm('Eltern-PIN entfernen?', 'Alle Limits werden aufgehoben.', { label: 'Entfernen', danger: true })) { acc.st.parentKey = null; acc.st.limit = 0; acc.st.bedtime.on = false; acc.st.u = Date.now(); store.save(true); render(); shell().updatePill(); $$('.dialog-wrap').forEach((d) => d.remove()); } } }, 'Eltern-PIN entfernen'))
          ),
          actions: [{ label: 'Abbrechen', ghost: true, value: false }, { label: 'Speichern', primary: true, value: true }]
        });
        if (!r) return;
        acc.st.limit = limit;
        acc.st.bedtime = { on: bOn.checked, from: bFrom.value || '21:00', to: bTo.value || '07:00' };
        acc.st.u = Date.now();
        store.save(true);
        ui.toast('Gespeichert');
        render(); shell().updatePill(); shell().checkLock();
      }
      render();
      iv = setInterval(() => { if (!document.querySelector('.dialog-wrap') && document.activeElement && document.activeElement.tagName !== 'INPUT') render(); }, 15000);
      return () => clearInterval(iv);
    }
  });
})();
