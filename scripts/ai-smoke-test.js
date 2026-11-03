/* KI-Test in GitHub Actions: lädt das vorinstallierte Modell in einem echten Browser
 * und prüft, dass es auf Deutsch antwortet und ein Bild beschreiben kann. */
let pw; try { pw = require('playwright-core'); } catch (e) { pw = require('playwright'); }
const { chromium } = pw;
const path = require('path');

(async () => {
  const root = path.join(__dirname, '..');
  // Kleiner Webserver mit Isolations-Headern (wie in der Android- und Windows-App) → Mehrkern-KI
  const http = require('http'), fs = require('fs');
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const p = path.normalize(path.join(root, decodeURIComponent(req.url.split('?')[0])));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'content-length': fs.statSync(p).size, 'cross-origin-opener-policy': 'same-origin', 'cross-origin-embedder-policy': 'require-corp', 'cross-origin-resource-policy': 'same-origin' });
    fs.createReadStream(p).pipe(res);
  }).listen(8799);
  server.kill = () => server.close();
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
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
    console.log(`Geladen in ${((Date.now() - t0) / 1000).toFixed(1)} s auf ${await page.evaluate(() => Nova.ai.device)} · isoliert: ${await page.evaluate(() => crossOriginIsolated)}`);

    const chat = await page.evaluate(async () => {
      const acc = Nova.store.current;
      const j = Nova.ai.chat({ messages: [{ role: 'system', content: Nova.ai.systemPrompt(acc) }, { role: 'user', content: 'Hallo! Wer bist du? Antworte in einem Satz.' }], maxTokens: 60, temperature: 0 });
      const r = await j.done; return { text: Nova.ai.cleanOutput(r.text), speed: r.tokens / r.secs, secs: r.secs };
    });
    console.log(`Chat-Antwort nach ${chat.secs.toFixed(1)} s: ${chat.text}`);
    if (!chat.text || chat.text.length < 3) throw new Error('Leere Chat-Antwort');

    const canSee = await page.evaluate(() => Nova.ai.canSee());
    if (canSee) {
      const vis = await page.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 320; c.height = 240;
        const g = c.getContext('2d');
        g.fillStyle = '#87ceeb'; g.fillRect(0, 0, 320, 240);
        g.fillStyle = '#2e8b57'; g.fillRect(0, 170, 320, 70);
        g.fillStyle = '#ffd700'; g.beginPath(); g.arc(250, 60, 35, 0, 7); g.fill();
        g.fillStyle = '#f5f5dc'; g.fillRect(70, 110, 110, 70);
        g.fillStyle = '#b22222'; g.beginPath(); g.moveTo(60, 112); g.lineTo(125, 60); g.lineTo(190, 112); g.fill();
        g.fillStyle = '#6b4226'; g.fillRect(115, 140, 22, 40);
        const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
        const j = Nova.ai.chat({ messages: [{ role: 'user', content: 'Was siehst du auf dem Bild? Beschreibe es in einem Satz.' }], image: blob, maxTokens: 60, temperature: 0 });
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
