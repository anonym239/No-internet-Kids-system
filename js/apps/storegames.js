/* Nova OS – Echte Spiele aus dem Play Store
 *
 * Wenn beim Konto „Mit einmaliger Installation" gewählt ist, kann man die originalen
 * Spiele einmalig aus dem Google Play Store installieren (dafür kurz Internet).
 * Danach startet Nova sie direkt – sie funktionieren ohne Internet.
 * Die Spielzeit wird beim Zurückkehren zur Bildschirmzeit gezählt.
 * (Nur in der Android-App möglich. Android erlaubt keine Installation ohne Bestätigung –
 *  der Play Store öffnet sich, dort tippt man einmal auf „Installieren".)
 */
(function () {
  'use strict';
  const Nova = window.Nova;
  const { h, ui, icon, store } = Nova;

  const GAMES = [
    { pkg: 'com.kiloo.subwaysurf', name: 'Subway Surfers', dev: 'SYBO Games', genre: 'Endlos-Runner', price: 'Kostenlos', grad: ['#ffb800', '#ff5c8a'], icon: 'run' },
    { pkg: 'com.robtopx.geometrydashlite', name: 'Geometry Dash Lite', dev: 'RobTop Games', genre: 'Rhythmus-Jump', price: 'Kostenlos', grad: ['#00e5ff', '#7c5cff'], icon: 'zap' },
    { pkg: 'com.robtopx.geometryjump', name: 'Geometry Dash', dev: 'RobTop Games', genre: 'Rhythmus-Jump (Vollversion)', price: 'Kostenpflichtig', grad: ['#22c55e', '#0ea5e9'], icon: 'zap' },
    { pkg: 'com.imangi.templerun2', name: 'Temple Run 2', dev: 'Imangi Studios', genre: 'Endlos-Runner', price: 'Kostenlos', grad: ['#a16207', '#f97316'], icon: 'run' },
    { pkg: 'com.fingersoft.hillclimb', name: 'Hill Climb Racing', dev: 'Fingersoft', genre: 'Fahren & Physik', price: 'Kostenlos', grad: ['#ef4444', '#facc15'], icon: 'flag' },
    { pkg: 'com.halfbrick.jetpackjoyride', name: 'Jetpack Joyride', dev: 'Halfbrick', genre: 'Action-Runner', price: 'Kostenlos', grad: ['#f97316', '#ec4899'], icon: 'sparkle' },
    { pkg: 'com.halfbrick.fruitninjafree', name: 'Fruit Ninja', dev: 'Halfbrick', genre: 'Geschicklichkeit', price: 'Kostenlos', grad: ['#22c55e', '#ef4444'], icon: 'star' },
    { pkg: 'com.yodo1.crossyroad', name: 'Crossy Road', dev: 'Hipster Whale', genre: 'Arcade', price: 'Kostenlos', grad: ['#4f8cff', '#22c55e'], icon: 'grid' },
    { pkg: 'com.mojang.minecraftpe', name: 'Minecraft', dev: 'Mojang', genre: 'Bauen & Abenteuer', price: 'Kostenpflichtig', grad: ['#16a34a', '#78350f'], icon: 'bricks' }
  ];
  Nova.STORE_GAMES = GAMES;

  /* Internet-Modus ändern – mit Eltern-PIN (falls eingerichtet) sonst mit eigenem Passwort */
  Nova.setInternetMode = async function (acc, mode) {
    if (acc.internet === mode) return true;
    let ok;
    if (Nova.st.hasParent(acc)) {
      const pin = await Nova.shell.askPin('Eltern-PIN', 'Das Ändern des Internet-Modus braucht die Eltern-PIN.');
      ok = pin != null && Nova.st.checkParent(acc, pin);
      if (pin != null && !ok) ui.toast('Eltern-PIN falsch', 'err');
    } else ok = await Nova.shell.askSecret(acc, 'Bestätigen', 'Bitte bestätige die Änderung.');
    if (!ok) return false;
    acc.internet = mode; acc.settings.u = Date.now(); store.save(true);
    ui.toast(mode === 'store' ? 'Einmalige Installation erlaubt' : 'Nova ist jetzt komplett internetfrei');
    return true;
  };

  Nova.registerApp({
    id: 'realgames', name: 'Echte Spiele', icon: 'store', folder: 'games', grad: ['#16a34a', '#0ea5e9'], desc: 'Subway Surfers, Geometry Dash & mehr – einmal installieren, dann offline spielen',
    mount(body, ctx) {
      const acc = ctx.acc;
      const wrap = h('div', { class: 'rg' });
      body.append(wrap);
      const status = {};
      const refresh = async () => {
        if (Nova.native.isAndroid) await Promise.all(GAMES.map(async (g) => { status[g.pkg] = await Nova.native.isInstalled(g.pkg); }));
        render();
      };
      const render = () => {
        wrap.innerHTML = '';
        const android = Nova.native.isAndroid;
        const offline = acc.internet !== 'store';
        let banner;
        if (offline) {
          banner = h('div', { class: 'card rg-banner' },
            h('div', { class: 'banner-ic', html: icon('wifiOff') }),
            h('div', { class: 'grow' }, h('b', null, 'Nova ist komplett internetfrei'), h('div', { class: 'muted small' }, 'Um echte Spiele einmalig zu installieren, erlaube „Einmalige Installation". Danach brauchst du kein Internet mehr.')),
            h('button', { class: 'btn primary sm', onclick: async () => { if (await Nova.setInternetMode(acc, 'store')) render(); } }, 'Erlauben'));
        } else if (!android) {
          banner = h('div', { class: 'card rg-banner' },
            h('div', { class: 'banner-ic', html: icon('info') }),
            h('div', { class: 'grow' }, h('b', null, 'Nur in der Android-App'), h('div', { class: 'muted small' }, 'Die Play-Store-Spiele kannst du in der Nova-App für Android installieren und starten. Am PC kannst du dir die Spiele nur ansehen.')));
        } else {
          banner = h('div', { class: 'card rg-banner' },
            h('div', { class: 'banner-ic ok', html: icon('download') }),
            h('div', { class: 'grow' }, h('b', null, 'So geht\'s'), h('div', { class: 'muted small' }, '1. Kurz mit dem WLAN verbinden · 2. „Installieren" tippen – der Play Store öffnet sich · 3. Dort installieren und zurück zu Nova · 4. WLAN wieder aus – fertig, das Spiel läuft offline.')),
            h('button', { class: 'btn sm', onclick: refresh, html: icon('sync') }));
        }
        const installedCount = GAMES.filter((g) => status[g.pkg]).length;
        wrap.append(banner,
          h('div', { class: 'row between' }, h('h3', null, 'Spiele'), android ? h('span', { class: 'muted small' }, installedCount + ' installiert') : null),
          h('div', { class: 'rg-grid' }, GAMES.map((g) => {
            const inst = !!status[g.pkg];
            let btn;
            if (inst) btn = h('button', { class: 'btn primary sm', onclick: async () => { Nova.shell.markExternal(); if (!(await Nova.native.launch(g.pkg))) ui.toast('Spiel konnte nicht gestartet werden', 'err'); }, html: icon('play') + ' Spielen' });
            else if (offline) btn = h('button', { class: 'btn sm', disabled: true, html: icon('lock') + ' Gesperrt' });
            else if (!android) btn = h('button', { class: 'btn sm', disabled: true }, 'Nur Android');
            else btn = h('button', { class: 'btn sm', onclick: async () => { if (Nova.st.blockReason(acc)) return Nova.shell.checkLock(); await Nova.native.openStore(g.pkg); ui.toast('Im Play Store auf „Installieren" tippen, dann zurück zu Nova'); }, html: icon('download') + ' Installieren' });
            return h('div', { class: 'rg-card card' + (inst ? ' inst' : '') },
              h('div', { class: 'app-ic', style: { background: `linear-gradient(145deg, ${g.grad[0]}, ${g.grad[1]})` }, html: icon(g.icon) }),
              h('div', { class: 'grow' },
                h('b', null, g.name),
                h('div', { class: 'muted xs' }, g.dev + ' · ' + g.genre),
                h('div', { class: 'row gap wrap rg-tags' },
                  h('span', { class: 'tag' }, g.price),
                  h('span', { class: 'tag', html: icon('wifiOff') + ' offline spielbar' }),
                  inst ? h('span', { class: 'tag ok' }, '✓ installiert') : null)),
              btn);
          })),
          h('p', { class: 'muted xs' }, 'Hinweis: Die Spiele gehören den jeweiligen Entwicklern und werden aus dem Google Play Store installiert. Kostenlose Spiele können Werbung und In-App-Käufe enthalten – ohne Internet wird meist keine Werbung geladen. Kauf-Sperren lassen sich im Play Store (Einstellungen → Authentifizierung) aktivieren. Die Spielzeit zählt zur Bildschirmzeit.')
        );
      };
      const onVis = () => { if (!document.hidden) refresh(); };
      document.addEventListener('visibilitychange', onVis);
      render(); refresh();
      return () => document.removeEventListener('visibilitychange', onVis);
    }
  });
})();
