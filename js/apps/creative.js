/* Nova OS – Kreativ: Zeichnen, Pixel-Studio, Beat-Maker, Galerie */
(function () {
  'use strict';
  const Nova = window.Nova;
  const { h, $$, ui, icon, store } = Nova;
  const PALETTE = ['#111827', '#ffffff', '#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#a16207', '#9ca3af'];
  Nova.pendingOpen = null; // { app, id } – zum Öffnen aus der Galerie

  function paletteEl(colors, cur, onPick, custom = true) {
    const el = h('div', { class: 'palette' });
    const render = (c) => {
      el.innerHTML = '';
      colors.forEach((col) => el.append(h('button', { class: 'pal' + (col === c ? ' on' : ''), style: { background: col }, onclick: () => { onPick(col); render(col); } })));
      if (custom) {
        const inp = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(c) ? c : '#000000', oninput: (e) => { onPick(e.target.value); } });
        el.append(h('label', { class: 'pal custom', title: 'Eigene Farbe', html: icon('palette') }, inp));
      }
    };
    render(cur);
    return el;
  }

  /* ======================= ZEICHNEN ======================= */
  Nova.registerApp({
    id: 'draw', name: 'Zeichnen', icon: 'a-draw', folder: 'creative', grad: ['#ff5c8a', '#a855f7'], desc: 'Malen mit Pinsel, Farben & Ebenen-Undo', full: true,
    mount(body, ctx) {
      const W = 1600, H = 1000;
      const cv = h('canvas', { class: 'draw-cv', width: W, height: H });
      const g = cv.getContext('2d');
      let tool = 'brush', color = '#111827', size = 8, drawing = false, last = null, editing = null, dirty = false;
      const undo = [];
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
      const snap = () => { undo.push(g.getImageData(0, 0, W, H)); if (undo.length > 25) undo.shift(); };

      if (Nova.pendingOpen && Nova.pendingOpen.app === 'draw') {
        const it = store.get('drawings', Nova.pendingOpen.id); Nova.pendingOpen = null;
        if (it) { editing = it; const img = new Image(); img.onload = () => g.drawImage(img, 0, 0, W, H); img.src = it.img; }
      }
      const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, p: e.pressure && e.pointerType === 'pen' ? e.pressure : 0.6 }; };
      const stroke = (a, b) => {
        g.globalCompositeOperation = 'source-over';
        g.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
        g.globalAlpha = tool === 'marker' ? 0.35 : 1;
        g.lineWidth = size * (tool === 'marker' ? 2.5 : 1) * (0.6 + b.p * 0.8);
        g.lineCap = g.lineJoin = 'round';
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        g.globalAlpha = 1;
      };
      const fill = (x, y) => {
        x = Math.floor(x); y = Math.floor(y);
        const img = g.getImageData(0, 0, W, H), d = img.data;
        const i0 = (y * W + x) * 4, t = [d[i0], d[i0 + 1], d[i0 + 2]];
        const n = parseInt(color.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        const near = (i) => Math.abs(d[i] - t[0]) + Math.abs(d[i + 1] - t[1]) + Math.abs(d[i + 2] - t[2]) < 60;
        if (Math.abs(t[0] - c[0]) + Math.abs(t[1] - c[1]) + Math.abs(t[2] - c[2]) < 5) return;
        const st = [x, y], seen = new Uint8Array(W * H);
        while (st.length) {
          const py = st.pop(), px = st.pop();
          if (px < 0 || py < 0 || px >= W || py >= H) continue;
          const k = py * W + px; if (seen[k]) continue; seen[k] = 1;
          const i = k * 4; if (!near(i)) continue;
          d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
          st.push(px + 1, py, px - 1, py, px, py + 1, px, py - 1);
        }
        g.putImageData(img, 0, 0);
      };
      cv.addEventListener('pointerdown', (e) => {
        cv.setPointerCapture(e.pointerId); snap(); dirty = true;
        const p = pos(e);
        if (tool === 'fill') { fill(p.x, p.y); return; }
        drawing = true; last = p; stroke(p, { ...p, x: p.x + 0.01 });
      });
      cv.addEventListener('pointermove', (e) => { if (!drawing) return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; for (const ev of evs) { const p = pos(ev); stroke(last, p); last = p; } });
      const end = () => { drawing = false; };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

      const tools = [['brush', 'brush', 'Pinsel'], ['marker', 'edit', 'Marker'], ['eraser', 'eraser', 'Radierer'], ['fill', 'fill', 'Füllen']];
      const toolEl = h('div', { class: 'tool-group' }, tools.map(([id, ic, label]) => h('button', { class: 'tool' + (id === tool ? ' on' : ''), title: label, onclick: (e) => { tool = id; $$('.tool', toolEl).forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); }, html: icon(ic) })));
      const sizeEl = h('input', { type: 'range', class: 'range', min: 2, max: 60, value: size, oninput: (e) => (size = +e.target.value) });
      const save = async () => {
        const t = h('canvas', { width: 800, height: 500 }); t.getContext('2d').drawImage(cv, 0, 0, 800, 500);
        const img = t.toDataURL('image/jpeg', 0.82);
        let name = editing ? editing.name : await ui.prompt('Bild speichern', { placeholder: 'Name deines Bildes', value: 'Bild ' + (store.items('drawings').length + 1) });
        if (!name) return;
        editing = store.put('drawings', { ...(editing || {}), name, img, kind: 'draw' });
        dirty = false;
        ui.toast('In der Galerie gespeichert');
      };
      body.append(h('div', { class: 'draw' },
        h('div', { class: 'draw-bar card' },
          toolEl,
          h('div', { class: 'size-wrap', html: icon('brush', 'sm') }, sizeEl),
          paletteEl(PALETTE, color, (c) => { color = c; if (tool === 'eraser' || tool === 'fill' && false) tool = 'brush'; }),
          h('div', { class: 'tool-group' },
            h('button', { class: 'tool', title: 'Rückgängig', onclick: () => { const u = undo.pop(); if (u) g.putImageData(u, 0, 0); }, html: icon('undo') }),
            h('button', { class: 'tool', title: 'Alles löschen', onclick: async () => { if (await ui.confirm('Leinwand leeren?', null, { label: 'Leeren', danger: true })) { snap(); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); } }, html: icon('trash') }))
        ),
        h('div', { class: 'draw-area' }, cv)
      ));
      ctx.setActions(
        h('button', { class: 'btn sm ghost', onclick: () => cv.toBlob((b) => Nova.download('zeichnung.png', b)), html: icon('download') }),
        h('button', { class: 'btn sm primary', onclick: save, html: icon('image') + ' Speichern' })
      );
      const onKey = Nova.kit.keys((k, e, down) => { if (down && (e.ctrlKey || e.metaKey) && k === 'z') { const u = undo.pop(); if (u) g.putImageData(u, 0, 0); return true; } });
      return () => { onKey(); if (dirty) ui.toast('Hinweis: Nicht gespeicherte Zeichnung verworfen'); };
    }
  });

  /* ======================= PIXEL-STUDIO ======================= */
  const PIX_PAL = ['#00000000', '#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179', '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86'];
  function pixToCanvas(px, n, scale) {
    const c = h('canvas', { width: n * scale, height: n * scale }), g = c.getContext('2d');
    px.forEach((col, i) => { if (col && col !== '#00000000') { g.fillStyle = col; g.fillRect((i % n) * scale, Math.floor(i / n) * scale, scale, scale); } });
    return c;
  }
  Nova.registerApp({
    id: 'pixel', name: 'Pixel-Studio', icon: 'a-pixel', folder: 'creative', grad: ['#00c2a8', '#4f8cff'], desc: 'Pixel-Art & Sprites erstellen',
    mount(body, ctx) {
      let n = 16, px, color = '#b13e53', tool = 'pen', mirror = false, editing = null, down = false;
      const undo = [];
      const gridEl = h('div', { class: 'pix-grid' });
      if (Nova.pendingOpen && Nova.pendingOpen.app === 'pixel') { editing = store.get('pixels', Nova.pendingOpen.id); Nova.pendingOpen = null; }
      const reset = (size) => { n = size; px = new Array(n * n).fill('#00000000'); build(); };
      const paint = (i) => {
        const set = (j) => { px[j] = tool === 'erase' ? '#00000000' : color; gridEl.children[j].style.background = px[j] === '#00000000' ? '' : px[j]; };
        if (tool === 'fill') {
          const t = px[i]; if (t === color) return;
          const st = [i]; while (st.length) { const j = st.pop(); if (px[j] !== t) continue; set(j); const x = j % n, y = Math.floor(j / n); if (x > 0) st.push(j - 1); if (x < n - 1) st.push(j + 1); if (y > 0) st.push(j - n); if (y < n - 1) st.push(j + n); }
          return;
        }
        if (tool === 'pick') { color = px[i] === '#00000000' ? color : px[i]; renderPal(); return; }
        set(i);
        if (mirror) { const x = i % n, y = Math.floor(i / n); set(y * n + (n - 1 - x)); }
      };
      const build = () => {
        gridEl.innerHTML = '';
        gridEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
        px.forEach((c) => gridEl.append(h('div', { class: 'px', style: { background: c === '#00000000' ? '' : c } })));
      };
      const idx = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.parentNode === gridEl ? Array.prototype.indexOf.call(gridEl.children, el) : -1; };
      gridEl.addEventListener('pointerdown', (e) => { e.preventDefault(); gridEl.setPointerCapture(e.pointerId); undo.push(px.slice()); if (undo.length > 40) undo.shift(); down = true; const i = idx(e); if (i >= 0) paint(i); });
      gridEl.addEventListener('pointermove', (e) => { if (!down || tool === 'fill' || tool === 'pick') return; const i = idx(e); if (i >= 0) paint(i); });
      gridEl.addEventListener('pointerup', () => (down = false));
      const palWrap = h('div');
      const renderPal = () => { palWrap.innerHTML = ''; palWrap.append(paletteEl(PIX_PAL.slice(1), color, (c) => { color = c; if (tool === 'erase' || tool === 'pick') setTool('pen'); })); };
      const toolBtns = h('div', { class: 'tool-group' });
      const setTool = (t) => { tool = t; toolBtns.innerHTML = ''; [['pen', 'edit', 'Stift'], ['erase', 'eraser', 'Radierer'], ['fill', 'fill', 'Füllen'], ['pick', 'palette', 'Farbe aufnehmen']].forEach(([id, ic, l]) => toolBtns.append(h('button', { class: 'tool' + (tool === id ? ' on' : ''), title: l, onclick: () => setTool(id), html: icon(ic) }))); };
      setTool('pen'); renderPal();
      if (editing) { n = editing.n; px = editing.px.slice(); build(); } else reset(16);
      const save = async () => {
        const name = editing ? editing.name : await ui.prompt('Pixel-Art speichern', { value: 'Sprite ' + (store.items('pixels').length + 1) });
        if (!name) return;
        const thumb = pixToCanvas(px, n, Math.max(4, Math.floor(256 / n))).toDataURL('image/png');
        editing = store.put('pixels', { ...(editing || {}), name, n, px: px.slice(), img: thumb, kind: 'pixel' });
        ui.toast('In der Galerie gespeichert');
      };
      body.append(h('div', { class: 'pix' },
        h('div', { class: 'pix-side card' },
          toolBtns,
          h('label', { class: 'toggle-row' }, h('span', null, 'Spiegeln'), h('input', { type: 'checkbox', class: 'switch', onchange: (e) => (mirror = e.target.checked) })),
          Nova.shell.seg([['16²', 16], ['24²', 24], ['32²', 32]], n, async (v) => { if (await ui.confirm('Neue Leinwand?', 'Die aktuelle Pixel-Art wird geleert.')) { editing = null; reset(v); } }),
          palWrap,
          h('div', { class: 'tool-group' },
            h('button', { class: 'tool', title: 'Rückgängig', onclick: () => { const u = undo.pop(); if (u) { px = u; build(); } }, html: icon('undo') }),
            h('button', { class: 'tool', title: 'Leeren', onclick: () => { undo.push(px.slice()); px.fill('#00000000'); build(); }, html: icon('trash') }))
        ),
        h('div', { class: 'pix-area' }, gridEl)
      ));
      ctx.setActions(
        h('button', { class: 'btn sm ghost', title: 'Als PNG exportieren', onclick: () => pixToCanvas(px, n, 32).toBlob((b) => Nova.download('pixel-art.png', b)), html: icon('download') }),
        h('button', { class: 'btn sm primary', onclick: save, html: icon('image') + ' Speichern' })
      );
    }
  });

  /* ======================= BEAT-MAKER ======================= */
  const TRACKS = [
    { name: 'Kick', color: '#ff5c8a' }, { name: 'Snare', color: '#ff9f43' }, { name: 'Hi-Hat', color: '#ffd166' },
    { name: 'Clap', color: '#2ecc71' }, { name: 'Bass', color: '#4f8cff' }, { name: 'Synth', color: '#a855f7' }
  ];
  const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
  function playTrack(ac, out, t, i, step) {
    const g = ac.createGain(); g.connect(out);
    if (i === 0) { const o = ac.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g); o.start(t); o.stop(t + 0.32); return; }
    if (i === 1 || i === 2 || i === 3) {
      const dur = i === 2 ? 0.05 : i === 1 ? 0.18 : 0.12;
      const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = buf.getChannelData(0);
      for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(); s.buffer = buf;
      f.type = i === 2 ? 'highpass' : 'bandpass'; f.frequency.value = i === 2 ? 7000 : i === 1 ? 1800 : 1200;
      g.gain.setValueAtTime(i === 2 ? 0.25 : 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f).connect(g); s.start(t);
      if (i === 1) { const o = ac.createOscillator(), g2 = ac.createGain(); o.frequency.value = 190; g2.gain.setValueAtTime(0.3, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.connect(g2).connect(out); o.start(t); o.stop(t + 0.12); }
      return;
    }
    const o = ac.createOscillator();
    if (i === 4) { o.type = 'sawtooth'; o.frequency.value = [55, 55, 65.4, 49][Math.floor(step / 4) % 4]; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; o.connect(f).connect(g); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); }
    else { o.type = 'triangle'; o.frequency.value = SCALE[(step * 3) % SCALE.length]; o.connect(g); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); }
    o.start(t); o.stop(t + 0.3);
  }
  Nova.registerApp({
    id: 'beats', name: 'Beat-Maker', icon: 'a-beats', folder: 'creative', grad: ['#6366f1', '#ec4899'], desc: 'Eigene Beats mit dem Step-Sequencer',
    mount(body, ctx) {
      let grid = TRACKS.map(() => new Array(16).fill(false)), bpm = 110, playing = false, step = 0, timer = null, nextT = 0, cur = null;
      const ac = Nova.kit.audio();
      const master = ac ? ac.createGain() : null; if (master) { master.gain.value = 0.8; master.connect(ac.destination); }
      const seq = h('div', { class: 'seq' });
      const build = () => {
        seq.innerHTML = '';
        TRACKS.forEach((tr, i) => seq.append(h('div', { class: 'seq-row' },
          h('div', { class: 'seq-name', style: { '--c': tr.color } }, tr.name),
          h('div', { class: 'seq-steps' }, grid[i].map((on, s) => h('button', { class: 'step' + (on ? ' on' : '') + (s % 4 === 0 ? ' beat' : ''), style: { '--c': tr.color }, onclick: (e) => { grid[i][s] = !grid[i][s]; e.currentTarget.classList.toggle('on'); if (grid[i][s] && ac && !playing) playTrack(ac, master, ac.currentTime, i, s); } })))
        )));
      };
      const sched = () => {
        while (nextT < ac.currentTime + 0.12) {
          const s = step;
          grid.forEach((row, i) => { if (row[s]) playTrack(ac, master, nextT, i, s); });
          const delay = Math.max(0, (nextT - ac.currentTime) * 1000);
          setTimeout(() => { $$('.seq-steps', seq).forEach((r) => { Array.from(r.children).forEach((c, k) => c.classList.toggle('now', k === s)); }); }, delay);
          nextT += 60 / bpm / 4; step = (step + 1) % 16;
        }
      };
      const playBtn = h('button', { class: 'btn primary', html: icon('play') + ' Play' });
      const toggle = () => {
        if (!ac) return ui.toast('Audio wird nicht unterstützt', 'err');
        playing = !playing;
        if (playing) { ac.resume(); step = 0; nextT = ac.currentTime + 0.05; timer = setInterval(sched, 25); }
        else { clearInterval(timer); $$('.step.now', seq).forEach((c) => c.classList.remove('now')); }
        playBtn.innerHTML = playing ? icon('stop') + ' Stop' : icon('play') + ' Play';
      };
      playBtn.onclick = toggle;
      const bpmLab = h('b', { class: 'mono' }, bpm + ' BPM');
      const presets = {
        'Hip-Hop': [[0, 7, 10], [4, 12], [0, 2, 4, 6, 8, 10, 12, 14], [12], [0, 7, 10], []],
        House: [[0, 4, 8, 12], [], [2, 6, 10, 14], [4, 12], [0, 3, 8, 11], [0, 6, 12]],
        Chill: [[0, 9], [8], [0, 4, 8, 12], [], [0, 9], [2, 5, 10, 13]]
      };
      const savedList = h('div', { class: 'row gap wrap' });
      const renderSaved = () => {
        savedList.innerHTML = '';
        store.items('beats').forEach((b) => {
          const chip = h('button', { class: 'chip' + (cur && cur.id === b.id ? ' on' : ''), onclick: () => { cur = b; grid = b.grid.map((r) => r.slice()); bpm = b.bpm; bpmLab.textContent = bpm + ' BPM'; rng.value = bpm; build(); renderSaved(); } }, b.name);
          ui.onContext(chip, (x, y) => ui.menu(x, y, [{ label: 'Löschen', icon: 'trash', danger: true, onClick: () => { store.del('beats', b.id); if (cur && cur.id === b.id) cur = null; renderSaved(); } }]));
          savedList.append(chip);
        });
      };
      const rng = h('input', { type: 'range', class: 'range', min: 60, max: 180, value: bpm, oninput: (e) => { bpm = +e.target.value; bpmLab.textContent = bpm + ' BPM'; } });
      body.append(h('div', { class: 'beats' },
        h('div', { class: 'beats-bar card' }, playBtn, h('div', { class: 'row gap grow' }, rng, bpmLab),
          h('div', { class: 'row gap' }, Object.keys(presets).map((p) => h('button', { class: 'chip', onclick: () => { grid = presets[p].map((steps) => { const r = new Array(16).fill(false); steps.forEach((s) => (r[s] = true)); return r; }); cur = null; build(); } }, p)),
            h('button', { class: 'chip', onclick: () => { grid = TRACKS.map(() => new Array(16).fill(false)); cur = null; build(); } }, 'Leeren'))),
        seq,
        h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('b', null, 'Meine Beats'), h('span', { class: 'muted xs' }, 'Lange drücken / Rechtsklick zum Löschen')), savedList)
      ));
      ctx.setActions(h('button', { class: 'btn sm primary', onclick: async () => {
        const name = cur ? cur.name : await ui.prompt('Beat speichern', { value: 'Beat ' + (store.items('beats').length + 1) });
        if (!name) return;
        cur = store.put('beats', { ...(cur || {}), name, bpm, grid: grid.map((r) => r.slice()) });
        renderSaved(); ui.toast('Beat gespeichert');
      }, html: icon('music') + ' Speichern' }));
      grid = presets['Hip-Hop'].map((steps) => { const r = new Array(16).fill(false); steps.forEach((s) => (r[s] = true)); return r; });
      build(); renderSaved();
      return () => { clearInterval(timer); if (master) master.disconnect(); };
    }
  });

  /* ======================= GALERIE ======================= */
  Nova.registerApp({
    id: 'gallery', name: 'Galerie', icon: 'a-gallery', folder: 'creative', grad: ['#0ea5e9', '#22c55e'], desc: 'Deine Zeichnungen & Pixel-Art',
    mount(body, ctx) {
      let filter = 'all';
      const grid = h('div', { class: 'gal-grid' });
      const render = () => {
        grid.innerHTML = '';
        let items = [...store.items('drawings'), ...store.items('pixels')].sort((a, b) => b.u - a.u);
        if (filter !== 'all') items = items.filter((x) => x.kind === filter);
        if (!items.length) grid.append(h('div', { class: 'empty' }, h('div', { html: icon('image') }), h('p', null, 'Noch keine Bilder. Erstelle etwas in „Zeichnen" oder im „Pixel-Studio".'),
          h('div', { class: 'row gap center' }, h('button', { class: 'btn primary', onclick: () => ctx.launch('draw') }, 'Zeichnen'), h('button', { class: 'btn', onclick: () => ctx.launch('pixel') }, 'Pixel-Studio'))));
        items.forEach((it) => grid.append(h('button', { class: 'gal-item' + (it.kind === 'pixel' ? ' pixel' : ''), onclick: () => view(it) },
          h('img', { src: it.img, alt: it.name, loading: 'lazy' }), h('div', { class: 'gal-cap' }, h('b', null, it.name), h('span', { class: 'muted xs' }, Nova.relTime(it.u))))));
      };
      const view = (it) => {
        const col = it.kind === 'pixel' ? 'pixels' : 'drawings';
        ui.dialog({
          title: it.name, wide: true,
          body: h('div', { class: 'gal-view' + (it.kind === 'pixel' ? ' pixel' : '') }, h('img', { src: it.img, alt: it.name })),
          actions: [
            { label: 'Löschen', danger: true, ghost: true, onClick: async () => { if (await ui.confirm('Bild löschen?', it.name, { label: 'Löschen', danger: true })) { store.del(col, it.id); render(); return true; } return false; } },
            { label: 'Herunterladen', onClick: () => { const a = h('a', { href: it.img, download: it.name + (it.kind === 'pixel' ? '.png' : '.jpg') }); document.body.append(a); a.click(); a.remove(); return false; } },
            { label: 'Bearbeiten', primary: true, onClick: () => { Nova.pendingOpen = { app: it.kind === 'pixel' ? 'pixel' : 'draw', id: it.id }; setTimeout(() => ctx.launch(Nova.pendingOpen.app), 0); return true; } }
          ]
        });
      };
      body.append(h('div', { class: 'gallery' }, Nova.shell.seg([['Alle', 'all'], ['Zeichnungen', 'draw'], ['Pixel-Art', 'pixel']], filter, (v) => { filter = v; render(); }), grid));
      render();
    }
  });
})();
