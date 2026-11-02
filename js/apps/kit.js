/* Nova OS – Toolkit für Spiele & Kreativ-Apps (Canvas, Sound, Eingabe) */
(function () {
  'use strict';
  const Nova = window.Nova;
  const { h } = Nova;
  let AC = null;

  const kit = {
    audio() {
      if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); }
      if (AC.state === 'suspended') AC.resume();
      return AC;
    },
    soundOn: () => !Nova.store.current || Nova.store.current.settings.sound !== false,
    beep(freq = 440, dur = 0.1, type = 'square', vol = 0.06, slideTo) {
      if (!kit.soundOn()) return;
      const ac = kit.audio(); if (!ac) return;
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur = 0.1, vol = 0.08, freq = 1200, when) {
      if (!kit.soundOn()) return;
      const ac = kit.audio(); if (!ac) return;
      const t = when || ac.currentTime;
      const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = buf; f.type = 'highpass'; f.frequency.value = freq;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(ac.destination); s.start(t);
    },

    /* Canvas mit fester logischer Größe, skaliert passend in den Container */
    stage(body, W, H) {
      const cv = h('canvas', { class: 'game-cv' });
      const hud = h('div', { class: 'game-hud' });
      const ov = h('div', { class: 'game-ov' });
      const box = h('div', { class: 'game-box' }, cv, hud, ov);
      const stage = h('div', { class: 'game-stage' }, box);
      body.append(stage);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = W * dpr; cv.height = H * dpr;
      const g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const fit = () => {
        const cs = getComputedStyle(stage);
        const aw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const ah = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        const s = Math.max(0.1, Math.min(aw / W, ah / H));
        box.style.width = W * s + 'px'; box.style.height = H * s + 'px';
      };
      const ro = new ResizeObserver(fit); ro.observe(stage); fit();
      return {
        cv, g, W, H, hud, ov, box, stage,
        overlay(title, text, btn, onBtn, extra) {
          ov.innerHTML = '';
          ov.append(h('div', { class: 'game-card' }, h('h2', null, title), text ? h('p', null, text) : null, extra || null,
            btn ? h('button', { class: 'btn primary', onclick: (e) => { e.stopPropagation(); onBtn(); } }, btn) : null));
          ov.classList.add('show');
          const b = ov.querySelector('.btn'); if (b) setTimeout(() => b.focus(), 50);
        },
        hide() { ov.classList.remove('show'); },
        destroy() { ro.disconnect(); }
      };
    },

    loop(fn) {
      let last = performance.now(), id, on = true;
      const step = (t) => { if (!on) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; fn(dt); id = requestAnimationFrame(step); };
      id = requestAnimationFrame(step);
      return () => { on = false; cancelAnimationFrame(id); };
    },

    /* Wischgesten: cb('left'|'right'|'up'|'down'|'tap', event) */
    swipe(el, cb) {
      let sx, sy, st, done;
      el.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; st = Date.now(); done = false; });
      el.addEventListener('pointermove', (e) => {
        if (done || sx == null) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.hypot(dx, dy) > 30) { done = true; cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'), e); }
      });
      el.addEventListener('pointerup', (e) => { if (!done && sx != null && Date.now() - st < 400) cb('tap', e); sx = null; });
    },

    keys(handler) {
      const on = (e) => { if (e.target.closest && e.target.closest('input,textarea')) return; if (handler(e.key, e, true) === true) e.preventDefault(); };
      const off = (e) => handler(e.key, e, false);
      document.addEventListener('keydown', on);
      document.addEventListener('keyup', off);
      return () => { document.removeEventListener('keydown', on); document.removeEventListener('keyup', off); };
    },

    hudSet(hud, items) {
      hud.innerHTML = '';
      for (const [k, v] of items) hud.append(h('div', { class: 'hud-item' }, h('span', null, k), h('b', null, v)));
    },

    roundRect(g, x, y, w, hh, r) {
      g.beginPath();
      g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r);
      g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
  };
  Nova.kit = kit;
})();
