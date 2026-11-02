/* Nova OS – Hilfsfunktionen & UI-Bausteine */
(function () {
  'use strict';
  const Nova = (window.Nova = window.Nova || {});

  /* ---------- DOM ---------- */
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; } }
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') el[k] = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- IDs & Codes ---------- */
  const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford, ohne I L O U
  function randB32(n) {
    const a = new Uint8Array(n);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.from(a, (x) => B32[x & 31]).join('');
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const normCode = (s) =>
    String(s || '')
      .toUpperCase()
      .replace(/[\s-]/g, '')
      .replace(/O/g, '0')
      .replace(/[IL]/g, '1')
      .replace(/U/g, 'V');

  /* ---------- Zeit ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  function dayKey(d = new Date()) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function dayNumber(d = new Date()) {
    return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  }
  function fmtDur(sec, short) {
    sec = Math.max(0, Math.round(sec));
    const hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60), ss = sec % 60;
    if (short) return hh ? hh + ' h ' + mm + ' min' : mm + ' min';
    return (hh ? hh + ':' + pad(mm) : mm) + ':' + pad(ss);
  }
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  function fmtDate(d = new Date()) {
    return ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][d.getDay()] + ', ' + d.getDate() + '. ' + MON[d.getMonth()];
  }
  const fmtTime = (d = new Date()) => pad(d.getHours()) + ':' + pad(d.getMinutes());
  function relTime(ts) {
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return 'gerade eben';
    if (s < 3600) return 'vor ' + Math.floor(s / 60) + ' min';
    if (s < 86400) return 'vor ' + Math.floor(s / 3600) + ' h';
    const d = new Date(ts);
    return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
  }
  function greeting() {
    const hr = new Date().getHours();
    if (hr < 5) return 'Gute Nacht';
    if (hr < 11) return 'Guten Morgen';
    if (hr < 17) return 'Hallo';
    if (hr < 22) return 'Guten Abend';
    return 'Gute Nacht';
  }

  /* ---------- Base64url ---------- */
  function b64u(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function download(name, content, type = 'application/octet-stream') {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = t;
      document.body.append(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
      ta.remove(); return ok;
    }
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* ---------- UI: Toast, Dialog, Menü ---------- */
  function toast(msg, kind) {
    let host = $('#toasts');
    if (!host) { host = h('div', { id: 'toasts' }); document.body.append(host); }
    const t = h('div', { class: 'toast' + (kind ? ' ' + kind : '') }, msg);
    host.append(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
  }

  function dialog({ title, text, body, actions = [{ label: 'OK', primary: true, value: true }], dismiss = true, wide }) {
    return new Promise((resolve) => {
      const close = (v) => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 200); document.removeEventListener('keydown', onKey); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape' && dismiss) close(undefined); };
      const btns = actions.map((a) =>
        h('button', {
          class: 'btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : '') + (a.ghost ? ' ghost' : ''),
          onclick: async () => {
            if (a.onClick) { const r = await a.onClick(); if (r === false) return; close(r === undefined ? a.value : r); }
            else close(a.value);
          }
        }, a.label)
      );
      const box = h('div', { class: 'dialog' + (wide ? ' wide' : '') },
        title && h('h3', null, title),
        text && h('p', { class: 'muted' }, text),
        typeof body === 'function' ? body(close) : body,
        h('div', { class: 'dialog-actions' }, btns)
      );
      const wrap = h('div', { class: 'dialog-wrap', onclick: (e) => { if (e.target === wrap && dismiss) close(undefined); } }, box);
      document.body.append(wrap);
      document.addEventListener('keydown', onKey);
      requestAnimationFrame(() => { wrap.classList.add('show'); const f = box.querySelector('input,textarea,select'); if (f) f.focus(); });
    });
  }

  async function prompt(title, { value = '', placeholder = '', label = 'Speichern', type = 'text', text } = {}) {
    const inp = h('input', { class: 'input', type, value, placeholder });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.closest('.dialog').querySelector('.btn.primary').click(); });
    const r = await dialog({
      title, text, body: inp,
      actions: [
        { label: 'Abbrechen', ghost: true, value: null },
        { label, primary: true, onClick: () => inp.value.trim() || false }
      ]
    });
    return r == null ? null : r;
  }

  function confirm(title, text, { label = 'OK', danger } = {}) {
    return dialog({ title, text, actions: [{ label: 'Abbrechen', ghost: true, value: false }, { label, primary: !danger, danger, value: true }] });
  }

  function menu(x, y, items) {
    $$('.ctx-menu').forEach((m) => m.remove());
    const m = h('div', { class: 'ctx-menu' },
      items.filter(Boolean).map((it) =>
        it === '-' ? h('div', { class: 'ctx-sep' }) :
        h('button', { class: 'ctx-item' + (it.danger ? ' danger' : ''), onclick: () => { m.remove(); it.onClick(); } },
          it.icon ? h('span', { class: 'ctx-ic', html: Nova.icon(it.icon) }) : null, it.label)
      )
    );
    document.body.append(m);
    const r = m.getBoundingClientRect();
    m.style.left = clamp(x, 8, innerWidth - r.width - 8) + 'px';
    m.style.top = clamp(y, 8, innerHeight - r.height - 8) + 'px';
    setTimeout(() => {
      const off = (e) => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } };
      document.addEventListener('pointerdown', off, true);
    }, 0);
  }

  /* Long-Press + Rechtsklick für Kontextmenüs */
  function onContext(el, fn) {
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); fn(e.clientX, e.clientY); });
    let t, sx, sy, fired = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      fired = false; sx = e.clientX; sy = e.clientY;
      t = setTimeout(() => { fired = true; if (navigator.vibrate) navigator.vibrate(15); fn(sx, sy); }, 500);
    });
    const cancel = (e) => { if (e && e.type === 'pointermove' && Math.hypot(e.clientX - sx, e.clientY - sy) < 10) return; clearTimeout(t); };
    el.addEventListener('pointermove', cancel);
    el.addEventListener('pointerup', cancel);
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('click', (e) => { if (fired) { e.stopImmediatePropagation(); e.preventDefault(); fired = false; } }, true);
  }

  /* PIN-Eingabe (Ziffernblock) */
  function pinPad({ length = 4, onDone, hint }) {
    let val = '';
    const dots = h('div', { class: 'pin-dots' }, Array.from({ length }, () => h('span')));
    const hintEl = h('div', { class: 'pin-hint muted' }, hint || '');
    const update = () => $$('span', dots).forEach((d, i) => d.classList.toggle('on', i < val.length));
    const press = (k) => {
      if (k === 'del') val = val.slice(0, -1);
      else if (val.length < length) val += k;
      update();
      if (val.length === length) { const v = val; setTimeout(() => onDone(v, api), 120); }
    };
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
    const pad = h('div', { class: 'pin-pad' }, keys.map((k) =>
      k === '' ? h('span') :
      h('button', { class: 'pin-key', onclick: () => press(k), html: k === 'del' ? Nova.icon('backspace') : k })
    ));
    const onKey = (e) => {
      if (!document.body.contains(root)) return document.removeEventListener('keydown', onKey);
      if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del');
    };
    document.addEventListener('keydown', onKey);
    const root = h('div', { class: 'pin' }, dots, hintEl, pad);
    const api = {
      el: root,
      reset(msg) { val = ''; update(); if (msg != null) { hintEl.textContent = msg; } },
      error(msg) { dots.classList.add('shake'); hintEl.textContent = msg; hintEl.classList.add('err'); setTimeout(() => { dots.classList.remove('shake'); api.reset(); }, 450); }
    };
    return api;
  }

  Object.assign(Nova, {
    h, $, $$, B32, randB32, uid, normCode, pad, dayKey, dayNumber, fmtDur, fmtDate, fmtTime, relTime, greeting, WD, MON,
    b64u, unb64u, download, copyText, clamp, debounce,
    ui: { toast, dialog, prompt, confirm, menu, onContext, pinPad }
  });
})();
