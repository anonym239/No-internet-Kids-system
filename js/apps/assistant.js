/* Nova KI – lokaler KI-Assistent (Chat, Bilder verstehen, Texte verbessern)
 * Chatten ist ohne Passwort möglich. Neue Modelle installieren nur mit Passwort (Eltern-PIN, falls eingerichtet).
 */
(function () {
  'use strict';
  const Nova = window.Nova;
  const { h, ui, icon, store } = Nova;
  const ai = () => Nova.ai;

  /* ---------- Mini-Markdown (sicher: erst escapen, dann formatieren) ---------- */
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function md(text) {
    const parts = String(text).split(/```/);
    return parts.map((part, i) => {
      if (i % 2 === 1) return '<pre><code>' + esc(part.replace(/^[a-z]*\n/i, '')) + '</code></pre>';
      const lines = esc(part).split('\n');
      let html = '', list = null;
      const inline = (s) => s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<i>$2</i>');
      const close = () => { if (list) { html += '</' + list + '>'; list = null; } };
      for (const raw of lines) {
        const l = raw.trimEnd();
        let m;
        if ((m = /^\s*[-*•]\s+(.*)/.exec(l))) { if (list !== 'ul') { close(); html += '<ul>'; list = 'ul'; } html += '<li>' + inline(m[1]) + '</li>'; }
        else if ((m = /^\s*\d+[.)]\s+(.*)/.exec(l))) { if (list !== 'ol') { close(); html += '<ol>'; list = 'ol'; } html += '<li>' + inline(m[1]) + '</li>'; }
        else if ((m = /^#{1,6}\s+(.*)/.exec(l))) { close(); html += '<p class="md-h">' + inline(m[1]) + '</p>'; }
        else if (!l.trim()) { close(); html += '<div class="md-gap"></div>'; }
        else { close(); html += '<p>' + inline(l) + '</p>'; }
      }
      close();
      return html;
    }).join('');
  }

  /* ---------- Zustimmung für Installationen ---------- */
  async function installAuth(acc) {
    if (Nova.st.hasParent(acc)) {
      const p = await Nova.shell.askPin('Eltern-PIN', 'Zum Installieren eines KI-Modells ist die Eltern-PIN nötig. Dafür wird kurz das Internet eingeschaltet.');
      if (p == null) return false;
      if (Nova.st.checkParent(acc, p)) return true;
      ui.toast('Eltern-PIN falsch', 'err');
      return false;
    }
    return Nova.shell.askSecret(acc, 'Modell installieren', 'Zum Installieren brauchst du ' + (acc.auth === 'password' ? 'dein Passwort' : 'deine PIN') + '. Dafür wird kurz das Internet eingeschaltet.');
  }

  /* ---------- Modelle verwalten ---------- */
  async function modelsDialog(onChange) {
    const A = ai();
    await A.loadCatalog();
    const acc = store.current;
    const wrap = h('div', { class: 'stack ai-models' });
    const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate().catch(() => null) : null;
    const render = () => {
      wrap.innerHTML = '';
      const active = A.activeModel();
      const installed = A.catalog.filter((m) => A.isInstalled(m));
      const available = A.catalog.filter((m) => !A.isInstalled(m));
      const card = (m) => {
        const inst = A.isInstalled(m);
        const rec = A.installedMap()[m.id];
        const size = inst ? (m.bundled ? m.size : rec.size) : A.gpuWanted() && m.gpuSize ? m.gpuSize : m.size;
        const bar = h('div', { class: 'progress hidden' }, h('i', { style: { width: '0%' } }));
        const status = h('div', { class: 'muted xs' });
        const actions = h('div', { class: 'row gap wrap' });
        if (inst) {
          if (!active || active.id !== m.id) actions.append(h('button', { class: 'btn sm primary', onclick: () => { A.setActive(m.id); render(); onChange && onChange(); ui.toast(m.name + ' wird verwendet'); } }, 'Verwenden'));
          else actions.append(h('span', { class: 'tag ok' }, 'Wird verwendet'));
          if (!m.bundled) actions.append(h('button', { class: 'btn sm ghost danger', onclick: async () => {
            if (!(await installAuth(acc))) return;
            await A.uninstall(m); render(); onChange && onChange(); ui.toast('Modell gelöscht');
          } }, 'Löschen'));
        } else {
          let ctrl = null;
          const btn = h('button', { class: 'btn sm primary', html: icon('download') + ' Installieren' });
          btn.onclick = async () => {
            if (ctrl) { ctrl.abort(); return; }
            if (!(await installAuth(acc))) return;
            ctrl = new AbortController();
            btn.innerHTML = icon('x') + ' Abbrechen';
            bar.classList.remove('hidden');
            ui.toast('Internet kurz eingeschaltet – Download läuft');
            try {
              await A.install(m, (done, total) => { bar.firstChild.style.width = Math.round((done / total) * 100) + '%'; status.textContent = A.fmtSize(done) + ' von ' + A.fmtSize(total); }, ctrl.signal);
              ui.toast(m.name + ' installiert – Internet wieder aus');
              if (!A.activeModel() || await ui.confirm('Modell verwenden?', m.name + ' ist installiert. Jetzt verwenden?', { label: 'Verwenden' })) A.setActive(m.id);
              onChange && onChange();
            } catch (e) {
              ui.toast(e.name === 'AbortError' ? 'Download abgebrochen' : 'Fehler: ' + e.message, 'err');
            }
            ctrl = null; render();
          };
          actions.append(btn);
        }
        return h('div', { class: 'ai-model card' + (active && active.id === m.id ? ' on' : '') },
          h('div', { class: 'row gap' },
            h('div', { class: 'ai-model-ic', html: icon(m.kind === 'vlm' ? 'image' : 'note') }),
            h('div', { class: 'grow' },
              h('b', null, m.name),
              h('div', { class: 'muted xs' }, m.maker + ' · ' + A.fmtSize(size) + (m.bundled ? ' · vorinstalliert' : ''))),
            h('div', { class: 'row gap ai-badges' },
              h('span', { class: 'tag' }, 'Chat'),
              m.kind === 'vlm' ? h('span', { class: 'tag' }, 'Bilder') : null,
              m.heavy ? h('span', { class: 'tag red' }, 'sehr groß') : null)),
          h('div', { class: 'muted small' }, m.desc),
          bar, status, actions);
      };
      wrap.append(...[
        h('div', { class: 'info-row', html: icon('shield') + '<div class="small">Alle Modelle laufen <b>komplett auf diesem Gerät</b>. Deine Chats verlassen nie das Gerät. Nur zum Installieren neuer Modelle wird – mit Erlaubnis – kurz das Internet eingeschaltet.</div>' }),
        navigator.gpu ? h('label', { class: 'toggle-row' }, h('span', null, h('b', null, 'Grafikkarte nutzen'), h('div', { class: 'muted xs' }, 'Meist deutlich schneller. Bei Problemen ausschalten.')),
          h('input', { type: 'checkbox', class: 'switch', checked: A.gpuWanted(), onchange: (e) => { A.setGpu(e.target.checked); A.state = 'idle'; A.loadedId = null; A.emit(); render(); } })) : null,
        h('h3', { class: 'ai-sec' }, 'Installiert'),
        installed.length ? installed.map(card) : h('p', { class: 'muted small' }, 'Noch kein Modell installiert.'),
        available.length ? h('h3', { class: 'ai-sec' }, 'Weitere Modelle (einmalig Internet nötig)') : null,
        available.map(card),
        est && est.quota ? h('div', { class: 'muted xs' }, 'Speicher: ' + A.fmtSize(est.usage || 0) + ' belegt von ' + A.fmtSize(est.quota) + ' verfügbar') : null
      ].flat().filter(Boolean));
    };
    render();
    const off = A.on(() => {});
    await ui.dialog({ title: 'KI-Modelle', wide: true, body: wrap, actions: [{ label: 'Fertig', primary: true }] });
    off();
  }

  /* ---------- Streaming-Dialog (für andere Apps) ---------- */
  function streamDialog(title, run, { applyLabel, onApply } = {}) {
    const out = h('div', { class: 'ai-out md' }, h('span', { class: 'ai-typing' }, h('i'), h('i'), h('i')));
    const status = h('div', { class: 'muted xs' }, 'Nova KI denkt nach …');
    let job, text = '', finished = false;
    const p = ui.dialog({
      title, wide: true,
      body: h('div', { class: 'stack' }, out, status),
      actions: [
        { label: 'Schließen', ghost: true, onClick: () => { if (job && !finished) job.stop(); return true; } },
        onApply ? { label: applyLabel || 'Übernehmen', primary: true, onClick: () => { if (!finished) { ui.toast('Bitte warten, bis die Antwort fertig ist'); return false; } onApply(ai().cleanOutput(text)); return true; } } : null
      ].filter(Boolean)
    });
    try {
      job = run((t) => { text += t; out.innerHTML = md(ai().cleanOutput(text)) || ''; });
      job.done.then(() => { finished = true; status.textContent = 'Fertig · lokal berechnet, ohne Internet'; out.innerHTML = md(ai().cleanOutput(text)); })
        .catch((e) => { finished = true; status.textContent = ''; out.innerHTML = '<p class="err-text">' + esc(e.message) + '</p>'; });
    } catch (e) { out.textContent = e.message; }
    return p;
  }
  Nova.aiTextHelper = async function (text, onApply) {
    if (!text || !text.trim()) return ui.toast('Erst etwas schreiben', 'err');
    await ai().loadCatalog();
    if (!ai().activeModel()) return ui.toast('Kein KI-Modell installiert – siehe App „Nova KI"', 'err');
    const pick = await ui.dialog({
      title: 'Mit Nova KI bearbeiten',
      body: (close) => h('div', { class: 'list' }, ai().TEXT_ACTIONS.map(([k, label]) => h('button', { class: 'list-item', onclick: () => close(k) }, h('span', { class: 'li-ic', html: icon('sparkle') }), h('span', { class: 'grow' }, label)))),
      actions: [{ label: 'Abbrechen', ghost: true, value: null }]
    });
    if (!pick) return;
    const [, label, instr] = ai().TEXT_ACTIONS.find((a) => a[0] === pick);
    const replace = ['fix', 'nicer', 'shorter', 'longer'].includes(pick);
    streamDialog(label, (onToken) => ai().task(instr, text, { onToken }), { applyLabel: replace ? 'Ersetzen' : 'Unten einfügen', onApply: (res) => onApply(res, replace) });
  };
  Nova.aiExplain = async function (title, prompt) {
    await ai().loadCatalog();
    if (!ai().activeModel()) return ui.toast('Kein KI-Modell installiert', 'err');
    const acc = store.current;
    streamDialog(title, (onToken) => ai().chat({ messages: [{ role: 'system', content: ai().systemPrompt(acc) }, { role: 'user', content: prompt }], onToken, maxTokens: 350, temperature: 0.3 }));
  };

  /* ---------- Die App ---------- */
  Nova.registerApp({
    id: 'assistant', name: 'Nova KI', icon: 'a-ai', folder: 'tools', grad: ['#0ea5e9', '#6366f1'], desc: 'Dein KI-Helfer – chatten, Bilder erklären, Texte verbessern. Läuft komplett offline.', full: true,
    mount(body, ctx) {
      const A = ai();
      const acc = ctx.acc;
      let chat = null, job = null, pendingImg = null;

      const side = h('aside', { class: 'ai-side' });
      const msgs = h('div', { class: 'ai-msgs' });
      const statusEl = h('div', { class: 'ai-status' });
      const imgPrev = h('div', { class: 'ai-imgprev hidden' });
      const input = h('textarea', { class: 'ai-input', rows: 1, placeholder: 'Frag Nova etwas …', maxlength: 4000 });
      const fileIn = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      const imgBtn = h('button', { class: 'icon-btn ai-imgbtn', title: 'Bild anhängen', html: icon('image') });
      const sendBtn = h('button', { class: 'ai-send', title: 'Senden', html: icon('send') });
      const main = h('div', { class: 'ai-main' }, statusEl, msgs, h('div', { class: 'ai-composer' }, imgPrev, h('div', { class: 'ai-inputrow' }, imgBtn, input, sendBtn), fileIn,
        h('div', { class: 'ai-note muted xs' }, 'Nova KI läuft auf deinem Gerät – ohne Internet. Sie kann sich irren.')));
      const app = h('div', { class: 'ai-app' }, side, main);
      body.append(app);

      const chats = () => store.items('aichats').sort((a, b) => b.u - a.u);
      const newChat = () => { chat = { title: '', messages: [] }; renderMsgs(); renderSide(); app.classList.remove('show-side'); setTimeout(() => input.focus(), 50); };
      const saveChat = () => {
        if (!chat.messages.length) return;
        if (!chat.title) chat.title = (chat.messages.find((m) => m.role === 'user') || {}).content.slice(0, 48) || 'Bild';
        chat = store.put('aichats', chat);
        const all = store.current.data.aichats.filter((c) => !c.del);
        if (all.length > 40) store.del('aichats', all.sort((a, b) => a.u - b.u)[0].id);
        renderSide();
      };

      function renderSide() {
        side.innerHTML = '';
        side.append(h('button', { class: 'btn primary wide', onclick: newChat, html: icon('plus') + ' Neuer Chat' }));
        const list = h('div', { class: 'ai-chats' });
        chats().forEach((c) => {
          const b = h('button', { class: 'ai-chat-item' + (chat && chat.id === c.id ? ' on' : ''), onclick: () => { chat = c; renderMsgs(); renderSide(); app.classList.remove('show-side'); } },
            h('span', { class: 'grow' }, c.title || 'Chat'), h('span', { class: 'muted xs' }, Nova.relTime(c.u)));
          ui.onContext(b, (x, y) => ui.menu(x, y, [{ label: 'Chat löschen', icon: 'trash', danger: true, onClick: () => { store.del('aichats', c.id); if (chat && chat.id === c.id) newChat(); else renderSide(); } }]));
          list.append(b);
        });
        if (!chats().length) list.append(h('p', { class: 'muted xs' }, 'Deine Chats erscheinen hier.'));
        side.append(list, h('button', { class: 'btn wide ai-models-btn', onclick: () => modelsDialog(renderStatus), html: icon('cpu') + ' KI-Modelle' }));
      }

      function suggestions() {
        const P = Nova.persona(acc);
        const ints = (acc.profile.interests || []).slice(0, 2);
        const base = P.level <= 2
          ? ['Erzähl mir eine kurze Geschichte über einen mutigen Drachen', 'Warum ist der Himmel blau?', 'Hilf mir beim Einmaleins mit 7']
          : ['Erklär mir den Satz des Pythagoras', 'Hilf mir, eine höfliche Nachricht an meine Lehrerin zu schreiben', 'Gib mir Tipps für ein gutes Referat', 'Stell mir ein Quiz über Tiere'];
        ints.forEach((i) => base.push('Erzähl mir etwas Spannendes über ' + i));
        if (A.canSee()) base.unshift('Was ist auf meinem Bild? (Bild anhängen)');
        return base.slice(0, 5);
      }

      function bubble(m, live) {
        const el = h('div', { class: 'ai-msg ' + m.role });
        if (m.role === 'assistant') el.append(h('div', { class: 'ai-av', html: icon('a-ai') }));
        const box = h('div', { class: 'ai-bubble' });
        if (m.img) box.append(h('img', { class: 'ai-msg-img', src: m.img, alt: 'Bild' }));
        const txt = h('div', { class: 'md' });
        if (m.role === 'assistant') txt.innerHTML = live ? '' : md(m.content); else txt.textContent = m.content;
        box.append(txt);
        if (m.meta) box.append(h('div', { class: 'ai-meta muted xs' }, m.meta));
        el.append(box);
        return { el, txt, box };
      }

      function renderMsgs() {
        msgs.innerHTML = '';
        if (!chat || !chat.messages.length) {
          const m = A.activeModel();
          msgs.append(h('div', { class: 'ai-empty' },
            h('div', { class: 'ai-empty-ic', html: icon('a-ai') }),
            h('h2', null, 'Hallo ' + acc.name + ', wie kann ich helfen?'),
            h('p', { class: 'muted' }, m ? 'Ich laufe komplett auf deinem Gerät – ohne Internet.' : 'Es ist noch kein KI-Modell installiert.'),
            m ? h('div', { class: 'ai-sugg' }, suggestions().map((s) => h('button', { class: 'chip', onclick: () => { if (s.includes('(Bild anhängen)')) { fileIn.click(); input.value = 'Was ist auf diesem Bild zu sehen?'; } else { input.value = s; send(); } } }, s)))
              : h('button', { class: 'btn primary', onclick: () => modelsDialog(renderStatus) }, 'KI-Modell installieren')));
          return;
        }
        chat.messages.forEach((m) => msgs.append(bubble(m).el));
        msgs.scrollTop = msgs.scrollHeight;
      }

      function renderStatus() {
        const m = A.activeModel();
        statusEl.innerHTML = '';
        let txt, cls = '';
        if (!A.supported) { txt = 'Dieses Gerät unterstützt die lokale KI leider nicht.'; cls = 'err'; }
        else if (!m) { txt = 'Kein Modell installiert'; cls = 'err'; }
        else if (A.state === 'loading' && A.progress.total) txt = 'Wird geladen … ' + Math.round((A.progress.loaded / A.progress.total) * 100) + ' %';
        else if (A.state === 'loading') txt = 'Wird gestartet …';
        else if (A.state === 'error') { txt = 'Fehler: ' + A.error; cls = 'err'; }
        else if (A.state === 'ready' && A.loadedId === m.id) txt = 'Bereit · ' + (A.device === 'webgpu' ? 'Grafikkarte' : 'Prozessor');
        else txt = 'Bereit zum Starten';
        statusEl.append(
          h('button', { class: 'icon-btn sm ai-hist', title: 'Verlauf', onclick: () => app.classList.toggle('show-side'), html: icon('grid') }),
          h('span', { class: 'ai-dot ' + (cls || (A.state === 'ready' ? 'ok' : '')) }),
          h('b', null, m ? m.name : 'Nova KI'),
          h('span', { class: 'muted small grow ai-st-txt' }, txt),
          h('button', { class: 'btn sm ghost', onclick: () => modelsDialog(renderStatus), html: icon('cpu') + '<span class="hide-xs"> Modelle</span>' }));
        imgBtn.classList.toggle('dim', !A.canSee());
        sendBtn.disabled = !m;
      }

      async function setImage(file) {
        if (!file) return;
        if (!A.canSee()) { ui.toast('Dieses Modell kann keine Bilder ansehen – wähle unter „Modelle" einen Alleskönner', 'err'); return; }
        try {
          pendingImg = await A.prepareImage(file);
          imgPrev.innerHTML = '';
          imgPrev.append(h('img', { src: pendingImg.url, alt: '' }), h('button', { class: 'icon-btn sm', title: 'Entfernen', onclick: () => { pendingImg = null; imgPrev.classList.add('hidden'); }, html: icon('x') }));
          imgPrev.classList.remove('hidden');
        } catch (e) { ui.toast('Bild konnte nicht geladen werden', 'err'); }
      }

      async function send() {
        if (job) { job.stop(); return; }
        const text = input.value.trim();
        if (!text && !pendingImg) return;
        if (!A.activeModel()) return modelsDialog(renderStatus);
        if (!chat) chat = { title: '', messages: [] };
        if (!chat.messages.length) msgs.innerHTML = '';
        let thumb = null;
        if (pendingImg) {
          const c = document.createElement('canvas'); const im = new Image(); im.src = pendingImg.url; await im.decode();
          const s = Math.min(1, 320 / Math.max(im.width, im.height)); c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          thumb = c.toDataURL('image/jpeg', 0.7);
        }
        const userMsg = { role: 'user', content: text || 'Was ist auf diesem Bild zu sehen?', img: thumb };
        chat.messages.push(userMsg);
        msgs.append(bubble(userMsg).el);
        input.value = ''; autosize();
        const image = pendingImg ? pendingImg.blob : null;
        pendingImg = null; imgPrev.classList.add('hidden');

        const reply = { role: 'assistant', content: '' };
        const b = bubble(reply, true);
        b.txt.innerHTML = '<span class="ai-typing"><i></i><i></i><i></i></span>';
        msgs.append(b.el); msgs.scrollTop = msgs.scrollHeight;

        if (A.blocked(userMsg.content)) {
          reply.content = A.blockedAnswer; b.txt.innerHTML = md(reply.content); chat.messages.push(reply); saveChat(); return;
        }
        const history = chat.messages.slice(0, -1).slice(-10).map((m) => ({ role: m.role, content: m.content }));
        const messages = [{ role: 'system', content: A.systemPrompt(acc) }, ...history, { role: 'user', content: userMsg.content }];
        let raw = '';
        sendBtn.classList.add('stop'); sendBtn.innerHTML = icon('stop'); sendBtn.title = 'Stopp';
        job = A.chat({ messages, image, onToken: (t) => { raw += t; const clean = A.cleanOutput(raw); b.txt.innerHTML = clean ? md(clean) : '<span class="ai-typing"><i></i><i></i><i></i></span>'; const near = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 140; if (near) msgs.scrollTop = msgs.scrollHeight; } });
        try {
          const r = await job.done;
          reply.content = A.cleanOutput(raw || r.text) || '…';
          reply.meta = r.secs ? (r.tokens / r.secs).toFixed(1).replace('.', ',') + ' Wörter/s · offline' : 'offline';
        } catch (e) {
          reply.content = raw ? A.cleanOutput(raw) : 'Das hat leider nicht geklappt: ' + e.message;
        }
        b.txt.innerHTML = md(reply.content);
        if (reply.meta) b.box.append(h('div', { class: 'ai-meta muted xs' }, reply.meta));
        chat.messages.push(reply);
        job = null;
        sendBtn.classList.remove('stop'); sendBtn.innerHTML = icon('send'); sendBtn.title = 'Senden';
        saveChat();
      }

      const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(160, input.scrollHeight) + 'px'; };
      input.addEventListener('input', autosize);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
      sendBtn.onclick = send;
      imgBtn.onclick = () => fileIn.click();
      fileIn.onchange = () => { setImage(fileIn.files[0]); fileIn.value = ''; };
      input.addEventListener('paste', (e) => { const f = Array.from(e.clipboardData.files || [])[0]; if (f && f.type.startsWith('image/')) { e.preventDefault(); setImage(f); } });
      app.addEventListener('dragover', (e) => e.preventDefault());
      app.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) setImage(f); });

      const off = A.on(renderStatus);
      ctx.setActions(h('button', { class: 'btn sm ghost', onclick: newChat, html: icon('plus') + '<span class="hide-xs"> Neuer Chat</span>' }));
      newChat();
      A.loadCatalog().then(async () => {
        await A.verify();
        renderStatus(); renderMsgs();
        if (A.activeModel() && A.supported) A.ensureReady().catch(() => {});
        if (Nova.aiPending) { const p = Nova.aiPending; Nova.aiPending = null; input.value = p.prompt; autosize(); if (p.autoSend) send(); }
      });
      renderStatus();
      return () => { off(); if (job) job.stop(); };
    }
  });

  Nova.aiModelsDialog = modelsDialog;
})();
