/* Nova OS – Konto-Einrichtung (Schritt für Schritt, so genau wie möglich) */
(function () {
  'use strict';
  const Nova = window.Nova;
  const { h, $$, ui, icon } = Nova;

  const STATES = ['Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen', 'Außerhalb Deutschlands'];
  const SCHOOLS = ['Grundschule', 'Gymnasium', 'Realschule', 'Gesamtschule', 'Mittelschule / Hauptschule', 'Oberschule / Sekundarschule', 'Gemeinschaftsschule', 'Förderschule', 'Berufsschule', 'Andere'];
  const INTERESTS = ['Gaming', 'Zeichnen', 'Musik', 'Sport', 'Lesen', 'Tiere', 'Technik', 'Natur', 'Wissenschaft', 'Basteln', 'Filme', 'Kochen', 'Programmieren', 'Tanzen'];
  const SUBJECTS = ['Mathe', 'Deutsch', 'Englisch', 'Sachkunde', 'Biologie', 'Geschichte', 'Erdkunde', 'Physik', 'Chemie', 'Informatik', 'Kunst', 'Musik', 'Sport'];
  const STATUS = [['kita', 'Kita / Vorschule'], ['school', 'Schule'], ['training', 'Ausbildung / Studium'], ['adult', 'Beruf / Erwachsen']];

  Nova.ONBOARD = { STATES, SCHOOLS, INTERESTS, SUBJECTS, STATUS };

  function chips(list, selected, multi, onChange) {
    const el = h('div', { class: 'row gap wrap' });
    const render = () => {
      el.innerHTML = '';
      list.forEach((it) => {
        const [val, label] = Array.isArray(it) ? it : [it, it];
        const on = multi ? selected().includes(val) : selected() === val;
        el.append(h('button', { class: 'chip' + (on ? ' on' : ''), onclick: () => { onChange(val); render(); } }, label));
      });
    };
    render();
    return el;
  }
  function select(options, value, onChange, placeholder) {
    const s = h('select', { class: 'input', onchange: (e) => onChange(e.target.value) },
      h('option', { value: '' }, placeholder || 'Bitte wählen…'),
      options.map((o) => h('option', { value: o, selected: o === value }, o)));
    return s;
  }

  Nova.onboarding = function (panel, { onBack, onDone }) {
    const d = {
      name: '', lastName: '', age: 12, birthday: '', status: 'school', grade: null, schoolType: '', state: '',
      interests: [], subjects: [], color: Math.floor(Math.random() * Nova.store.COLORS.length),
      internet: 'offline', auth: 'pin', secret: '', secret2: '', parentPin: '', parentPin2: '', useLimit: true
    };
    let i = 0;
    const toggle = (arr, v) => { const k = arr.indexOf(v); if (k >= 0) arr.splice(k, 1); else arr.push(v); };

    const steps = [
      /* 1 – Name */
      () => {
        const n = h('input', { class: 'input', placeholder: 'Vorname', maxlength: 20, value: d.name, oninput: (e) => (d.name = e.target.value) });
        const l = h('input', { class: 'input', placeholder: 'Nachname (optional)', maxlength: 30, value: d.lastName, oninput: (e) => (d.lastName = e.target.value) });
        setTimeout(() => n.focus(), 60);
        return {
          title: 'Wie heißt du?', sub: 'Dein Name erscheint auf dem Startbildschirm.',
          body: [h('label', { class: 'field' }, h('span', null, 'Vorname'), n), h('label', { class: 'field' }, h('span', null, 'Nachname'), l)],
          valid: () => {
            const v = d.name.trim();
            if (v.length < 2) return 'Bitte gib deinen Vornamen ein (mind. 2 Buchstaben).';
            if (Nova.store.list().some((a) => a.name.toLowerCase() === v.toLowerCase())) return 'Diesen Namen gibt es auf diesem Gerät schon.';
            return true;
          }
        };
      },
      /* 2 – Alter */
      () => {
        const num = h('div', { class: 'age-num' });
        const react = h('div', { class: 'age-react' });
        const rng = h('input', { type: 'range', class: 'range', min: 0, max: 100, value: d.age });
        const upd = () => {
          num.textContent = d.age;
          rng.value = d.age;
          react.innerHTML = '';
          const p = Nova.persona({ profile: { age: d.age }, settings: {} });
          react.append(h('div', { class: 'age-react-ic', html: icon('sparkle') }),
            h('div', null, h('b', null, Nova.personaReaction(d.age)), h('div', { class: 'muted small' }, 'Erklär-Stil: ' + p.levelInfo.name + ' · ' + p.stage)));
        };
        rng.addEventListener('input', (e) => { d.age = +e.target.value; d.birthday = ''; bday.value = ''; upd(); });
        const step = (k) => { d.age = Nova.clamp(d.age + k, 0, 100); d.birthday = ''; bday.value = ''; upd(); };
        const bday = h('input', { class: 'input', type: 'date', value: d.birthday, max: Nova.dayKey(), onchange: (e) => { d.birthday = e.target.value; const a = Nova.ageFromBirthday(d.birthday); if (a != null) { d.age = a; upd(); } } });
        upd();
        return {
          title: 'Wie alt bist du?', sub: 'Damit Nova weiß, wie es dir Dinge am besten erklärt.',
          body: [
            h('div', { class: 'age-pick' },
              h('button', { class: 'icon-btn age-btn', onclick: () => step(-1), html: '−' }),
              num,
              h('button', { class: 'icon-btn age-btn', onclick: () => step(1), html: '+' })),
            h('div', { class: 'row gap' }, h('span', { class: 'muted xs' }, '0'), rng, h('span', { class: 'muted xs' }, '100')),
            h('label', { class: 'field' }, h('span', null, 'Geburtstag (optional – berechnet das Alter genau)'), bday),
            react
          ],
          valid: () => true
        };
      },
      /* 3 – Schule */
      () => {
        if (!d._statusSet) { d.status = d.age < 6 ? 'kita' : d.age <= 19 ? 'school' : d.age <= 26 ? 'training' : 'adult'; d._statusSet = true; }
        if (d.grade == null && d.status === 'school') d.grade = Nova.clamp(d.age - 5, 1, 13);
        const wrap = h('div', { class: 'stack' });
        const render = () => {
          wrap.innerHTML = '';
          wrap.append(h('div', { class: 'field' }, h('span', null, 'Was machst du gerade?'), chips(STATUS, () => d.status, false, (v) => { d.status = v; if (v === 'school' && !d.grade) d.grade = Nova.clamp(d.age - 5, 1, 13); render(); })));
          if (d.status === 'school') {
            wrap.append(
              h('div', { class: 'field' }, h('span', null, 'Klassenstufe'), chips(Array.from({ length: 13 }, (_, k) => [k + 1, String(k + 1)]), () => d.grade, false, (v) => (d.grade = v))),
              h('label', { class: 'field' }, h('span', null, 'Schulform'), select(SCHOOLS, d.schoolType, (v) => (d.schoolType = v)))
            );
          }
          wrap.append(h('label', { class: 'field' }, h('span', null, 'Bundesland'), select(STATES, d.state, (v) => (d.state = v))));
        };
        render();
        return { title: 'Schule & Wohnort', sub: 'Die Lern-Apps (Mathe, Deutsch) passen sich deiner Klasse an – wie im Unterricht in Deutschland.', body: wrap, valid: () => (d.status === 'school' && !d.grade ? 'Bitte wähle deine Klassenstufe.' : true) };
      },
      /* 4 – Interessen */
      () => ({
        title: 'Was magst du?', sub: 'Wähle so viele, wie du willst. So kann Nova Beispiele passend für dich wählen.',
        body: [
          h('div', { class: 'field' }, h('span', null, 'Hobbys & Interessen'), chips(INTERESTS, () => d.interests, true, (v) => toggle(d.interests, v))),
          h('div', { class: 'field' }, h('span', null, 'Lieblingsfächer'), chips(SUBJECTS, () => d.subjects, true, (v) => toggle(d.subjects, v)))
        ],
        valid: () => true
      }),
      /* 5 – Aussehen */
      () => {
        const prev = h('div', { class: 'create-prev' });
        const upd = () => { prev.innerHTML = ''; prev.append(Nova.shell.avatar({ name: d.name || '?', color: d.color }, 'xl')); };
        upd();
        const sw = h('div', { class: 'swatches center' }, Nova.store.COLORS.map((g, k) =>
          h('button', { class: 'swatch big' + (k === d.color ? ' on' : ''), style: { background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }, onclick: (e) => { d.color = k; $$('.swatch', sw).forEach((s) => s.classList.remove('on')); e.currentTarget.classList.add('on'); upd(); } })));
        return { title: 'Deine Farbe', sub: 'Such dir eine Farbe für dein Profil aus.', body: [prev, sw], valid: () => true };
      },
      /* 6 – Internet */
      () => {
        const wrap = h('div', { class: 'stack' });
        const card = (val, ic, title, text) => h('button', { class: 'opt-card' + (d.internet === val ? ' on' : ''), onclick: () => { d.internet = val; render(); } },
          h('div', { class: 'opt-ic', html: icon(ic) }), h('div', { class: 'grow' }, h('b', null, title), h('div', { class: 'muted small' }, text)), h('i', { class: 'opt-radio' }));
        const render = () => {
          wrap.innerHTML = '';
          wrap.append(
            card('offline', 'wifiOff', 'Komplett internetfrei', 'Nur die eingebauten Apps und Spiele. Nova benutzt nie das Internet.'),
            card('store', 'store', 'Mit einmaliger Installation', 'Echte Spiele wie Subway Surfers oder Geometry Dash einmalig aus dem Play Store installieren (dafür kurz Internet). Danach laufen sie offline.')
          );
        };
        render();
        return { title: 'Internet', sub: 'Du kannst das später in den Einstellungen ändern (mit Eltern-PIN, falls eingerichtet).', body: wrap, valid: () => true };
      },
      /* 7 – Sicherheit */
      () => {
        const wrap = h('div', { class: 'stack' });
        const render = () => {
          wrap.innerHTML = '';
          const isPin = d.auth === 'pin';
          const a = h('input', { class: 'input' + (isPin ? ' pin-input' : ''), type: 'password', inputmode: isPin ? 'numeric' : 'text', maxlength: isPin ? 4 : 64, autocomplete: 'new-password', placeholder: isPin ? '4 Ziffern' : 'Mindestens 6 Zeichen', value: d.secret, oninput: (e) => (d.secret = e.target.value) });
          const b = h('input', { class: 'input' + (isPin ? ' pin-input' : ''), type: 'password', inputmode: isPin ? 'numeric' : 'text', maxlength: isPin ? 4 : 64, autocomplete: 'new-password', placeholder: 'Wiederholen', value: d.secret2, oninput: (e) => (d.secret2 = e.target.value) });
          wrap.append(
            Nova.shell.seg([['PIN (4 Ziffern)', 'pin'], ['Passwort', 'password']], d.auth, (v) => { d.auth = v; d.secret = d.secret2 = ''; render(); }),
            h('label', { class: 'field' }, h('span', null, isPin ? 'Deine PIN' : 'Dein Passwort'), a),
            h('label', { class: 'field' }, h('span', null, 'Nochmal eingeben'), b),
            h('div', { class: 'info-row', html: icon('lock') + '<div class="small">Damit meldest du dich an. Du brauchst es auch <b>zum Abmelden und zum Verlassen der App</b>.</div>' })
          );
          if (d.age < 16) {
            const pa = h('input', { class: 'input pin-input', type: 'password', inputmode: 'numeric', maxlength: 8, placeholder: '4–8 Ziffern', value: d.parentPin, oninput: (e) => (d.parentPin = e.target.value) });
            const pb = h('input', { class: 'input pin-input', type: 'password', inputmode: 'numeric', maxlength: 8, placeholder: 'Wiederholen', value: d.parentPin2, oninput: (e) => (d.parentPin2 = e.target.value) });
            const sug = Nova.persona({ profile: { age: d.age }, settings: {} }).suggestMinutes;
            wrap.append(h('details', { class: 'parent-box', open: !!d.parentPin },
              h('summary', { html: icon('shield') + ' Eltern-PIN jetzt einrichten (empfohlen, optional)' }),
              h('div', { class: 'stack' },
                h('p', { class: 'muted small' }, 'Diesen Teil sollten Eltern ausfüllen. Mit der Eltern-PIN können sie Bildschirmzeit festlegen und per Code freigeben.'),
                h('div', { class: 'grid2' }, pa, pb),
                sug ? h('label', { class: 'toggle-row' }, h('span', { class: 'small' }, 'Empfohlenes Tageslimit für ' + d.age + ' Jahre: ' + Nova.fmtDur(sug * 60, true)), h('input', { type: 'checkbox', class: 'switch', checked: d.useLimit, onchange: (e) => (d.useLimit = e.target.checked) })) : null)));
          }
        };
        render();
        return {
          title: 'Sicherheit', sub: 'Schütze dein Konto.', body: wrap,
          valid: () => {
            if (d.auth === 'pin' && !/^\d{4}$/.test(d.secret)) return 'Die PIN muss genau 4 Ziffern haben.';
            if (d.auth === 'password' && d.secret.length < 6) return 'Das Passwort muss mindestens 6 Zeichen haben.';
            if (d.secret !== d.secret2) return 'Die Eingaben stimmen nicht überein.';
            if (d.parentPin || d.parentPin2) {
              if (!/^\d{4,8}$/.test(d.parentPin)) return 'Eltern-PIN: 4–8 Ziffern.';
              if (d.parentPin !== d.parentPin2) return 'Die Eltern-PINs stimmen nicht überein.';
            }
            return true;
          }
        };
      },
      /* 8 – Zusammenfassung */
      () => {
        const p = Nova.persona({ profile: { age: d.age, grade: d.status === 'school' ? d.grade : null }, settings: {} });
        const st = STATUS.find((s) => s[0] === d.status)[1];
        const kv = (k, v) => h('div', { class: 'kv' }, h('span', { class: 'muted' }, k), h('b', null, v));
        return {
          title: 'Alles bereit, ' + (d.name.trim() || '') + '!', sub: 'Prüfe kurz deine Angaben.',
          body: [
            h('div', { class: 'create-prev' }, Nova.shell.avatar({ name: d.name, color: d.color }, 'xl')),
            h('div', { class: 'stack tight' },
              kv('Name', (d.name.trim() + ' ' + d.lastName.trim()).trim()),
              kv('Alter', d.age + ' Jahre' + (d.birthday ? ' · 🎂 ' + new Date(d.birthday + 'T00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) : '')),
              kv('Status', st + (d.status === 'school' ? ' · Klasse ' + d.grade : '')),
              d.schoolType && d.status === 'school' ? kv('Schulform', d.schoolType) : null,
              d.state ? kv('Bundesland', d.state) : null,
              kv('Erklär-Stil', p.levelInfo.name),
              kv('Internet', d.internet === 'store' ? 'Einmalige Installation erlaubt' : 'Komplett internetfrei'),
              kv('Anmeldung', d.auth === 'pin' ? 'PIN' : 'Passwort'),
              d.parentPin ? kv('Eltern-PIN', 'eingerichtet' + (d.useLimit && p.suggestMinutes ? ' · Limit ' + Nova.fmtDur(p.suggestMinutes * 60, true) : '')) : null)
          ],
          valid: () => true, final: true
        };
      }
    ];

    function render() {
      const s = steps[i]();
      panel.innerHTML = '';
      const next = h('button', { class: 'btn primary wide lg', onclick: () => {
        const v = s.valid();
        if (v !== true) return ui.toast(v, 'err');
        if (s.final) return onDone(d);
        i++; render();
      } }, s.final ? 'Konto erstellen' : 'Weiter');
      panel.append(
        h('div', { class: 'wiz-head' },
          h('button', { class: 'icon-btn', onclick: () => { if (i === 0) onBack(); else { i--; render(); } }, html: icon('back') }),
          h('div', { class: 'wiz-prog' }, h('i', { style: { width: ((i + 1) / steps.length) * 100 + '%' } })),
          h('span', { class: 'muted xs' }, (i + 1) + '/' + steps.length)),
        h('div', { class: 'wiz-title' }, h('h2', null, s.title), s.sub ? h('p', { class: 'muted small' }, s.sub) : null),
        h('div', { class: 'wiz-body stack' }, s.body),
        next
      );
      panel.querySelectorAll('input').forEach((inp) => inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') next.click(); }));
    }
    render();
  };
})();
