/* Nova OS – Spiele (alle offline, eigene Spiele im Stil bekannter Genres)
 *  Rail Rush    – 3-Spuren Endlos-Runner (springen, rutschen, ausweichen, Münzen)
 *  Pulse Dash   – Rhythmus-Jump-Runner mit Würfel, Stacheln & Sprungfeldern
 *  Neon Snake   – Snake-Klassiker
 *  Memory       – Paare finden
 *  Vier gewinnt – gegen die KI oder zu zweit
 *  Blockbrecher – Ball & Schläger
 */
(function () {
  'use strict';
  const Nova = window.Nova;
  const { h, ui, icon, store } = Nova;
  const kit = () => Nova.kit;

  function gameShell(body, ctx, id, W, H) {
    const s = kit().stage(body, W, H);
    ctx.onClose(() => s.destroy());
    return s;
  }
  const bestLine = (id) => 'Rekord: ' + store.score(id);

  /* ======================= RAIL RUSH ======================= */
  Nova.registerApp({
    id: 'runner', name: 'Rail Rush', icon: 'run', folder: 'games', grad: ['#ff6b3d', '#ff3d77'], desc: 'Endlos-Runner: weiche aus, spring und sammle Münzen',
    mount(body, ctx) {
      const W = 480, H = 760;
      const S = gameShell(body, ctx, 'runner', W, H);
      const g = S.g;
      const HOR = 250, BASE = 690, F = 9, ZMAX = 90;
      let st, state = 'ready';
      const reset = () => {
        st = { lane: 0, x: 0, jump: 0, vy: 0, slide: 0, speed: 26, dist: 0, coins: 0, objs: [], next: 25, t: 0, shake: 0, parts: [] };
      };
      const proj = (lx, z) => { const p = F / (z + F); return { x: W / 2 + lx * 150 * p, y: HOR + (BASE - HOR) * p, p }; };
      const spawn = () => {
        const z = ZMAX;
        const lanes = [-1, 0, 1].sort(() => Math.random() - 0.5);
        const r = Math.random();
        const nBlock = st.dist > 300 && r < 0.4 ? 2 : r < 0.75 ? 1 : 0;
        let maxLen = 1;
        lanes.forEach((l, i) => {
          if (i < nBlock) { const len = 6 + Math.random() * 6; maxLen = Math.max(maxLen, len); st.objs.push({ type: 'block', lane: l, z, len }); }
          else if (i === nBlock && Math.random() < 0.6) st.objs.push({ type: Math.random() < 0.5 ? 'low' : 'high', lane: l, z });
          else if (Math.random() < 0.55) for (let k = 0; k < 5; k++) st.objs.push({ type: 'coin', lane: l, z: z + k * 2.2, hy: i === nBlock ? 0 : 0 });
        });
        // Abstand wächst mit dem Tempo, damit immer genug Zeit zum Ausweichen bleibt
        st.next = maxLen + 8 + st.speed * 0.32 + Math.random() * 12;
      };
      const move = (d) => { if (state !== 'play') return; const nl = Nova.clamp(st.lane + d, -1, 1); if (nl !== st.lane) { st.lane = nl; kit().beep(520, 0.05, 'sine', 0.04); } };
      const jump = () => { if (state !== 'play') return; if (st.jump <= 0.01) { st.vy = 15; st.slide = 0; kit().beep(380, 0.12, 'square', 0.04, 760); } };
      const slide = () => { if (state !== 'play') return; st.slide = 0.7; if (st.jump > 0) st.vy = -25; kit().noise(0.12, 0.05, 2000); };
      const over = () => {
        state = 'over'; st.shake = 1; kit().beep(200, 0.4, 'sawtooth', 0.08, 60);
        if (navigator.vibrate) navigator.vibrate(120);
        const score = Math.floor(st.dist) + st.coins * 10;
        const rec = store.score('runner', score);
        S.overlay(rec ? 'Neuer Rekord!' : 'Erwischt!', score + ' Punkte · ' + st.coins + ' Münzen · ' + bestLine('runner'), 'Nochmal', start);
      };
      const start = () => { reset(); state = 'play'; S.hide(); kit().audio(); };
      const update = (dt) => {
        st.t += dt;
        if (state !== 'play') return;
        st.speed = Math.min(70, 26 + st.dist / 60);
        const dz = st.speed * dt;
        st.dist += dz * 0.5;
        st.x += (st.lane - st.x) * Math.min(1, dt * 14);
        if (st.jump > 0 || st.vy > 0) { st.vy -= 45 * dt; st.jump = Math.max(0, st.jump + st.vy * dt); if (st.jump === 0) st.vy = 0; }
        st.slide = Math.max(0, st.slide - dt);
        st.next -= dz; if (st.next <= 0) spawn();
        for (const o of st.objs) {
          o.z -= dz;
          if (o.dead) continue;
          const sameLane = Math.abs(o.lane - st.x) < 0.45;
          if (o.type === 'coin') {
            if (o.z < 1.2 && o.z > -1 && sameLane && st.jump < 3) { o.dead = true; st.coins++; kit().beep(1200 + (st.coins % 5) * 100, 0.06, 'sine', 0.04); }
          } else if (o.type === 'block') {
            if (o.z < 1 && o.z + o.len > -0.5 && sameLane) return over();
          } else if (o.z < 0.8 && o.z > -0.8 && sameLane) {
            if (o.type === 'low' && st.jump < 1.2) return over();
            if (o.type === 'high' && st.slide <= 0) return over();
          }
        }
        st.objs = st.objs.filter((o) => o.z + (o.len || 0) > -3 && !(o.dead && o.type === 'coin'));
        kit().hudSet(S.hud, [['Punkte', Math.floor(st.dist) + st.coins * 10], ['Münzen', st.coins]]);
      };
      const box3d = (lane, z, len, hgt, wid, top, side, front) => {
        const z2 = z + len;
        if (z2 < -2) return;
        const zc = Math.max(z, -1.5);
        const a = proj(lane - wid, zc), b = proj(lane + wid, zc), c = proj(lane - wid, z2), d = proj(lane + wid, z2);
        const ha = hgt * 150 * a.p, hc = hgt * 150 * c.p;
        g.fillStyle = top; g.beginPath(); g.moveTo(a.x, a.y - ha); g.lineTo(b.x, b.y - ha); g.lineTo(d.x, d.y - hc); g.lineTo(c.x, c.y - hc); g.fill();
        g.fillStyle = side;
        if (lane < st.x - 0.1) { g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x, b.y - ha); g.lineTo(d.x, d.y - hc); g.lineTo(d.x, d.y); g.fill(); }
        if (lane > st.x + 0.1) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x, a.y - ha); g.lineTo(c.x, c.y - hc); g.lineTo(c.x, c.y); g.fill(); }
        g.fillStyle = front; g.fillRect(a.x, a.y - ha, b.x - a.x, ha);
        return { a, b, ha };
      };
      const draw = () => {
        const sh = st.shake > 0 ? (st.shake -= 0.04, (Math.random() - 0.5) * 12 * st.shake) : 0;
        g.save(); g.translate(sh, 0);
        const sky = g.createLinearGradient(0, 0, 0, HOR);
        sky.addColorStop(0, '#120b2e'); sky.addColorStop(1, '#3b1a5a');
        g.fillStyle = sky; g.fillRect(-20, 0, W + 40, HOR);
        // Sonne & Skyline
        g.fillStyle = '#ff5c8a'; g.globalAlpha = 0.85; g.beginPath(); g.arc(W / 2, HOR - 10, 70, Math.PI, 0); g.fill(); g.globalAlpha = 1;
        g.fillStyle = '#1c1240';
        for (let i = 0; i < 14; i++) { const bw = 34, bh = 30 + ((i * 53) % 70); g.fillRect(i * bw - 10, HOR - bh, bw - 4, bh); }
        const gr = g.createLinearGradient(0, HOR, 0, H); gr.addColorStop(0, '#1d1238'); gr.addColorStop(1, '#0b0d18');
        g.fillStyle = gr; g.fillRect(-20, HOR, W + 40, H - HOR);
        // Gleise
        const L = proj(-1.6, ZMAX), R = proj(1.6, ZMAX), L0 = proj(-1.6, -1.5), R0 = proj(1.6, -1.5);
        g.fillStyle = '#231a40'; g.beginPath(); g.moveTo(L.x, L.y); g.lineTo(R.x, R.y); g.lineTo(R0.x, R0.y); g.lineTo(L0.x, L0.y); g.fill();
        const off = (st.dist * 2) % 6;
        g.strokeStyle = 'rgba(255,92,138,.25)'; g.lineWidth = 1;
        for (let z = 6 - off; z < ZMAX; z += 6) { const a = proj(-1.6, z), b = proj(1.6, z); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
        g.strokeStyle = 'rgba(124,92,255,.7)'; g.lineWidth = 2;
        [-1.5, -0.5, 0.5, 1.5].forEach((lx) => { const a = proj(lx, ZMAX), b = proj(lx, -1.5); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); });
        // Objekte (hinten zuerst)
        const objs = st.objs.slice().sort((a, b) => b.z - a.z);
        let playerDrawn = false;
        const drawPlayer = () => {
          playerDrawn = true;
          const p = proj(st.x, 0);
          const s = p.p * 150;
          const y = p.y - st.jump * s * 0.9;
          const hh = st.slide > 0 ? 0.35 * s : 0.75 * s, ww = 0.42 * s;
          g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(p.x, p.y, ww * 0.7, 8, 0, 0, 7); g.fill();
          const run = Math.sin(st.t * 18) * (st.jump > 0 || st.slide > 0 ? 0 : 6);
          g.fillStyle = '#00e5c3';
          kit().roundRect(g, p.x - ww / 2 - 4, y - hh * 0.35 + run * 0.2, 10, hh * 0.35, 4); g.fill();
          kit().roundRect(g, p.x + ww / 2 - 6, y - hh * 0.35 - run * 0.2, 10, hh * 0.35, 4); g.fill();
          const bg = g.createLinearGradient(0, y - hh, 0, y); bg.addColorStop(0, '#ffd166'); bg.addColorStop(1, '#ff6b3d');
          g.fillStyle = bg; kit().roundRect(g, p.x - ww / 2, y - hh, ww, hh * 0.8, ww * 0.3); g.fill();
          g.fillStyle = '#1a1033'; kit().roundRect(g, p.x - ww * 0.32, y - hh * 0.9, ww * 0.64, hh * 0.2, 6); g.fill();
          g.fillStyle = '#7cf5ff'; g.fillRect(p.x - ww * 0.22, y - hh * 0.84, ww * 0.44, hh * 0.06);
        };
        for (const o of objs) {
          if (!playerDrawn && o.z + (o.len || 0) < 0.3) drawPlayer();
          if (o.z > ZMAX) continue;
          if (o.type === 'coin') {
            const p = proj(o.lane, o.z), r = 0.14 * 150 * p.p, y = p.y - 0.45 * 150 * p.p + Math.sin(st.t * 6 + o.z) * 3 * p.p;
            g.fillStyle = '#ffd166'; g.beginPath(); g.ellipse(p.x, y, r * Math.abs(Math.cos(st.t * 4 + o.z)) + 1, r, 0, 0, 7); g.fill();
            g.strokeStyle = '#ff9f43'; g.lineWidth = 2 * p.p; g.stroke();
          } else if (o.type === 'block') box3d(o.lane, o.z, o.len, 1.1, 0.46, '#5b4bd6', '#3a2f9a', '#7c5cff');
          else if (o.type === 'low') { const r = box3d(o.lane, o.z, 0.5, 0.35, 0.46, '#ffb800', '#c88600', '#ff9f43'); if (r) { g.fillStyle = '#1a1033'; for (let k = 0; k < 3; k++) g.fillRect(r.a.x + (k * 2 + 0.5) * (r.b.x - r.a.x) / 6, r.a.y - r.ha, (r.b.x - r.a.x) / 12, r.ha); } }
          else if (o.type === 'high') {
            const a = proj(o.lane - 0.46, Math.max(o.z, -1.5)), b = proj(o.lane + 0.46, Math.max(o.z, -1.5)), s = 150 * a.p;
            g.fillStyle = '#ff5c8a'; g.fillRect(a.x, a.y - 1.1 * s, 6 * a.p, 1.1 * s); g.fillRect(b.x - 6 * a.p, b.y - 1.1 * s, 6 * a.p, 1.1 * s);
            g.fillStyle = '#ff3d77'; g.fillRect(a.x, a.y - 1.1 * s, b.x - a.x, 0.42 * s);
            g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(a.x, a.y - 0.86 * s, b.x - a.x, 0.06 * s);
          }
        }
        if (!playerDrawn) drawPlayer();
        g.restore();
      };
      reset();
      const stop = kit().loop((dt) => { update(dt); draw(); });
      const offKeys = kit().keys((k, e, down) => {
        if (!down) return;
        if (state !== 'play' && (k === ' ' || k === 'Enter')) { start(); return true; }
        if (k === 'ArrowLeft' || k === 'a') { move(-1); return true; }
        if (k === 'ArrowRight' || k === 'd') { move(1); return true; }
        if (k === 'ArrowUp' || k === 'w' || k === ' ') { jump(); return true; }
        if (k === 'ArrowDown' || k === 's') { slide(); return true; }
      });
      kit().swipe(S.box, (d, e) => {
        if (d === 'left') move(-1); else if (d === 'right') move(1); else if (d === 'up') jump(); else if (d === 'down') slide();
        else if (d === 'tap' && state === 'play') { const r = S.box.getBoundingClientRect(); move(e.clientX < r.left + r.width / 2 ? -1 : 1); }
      });
      S.overlay('Rail Rush', 'Wische ← → zum Ausweichen, ↑ zum Springen, ↓ zum Rutschen. Am PC: Pfeiltasten. ' + bestLine('runner'), 'Los geht\'s', start);
      return () => { stop(); offKeys(); };
    }
  });

  /* ======================= PULSE DASH ======================= */
  Nova.registerApp({
    id: 'pulse', name: 'Pulse Dash', icon: 'zap', folder: 'games', grad: ['#7c5cff', '#00e5ff'], desc: 'Spring im Takt über Stacheln und Blöcke',
    mount(body, ctx) {
      const W = 800, H = 450, GY = 360, SZ = 34, PX = 180;
      const S = gameShell(body, ctx, 'pulse', W, H);
      const g = S.g;
      let st, state = 'ready', holding = false, attempts = 0, beatT = 0;
      const BPM = 128;
      const reset = () => { st = { y: GY - SZ, vy: 0, rot: 0, ground: true, x: 0, speed: 380, objs: [], genX: 900, t: 0, parts: [], hue: 250, pulse: 0 }; gen(); };
      const gen = () => {
        while (st.genX < st.x + W + 600) {
          const lvl = Math.min(4, Math.floor(st.x / 3000));
          const r = Math.random();
          let x = st.genX;
          if (r < 0.3) { st.objs.push({ t: 'spike', x }); if (lvl > 0 && Math.random() < 0.5) st.objs.push({ t: 'spike', x: x + SZ }); if (lvl > 2 && Math.random() < 0.3) st.objs.push({ t: 'spike', x: x + SZ * 2 }); st.genX += 260 + Math.random() * 160; }
          else if (r < 0.55) { const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) st.objs.push({ t: 'block', x: x + i * SZ, y: GY - SZ, w: SZ, h: SZ }); if (Math.random() < 0.5) st.objs.push({ t: 'spike', x: x + n * SZ + 90 }); st.genX += n * SZ + 300; }
          else if (r < 0.75) { for (let i = 0; i < 3; i++) st.objs.push({ t: 'block', x: x + i * 130, y: GY - SZ * (i + 1), w: SZ * 2, h: SZ * (i + 1) }); st.objs.push({ t: 'spike', x: x + 3 * 130 + 40 }); st.genX += 600; }
          else if (r < 0.88) { st.objs.push({ t: 'pad', x }); st.objs.push({ t: 'block', x: x + 150, y: GY - SZ * 3.5, w: SZ * 4, h: SZ * 0.6 }); st.objs.push({ t: 'spike', x: x + 170 }); st.objs.push({ t: 'spike', x: x + 170 + SZ }); st.objs.push({ t: 'spike', x: x + 170 + SZ * 2 }); st.genX += 520; }
          else { st.objs.push({ t: 'orb', x: x + 60, y: GY - SZ * 2.4 }); st.objs.push({ t: 'spike', x: x }); st.objs.push({ t: 'spike', x: x + SZ }); st.objs.push({ t: 'spike', x: x + SZ * 2 }); st.objs.push({ t: 'spike', x: x + SZ * 3 }); st.genX += 420; }
        }
      };
      const tryJump = () => { if (st.ground) { st.vy = -760; st.ground = false; kit().beep(660, 0.06, 'square', 0.03, 990); } };
      const over = () => {
        state = 'over'; attempts++;
        kit().noise(0.3, 0.12, 400);
        for (let i = 0; i < 24; i++) st.parts.push({ x: PX + SZ / 2, y: st.y + SZ / 2, vx: (Math.random() - 0.5) * 600, vy: (Math.random() - 0.5) * 600, l: 0.8, c: '#00e5ff' });
        const score = Math.floor(st.x / 10);
        const rec = store.score('pulse', score);
        setTimeout(() => S.overlay(rec ? 'Neuer Rekord!' : 'Crash!', score + ' m · Versuch ' + attempts + ' · ' + bestLine('pulse'), 'Nochmal', start), 500);
      };
      const start = () => { reset(); state = 'play'; S.hide(); kit().audio(); beatT = 0; };
      const hit = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
      const update = (dt) => {
        st.t += dt;
        st.parts.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; p.l -= dt; });
        st.parts = st.parts.filter((p) => p.l > 0);
        st.pulse = Math.max(0, st.pulse - dt * 3);
        if (state !== 'play') return;
        beatT += dt;
        const spb = 60 / BPM;
        if (beatT >= spb) { beatT -= spb; st.pulse = 1; kit().beep(110, 0.12, 'sine', 0.12, 45); }
        st.speed = 380 + Math.min(200, st.x / 60);
        st.x += st.speed * dt;
        st.hue = (250 + st.x / 40) % 360;
        if (holding) tryJump();
        st.vy += 2600 * dt;
        let ny = st.y + st.vy * dt;
        st.ground = false;
        if (ny >= GY - SZ) { ny = GY - SZ; st.vy = 0; st.ground = true; }
        const px = st.x + PX;
        for (const o of st.objs) {
          if (o.x > px + 200 || o.x + (o.w || SZ) < px - 50) continue;
          if (o.t === 'block') {
            if (hit(px + 3, ny, SZ - 6, SZ, o.x, o.y, o.w, o.h)) {
              if (st.y + SZ <= o.y + 8 && st.vy >= 0) { ny = o.y - SZ; st.vy = 0; st.ground = true; }
              else return over();
            }
          } else if (o.t === 'spike') {
            if (hit(px + 8, ny + 8, SZ - 16, SZ - 10, o.x + 10, GY - SZ + 12, SZ - 20, SZ - 12)) return over();
          } else if (o.t === 'pad') {
            if (hit(px, ny, SZ, SZ, o.x, GY - 8, SZ, 8)) { st.vy = -1150; st.ground = false; kit().beep(500, 0.15, 'sine', 0.06, 1500); }
          } else if (o.t === 'orb') {
            if (!o.used && holding && hit(px - 10, ny - 10, SZ + 20, SZ + 20, o.x - 18, o.y - 18, 36, 36)) { o.used = true; st.vy = -880; kit().beep(800, 0.12, 'sine', 0.06, 1600); }
          }
        }
        st.y = ny;
        if (st.ground) st.rot = Math.round(st.rot / (Math.PI / 2)) * (Math.PI / 2);
        else st.rot += 7.2 * dt;
        if (st.ground && Math.random() < 0.6) st.parts.push({ x: PX, y: st.y + SZ, vx: -120 - Math.random() * 80, vy: -Math.random() * 80, l: 0.35, c: `hsl(${st.hue},90%,65%)` });
        st.objs = st.objs.filter((o) => o.x + (o.w || SZ) > st.x - 50);
        gen();
        kit().hudSet(S.hud, [['Distanz', Math.floor(st.x / 10) + ' m'], ['Rekord', store.score('pulse') + ' m']]);
      };
      const draw = () => {
        const hue = st.hue;
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, `hsl(${hue},60%,${12 + st.pulse * 6}%)`); bg.addColorStop(1, `hsl(${(hue + 40) % 360},55%,6%)`);
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        g.strokeStyle = `hsla(${hue},90%,70%,${0.06 + st.pulse * 0.08})`; g.lineWidth = 1;
        const off = (st.x * 0.3) % 60;
        for (let x = -off; x < W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, GY); g.stroke(); }
        for (let y = 20; y < GY; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        // Boden
        g.fillStyle = `hsl(${hue},50%,10%)`; g.fillRect(0, GY, W, H - GY);
        g.fillStyle = `hsl(${hue},95%,65%)`; g.fillRect(0, GY, W, 3);
        g.globalAlpha = 0.25; for (let x = -(st.x % 80); x < W; x += 80) g.fillRect(x, GY + 3, 40, H - GY); g.globalAlpha = 1;
        for (const o of st.objs) {
          const x = o.x - st.x;
          if (x < -200 || x > W + 50) continue;
          if (o.t === 'block') {
            g.fillStyle = `hsl(${hue},40%,14%)`; g.fillRect(x, o.y, o.w, o.h);
            g.strokeStyle = `hsl(${hue},95%,65%)`; g.lineWidth = 2; g.strokeRect(x + 1, o.y + 1, o.w - 2, o.h - 2);
          } else if (o.t === 'spike') {
            g.fillStyle = '#0b0b14'; g.strokeStyle = '#fff'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(x + 2, GY); g.lineTo(x + SZ / 2, GY - SZ + 2); g.lineTo(x + SZ - 2, GY); g.closePath(); g.fill(); g.stroke();
          } else if (o.t === 'pad') {
            g.fillStyle = '#ffd166'; g.beginPath(); g.ellipse(x + SZ / 2, GY - 2, SZ / 2, 7, 0, Math.PI, 0); g.fill();
          } else if (o.t === 'orb') {
            g.strokeStyle = o.used ? 'rgba(255,255,255,.3)' : '#ffd166'; g.lineWidth = 4;
            g.beginPath(); g.arc(x, o.y, 14 + Math.sin(st.t * 8) * 2, 0, 7); g.stroke();
          }
        }
        st.parts.forEach((p) => { g.globalAlpha = Math.max(0, p.l * 2); g.fillStyle = p.c; g.fillRect(p.x - 3, p.y - 3, 6, 6); });
        g.globalAlpha = 1;
        if (state !== 'over') {
          g.save(); g.translate(PX + SZ / 2, st.y + SZ / 2); g.rotate(st.rot);
          g.shadowColor = '#00e5ff'; g.shadowBlur = 18;
          g.fillStyle = '#00e5ff'; g.fillRect(-SZ / 2, -SZ / 2, SZ, SZ);
          g.shadowBlur = 0;
          g.fillStyle = '#0b0b14'; g.fillRect(-SZ / 2 + 6, -SZ / 2 + 6, SZ - 12, SZ - 12);
          g.fillStyle = '#ffd166'; g.fillRect(-SZ / 2 + 11, -SZ / 2 + 11, SZ - 22, SZ - 22);
          g.restore();
        }
      };
      reset();
      const stop = kit().loop((dt) => { update(dt); draw(); });
      const press = (v) => { holding = v; if (v && state === 'play') tryJump(); };
      S.box.addEventListener('pointerdown', (e) => { if (state === 'play') { e.preventDefault(); press(true); } });
      const up = () => press(false);
      window.addEventListener('pointerup', up);
      const offKeys = kit().keys((k, e, down) => {
        if (k === ' ' || k === 'ArrowUp' || k === 'w') {
          if (down && state !== 'play' && !e.repeat) { start(); return true; }
          press(down); return true;
        }
      });
      S.overlay('Pulse Dash', 'Tippe oder halte (Leertaste / ↑) zum Springen. Gelbe Felder & Ringe geben Extra-Sprünge. ' + bestLine('pulse') + ' m', 'Start', start);
      return () => { stop(); offKeys(); window.removeEventListener('pointerup', up); };
    }
  });

  /* ======================= NEON SNAKE ======================= */
  Nova.registerApp({
    id: 'snake', name: 'Neon Snake', icon: 'snake', folder: 'games', grad: ['#22c55e', '#0ea5e9'], desc: 'Friss, wachse – und beiß dich nicht selbst',
    mount(body, ctx) {
      const N = 20, CELL = 28, W = N * CELL, H = N * CELL;
      const S = gameShell(body, ctx, 'snake', W, H);
      const g = S.g;
      let snake, dir, nextDir, food, acc, speed, state = 'ready', score, t = 0;
      const place = () => { do { food = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; } while (snake.some((s) => s.x === food.x && s.y === food.y)); };
      const reset = () => { snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }]; dir = nextDir = { x: 1, y: 0 }; acc = 0; speed = 7; score = 0; place(); };
      const turn = (x, y) => { if (state !== 'play') return; if (x === -dir.x && y === -dir.y) return; nextDir = { x, y }; };
      const over = () => { state = 'over'; kit().beep(180, 0.4, 'sawtooth', 0.07, 60); const rec = store.score('snake', score); S.overlay(rec ? 'Neuer Rekord!' : 'Game Over', score + ' Punkte · ' + bestLine('snake'), 'Nochmal', start); };
      const start = () => { reset(); state = 'play'; S.hide(); kit().audio(); };
      const update = (dt) => {
        t += dt;
        if (state !== 'play') return;
        acc += dt;
        if (acc < 1 / speed) return;
        acc = 0; dir = nextDir;
        const hd = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (hd.x < 0 || hd.y < 0 || hd.x >= N || hd.y >= N || snake.some((s) => s.x === hd.x && s.y === hd.y)) return over();
        snake.unshift(hd);
        if (hd.x === food.x && hd.y === food.y) { score += 10; speed = Math.min(18, speed + 0.4); kit().beep(900, 0.07, 'sine', 0.05, 1400); place(); }
        else snake.pop();
        kit().hudSet(S.hud, [['Punkte', score], ['Länge', snake.length]]);
      };
      const draw = () => {
        g.fillStyle = '#0a0f1a'; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,255,255,.03)';
        for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if ((x + y) % 2) g.fillRect(x * CELL, y * CELL, CELL, CELL);
        const fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2;
        g.shadowColor = '#ff5c8a'; g.shadowBlur = 16; g.fillStyle = '#ff5c8a';
        g.beginPath(); g.arc(fx, fy, CELL * 0.32 + Math.sin(t * 6) * 2, 0, 7); g.fill();
        g.shadowColor = '#22c55e';
        snake.forEach((s, i) => {
          const k = 1 - i / (snake.length + 4);
          g.fillStyle = `hsl(${150 - i * 2},80%,${45 + k * 15}%)`; g.shadowBlur = i === 0 ? 18 : 6;
          kit().roundRect(g, s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, 7); g.fill();
        });
        g.shadowBlur = 0;
        const hd = snake[0]; g.fillStyle = '#0a0f1a';
        const ex = dir.y !== 0 ? 6 : 0, ey = dir.x !== 0 ? 6 : 0;
        g.beginPath(); g.arc(hd.x * CELL + CELL / 2 + ex + dir.x * 4, hd.y * CELL + CELL / 2 + ey + dir.y * 4, 3, 0, 7); g.arc(hd.x * CELL + CELL / 2 - ex + dir.x * 4, hd.y * CELL + CELL / 2 - ey + dir.y * 4, 3, 0, 7); g.fill();
      };
      reset();
      const stop = kit().loop((dt) => { update(dt); draw(); });
      const offKeys = kit().keys((k, e, down) => {
        if (!down) return;
        if (state !== 'play' && (k === ' ' || k === 'Enter')) { start(); return true; }
        const m = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[k];
        if (m) { turn(m[0], m[1]); return true; }
      });
      kit().swipe(S.box, (d) => ({ up: () => turn(0, -1), down: () => turn(0, 1), left: () => turn(-1, 0), right: () => turn(1, 0) }[d] || (() => {}))());
      S.overlay('Neon Snake', 'Steuere mit Wischen oder Pfeiltasten. ' + bestLine('snake'), 'Start', start);
      return () => { stop(); offKeys(); };
    }
  });

  /* ======================= MEMORY ======================= */
  Nova.registerApp({
    id: 'memory', name: 'Memory', icon: 'brain', folder: 'games', grad: ['#ec4899', '#f97316'], desc: 'Finde alle Paare so schnell wie möglich',
    mount(body) {
      const SYMS = ['star', 'music', 'zap', 'moon', 'sun', 'bell', 'flag', 'key', 'gamepad', 'brush', 'snake', 'shield'];
      const COLS = ['#ff5c8a', '#7c5cff', '#00c2a8', '#ffb800', '#4f8cff', '#ff6b3d', '#2ecc71', '#a855f7', '#0ea5e9', '#ec4899', '#22c55e', '#f97316'];
      let size = 16, cards, open, found, moves, startT, timer, lock;
      const grid = h('div', { class: 'mem-grid' });
      const info = h('div', { class: 'row gap center mem-info' });
      const setInfo = () => { info.innerHTML = ''; info.append(h('span', { class: 'chip' }, 'Züge: ' + moves), h('span', { class: 'chip' }, 'Zeit: ' + Nova.fmtDur(startT ? (Date.now() - startT) / 1000 : 0)), h('span', { class: 'chip' }, bestLine('memory'))); };
      const newGame = () => {
        clearInterval(timer);
        const n = size / 2;
        const picks = SYMS.map((s, i) => ({ s, c: COLS[i] })).sort(() => Math.random() - 0.5).slice(0, n);
        cards = [...picks, ...picks].map((p, i) => ({ ...p, k: i })).sort(() => Math.random() - 0.5);
        open = []; found = 0; moves = 0; startT = 0; lock = false;
        grid.style.gridTemplateColumns = `repeat(${size === 16 ? 4 : 6}, 1fr)`;
        grid.innerHTML = '';
        cards.forEach((c) => {
          const el = h('button', { class: 'mem-card', onclick: () => flip(c, el) }, h('div', { class: 'mem-in' }, h('div', { class: 'mem-front', html: icon('sparkle') }), h('div', { class: 'mem-back', style: { '--c': c.c }, html: icon(c.s) })));
          c.el = el; grid.append(el);
        });
        setInfo();
      };
      const flip = (c, el) => {
        if (lock || el.classList.contains('on') || el.classList.contains('done')) return;
        if (!startT) { startT = Date.now(); timer = setInterval(setInfo, 1000); }
        el.classList.add('on'); open.push(c); kit().beep(600, 0.04, 'sine', 0.03);
        if (open.length === 2) {
          moves++; setInfo();
          const [a, b] = open;
          if (a.s === b.s) { open = []; setTimeout(() => { a.el.classList.add('done'); b.el.classList.add('done'); kit().beep(1000, 0.1, 'sine', 0.05, 1500); }, 250); found += 2; if (found === cards.length) setTimeout(win, 600); }
          else { lock = true; setTimeout(() => { a.el.classList.remove('on'); b.el.classList.remove('on'); open = []; lock = false; }, 800); }
        }
      };
      const win = () => {
        clearInterval(timer);
        const secs = Math.round((Date.now() - startT) / 1000);
        const pts = Math.max(50, (size === 16 ? 1000 : 1600) - moves * 15 - secs * 3);
        const rec = store.score('memory', pts);
        ui.dialog({ title: rec ? 'Neuer Rekord! 🎉' : 'Geschafft!', text: moves + ' Züge in ' + Nova.fmtDur(secs) + ' – ' + pts + ' Punkte', actions: [{ label: 'Nochmal', primary: true, onClick: newGame }] });
      };
      body.append(h('div', { class: 'memory' }, h('div', { class: 'row between wrap gap' }, Nova.shell.seg([['4×4', 16], ['6×4', 24]], size, (v) => { size = v; newGame(); }), h('button', { class: 'btn sm', onclick: newGame, html: icon('reset') + ' Neu' })), info, grid));
      newGame();
      return () => clearInterval(timer);
    }
  });

  /* ======================= VIER GEWINNT ======================= */
  Nova.registerApp({
    id: 'four', name: 'Vier gewinnt', icon: 'dots', folder: 'games', grad: ['#ffb800', '#ff5c8a'], desc: 'Gegen die KI oder zu zweit',
    mount(body) {
      const C = 7, R = 6;
      let b, turn, mode = 'ai', diff = 2, over, wins = store.score('four');
      const board = h('div', { class: 'c4' });
      const status = h('div', { class: 'c4-status' });
      const winAt = (bb, p) => {
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
          if (bb[r][c] !== p) continue;
          for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
            const cells = [[r, c]];
            for (let k = 1; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= R || cc < 0 || cc >= C || bb[rr][cc] !== p) break; cells.push([rr, cc]); }
            if (cells.length === 4) return cells;
          }
        }
        return null;
      };
      const drop = (bb, c, p) => { for (let r = R - 1; r >= 0; r--) if (!bb[r][c]) { bb[r][c] = p; return r; } return -1; };
      const valid = (bb) => [3, 2, 4, 1, 5, 0, 6].filter((c) => !bb[0][c]);
      const evalB = (bb) => {
        let s = 0;
        for (let r = 0; r < R; r++) if (bb[r][3] === 2) s += 3; else if (bb[r][3] === 1) s -= 3;
        const lines = [];
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
          const w = []; for (let k = 0; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= R || cc < 0 || cc >= C) break; w.push(bb[rr][cc]); }
          if (w.length === 4) lines.push(w);
        }
        for (const w of lines) {
          const a = w.filter((x) => x === 2).length, o = w.filter((x) => x === 1).length, e = 4 - a - o;
          if (a === 3 && e === 1) s += 5; else if (a === 2 && e === 2) s += 2;
          if (o === 3 && e === 1) s -= 4;
        }
        return s;
      };
      const minimax = (bb, depth, alpha, beta, maxP) => {
        if (winAt(bb, 2)) return [null, 100000 + depth];
        if (winAt(bb, 1)) return [null, -100000 - depth];
        const vs = valid(bb);
        if (!vs.length || depth === 0) return [null, evalB(bb)];
        let best = vs[0];
        if (maxP) {
          let v = -Infinity;
          for (const c of vs) { const r = drop(bb, c, 2); const [, sc] = minimax(bb, depth - 1, alpha, beta, false); bb[r][c] = 0; if (sc > v) { v = sc; best = c; } alpha = Math.max(alpha, v); if (alpha >= beta) break; }
          return [best, v];
        }
        let v = Infinity;
        for (const c of vs) { const r = drop(bb, c, 1); const [, sc] = minimax(bb, depth - 1, alpha, beta, true); bb[r][c] = 0; if (sc < v) { v = sc; best = c; } beta = Math.min(beta, v); if (alpha >= beta) break; }
        return [best, v];
      };
      const render = (winCells) => {
        board.innerHTML = '';
        for (let c = 0; c < C; c++) {
          const col = h('button', { class: 'c4-col', onclick: () => play(c) });
          for (let r = 0; r < R; r++) {
            const isWin = winCells && winCells.some(([wr, wc]) => wr === r && wc === c);
            col.append(h('div', { class: 'c4-cell' }, b[r][c] ? h('div', { class: 'c4-disc p' + b[r][c] + (isWin ? ' win' : '') + (b[r][c] && b.last && b.last[0] === r && b.last[1] === c ? ' drop' : '') }) : null));
          }
          board.append(col);
        }
      };
      const setStatus = (t, cls) => { status.className = 'c4-status ' + (cls || ''); status.innerHTML = t; };
      const play = (c) => {
        if (over || (mode === 'ai' && turn === 2)) return;
        move(c);
        if (!over && mode === 'ai') { setStatus('KI denkt…', 'p2'); setTimeout(() => { const [mv] = minimax(b, [1, 3, 5][diff - 1], -Infinity, Infinity, true); move(mv == null ? valid(b)[0] : mv); }, 350); }
      };
      const move = (c) => {
        const r = drop(b, c, turn); if (r < 0) return;
        b.last = [r, c]; kit().beep(turn === 1 ? 500 : 400, 0.06, 'sine', 0.05);
        const w = winAt(b, turn);
        if (w) {
          over = true; render(w);
          if (mode === 'ai') { if (turn === 1) { wins++; store.score('four', wins); setStatus('Du hast gewonnen! 🎉 (' + wins + ' Siege)', 'p1'); } else setStatus('Die KI hat gewonnen.', 'p2'); }
          else setStatus((turn === 1 ? 'Rot' : 'Gelb') + ' gewinnt!', 'p' + turn);
          return;
        }
        if (!valid(b).length) { over = true; render(); setStatus('Unentschieden!'); return; }
        turn = 3 - turn; render();
        setStatus(mode === 'ai' ? (turn === 1 ? 'Du bist dran' : 'KI denkt…') : (turn === 1 ? 'Rot' : 'Gelb') + ' ist dran', 'p' + turn);
      };
      const newGame = () => { b = Array.from({ length: R }, () => new Array(C).fill(0)); turn = 1; over = false; render(); setStatus(mode === 'ai' ? 'Du bist dran (Rot)' : 'Rot beginnt', 'p1'); };
      body.append(h('div', { class: 'four' },
        h('div', { class: 'row between wrap gap' },
          Nova.shell.seg([['Gegen KI', 'ai'], ['2 Spieler', 'pvp']], mode, (v) => { mode = v; newGame(); }),
          Nova.shell.seg([['Leicht', 1], ['Mittel', 2], ['Schwer', 3]], diff, (v) => { diff = v; newGame(); }),
          h('button', { class: 'btn sm', onclick: newGame, html: icon('reset') + ' Neu' })),
        status, board));
      newGame();
    }
  });

  /* ======================= BLOCKBRECHER ======================= */
  Nova.registerApp({
    id: 'bricks', name: 'Blockbrecher', icon: 'bricks', folder: 'games', grad: ['#0ea5e9', '#7c5cff'], desc: 'Zerstöre alle Blöcke mit dem Ball',
    mount(body, ctx) {
      const W = 600, H = 760;
      const S = gameShell(body, ctx, 'bricks', W, H);
      const g = S.g;
      let st, state = 'ready', target = W / 2;
      const COLORS = ['#ff5c8a', '#ff9f43', '#ffd166', '#2ecc71', '#00c2a8', '#4f8cff', '#7c5cff'];
      const level = (n) => {
        const bricks = [];
        const rows = Math.min(7, 4 + n);
        for (let r = 0; r < rows; r++) for (let c = 0; c < 9; c++) {
          if (n % 2 === 1 && (r + c) % 3 === 0) continue;
          bricks.push({ x: 24 + c * 62, y: 90 + r * 30, w: 56, h: 22, hp: r < n - 1 ? 2 : 1, c: COLORS[r % COLORS.length] });
        }
        return bricks;
      };
      const reset = () => { st = { px: W / 2, pw: 110, balls: [], lives: 3, score: 0, lvl: 1, bricks: level(1), stuck: true, parts: [] }; serve(); };
      const serve = () => { st.balls = [{ x: st.px, y: H - 62, vx: 0, vy: 0, r: 9 }]; st.stuck = true; };
      const launch = () => { if (state === 'play' && st.stuck) { st.stuck = false; const sp = 430 + st.lvl * 25; st.balls[0].vx = (Math.random() - 0.5) * sp * 0.8; st.balls[0].vy = -sp; } };
      const over = () => { state = 'over'; const rec = store.score('bricks', st.score); S.overlay(rec ? 'Neuer Rekord!' : 'Game Over', st.score + ' Punkte · Level ' + st.lvl + ' · ' + bestLine('bricks'), 'Nochmal', start); };
      const start = () => { reset(); state = 'play'; S.hide(); kit().audio(); };
      const update = (dt) => {
        st.parts.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.l -= dt; });
        st.parts = st.parts.filter((p) => p.l > 0);
        if (state !== 'play') return;
        st.px += (target - st.px) * Math.min(1, dt * 18);
        st.px = Nova.clamp(st.px, st.pw / 2, W - st.pw / 2);
        for (const b of st.balls) {
          if (st.stuck) { b.x = st.px; b.y = H - 62; continue; }
          const steps = 3;
          for (let i = 0; i < steps; i++) {
            b.x += (b.vx * dt) / steps; b.y += (b.vy * dt) / steps;
            if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
            if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
            if (b.y < b.r + 50) { b.y = b.r + 50; b.vy = Math.abs(b.vy); }
            const py = H - 50;
            if (b.vy > 0 && b.y + b.r > py && b.y < py + 14 && Math.abs(b.x - st.px) < st.pw / 2 + b.r) {
              const off = (b.x - st.px) / (st.pw / 2), sp = Math.hypot(b.vx, b.vy) * 1.01;
              const ang = off * 1.05;
              b.vx = Math.sin(ang) * sp; b.vy = -Math.cos(ang) * sp; b.y = py - b.r;
              kit().beep(300, 0.04, 'square', 0.03);
            }
            for (const br of st.bricks) {
              if (br.hp <= 0) continue;
              if (b.x + b.r > br.x && b.x - b.r < br.x + br.w && b.y + b.r > br.y && b.y - b.r < br.y + br.h) {
                const ox = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r)), oy = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r));
                if (ox < oy) b.vx = -b.vx; else b.vy = -b.vy;
                br.hp--; st.score += 10;
                kit().beep(700 + Math.random() * 300, 0.05, 'sine', 0.04);
                if (br.hp <= 0) for (let k = 0; k < 8; k++) st.parts.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.8) * 300, l: 0.6, c: br.c });
                break;
              }
            }
          }
        }
        st.balls = st.balls.filter((b) => b.y < H + 20);
        if (!st.balls.length) { st.lives--; kit().beep(220, 0.3, 'sawtooth', 0.06, 80); if (st.lives <= 0) return over(); serve(); }
        if (st.bricks.every((b) => b.hp <= 0)) { st.lvl++; st.score += 100; st.bricks = level(st.lvl); serve(); kit().beep(600, 0.3, 'sine', 0.06, 1200); }
        kit().hudSet(S.hud, [['Punkte', st.score], ['Level', st.lvl], ['Leben', '♥'.repeat(st.lives)]]);
      };
      const draw = () => {
        const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0f1530'); bg.addColorStop(1, '#090b16');
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        for (const br of st.bricks) {
          if (br.hp <= 0) continue;
          g.fillStyle = br.c; g.globalAlpha = br.hp > 1 ? 1 : 0.85;
          kit().roundRect(g, br.x, br.y, br.w, br.h, 6); g.fill();
          if (br.hp > 1) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
          g.globalAlpha = 1;
        }
        st.parts.forEach((p) => { g.globalAlpha = Math.max(0, p.l * 1.6); g.fillStyle = p.c; g.fillRect(p.x - 3, p.y - 3, 6, 6); });
        g.globalAlpha = 1;
        const pg = g.createLinearGradient(st.px - st.pw / 2, 0, st.px + st.pw / 2, 0); pg.addColorStop(0, '#00e5ff'); pg.addColorStop(1, '#7c5cff');
        g.fillStyle = pg; kit().roundRect(g, st.px - st.pw / 2, H - 50, st.pw, 14, 7); g.fill();
        g.shadowColor = '#fff'; g.shadowBlur = 14; g.fillStyle = '#fff';
        st.balls.forEach((b) => { g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill(); });
        g.shadowBlur = 0;
        if (state === 'play' && st.stuck) { g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '600 16px system-ui'; g.textAlign = 'center'; g.fillText('Tippen oder Leertaste zum Starten', W / 2, H - 100); }
      };
      reset();
      const stop = kit().loop((dt) => { update(dt); draw(); });
      const toX = (e) => { const r = S.box.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * W; };
      S.box.addEventListener('pointermove', (e) => { target = toX(e); });
      S.box.addEventListener('pointerdown', (e) => { target = toX(e); launch(); });
      let keyDir = 0;
      const kl = setInterval(() => { if (keyDir) target = Nova.clamp(st.px + keyDir * 40, 0, W); }, 16);
      const offKeys = kit().keys((k, e, down) => {
        if (k === 'ArrowLeft' || k === 'a') { keyDir = down ? -1 : 0; return true; }
        if (k === 'ArrowRight' || k === 'd') { keyDir = down ? 1 : 0; return true; }
        if (k === ' ' && down) { if (state !== 'play') start(); else launch(); return true; }
      });
      S.overlay('Blockbrecher', 'Bewege den Schläger mit Finger, Maus oder Pfeiltasten. ' + bestLine('bricks'), 'Start', start);
      return () => { stop(); offKeys(); clearInterval(kl); };
    }
  });
})();
