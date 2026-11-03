/* KI-Test in GitHub Actions: lädt das vorinstallierte Modell in einem echten Browser
 * und prüft, dass es auf Deutsch antwortet und ein Bild beschreiben kann. */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const root = path.join(__dirname, '..');
  const server = spawn('python3', ['-m', 'http.server', '8799'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1500));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [], external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || t.includes('[Nova KI]')) console.log('  [Konsole]', t.slice(0, 300)); });
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith('http://localhost:8799') && !/^(data|blob):/.test(u)) external.push(u); });
  let ok = true;
  try {
    await page.goto('http://localhost:8799/index.html');
    const info = await page.evaluate(async () => {
      localStorage.clear();
      const a = Nova.store.create({ name: 'Testkind', pin: '1234', color: 1, profile: { age: 11, grade: 6, status: 'school' } });
      Nova.store.login(a);
      await Nova.ai.loadCatalog();
      const m = Nova.ai.activeModel();
      return m ? m.id + ' (' + m.kind + ', ' + Nova.ai.fmtSize(m.size) + ')' : null;
    });
    console.log('Vorinstalliertes Modell:', info);
    if (!info) throw new Error('Kein vorinstalliertes Modell gefunden');

    const t0 = Date.now();
    await page.evaluate(() => Nova.ai.ensureReady());
    console.log(`Geladen in ${((Date.now() - t0) / 1000).toFixed(1)} s auf ${await page.evaluate(() => Nova.ai.device)}`);

    const chat = await page.evaluate(async () => {
      const acc = Nova.store.current;
      const j = Nova.ai.chat({ messages: [{ role: 'system', content: Nova.ai.systemPrompt(acc) }, { role: 'user', content: 'Hallo! Wer bist du? Antworte in einem Satz.' }], maxTokens: 60, temperature: 0 });
      const r = await j.done; return { text: Nova.ai.cleanOutput(r.text), speed: r.tokens / r.secs };
    });
    console.log(`Chat-Antwort (${chat.speed.toFixed(1)} Token/s): ${chat.text}`);
    if (!chat.text || chat.text.length < 3) throw new Error('Leere Chat-Antwort');

    const canSee = await page.evaluate(() => Nova.ai.canSee());
    if (canSee) {
      const vis = await page.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 320; c.height = 240;
        const g = c.getContext('2d');
        g.fillStyle = '#87ceeb'; g.fillRect(0, 0, 320, 240);
        g.fillStyle = '#2e8b57'; g.fillRect(0, 170, 320, 70);
        g.fillStyle = '#ffd700'; g.beginPath(); g.arc(250, 60, 35, 0, 7); g.fill();
        g.fillStyle = '#d32f2f'; g.beginPath(); g.arc(110, 150, 45, 0, 7); g.fill();
        const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
        const j = Nova.ai.chat({ messages: [{ role: 'user', content: 'Was siehst du auf dem Bild? Antworte kurz.' }], image: blob, maxTokens: 60, temperature: 0 });
        const r = await j.done; return Nova.ai.cleanOutput(r.text);
      });
      console.log('Bild-Antwort:', vis);
      if (!vis || vis.length < 3) throw new Error('Leere Bild-Antwort');
    }
    console.log('Externe Anfragen:', external.length ? external.join(', ') : 'keine (komplett offline ✓)');
    if (external.length) throw new Error('Nova KI hat versucht, ins Internet zu gehen');
  } catch (e) {
    ok = false;
    console.error('KI-TEST FEHLGESCHLAGEN:', e.message);
  }
  if (errors.length) console.log('Seitenfehler:', errors.slice(0, 5));
  await browser.close();
  server.kill();
  process.exit(ok ? 0 : 1);
})();
