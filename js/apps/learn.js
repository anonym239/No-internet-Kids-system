/* Nova OS – Lern-Motor + Mathe
 * Wie ein Lern-Trainer für die Schule in Deutschland: Themen nach Klassenstufe,
 * unendlich viele neu erzeugte Aufgaben, Sterne, XP, Lern-Serie –
 * und Erklärungen, die sich am Alter orientieren (Nova.persona).
 */
(function () {
  'use strict';
  const Nova = window.Nova;
  const { h, ui, icon, store } = Nova;

  /* ---------- Helfer ---------- */
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const lcm = (a, b) => (a * b) / gcd(a, b);
  const de = (n) => (Math.round(n * 1e6) / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 6 });
  const S = (lv, t) => Nova.say(lv, t);
  /* Auswahl-Antworten: richtige + Ablenker, gemischt, ohne Duplikate */
  function choicesOf(correct, wrong, n = 4) {
    const set = [String(correct)];
    for (const w of shuffle(wrong.map(String))) { if (set.length >= n) break; if (!set.includes(w)) set.push(w); }
    return shuffle(set);
  }
  const numWrong = (c, spread = 3) => { const out = []; for (let k = 1; out.length < 6 && k < 20; k++) { const d = rnd(1, spread) * (Math.random() < 0.5 ? -1 : 1); if (c + d >= 0 && c + d !== c) out.push(c + d); } return out; };

  function parseNum(s) {
    s = String(s).trim().replace(/\s/g, '').replace(/€|cm|m|kg|g|%|min|h|ct/gi, '').replace(',', '.');
    if (/^-?\d+\/\d+$/.test(s)) { const [a, b] = s.split('/').map(Number); return b ? a / b : NaN; }
    return s === '' ? NaN : Number(s);
  }
  function parseFrac(s) {
    s = String(s).trim().replace(/\s/g, '').replace(',', '.');
    let m = /^(-?\d+)\/(\d+)$/.exec(s);
    if (m) return { n: +m[1], d: +m[2] };
    m = /^(-?\d+)$/.exec(s);
    if (m) return { n: +m[1], d: 1 };
    return null;
  }

  function check(task, input) {
    const t = task.type;
    if (t === 'choice') return input === String(task.answer);
    if (t === 'num') { const v = parseNum(input); return !isNaN(v) && Math.abs(v - task.answer) < 1e-6; }
    if (t === 'frac') {
      const f = parseFrac(input); if (!f || f.d === 0) return false;
      const ok = Math.abs(f.n / f.d - task.answer.n / task.answer.d) < 1e-9;
      if (task.simplest) return ok && gcd(f.n, f.d) === 1;
      return ok;
    }
    if (t === 'set') {
      const vals = String(input).split(/[;|]|und/).map((x) => parseNum(x)).filter((x) => !isNaN(x)).sort((a, b) => a - b);
      const ans = task.answer.slice().sort((a, b) => a - b);
      return vals.length === ans.length && vals.every((v, i) => Math.abs(v - ans[i]) < 1e-6);
    }
    return String(input).trim().toLowerCase() === String(task.answer).trim().toLowerCase();
  }
  const answerText = (task) => task.type === 'frac' ? task.answer.n + '/' + task.answer.d : task.type === 'set' ? task.answer.join('; ') : task.type === 'num' ? de(task.answer) : String(task.answer);

  /* ======================= LERN-APP (generisch) ======================= */
  Nova.learnApps = {};
  Nova.learnApp = function (def) {
    Nova.learnApps[def.id] = def;
    Nova.registerApp({
      id: def.id, name: def.name, icon: def.icon, folder: 'learn', grad: def.grad, desc: def.desc,
      mount(body, ctx) {
        const acc = ctx.acc;
        const P = Nova.persona(acc);
        let gradeFilter = P.grade;
        const view = h('div', { class: 'learn' });
        body.append(view);
        const sKey = (t) => def.id + ':' + t.id;
        const stars = (t) => store.score('learn:' + sKey(t));
        const xp = () => store.score('xp:' + def.id);
        const streak = () => {
          let n = 0; const d = new Date();
          if (!store.score('ld:' + Nova.dayKey(d))) d.setDate(d.getDate() - 1);
          while (store.score('ld:' + Nova.dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
          return n;
        };
        const starEl = (n) => h('span', { class: 'stars' }, [0, 1, 2].map((i) => h('i', { class: i < n ? 'on' : '', html: icon('star') })));

        function overview() {
          ctx.setActions();
          view.innerHTML = '';
          const topics = def.topics.filter((t) => gradeFilter === 0 || (gradeFilter >= t.grades[0] && gradeFilter <= t.grades[1])).sort((a, b) => a.grades[0] - b.grades[0]);
          const gradeChips = h('div', { class: 'grade-chips' },
            h('button', { class: 'chip' + (gradeFilter === 0 ? ' on' : ''), onclick: () => { gradeFilter = 0; overview(); } }, 'Alle'),
            Array.from({ length: 13 }, (_, i) => i + 1).filter((g) => def.topics.some((t) => g >= t.grades[0] && g <= t.grades[1])).map((g) =>
              h('button', { class: 'chip' + (gradeFilter === g ? ' on' : '') + (g === P.grade ? ' mine' : ''), onclick: () => { gradeFilter = g; overview(); } }, 'Kl. ' + g)));
          view.append(
            h('div', { class: 'learn-hero', style: { '--g1': def.grad[0], '--g2': def.grad[1] } },
              h('div', { class: 'grow' },
                h('div', { class: 'learn-kicker' }, def.name + ' · ' + (acc.profile.status === 'school' ? 'Klasse ' + P.grade : P.stage)),
                h('h2', null, S(P.level, { 1: 'Los geht\'s, ' + acc.name + '! 🎈', 3: 'Bereit zum Üben, ' + acc.name + '?', 5: 'Training: ' + def.name })),
                h('p', null, 'Erklär-Stil: ' + P.levelInfo.name + ' – passend zu deinem Alter (' + P.age + ').')),
              h('div', { class: 'learn-stats' },
                h('div', null, h('b', null, xp()), h('span', null, 'XP')),
                h('div', null, h('b', null, streak()), h('span', { html: icon('flame') + ' Tage' })),
                h('div', null, h('b', null, def.topics.reduce((s, t) => s + stars(t), 0)), h('span', { html: icon('star') + ' Sterne' })))),
            gradeChips,
            topics.length ? h('div', { class: 'topic-grid' }, topics.map((t) =>
              h('button', { class: 'topic card', onclick: () => intro(t) },
                h('div', { class: 'topic-top' }, h('span', { class: 'tag' }, 'Klasse ' + (t.grades[0] === t.grades[1] ? t.grades[0] : t.grades[0] + '–' + t.grades[1])), starEl(stars(t))),
                h('b', null, t.title),
                h('span', { class: 'muted small' }, t.sub || '')))) :
              h('div', { class: 'empty' }, h('p', null, 'Für diese Klassenstufe gibt es hier noch keine Themen.'))
          );
        }

        function intro(t) {
          ctx.setActions(h('button', { class: 'btn sm ghost', onclick: overview, html: icon('back') + ' Themen' }));
          view.innerHTML = '';
          const ex = t.gen(P.level, P.grade);
          view.append(h('div', { class: 'lesson' },
            h('div', { class: 'lesson-head' }, h('span', { class: 'tag' }, 'Klasse ' + t.grades[0] + (t.grades[1] !== t.grades[0] ? '–' + t.grades[1] : '')), starEl(stars(t))),
            h('h2', null, t.title),
            h('div', { class: 'lesson-box' }, h('div', { class: 'lesson-ic', html: icon('info') }), h('div', { class: 'lesson-txt' }, S(P.level, t.intro))),
            h('div', { class: 'lesson-ex' }, h('span', { class: 'muted xs' }, 'BEISPIEL'), h('div', { class: 'ex-q' }, ex.q), h('div', { class: 'ex-a' }, '→ ' + answerText(ex)), h('div', { class: 'muted small ex-why' }, typeof ex.explain === 'string' ? ex.explain : S(P.level, ex.explain))),
            h('button', { class: 'btn primary lg wide', onclick: () => quiz(t), html: icon('play') + ' 10 Aufgaben üben' })));
        }

        function quiz(t) {
          ctx.setActions(h('button', { class: 'btn sm ghost', onclick: async () => { if (await ui.confirm('Übung abbrechen?', 'Dein Fortschritt in dieser Runde geht verloren.', { label: 'Abbrechen', danger: true })) overview(); }, html: icon('x') + ' Beenden' }));
          const N = 10;
          let k = 0, right = 0, streakRun = 0;
          const tasks = [];
          for (let i = 0; i < N; i++) {
            let tk, tries = 0;
            do { tk = t.gen(P.level, P.grade); tries++; } while (tries < 8 && tasks.some((x) => x.q === tk.q));
            tasks.push(tk);
          }
          const next = () => {
            if (k >= N) return result(t, right, N);
            const task = tasks[k];
            view.innerHTML = '';
            const bar = h('div', { class: 'quiz-prog' }, h('i', { style: { width: (k / N) * 100 + '%' } }));
            const fb = h('div', { class: 'quiz-fb' });
            let answered = false;
            const done = (ok, given) => {
              if (answered) return; answered = true;
              if (ok) { right++; streakRun++; Nova.kit.beep(880, 0.08, 'sine', 0.05, 1320); } else { streakRun = 0; Nova.kit.beep(220, 0.15, 'triangle', 0.05); }
              const exp = typeof task.explain === 'string' ? task.explain : S(P.level, task.explain);
              fb.className = 'quiz-fb show ' + (ok ? 'ok' : 'bad');
              fb.innerHTML = '';
              fb.append(
                h('div', { class: 'fb-title' }, ok ? S(P.level, { 1: 'Super gemacht! ⭐', 3: pick(['Richtig! ✓', 'Stark! ✓', 'Genau! ✓']) + (streakRun >= 3 ? ' · ' + streakRun + ' in Folge 🔥' : ''), 5: 'Korrekt.' }) : 'Nicht ganz – richtig ist: ' + answerText(task)),
                exp ? h('div', { class: 'fb-exp' }, ok ? h('details', null, h('summary', null, 'Warum?'), h('div', null, exp)) : exp) : null,
                h('button', { class: 'btn primary', onclick: () => { k++; next(); } }, k + 1 >= N ? 'Ergebnis' : 'Weiter'));
              fb.querySelector('.btn').focus();
              if (task.type === 'choice') view.querySelectorAll('.quiz-choice').forEach((b) => { b.disabled = true; if (b.dataset.v === String(task.answer)) b.classList.add('right'); else if (b.dataset.v === given) b.classList.add('wrong'); });
            };
            let inputArea;
            if (task.type === 'choice') {
              inputArea = h('div', { class: 'quiz-choices' + (task.choices.length > 4 ? ' many' : '') }, task.choices.map((c) => h('button', { class: 'quiz-choice', 'data-v': c, onclick: () => done(c === String(task.answer), c) }, c)));
            } else {
              const inp = h('input', { class: 'input quiz-in', inputmode: task.type === 'num' && !task.allowText ? 'decimal' : 'text', autocomplete: 'off', placeholder: task.placeholder || 'Antwort' });
              const go = () => { if (!inp.value.trim()) return; inp.disabled = true; done(check(task, inp.value), inp.value); };
              inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { if (!answered) go(); else fb.querySelector('.btn') && fb.querySelector('.btn').click(); } });
              inputArea = h('div', { class: 'quiz-input' }, inp, h('button', { class: 'btn primary lg', onclick: go }, 'Prüfen'), task.hint ? h('div', { class: 'muted xs' }, task.hint) : null);
              setTimeout(() => inp.focus(), 60);
            }
            view.append(h('div', { class: 'quiz' },
              h('div', { class: 'row gap' }, bar, h('span', { class: 'muted small mono' }, (k + 1) + '/' + N)),
              h('div', { class: 'quiz-card' }, task.lead ? h('div', { class: 'muted small' }, task.lead) : null, h('div', { class: 'quiz-q' + (task.big ? ' big' : '') }, task.q)),
              inputArea, fb));
          };
          next();
        }

        function result(t, right, N) {
          const st = right >= 9 ? 3 : right >= 7 ? 2 : right >= 5 ? 1 : 0;
          const before = stars(t);
          store.score('learn:' + sKey(t), st);
          const gained = right * 10;
          store.current.data.scores['xp:' + def.id] = xp() + gained;
          store.current.data.scores['ld:' + Nova.dayKey()] = 1;
          store.save();
          if (st >= 2) Nova.kit.beep(660, 0.3, 'sine', 0.06, 1320);
          view.innerHTML = '';
          view.append(h('div', { class: 'result' },
            h('div', { class: 'result-ic', html: icon(st >= 2 ? 'trophy' : 'heart') }),
            h('h2', null, st === 3 ? S(P.level, { 1: 'Wow, alles super! 🎉', 3: 'Perfekt gemeistert!', 5: 'Hervorragend.' }) : st >= 1 ? S(P.level, { 1: 'Gut gemacht! 👍', 3: 'Gut gemacht!', 5: 'Solide Leistung.' }) : S(P.level, { 1: 'Üben macht stark! 💪', 3: 'Dranbleiben – das wird!', 5: 'Weiter üben empfohlen.' })),
            h('div', { class: 'big-stars' }, [0, 1, 2].map((i) => h('i', { class: i < st ? 'on' : '', html: icon('star') }))),
            h('p', { class: 'muted' }, right + ' von ' + N + ' richtig · +' + gained + ' XP' + (st > before ? ' · neuer Bestwert!' : '')),
            h('div', { class: 'row gap center wrap' },
              h('button', { class: 'btn primary', onclick: () => quiz(t), html: icon('reset') + ' Nochmal' }),
              h('button', { class: 'btn', onclick: () => intro(t) }, 'Erklärung'),
              h('button', { class: 'btn ghost', onclick: overview }, 'Themen'))));
        }
        overview();
      }
    });
  };
  Nova.learnKit = { rnd, pick, shuffle, gcd, lcm, de, choicesOf, numWrong };

  /* ======================= MATHE ======================= */
  const T = [];
  const add = (t) => T.push(t);

  add({ id: 'add20', title: 'Plus bis 20', sub: 'Mit Zehnerübergang', grades: [1, 2],
    intro: { 1: 'Beim Plusrechnen kommt etwas dazu. Wenn du über die 10 kommst, mach erst die 10 voll und rechne dann den Rest dazu.', 3: 'Zehnerübergang: Ergänze zuerst bis 10, dann addierst du den Rest. Beispiel: 8 + 5 = 8 + 2 + 3 = 13.' },
    gen() { const a = rnd(3, 9), b = rnd(11 - a, 9); const r = 10 - a;
      return { q: a + ' + ' + b + ' = ?', big: true, type: 'num', answer: a + b,
        explain: { 1: 'Stell dir ' + a + ' Äpfel vor 🍎 und es kommen ' + b + ' dazu. Erst ' + r + ' dazu, dann sind es 10. Dann noch ' + (b - r) + ' dazu: ' + (a + b) + '.', 3: a + ' + ' + r + ' = 10, dann + ' + (b - r) + ' = ' + (a + b) + '.', 5: 'Zerlegung: ' + a + ' + ' + r + ' + ' + (b - r) + ' = ' + (a + b) + '.' } }; } });

  add({ id: 'sub20', title: 'Minus bis 20', sub: 'Mit Zehnerübergang', grades: [1, 2],
    intro: { 1: 'Beim Minusrechnen nimmst du etwas weg. Geh erst zurück bis 10, dann nimm den Rest weg.', 3: 'Rechne erst bis zur 10 zurück, dann ziehst du den Rest ab. Beispiel: 13 − 5 = 13 − 3 − 2 = 8.' },
    gen() { const a = rnd(11, 18), b = rnd(a - 9, 9); const r = a - 10;
      return { q: a + ' − ' + b + ' = ?', big: true, type: 'num', answer: a - b,
        explain: { 1: 'Du hast ' + a + ' Bonbons 🍬 und gibst ' + b + ' ab. Erst ' + r + ' weg, dann hast du 10. Dann noch ' + (b - r) + ' weg: ' + (a - b) + '.', 3: a + ' − ' + r + ' = 10, dann − ' + (b - r) + ' = ' + (a - b) + '.', 5: a + ' − ' + r + ' − ' + (b - r) + ' = ' + (a - b) + '.' } }; } });

  add({ id: 'add100', title: 'Plus & Minus bis 100', sub: 'Zehner und Einer', grades: [2, 3],
    intro: { 1: 'Rechne erst die Zehner, dann die Einer.', 3: 'Zerlege die zweite Zahl in Zehner und Einer: 47 + 25 = 47 + 20 + 5 = 72.' },
    gen() { const plus = Math.random() < 0.5; let a = rnd(21, 89), b = rnd(11, 59); if (plus && a + b > 100) b = 100 - a - rnd(0, 10); if (!plus && b > a) [a, b] = [b, a]; if (b < 2) b = 2;
      const z = Math.floor(b / 10) * 10, e = b % 10, mid = plus ? a + z : a - z, res = plus ? a + b : a - b;
      return { q: a + (plus ? ' + ' : ' − ') + b + ' = ?', big: true, type: 'num', answer: res,
        explain: { 1: 'Erst die Zehner: ' + a + (plus ? ' + ' : ' − ') + z + ' = ' + mid + '. Dann die Einer: ' + mid + (plus ? ' + ' : ' − ') + e + ' = ' + res + '.', 5: a + (plus ? ' + ' : ' − ') + z + (plus ? ' + ' : ' − ') + e + ' = ' + res } }; } });

  add({ id: 'times', title: 'Das Einmaleins', sub: 'Malaufgaben', grades: [2, 4],
    intro: { 1: 'Mal heißt: Eine Zahl kommt mehrmals vor. 3 · 4 heißt: 4 + 4 + 4 = 12.', 3: 'Tipp: Nutze Kernaufgaben (·1, ·2, ·5, ·10). 7 · 6 = 5 · 6 + 2 · 6 = 30 + 12 = 42.', 4: 'Merke die Kernaufgaben und leite den Rest ab. Tauschaufgaben (a·b = b·a) halbieren die Arbeit.' },
    gen() { const a = rnd(2, 10), b = rnd(2, 10);
      const k = a > 5 ? '5 · ' + b + ' + ' + (a - 5) + ' · ' + b + ' = ' + 5 * b + ' + ' + (a - 5) * b + ' = ' + a * b : a + ' · ' + b + ' = ' + Array(a).fill(b).join(' + ') + ' = ' + a * b;
      return { q: a + ' · ' + b + ' = ?', big: true, type: 'num', answer: a * b,
        explain: { 1: 'Die ' + b + ' kommt ' + a + '-mal vor: ' + Array(a).fill(b).join(' + ') + ' = ' + a * b + '.', 3: k + '.', 5: a + ' · ' + b + ' = ' + a * b + ' (Tauschaufgabe: ' + b + ' · ' + a + ').' } }; } });

  add({ id: 'div', title: 'Geteilt rechnen', sub: 'Umkehraufgabe nutzen', grades: [2, 4],
    intro: { 1: 'Teilen heißt: gerecht verteilen. 12 Kekse an 3 Kinder – jedes bekommt 4.', 3: 'Nutze die Umkehraufgabe: 42 : 6 = ? → Welche Zahl mal 6 ergibt 42? → 7.' },
    gen() { const a = rnd(2, 10), b = rnd(2, 10), c = a * b;
      return { q: c + ' : ' + a + ' = ?', big: true, type: 'num', answer: b,
        explain: { 1: c + ' Kekse 🍪 an ' + a + ' Kinder verteilt: Jedes bekommt ' + b + ', denn ' + a + ' · ' + b + ' = ' + c + '.', 3: 'Umkehraufgabe: ' + a + ' · ? = ' + c + ' → ? = ' + b + '.' } }; } });

  add({ id: 'calc1000', title: 'Rechnen bis 1000', sub: 'Hunderter, Zehner, Einer', grades: [3, 4],
    intro: { 1: 'Rechne Stelle für Stelle: erst Hunderter, dann Zehner, dann Einer.', 3: 'Zerlege die Zahlen nach Stellenwerten: 356 + 427 = 300+400, 50+20, 6+7 → 700 + 70 + 13 = 783.' },
    gen() { const plus = Math.random() < 0.5; let a = rnd(120, 880), b = rnd(105, 499); if (plus && a + b > 1000) a = 1000 - b - rnd(0, 90); if (!plus && b > a) [a, b] = [b, a];
      const res = plus ? a + b : a - b;
      const H = (n) => Math.floor(n / 100) * 100, Z = (n) => Math.floor((n % 100) / 10) * 10, E = (n) => n % 10;
      return { q: a + (plus ? ' + ' : ' − ') + b + ' = ?', big: true, type: 'num', answer: res,
        explain: plus ? { 1: 'Hunderter: ' + H(a) + ' + ' + H(b) + ' = ' + (H(a) + H(b)) + '. Zehner: ' + Z(a) + ' + ' + Z(b) + ' = ' + (Z(a) + Z(b)) + '. Einer: ' + E(a) + ' + ' + E(b) + ' = ' + (E(a) + E(b)) + '. Zusammen: ' + res + '.', 5: (H(a) + H(b)) + ' + ' + (Z(a) + Z(b)) + ' + ' + (E(a) + E(b)) + ' = ' + res }
          : { 1: 'Rechne schrittweise: ' + a + ' − ' + H(b) + ' = ' + (a - H(b)) + ', dann − ' + (b % 100) + ' = ' + res + '.', 5: a + ' − ' + H(b) + ' − ' + (b % 100) + ' = ' + res } }; } });

  add({ id: 'divrest', title: 'Division mit Rest', sub: 'Was bleibt übrig?', grades: [3, 5],
    intro: { 1: 'Manchmal geht Teilen nicht ganz auf. Was übrig bleibt, heißt Rest.', 3: 'Suche die größte Malaufgabe, die in die Zahl passt. 23 : 5 → 4 · 5 = 20, Rest 3.' },
    gen() { const d = rnd(3, 9), q = rnd(3, 11), r = rnd(1, d - 1), n = d * q + r;
      const c = q + ' Rest ' + r;
      return { q: n + ' : ' + d + ' = ?', big: true, type: 'choice', answer: c,
        choices: choicesOf(c, [(q + 1) + ' Rest ' + r, q + ' Rest ' + (r + 1 < d ? r + 1 : r - 1), (q - 1) + ' Rest ' + (r + d), q + ' Rest ' + (d - r)]),
        explain: { 1: d + ' passt ' + q + '-mal in ' + n + ' (' + q + ' · ' + d + ' = ' + q * d + '). Übrig bleiben ' + r + '.', 5: q + ' · ' + d + ' = ' + q * d + '; ' + n + ' − ' + q * d + ' = ' + r + '.' } }; } });

  add({ id: 'round', title: 'Runden', sub: 'Auf Zehner, Hunderter, Tausender', grades: [3, 5],
    intro: { 1: 'Schau auf die Ziffer rechts davon: Bei 0, 1, 2, 3, 4 rundest du ab, bei 5, 6, 7, 8, 9 rundest du auf.', 4: 'Rundungsregel: Entscheidend ist die Ziffer rechts von der Rundungsstelle (0–4 abrunden, 5–9 aufrunden).' },
    gen() { const pl = pick([[10, 'Zehner'], [100, 'Hunderter'], [1000, 'Tausender']]); const n = rnd(pl[0] * 2, pl[0] * 99) + rnd(0, 9);
      const res = Math.round(n / pl[0]) * pl[0], dig = Math.floor((n % pl[0]) / (pl[0] / 10));
      return { q: 'Runde ' + n.toLocaleString('de-DE') + ' auf ' + pl[1] + '.', type: 'num', answer: res,
        explain: { 1: 'Die Ziffer rechts davon ist ' + dig + '. ' + (dig >= 5 ? 'Das ist 5 oder mehr → aufrunden' : 'Das ist weniger als 5 → abrunden') + ': ' + res.toLocaleString('de-DE') + '.', 5: 'Entscheidende Ziffer ' + dig + ' → ' + (dig >= 5 ? 'aufrunden' : 'abrunden') + ': ' + res.toLocaleString('de-DE') } }; } });

  add({ id: 'units', title: 'Größen umrechnen', sub: 'Längen, Gewichte, Zeit, Geld', grades: [3, 6],
    intro: { 1: '1 m = 100 cm, 1 kg = 1000 g, 1 h = 60 min, 1 € = 100 ct.', 3: 'Merke die Umrechnungszahlen: 1 km = 1000 m, 1 m = 100 cm, 1 cm = 10 mm, 1 kg = 1000 g, 1 t = 1000 kg, 1 h = 60 min, 1 min = 60 s, 1 € = 100 ct.' },
    gen() { const u = pick([['m', 'cm', 100], ['km', 'm', 1000], ['kg', 'g', 1000], ['h', 'min', 60], ['€', 'ct', 100], ['cm', 'mm', 10], ['min', 's', 60], ['t', 'kg', 1000]]);
      const big = Math.random() < 0.6; const v = rnd(2, 9);
      if (big) return { q: v + ' ' + u[0] + ' = ? ' + u[1], type: 'num', answer: v * u[2], explain: { 1: '1 ' + u[0] + ' sind ' + u[2] + ' ' + u[1] + '. Also sind ' + v + ' ' + u[0] + ' = ' + v + ' · ' + u[2] + ' = ' + v * u[2] + ' ' + u[1] + '.', 5: v + ' · ' + u[2] + ' = ' + v * u[2] + ' ' + u[1] } };
      return { q: v * u[2] + ' ' + u[1] + ' = ? ' + u[0], type: 'num', answer: v, explain: { 1: u[2] + ' ' + u[1] + ' sind 1 ' + u[0] + '. ' + v * u[2] + ' : ' + u[2] + ' = ' + v + '.', 5: v * u[2] + ' : ' + u[2] + ' = ' + v + ' ' + u[0] } }; } });

  add({ id: 'order', title: 'Punkt vor Strich', sub: 'Rechenregeln & Klammern', grades: [4, 6],
    intro: { 1: 'Mal und Geteilt rechnest du zuerst, dann Plus und Minus. Was in Klammern steht, kommt ganz zuerst.', 4: 'Reihenfolge: Klammern → Potenzen → Punktrechnung (·, :) → Strichrechnung (+, −).' },
    gen() { const a = rnd(2, 20), b = rnd(2, 9), c = rnd(2, 9); const kind = rnd(0, 2);
      if (kind === 0) return { q: a + ' + ' + b + ' · ' + c + ' = ?', big: true, type: 'num', answer: a + b * c, explain: { 1: 'Erst Mal: ' + b + ' · ' + c + ' = ' + b * c + '. Dann Plus: ' + a + ' + ' + b * c + ' = ' + (a + b * c) + '.', 5: 'Punkt vor Strich: ' + a + ' + ' + b * c + ' = ' + (a + b * c) } };
      if (kind === 1) return { q: '(' + a + ' + ' + b + ') · ' + c + ' = ?', big: true, type: 'num', answer: (a + b) * c, explain: { 1: 'Klammer zuerst: ' + a + ' + ' + b + ' = ' + (a + b) + '. Dann · ' + c + ' = ' + (a + b) * c + '.', 5: (a + b) + ' · ' + c + ' = ' + (a + b) * c } };
      const d = rnd(1, c - 1), p = b * c;
      return { q: p + ' : ' + b + ' − ' + d + ' = ?', big: true, type: 'num', answer: c - d, explain: { 1: 'Erst Geteilt: ' + p + ' : ' + b + ' = ' + c + '. Dann Minus: ' + c + ' − ' + d + ' = ' + (c - d) + '.', 5: 'Punkt vor Strich: ' + c + ' − ' + d + ' = ' + (c - d) } }; } });

  add({ id: 'decimal', title: 'Dezimalzahlen', sub: 'Komma-Zahlen rechnen', grades: [5, 7],
    intro: { 1: 'Bei Kommazahlen schreibst du Komma unter Komma. Dann rechnest du wie gewohnt.', 3: 'Addieren/Subtrahieren: Komma unter Komma. Multiplizieren: erst ohne Komma rechnen, dann so viele Nachkommastellen setzen, wie beide Faktoren zusammen haben.' },
    gen() { const k = rnd(0, 2);
      if (k < 2) { const a = rnd(11, 99) / 10, b = rnd(101, 999) / 100; const plus = k === 0 || a < b; const x = plus ? a : Math.max(a, b), y = plus ? b : Math.min(a, b); const res = Math.round((plus ? x + y : x - y) * 100) / 100;
        return { q: de(x) + (plus ? ' + ' : ' − ') + de(y) + ' = ?', big: true, type: 'num', answer: res, hint: 'Komma oder Punkt ist egal', explain: { 1: 'Schreibe Komma unter Komma: ' + x.toFixed(2).replace('.', ',') + (plus ? ' + ' : ' − ') + y.toFixed(2).replace('.', ',') + ' = ' + de(res) + '.', 5: (plus ? 'Summe' : 'Differenz') + ': ' + de(res) } }; }
      const a = rnd(2, 9) / 10, b = rnd(2, 12); const res = Math.round(a * b * 100) / 100;
      return { q: de(a) + ' · ' + b + ' = ?', big: true, type: 'num', answer: res, explain: { 1: 'Rechne ' + Math.round(a * 10) + ' · ' + b + ' = ' + Math.round(a * 10) * b + '. ' + de(a) + ' hat eine Nachkommastelle, also: ' + de(res) + '.', 5: Math.round(a * 10) * b + ' / 10 = ' + de(res) } }; } });

  add({ id: 'neg', title: 'Negative Zahlen', sub: 'Rechnen mit Minus-Zahlen', grades: [6, 8],
    intro: { 1: 'Stell dir ein Thermometer vor: Unter 0 sind die Minus-Grade.', 3: 'Auf dem Zahlenstrahl: Plus heißt nach rechts, Minus nach links. Minus mal Minus ergibt Plus.', 4: 'Vorzeichenregeln: (−)+(−) → Beträge addieren, Vorzeichen −. a − (−b) = a + b. (−)·(−) = (+), (−)·(+) = (−).' },
    gen() { const k = rnd(0, 2), a = rnd(-15, 15) || 3, b = rnd(-12, 12) || -4; const p = (n) => (n < 0 ? '(' + n + ')' : n);
      if (k === 0) return { q: a + ' + ' + p(b) + ' = ?', big: true, type: 'num', answer: a + b, hint: 'Minus mit „-" eingeben', explain: { 1: 'Starte bei ' + a + ' auf dem Thermometer 🌡️ und geh ' + Math.abs(b) + ' nach ' + (b < 0 ? 'unten' : 'oben') + ': ' + (a + b) + '.', 4: a + (b < 0 ? ' − ' + -b : ' + ' + b) + ' = ' + (a + b) } };
      if (k === 1) return { q: a + ' − ' + p(b) + ' = ?', big: true, type: 'num', answer: a - b, hint: 'Minus mit „-" eingeben', explain: { 1: b < 0 ? 'Minus Minus wird Plus: ' + a + ' + ' + -b + ' = ' + (a - b) + '.' : 'Geh von ' + a + ' aus ' + b + ' nach unten: ' + (a - b) + '.', 4: a + ' − ' + p(b) + ' = ' + (a - b) } };
      const x = rnd(-9, 9) || -2, y = rnd(-9, 9) || 3; return { q: p(x) + ' · ' + p(y) + ' = ?', big: true, type: 'num', answer: x * y, hint: 'Minus mit „-" eingeben', explain: { 1: Math.abs(x) + ' · ' + Math.abs(y) + ' = ' + Math.abs(x * y) + '. ' + ((x < 0) === (y < 0) ? 'Gleiche Vorzeichen → Plus.' : 'Verschiedene Vorzeichen → Minus.') + ' Ergebnis: ' + x * y + '.', 4: 'Vorzeichenregel → ' + x * y } }; } });

  add({ id: 'fracsimp', title: 'Brüche kürzen', sub: 'So einfach wie möglich', grades: [5, 7],
    intro: { 1: 'Kürzen heißt: Zähler (oben) und Nenner (unten) durch dieselbe Zahl teilen. Der Bruch bleibt gleich groß.', 4: 'Kürze mit dem größten gemeinsamen Teiler (ggT) von Zähler und Nenner, dann ist der Bruch vollständig gekürzt.' },
    gen() { let n, d; do { n = rnd(1, 9); d = rnd(2, 12); } while (n >= d || gcd(n, d) !== 1); const f = rnd(2, 9);
      return { q: 'Kürze vollständig: ' + n * f + '/' + d * f, big: true, type: 'frac', simplest: true, answer: { n, d }, placeholder: 'z. B. 3/4',
        explain: { 1: 'Oben und unten passt die ' + f + ': ' + n * f + ' : ' + f + ' = ' + n + ' und ' + d * f + ' : ' + f + ' = ' + d + '. Also ' + n + '/' + d + '.', 4: 'ggT(' + n * f + ', ' + d * f + ') = ' + f + ' → ' + n + '/' + d } }; } });

  add({ id: 'fracadd', title: 'Brüche addieren', sub: 'Gleichnamig machen', grades: [6, 7],
    intro: { 1: 'Bei gleichem Nenner (unten) addierst du nur die Zähler (oben).', 3: 'Bei verschiedenen Nennern erst gleichnamig machen (gemeinsamer Nenner), dann Zähler addieren und kürzen.', 4: 'a/b + c/d: Hauptnenner = kgV(b, d), erweitern, Zähler addieren, Ergebnis kürzen.' },
    gen(lv, gr) { const same = gr <= 6 && Math.random() < 0.5; let b = rnd(2, 9), d = same ? b : rnd(2, 9); if (!same && d === b) d = b + 1;
      const a = rnd(1, b - 1), c = rnd(1, d - 1); const L = lcm(b, d), n = a * (L / b) + c * (L / d), g = gcd(n, L);
      return { q: a + '/' + b + ' + ' + c + '/' + d + ' = ?', big: true, type: 'frac', answer: { n: n / g, d: L / g }, placeholder: 'z. B. 5/6', hint: 'Kürzen ist erlaubt, muss aber nicht',
        explain: same ? { 1: 'Gleicher Nenner: ' + a + ' + ' + c + ' = ' + (a + c) + ', Nenner bleibt ' + b + ' → ' + (a + c) + '/' + b + (g > 1 ? ' = ' + n / g + '/' + L / g : '') + '.' }
          : { 1: 'Gemeinsamer Nenner ist ' + L + '. ' + a + '/' + b + ' = ' + a * (L / b) + '/' + L + ' und ' + c + '/' + d + ' = ' + c * (L / d) + '/' + L + '. Zusammen: ' + n + '/' + L + (g > 1 ? ' = ' + n / g + '/' + L / g : '') + '.', 4: 'kgV(' + b + ', ' + d + ') = ' + L + ': ' + a * (L / b) + '/' + L + ' + ' + c * (L / d) + '/' + L + ' = ' + n + '/' + L + (g > 1 ? ' = ' + n / g + '/' + L / g : '') } }; } });

  add({ id: 'area', title: 'Fläche & Umfang', sub: 'Rechteck, Quadrat, Dreieck', grades: [4, 7],
    intro: { 1: 'Der Umfang ist der Weg einmal außen herum. Die Fläche ist, wie viel Platz innen ist.', 3: 'Rechteck: A = a · b, u = 2·a + 2·b. Quadrat: A = a · a. Dreieck: A = g · h : 2.' },
    gen() { const k = rnd(0, 2), a = rnd(3, 15), b = rnd(2, 12);
      if (k === 0) return { lead: 'Rechteck mit a = ' + a + ' cm und b = ' + b + ' cm', q: 'Wie groß ist die Fläche (in cm²)?', type: 'num', answer: a * b, explain: { 1: 'Fläche = Länge mal Breite: ' + a + ' · ' + b + ' = ' + a * b + ' cm². So viele 1-cm-Kästchen passen hinein.', 4: 'A = a · b = ' + a * b + ' cm²' } };
      if (k === 1) return { lead: 'Rechteck mit a = ' + a + ' cm und b = ' + b + ' cm', q: 'Wie groß ist der Umfang (in cm)?', type: 'num', answer: 2 * (a + b), explain: { 1: 'Einmal außen herum: ' + a + ' + ' + b + ' + ' + a + ' + ' + b + ' = ' + 2 * (a + b) + ' cm.', 4: 'u = 2·(a + b) = ' + 2 * (a + b) + ' cm' } };
      const g = rnd(2, 12) * 2, hh = rnd(2, 12); return { lead: 'Dreieck mit Grundseite g = ' + g + ' cm und Höhe h = ' + hh + ' cm', q: 'Wie groß ist die Fläche (in cm²)?', type: 'num', answer: (g * hh) / 2, explain: { 1: 'Ein Dreieck ist ein halbes Rechteck: ' + g + ' · ' + hh + ' = ' + g * hh + ', die Hälfte ist ' + (g * hh) / 2 + ' cm².', 4: 'A = g·h/2 = ' + (g * hh) / 2 + ' cm²' } }; } });

  add({ id: 'percent', title: 'Prozentrechnung', sub: 'Prozentwert & Prozentsatz', grades: [6, 9],
    intro: { 1: 'Prozent heißt „von Hundert". 50 % ist die Hälfte, 25 % ein Viertel, 10 % ein Zehntel.', 3: 'Prozentwert W = G · p / 100. Prozentsatz p = W / G · 100. Tipp: Erst 1 % ausrechnen (G : 100), dann mal p.', 4: 'Grundformel: W = G · p%. Umgestellt: p% = W / G, G = W / p%.' },
    gen() { const G = pick([20, 40, 50, 80, 120, 200, 250, 300, 400, 500, 600, 800]); const p = pick([5, 10, 15, 20, 25, 30, 40, 50, 75]); const W = (G * p) / 100;
      if (Math.random() < 0.6) return { q: 'Wie viel sind ' + p + ' % von ' + G + '?', type: 'num', answer: W, explain: { 1: '1 % von ' + G + ' ist ' + de(G / 100) + '. Mal ' + p + ' ergibt ' + de(W) + '.', 4: 'W = ' + G + ' · ' + p + '/100 = ' + de(W) } };
      return { q: de(W) + ' von ' + G + ' sind wie viel Prozent?', type: 'num', answer: p, hint: 'Nur die Zahl eingeben', explain: { 1: de(W) + ' : ' + G + ' = ' + de(p / 100) + ' → mal 100 = ' + p + ' %.', 4: 'p = W/G · 100 = ' + p + ' %' } }; } });

  add({ id: 'prob', title: 'Wahrscheinlichkeit', sub: 'Würfel & Münzen', grades: [6, 9],
    intro: { 1: 'Wahrscheinlichkeit = günstige Möglichkeiten geteilt durch alle Möglichkeiten.', 4: 'Laplace-Wahrscheinlichkeit: P(E) = |E| / |Ω| (alle Ergebnisse gleich wahrscheinlich).' },
    gen() { const k = rnd(0, 2);
      if (k === 0) { const t = rnd(1, 5); const n = 6 - t, g = gcd(n, 6); return { q: 'Ein Würfel wird geworfen. Wie wahrscheinlich ist eine Zahl größer als ' + t + '?', type: 'frac', answer: { n: n / g, d: 6 / g }, placeholder: 'als Bruch, z. B. 1/2', explain: { 1: 'Größer als ' + t + ' sind ' + n + ' Zahlen von 6. Also ' + n + '/6' + (g > 1 ? ' = ' + n / g + '/' + 6 / g : '') + '.' } }; }
      if (k === 1) return { q: 'Wie wahrscheinlich ist eine gerade Zahl beim Würfeln?', type: 'frac', answer: { n: 1, d: 2 }, placeholder: 'als Bruch', explain: { 1: 'Gerade sind 2, 4, 6 – also 3 von 6 = 1/2.' } };
      const r = rnd(2, 6), b = rnd(2, 6), g = gcd(r, r + b); return { q: 'In einer Tüte sind ' + r + ' rote und ' + b + ' blaue Kugeln. Wie wahrscheinlich ziehst du eine rote?', type: 'frac', answer: { n: r / g, d: (r + b) / g }, placeholder: 'als Bruch', explain: { 1: r + ' rote von insgesamt ' + (r + b) + ' Kugeln: ' + r + '/' + (r + b) + (g > 1 ? ' = ' + r / g + '/' + (r + b) / g : '') + '.' } }; } });

  add({ id: 'lineq', title: 'Gleichungen lösen', sub: 'x finden', grades: [7, 9],
    intro: { 1: 'Eine Gleichung ist wie eine Waage ⚖️: Was du links machst, musst du auch rechts machen.', 3: 'Bringe alles ohne x auf die andere Seite (Umkehroperation), dann teile durch die Zahl vor dem x.', 4: 'Äquivalenzumformungen: auf beiden Seiten dieselbe Operation, bis x isoliert ist.' },
    gen() { const x = rnd(-6, 12), a = rnd(2, 9), b = rnd(-15, 20); const c = a * x + b;
      return { q: a + 'x ' + (b < 0 ? '− ' + -b : '+ ' + b) + ' = ' + c, big: true, type: 'num', answer: x, placeholder: 'x = ?',
        explain: { 1: 'Erst ' + (b < 0 ? '+ ' + -b : '− ' + b) + ' auf beiden Seiten: ' + a + 'x = ' + (c - b) + '. Dann durch ' + a + ' teilen: x = ' + x + '.', 4: a + 'x = ' + (c - b) + ' | : ' + a + ' → x = ' + x } }; } });

  add({ id: 'linfun', title: 'Lineare Funktionen', sub: 'f(x) = mx + b', grades: [8, 10],
    intro: { 1: 'Setze die Zahl für x ein und rechne aus.', 4: 'f(x) = m·x + b: m ist die Steigung, b der y-Achsenabschnitt. Einsetzen und berechnen.' },
    gen() { const m = rnd(-4, 5) || 2, b = rnd(-8, 8), x = rnd(-5, 6);
      return { q: 'f(x) = ' + m + 'x ' + (b < 0 ? '− ' + -b : '+ ' + b) + '. Berechne f(' + x + ').', type: 'num', answer: m * x + b,
        explain: { 1: 'Für x setzen wir ' + x + ' ein: ' + m + ' · ' + (x < 0 ? '(' + x + ')' : x) + ' = ' + m * x + ', dann ' + (b < 0 ? '− ' + -b : '+ ' + b) + ' = ' + (m * x + b) + '.', 4: 'f(' + x + ') = ' + m * x + ' ' + (b < 0 ? '− ' + -b : '+ ' + b) + ' = ' + (m * x + b) } }; } });

  add({ id: 'powers', title: 'Potenzen & Wurzeln', sub: 'Hochzahlen und Quadratwurzeln', grades: [7, 10],
    intro: { 1: '3² heißt 3 · 3. Die Wurzel √9 fragt: Welche Zahl mal sich selbst ergibt 9? → 3.', 4: 'aⁿ = a · a · … · a (n Faktoren). √a ist die nicht-negative Zahl x mit x² = a.' },
    gen() { const k = rnd(0, 2);
      if (k === 0) { const a = rnd(2, 15); return { q: a + '² = ?', big: true, type: 'num', answer: a * a, explain: { 1: a + ' · ' + a + ' = ' + a * a + '.' } }; }
      if (k === 1) { const a = rnd(2, 15); return { q: '√' + a * a + ' = ?', big: true, type: 'num', answer: a, explain: { 1: a + ' · ' + a + ' = ' + a * a + ', also ist √' + a * a + ' = ' + a + '.' } }; }
      const a = rnd(2, 5), n = rnd(3, a === 2 ? 8 : 4); return { q: a + (n === 3 ? '³' : '^' + n) + ' = ?', big: true, type: 'num', answer: Math.pow(a, n), explain: { 1: Array(n).fill(a).join(' · ') + ' = ' + Math.pow(a, n) + '.' } }; } });

  add({ id: 'pyth', title: 'Satz des Pythagoras', sub: 'a² + b² = c²', grades: [8, 10],
    intro: { 1: 'Im rechtwinkligen Dreieck gilt: Die beiden kurzen Seiten im Quadrat zusammen ergeben die lange Seite im Quadrat.', 4: 'Im rechtwinkligen Dreieck mit Hypotenuse c gilt a² + b² = c². Also c = √(a² + b²) bzw. a = √(c² − b²).' },
    gen() { const tr = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29]]); const f = tr[2] > 20 ? 1 : rnd(1, 2); const [a, b, c] = tr.map((x) => x * f);
      if (Math.random() < 0.6) return { lead: 'Rechtwinkliges Dreieck: a = ' + a + ' cm, b = ' + b + ' cm', q: 'Wie lang ist die Hypotenuse c?', type: 'num', answer: c, explain: { 1: a + '² + ' + b + '² = ' + a * a + ' + ' + b * b + ' = ' + c * c + '. √' + c * c + ' = ' + c + ' cm.', 4: 'c = √(' + a * a + ' + ' + b * b + ') = ' + c + ' cm' } };
      return { lead: 'Rechtwinkliges Dreieck: c = ' + c + ' cm (Hypotenuse), a = ' + a + ' cm', q: 'Wie lang ist b?', type: 'num', answer: b, explain: { 1: c + '² − ' + a + '² = ' + c * c + ' − ' + a * a + ' = ' + b * b + '. √' + b * b + ' = ' + b + ' cm.', 4: 'b = √(' + c * c + ' − ' + a * a + ') = ' + b + ' cm' } }; } });

  add({ id: 'quad', title: 'Quadratische Gleichungen', sub: 'pq-Formel', grades: [9, 11],
    intro: { 1: 'Eine quadratische Gleichung hat meist zwei Lösungen. Mit der pq-Formel findest du sie.', 4: 'x² + px + q = 0 → x₁,₂ = −p/2 ± √((p/2)² − q). Alternativ: Satz von Vieta (x₁ + x₂ = −p, x₁ · x₂ = q).' },
    gen() { let r1 = rnd(-8, 8), r2 = rnd(-8, 8); if (r1 === r2) r2 = r1 + 2; const p = -(r1 + r2), q = r1 * r2;
      const fmt = (v, s) => (v === 0 ? '' : (v < 0 ? ' − ' : ' + ') + (Math.abs(v) === 1 && s ? '' : Math.abs(v)) + s);
      return { q: 'x²' + fmt(p, 'x') + fmt(q, '') + ' = 0', big: true, type: 'set', answer: [r1, r2], allowText: true, placeholder: 'z. B. -2; 5', hint: 'Beide Lösungen mit „;" trennen',
        explain: { 1: 'Gesucht sind zwei Zahlen: zusammen ' + -p + ' und mal genommen ' + q + '. Das sind ' + r1 + ' und ' + r2 + '.', 4: 'p = ' + p + ', q = ' + q + '. x = ' + de(-p / 2) + ' ± √(' + de((p / 2) ** 2) + ' − ' + (q < 0 ? '(' + q + ')' : q) + ') = ' + de(-p / 2) + ' ± ' + de(Math.abs(r1 - r2) / 2) + ' → x₁ = ' + Math.min(r1, r2) + ', x₂ = ' + Math.max(r1, r2) } }; } });

  Nova.learnApp({ id: 'mathe', name: 'Mathe', icon: 'a-math', grad: ['#4f8cff', '#7c5cff'], desc: 'Mathe üben von Klasse 1 bis 10 – mit Erklärungen passend zu deinem Alter', topics: T });

  Nova.learnCheck = check; // für Tests
})();
