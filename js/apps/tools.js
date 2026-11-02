/* Nova OS – Werkzeuge: Rechner, Aufgaben, Notizen, Timer, Lernkarten */
(function () {
  'use strict';
  const Nova = window.Nova;
  const { h, $, $$, ui, icon, store } = Nova;

  /* ======================= RECHNER ======================= */
  function evaluate(src) {
    const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '.');
    let i = 0;
    const peek = () => s[i], eat = (c) => (s[i] === c ? (i++, true) : false);
    const ws = () => { while (s[i] === ' ') i++; };
    function expr() { let v = term(); for (;;) { ws(); if (eat('+')) v += term(); else if (eat('-')) v -= term(); else return v; } }
    function term() { let v = power(); for (;;) { ws(); if (eat('*')) v *= power(); else if (eat('/')) { const d = power(); if (d === 0) throw new Error('Division durch 0'); v /= d; } else if (/[\d(π√.]/.test(peek() || '')) v *= power(); else return v; } }
    function power() { const b = unary(); ws(); if (eat('^')) return Math.pow(b, power()); return b; }
    function unary() { ws(); if (eat('-')) return -unary(); if (eat('+')) return unary(); return postfix(); }
    function postfix() { let v = primary(); for (;;) { ws(); if (eat('%')) v /= 100; else if (eat('²')) v *= v; else return v; } }
    function primary() {
      ws();
      if (eat('(')) { const v = expr(); ws(); eat(')'); return v; }
      if (eat('π')) return Math.PI;
      if (eat('√')) { const v = unary(); if (v < 0) throw new Error('Ungültig'); return Math.sqrt(v); }
      const m = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(s.slice(i)) || /^\d+\.?/.exec(s.slice(i));
      if (!m) throw new Error('Fehler');
      i += m[0].length; return parseFloat(m[0]);
    }
    const v = expr(); ws();
    if (i < s.length) throw new Error('Fehler');
    if (!isFinite(v)) throw new Error('Zu groß');
    return v;
  }
  const fmtNum = (v) => {
    const r = Math.round(v * 1e10) / 1e10;
    if (Math.abs(r) >= 1e15 || (Math.abs(r) < 1e-9 && r !== 0)) return r.toExponential(6).replace('.', ',');
    return r.toLocaleString('de-DE', { maximumFractionDigits: 10 });
  };

  Nova.registerApp({
    id: 'calc', name: 'Rechner', icon: 'a-calc', folder: 'tools', grad: ['#4f8cff', '#6a5cff'], desc: 'Taschenrechner mit Verlauf',
    mount(body, ctx) {
      let exp = '', sci = false, justEval = false;
      const expEl = h('div', { class: 'calc-exp' });
      const resEl = h('div', { class: 'calc-res' }, '0');
      const hist = h('div', { class: 'calc-hist' });
      const update = () => {
        expEl.textContent = exp || ' ';
        try { resEl.textContent = exp ? fmtNum(evaluate(exp)) : '0'; resEl.classList.remove('err'); }
        catch (e) { if (!exp) resEl.textContent = '0'; }
      };
      const renderHist = () => {
        hist.innerHTML = '';
        const items = store.items('calc').slice(0, 30);
        if (!items.length) hist.append(h('p', { class: 'muted small' }, 'Noch keine Rechnungen.'));
        items.forEach((it) => hist.append(h('button', { class: 'hist-item', onclick: () => { exp = it.r.replace(/\./g, '').replace(',', '.'); update(); } }, h('span', { class: 'muted' }, it.e + ' ='), h('b', null, it.r))));
      };
      const press = (k) => {
        if (k === 'C') { exp = ''; }
        else if (k === 'del') { exp = exp.slice(0, -1); }
        else if (k === '=') {
          if (!exp) return;
          try {
            const r = fmtNum(evaluate(exp));
            store.put('calc', { e: exp, r });
            const arr = ctx.acc.data.calc; if (arr.length > 40) arr.length = 40;
            exp = r.replace(/\./g, '').replace(',', '.'); justEval = true; renderHist();
            update(); resEl.classList.add('pop'); setTimeout(() => resEl.classList.remove('pop'), 200);
          } catch (e) { resEl.textContent = e.message; resEl.classList.add('err'); }
          return;
        }
        else if (k === '±') { exp = exp.startsWith('-(') && exp.endsWith(')') ? exp.slice(2, -1) : exp ? '-(' + exp + ')' : '-'; }
        else {
          if (justEval && /[\d.π√(]/.test(k)) exp = '';
          exp += k;
        }
        justEval = false;
        update();
      };
      const KB = [['C', 'fn'], ['±', 'fn'], ['%', 'fn'], ['÷', 'op'], ['7'], ['8'], ['9'], ['×', 'op'], ['4'], ['5'], ['6'], ['−', 'op'], ['1'], ['2'], ['3'], ['+', 'op'], ['0', 'zero'], [','], ['=', 'eq']];
      const SCI = ['(', ')', '√', '²', '^', 'π'];
      const sciRow = h('div', { class: 'calc-sci' }, SCI.map((k) => h('button', { class: 'ck fn', onclick: () => press(k) }, k)));
      const keys = h('div', { class: 'calc-keys' }, KB.map(([k, c]) => h('button', { class: 'ck ' + (c || ''), onclick: () => press(k === ',' ? '.' : k) }, k)));
      const calc = h('div', { class: 'calc' }, h('div', { class: 'calc-display' }, expEl, resEl), sciRow, keys);
      body.append(h('div', { class: 'calc-wrap' }, calc, h('aside', { class: 'calc-side card' }, h('div', { class: 'row between' }, h('h3', null, 'Verlauf'), h('button', { class: 'icon-btn sm', title: 'Verlauf löschen', onclick: () => { store.items('calc').forEach((x) => store.del('calc', x.id)); ctx.acc.data.calc = []; store.save(); renderHist(); }, html: icon('trash') })), hist)));
      sciRow.style.display = 'none';
      ctx.setActions(h('button', { class: 'btn sm ghost', onclick: (e) => { sci = !sci; sciRow.style.display = sci ? '' : 'none'; e.currentTarget.classList.toggle('on', sci); } }, 'Wissenschaftlich'));
      update(); renderHist();
      const off = Nova.kit.keys((key, e, down) => {
        if (!down) return;
        const map = { '*': '×', '/': '÷', '-': '−', Enter: '=', '=': '=', Backspace: 'del', Escape: null, Delete: 'C', ',': '.', '.': '.' };
        if (/^[\d+%()^]$/.test(key)) { press(key); return true; }
        if (key in map && map[key]) { press(map[key]); return true; }
      });
      return off;
    }
  });

  /* ======================= AUFGABEN ======================= */
  Nova.registerApp({
    id: 'todo', name: 'Aufgaben', icon: 'a-todo', folder: 'tools', grad: ['#2ecc71', '#00b4d8'], desc: 'To-do-Listen für Schule und Freizeit',
    mount(body) {
      let filter = 'open', list = 'Alle';
      const defaults = ['Schule', 'Freizeit', 'Zuhause'];
      const lists = () => Array.from(new Set([...defaults, ...store.items('todos').map((t) => t.list).filter(Boolean)]));
      const input = h('input', { class: 'input grow', placeholder: 'Neue Aufgabe… (Enter)', maxlength: 140 });
      const due = h('input', { class: 'input date-in', type: 'date' });
      const prio = h('button', { class: 'icon-btn', title: 'Wichtig', html: icon('star'), onclick: (e) => e.currentTarget.classList.toggle('on') });
      const side = h('div', { class: 'todo-lists' });
      const main = h('div', { class: 'todo-items' });
      const stats = h('div', { class: 'todo-stats' });
      const add = () => {
        const text = input.value.trim(); if (!text) return;
        store.put('todos', { text, done: false, list: list === 'Alle' ? 'Schule' : list, due: due.value || null, prio: prio.classList.contains('on'), created: Date.now() });
        input.value = ''; due.value = ''; prio.classList.remove('on'); render();
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
      const render = () => {
        const all = store.items('todos');
        side.innerHTML = '';
        ['Alle', ...lists()].forEach((l) => {
          const n = all.filter((t) => !t.done && (l === 'Alle' || t.list === l)).length;
          side.append(h('button', { class: 'side-item' + (l === list ? ' on' : ''), onclick: () => { list = l; render(); } }, h('span', { class: 'grow' }, l), n ? h('span', { class: 'count' }, n) : null));
        });
        side.append(h('button', { class: 'side-item add', onclick: async () => { const n = await ui.prompt('Neue Liste', { placeholder: 'Name der Liste' }); if (n) { defaults.push(n.slice(0, 20)); list = n.slice(0, 20); render(); } }, html: icon('plus') + ' Liste' }));
        const today = Nova.dayKey();
        let items = all.filter((t) => list === 'Alle' || t.list === list);
        const open = items.filter((t) => !t.done).length, done = items.length - open;
        stats.innerHTML = '';
        stats.append(Nova.shell.seg([['Offen (' + open + ')', 'open'], ['Heute', 'today'], ['Erledigt (' + done + ')', 'done']], filter, (v) => { filter = v; render(); }));
        if (filter === 'open') items = items.filter((t) => !t.done);
        if (filter === 'done') items = items.filter((t) => t.done);
        if (filter === 'today') items = items.filter((t) => !t.done && t.due && t.due <= today);
        items.sort((a, b) => (b.prio - a.prio) || ((a.due || '9') < (b.due || '9') ? -1 : 1) || b.created - a.created);
        main.innerHTML = '';
        if (!items.length) main.append(h('div', { class: 'empty' }, h('div', { html: icon('check') }), h('p', null, filter === 'done' ? 'Noch nichts erledigt.' : 'Alles erledigt – stark! 🎉')));
        items.forEach((t) => {
          const overdue = t.due && !t.done && t.due < today;
          main.append(h('div', { class: 'todo' + (t.done ? ' done' : '') },
            h('button', { class: 'tick' + (t.done ? ' on' : ''), onclick: () => { t.done = !t.done; t.doneAt = Date.now(); store.put('todos', t); if (t.done) Nova.kit.beep(880, 0.08, 'sine', 0.05, 1320); render(); }, html: icon('check') }),
            h('div', { class: 'todo-main grow', ondblclick: async () => { const n = await ui.prompt('Aufgabe bearbeiten', { value: t.text }); if (n) { t.text = n; store.put('todos', t); render(); } } },
              h('div', { class: 'todo-text' }, t.text),
              h('div', { class: 'todo-meta' },
                list === 'Alle' ? h('span', { class: 'tag' }, t.list) : null,
                t.due ? h('span', { class: 'tag' + (overdue ? ' red' : '') }, (overdue ? 'überfällig · ' : '') + new Date(t.due + 'T00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })) : null,
                t.prio ? h('span', { class: 'tag star', html: icon('star') + ' wichtig' }) : null)
            ),
            h('button', { class: 'icon-btn sm', title: 'Löschen', onclick: () => { store.del('todos', t.id); render(); }, html: icon('trash') })
          ));
        });
      };
      body.append(h('div', { class: 'split' },
        h('aside', { class: 'split-side' }, side),
        h('div', { class: 'split-main' },
          h('div', { class: 'todo-add card' }, input, due, prio, h('button', { class: 'btn primary', onclick: add, html: icon('plus') })),
          stats, main)
      ));
      render();
      setTimeout(() => input.focus(), 100);
    }
  });

  /* ======================= NOTIZEN ======================= */
  const NOTE_COLORS = ['#7c5cff', '#4f8cff', '#00c2a8', '#ffb800', '#ff6b3d', '#ff5c8a'];
  Nova.registerApp({
    id: 'notes', name: 'Notizen', icon: 'a-notes', folder: 'tools', grad: ['#ffb800', '#ff6b3d'], desc: 'Notizen schreiben und ordnen',
    mount(body, ctx) {
      let cur = null, q = '';
      const listEl = h('div', { class: 'note-list' });
      const search = h('input', { class: 'input', placeholder: 'Suchen…', type: 'search', oninput: (e) => { q = e.target.value.toLowerCase(); renderList(); } });
      const title = h('input', { class: 'note-title', placeholder: 'Titel', maxlength: 80 });
      const text = h('textarea', { class: 'note-text', placeholder: 'Schreib los…' });
      const info = h('div', { class: 'muted small' });
      const colorRow = h('div', { class: 'row gap' });
      const editor = h('div', { class: 'note-editor' }, h('div', { class: 'row between' }, colorRow, info), title, text);
      const wrap = h('div', { class: 'split notes' }, h('aside', { class: 'split-side' }, h('div', { class: 'row gap' }, search, h('button', { class: 'btn primary', title: 'Neue Notiz', onclick: () => newNote(), html: icon('plus') })), listEl), h('div', { class: 'split-main' }, editor));
      body.append(wrap);
      const save = Nova.debounce(() => { if (!cur) return; cur.title = title.value; cur.text = text.value; store.put('notes', cur); info.textContent = 'Gespeichert'; renderList(); }, 350);
      title.addEventListener('input', () => { info.textContent = '…'; save(); });
      text.addEventListener('input', () => { info.textContent = '…'; save(); });
      function newNote() { cur = store.put('notes', { title: '', text: '', color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)] }); open(cur); renderList(); title.focus(); }
      function open(n) {
        cur = n; wrap.classList.add('editing');
        title.value = n.title; text.value = n.text; info.textContent = Nova.relTime(n.u);
        colorRow.innerHTML = '';
        NOTE_COLORS.forEach((c) => colorRow.append(h('button', { class: 'dot' + (n.color === c ? ' on' : ''), style: { background: c }, onclick: () => { n.color = c; store.put('notes', n); open(n); renderList(); } })));
        colorRow.append(h('button', { class: 'icon-btn sm', title: 'Löschen', onclick: async () => { if (await ui.confirm('Notiz löschen?', null, { label: 'Löschen', danger: true })) { store.del('notes', n.id); cur = null; wrap.classList.remove('editing'); renderList(); showEmpty(); } }, html: icon('trash') }));
        editor.classList.remove('hidden');
        renderList();
      }
      function showEmpty() { const f = store.items('notes')[0]; if (f) open(f); else editor.classList.add('hidden'); }
      function renderList() {
        listEl.innerHTML = '';
        const items = store.items('notes').filter((n) => !q || (n.title + ' ' + n.text).toLowerCase().includes(q));
        if (!items.length) listEl.append(h('div', { class: 'empty sm' }, h('p', null, q ? 'Nichts gefunden.' : 'Noch keine Notizen.'), q ? null : h('button', { class: 'btn primary', onclick: newNote }, 'Erste Notiz')));
        items.forEach((n) => listEl.append(h('button', { class: 'note-item' + (cur && cur.id === n.id ? ' on' : ''), style: { '--nc': n.color }, onclick: () => open(n) },
          h('b', null, n.title || 'Ohne Titel'), h('span', { class: 'muted small' }, (n.text || '').slice(0, 70) || 'Leer'), h('span', { class: 'muted xs' }, Nova.relTime(n.u)))));
      }
      ctx.setActions(h('button', { class: 'btn sm ghost mobile-only', onclick: () => wrap.classList.remove('editing'), html: icon('note') + ' Liste' }));
      renderList(); showEmpty(); wrap.classList.remove('editing');
      return () => { if (cur) { cur.title = title.value; cur.text = text.value; if (!cur.title && !cur.text) store.del('notes', cur.id); else store.put('notes', cur); } };
    }
  });

  /* ======================= TIMER & STOPPUHR ======================= */
  Nova.registerApp({
    id: 'timer', name: 'Timer', icon: 'a-timer', folder: 'tools', grad: ['#ff5c8a', '#ff9f43'], desc: 'Timer, Stoppuhr & Lernzeit',
    mount(body) {
      let mode = 'timer', total = 300, left = 300, running = false, last = 0, sw = 0, laps = [], raf;
      const ring = h('div', { class: 'tm-ring' });
      const big = h('div', { class: 'tm-big mono' });
      const sub = h('div', { class: 'muted' });
      const presets = h('div', { class: 'row gap wrap center' });
      const lapsEl = h('div', { class: 'tm-laps' });
      const startBtn = h('button', { class: 'btn primary lg' });
      const resetBtn = h('button', { class: 'btn lg', html: icon('reset') + ' Reset' });
      const lapBtn = h('button', { class: 'btn lg', html: icon('flag') + ' Runde' });
      const tabs = Nova.shell.seg([['Timer', 'timer'], ['Stoppuhr', 'sw'], ['Lernzeit 25/5', 'focus']], mode, (v) => { mode = v; running = false; if (v === 'focus') { total = left = 25 * 60; } else if (v === 'timer') { total = left = 300; } render(); });
      const fmt = (s, cs) => { const m = Math.floor(s / 60), ss = Math.floor(s % 60); return Nova.pad(m) + ':' + Nova.pad(ss) + (cs ? ',' + Nova.pad(Math.floor((s * 100) % 100)) : ''); };
      const alarm = () => { let n = 0; const iv = setInterval(() => { Nova.kit.beep(880, 0.15, 'sine', 0.1); setTimeout(() => Nova.kit.beep(1175, 0.2, 'sine', 0.1), 180); if (++n >= 4) clearInterval(iv); }, 600); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); };
      const frame = (t) => {
        const dt = (t - last) / 1000; last = t;
        if (running) {
          if (mode === 'sw') sw += dt;
          else { left -= dt; if (left <= 0) { left = 0; running = false; alarm(); ui.toast(mode === 'focus' ? 'Lernzeit vorbei – 5 Minuten Pause!' : 'Zeit ist um!'); if (mode === 'focus') { total = left = 5 * 60; } } }
        }
        draw(); raf = requestAnimationFrame(frame);
      };
      const draw = () => {
        const pct = mode === 'sw' ? (sw % 60) / 60 : total ? left / total : 0;
        ring.style.setProperty('--p', pct);
        big.textContent = mode === 'sw' ? fmt(sw, true) : fmt(Math.ceil(left));
        startBtn.innerHTML = running ? icon('pause') + ' Pause' : icon('play') + ' Start';
      };
      const render = () => {
        presets.innerHTML = '';
        lapsEl.innerHTML = '';
        lapBtn.style.display = mode === 'sw' ? '' : 'none';
        sub.textContent = mode === 'focus' ? 'Konzentriert lernen, dann Pause machen' : mode === 'sw' ? 'Miss deine Zeit' : 'Wähle eine Zeit';
        if (mode === 'timer') {
          [1, 3, 5, 10, 15, 30, 60].forEach((m) => presets.append(h('button', { class: 'chip' + (total === m * 60 ? ' on' : ''), onclick: () => { total = left = m * 60; running = false; render(); } }, m + ' min')));
          presets.append(h('button', { class: 'chip', onclick: async () => { const v = await ui.prompt('Eigene Zeit', { placeholder: 'Minuten', type: 'number' }); const m = parseFloat(v); if (m > 0 && m <= 600) { total = left = Math.round(m * 60); running = false; render(); } } }, 'Eigene…'));
        }
        if (mode === 'sw') laps.forEach((l, i) => lapsEl.append(h('div', { class: 'lap' }, h('span', { class: 'muted' }, 'Runde ' + (laps.length - i)), h('b', { class: 'mono' }, fmt(l, true)))));
        draw();
      };
      startBtn.onclick = () => { if (mode !== 'sw' && left <= 0) left = total; running = !running; Nova.kit.audio(); draw(); };
      resetBtn.onclick = () => { running = false; sw = 0; laps = []; left = total; render(); };
      lapBtn.onclick = () => { if (sw > 0) { laps.unshift(sw); render(); } };
      ring.append(h('div', { class: 'tm-in' }, big, sub));
      body.append(h('div', { class: 'tm' }, tabs, ring, presets, h('div', { class: 'row gap center' }, startBtn, lapBtn, resetBtn), lapsEl));
      render(); last = performance.now(); raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    }
  });

  /* ======================= LERNKARTEN ======================= */
  Nova.registerApp({
    id: 'cards', name: 'Lernkarten', icon: 'a-cards', folder: 'tools', grad: ['#a855f7', '#6366f1'], desc: 'Vokabeln & Fakten lernen',
    mount(body, ctx) {
      const view = h('div', { class: 'cards-app' });
      body.append(view);
      const home = () => {
        ctx.setActions(h('button', { class: 'btn sm primary', onclick: async () => { const n = await ui.prompt('Neuer Stapel', { placeholder: 'z. B. Englisch Unit 3', label: 'Erstellen' }); if (n) edit(store.put('decks', { name: n, cards: [] })); }, html: icon('plus') + ' Stapel' }));
        view.innerHTML = '';
        const decks = store.items('decks');
        if (!decks.length) {
          view.append(h('div', { class: 'empty' }, h('div', { html: icon('cards') }), h('p', null, 'Erstelle deinen ersten Lernstapel – z. B. für Vokabeln.'),
            h('button', { class: 'btn primary', onclick: () => { const d = store.put('decks', { name: 'Englisch – Beispiel', cards: [{ q: 'dog', a: 'Hund' }, { q: 'house', a: 'Haus' }, { q: 'to learn', a: 'lernen' }, { q: 'friend', a: 'Freund/in' }, { q: 'yesterday', a: 'gestern' }] }); home(); } }, 'Beispiel-Stapel laden')));
          return;
        }
        view.append(h('div', { class: 'deck-grid' }, decks.map((d) => {
          const known = d.cards.filter((c) => (c.s || 0) >= 2).length;
          return h('div', { class: 'deck card' },
            h('div', { class: 'deck-top' }, h('b', null, d.name), h('span', { class: 'muted small' }, d.cards.length + ' Karten')),
            h('div', { class: 'progress' }, h('i', { style: { width: (d.cards.length ? (known / d.cards.length) * 100 : 0) + '%' } })),
            h('div', { class: 'muted xs' }, known + ' von ' + d.cards.length + ' sicher'),
            h('div', { class: 'row gap' },
              h('button', { class: 'btn primary sm', disabled: !d.cards.length, onclick: () => study(d) }, 'Lernen'),
              h('button', { class: 'btn sm', onclick: () => edit(d) }, 'Bearbeiten'))
          );
        })));
      };
      const edit = (d) => {
        ctx.setActions(h('button', { class: 'btn sm ghost', onclick: home, html: icon('back') + ' Stapel' }));
        view.innerHTML = '';
        const q = h('input', { class: 'input', placeholder: 'Vorderseite (Frage)' });
        const a = h('input', { class: 'input', placeholder: 'Rückseite (Antwort)' });
        const list = h('div', { class: 'card-list' });
        const add = () => { if (!q.value.trim() || !a.value.trim()) return; d.cards.push({ q: q.value.trim(), a: a.value.trim(), s: 0 }); store.put('decks', d); q.value = a.value = ''; q.focus(); renderList(); };
        a.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
        q.addEventListener('keydown', (e) => { if (e.key === 'Enter') a.focus(); });
        const renderList = () => {
          list.innerHTML = '';
          d.cards.forEach((c, i) => list.append(h('div', { class: 'card-row' }, h('span', { class: 'grow' }, c.q), h('span', { class: 'muted grow' }, c.a), h('button', { class: 'icon-btn sm', onclick: () => { d.cards.splice(i, 1); store.put('decks', d); renderList(); }, html: icon('trash') }))));
          if (!d.cards.length) list.append(h('p', { class: 'muted small' }, 'Noch keine Karten. Füge oben welche hinzu.'));
        };
        view.append(
          h('div', { class: 'row between' }, h('h2', null, d.name), h('div', { class: 'row gap' },
            h('button', { class: 'btn sm', onclick: async () => { const n = await ui.prompt('Umbenennen', { value: d.name }); if (n) { d.name = n; store.put('decks', d); edit(d); } } }, 'Umbenennen'),
            h('button', { class: 'btn sm danger ghost', onclick: async () => { if (await ui.confirm('Stapel löschen?', d.name, { label: 'Löschen', danger: true })) { store.del('decks', d.id); home(); } } }, 'Löschen'))),
          h('div', { class: 'card-add card' }, q, a, h('button', { class: 'btn primary', onclick: add, html: icon('plus') })),
          list);
        renderList(); setTimeout(() => q.focus(), 50);
      };
      const study = (d) => {
        ctx.setActions(h('button', { class: 'btn sm ghost', onclick: home, html: icon('back') + ' Stapel' }));
        let queue = d.cards.map((c, i) => i).sort((x, y) => (d.cards[x].s || 0) - (d.cards[y].s || 0) || Math.random() - 0.5);
        let right = 0, wrong = 0;
        const next = () => {
          view.innerHTML = '';
          if (!queue.length) {
            view.append(h('div', { class: 'empty' }, h('div', { html: icon('star') }), h('h2', null, 'Runde geschafft!'), h('p', null, right + ' gewusst · ' + wrong + ' nochmal'), h('div', { class: 'row gap center' }, h('button', { class: 'btn primary', onclick: () => study(d) }, 'Nochmal'), h('button', { class: 'btn', onclick: home }, 'Fertig'))));
            return;
          }
          const c = d.cards[queue[0]];
          const flip = h('div', { class: 'flip', onclick: () => flip.classList.toggle('on') },
            h('div', { class: 'flip-in' }, h('div', { class: 'face front' }, h('span', { class: 'muted xs' }, 'Frage'), h('div', null, c.q)), h('div', { class: 'face back' }, h('span', { class: 'muted xs' }, 'Antwort'), h('div', null, c.a))));
          const ans = (ok) => { c.s = ok ? (c.s || 0) + 1 : 0; ok ? right++ : wrong++; const i = queue.shift(); if (!ok) queue.splice(Math.min(queue.length, 3), 0, i); store.put('decks', d); next(); };
          view.append(h('div', { class: 'study' },
            h('div', { class: 'muted small center' }, d.name + ' · noch ' + queue.length),
            flip,
            h('div', { class: 'muted xs center' }, 'Tippe auf die Karte zum Umdrehen'),
            h('div', { class: 'row gap center' }, h('button', { class: 'btn lg danger ghost', onclick: () => ans(false) }, 'Nochmal'), h('button', { class: 'btn lg primary', onclick: () => ans(true) }, 'Gewusst ✓'))));
        };
        next();
      };
      home();
    }
  });
})();
