/* Nova OS – Bildschirmzeit & Fernsteuerungs-Codes
 *
 * Fernsteuerung ohne Internet:
 * Eltern öffnen auf IHREM Gerät "Eltern-Fernsteuerung", geben die Konto-ID des Kindes
 * und die Eltern-PIN ein und wählen eine Aktion. Daraus wird ein 9-stelliger Code
 * berechnet (HMAC-SHA256 mit einem Schlüssel aus Konto-ID + Eltern-PIN).
 * Das Kind tippt den Code ein – das Gerät prüft ihn mit dem gespeicherten Schlüssel.
 * Codes gelten nur am Erstellungstag (±1 Tag) und nur einmal.
 *
 * Code-Aufbau (45 Bit, Base32 = 9 Zeichen):
 *   Aktion 3 Bit | Wert 8 Bit | Tag 6 Bit | Zufall 8 Bit | Signatur 20 Bit
 */
(function () {
  'use strict';
  const Nova = window.Nova;
  const C = window.NovaCrypto;

  const ACTIONS = [
    { id: 0, label: 'Zeit hinzufügen', short: '+ Zeit', icon: 'plus', value: 'minutes' },
    { id: 1, label: 'Tageslimit festlegen', short: 'Limit', icon: 'hourglass', value: 'limit' },
    { id: 2, label: 'Heute sperren', short: 'Sperren', icon: 'lock' },
    { id: 3, label: 'Heute freigeben', short: 'Freigeben', icon: 'unlock' },
    { id: 4, label: 'Nutzung zurücksetzen', short: 'Reset', icon: 'reset' },
    { id: 5, label: 'Nachtruhe an / aus', short: 'Nachtruhe', icon: 'moon', value: 'toggle' }
  ];

  const keyFor = (id, pin) => C.sha256hex('nova-parent:' + Nova.normCode(id) + ':' + pin);
  const today = () => Nova.dayKey();

  function mac(key, id, payload) {
    const b = C.hmac(key, Nova.normCode(id) + ':' + payload);
    return (b[0] << 12) | (b[1] << 4) | (b[2] >> 4);
  }
  function encode(n, len) {
    let s = '';
    for (let i = 0; i < len; i++) { s = Nova.B32[n % 32] + s; n = Math.floor(n / 32); }
    return s;
  }
  function decode(s) {
    let n = 0;
    for (const ch of s) { const v = Nova.B32.indexOf(ch); if (v < 0) return -1; n = n * 32 + v; }
    return n;
  }
  const fmtCode = (s) => s.slice(0, 3) + '-' + s.slice(3, 6) + '-' + s.slice(6, 9);

  const st = {
    ACTIONS,
    keyFor,
    fmtCode,
    hasParent: (acc) => !!acc.st.parentKey,
    checkParent: (acc, pin) => acc.st.parentKey === keyFor(acc.id, pin),
    setParent(acc, pin) { acc.st.parentKey = keyFor(acc.id, pin); acc.st.u = Date.now(); Nova.store.save(true); },

    used: (acc) => acc.st.usage[today()] || 0,
    state(acc) {
      const d = today(), L = acc.st.locked[d] || 0, U = acc.st.unlocked[d] || 0;
      if (L && L >= U) return 'locked';
      if (U && U > L) return 'free';
      return 'normal';
    },
    allowance(acc) {
      const s = this.state(acc);
      if (s === 'locked') return 0;
      if (s === 'free' || !acc.st.limit) return Infinity;
      return (acc.st.limit + (acc.st.bonus[today()] || 0)) * 60;
    },
    remaining(acc) { return this.allowance(acc) - this.used(acc); },
    isBedtime(acc) {
      const b = acc.st.bedtime;
      if (!b || !b.on || this.state(acc) === 'free') return false;
      const now = new Date(), m = now.getHours() * 60 + now.getMinutes();
      const [fh, fm] = b.from.split(':').map(Number), [th, tm] = b.to.split(':').map(Number);
      const f = fh * 60 + fm, t = th * 60 + tm;
      return f <= t ? m >= f && m < t : m >= f || m < t;
    },
    blockReason(acc) {
      if (this.state(acc) === 'locked') return 'locked';
      if (this.isBedtime(acc)) return 'bedtime';
      if (this.remaining(acc) <= 0) return 'time';
      return null;
    },
    tick(acc) {
      const d = today();
      acc.st.usage[d] = (acc.st.usage[d] || 0) + 1;
    },
    history(acc, days = 7) {
      const out = [];
      for (let i = days - 1; i >= 0; i--) {
        const dt = new Date(); dt.setDate(dt.getDate() - i);
        out.push({ date: dt, key: Nova.dayKey(dt), sec: acc.st.usage[Nova.dayKey(dt)] || 0 });
      }
      return out;
    },

    /* Direkte Änderung (nach Eltern-PIN am Gerät) */
    apply(acc, action, value) {
      const d = today(), s = acc.st;
      switch (action) {
        case 0: s.bonus[d] = (s.bonus[d] || 0) + value; delete s.locked[d]; break;
        case 1: s.limit = value; break;
        case 2: s.locked[d] = Date.now(); break;
        case 3: s.unlocked[d] = Date.now(); break;
        case 4: s.usage[d] = 0; s.bonus[d] = 0; break;
        case 5: s.bedtime.on = !!value; break;
      }
      s.u = Date.now();
      Nova.store.save(true);
    },
    describe(action, value) {
      switch (action) {
        case 0: return '+' + value + ' Minuten für heute';
        case 1: return value ? 'Tageslimit: ' + Nova.fmtDur(value * 60, true) : 'Tageslimit: unbegrenzt';
        case 2: return 'Für heute gesperrt';
        case 3: return 'Für heute freigegeben';
        case 4: return 'Nutzung von heute zurückgesetzt';
        case 5: return 'Nachtruhe ' + (value ? 'eingeschaltet' : 'ausgeschaltet');
      }
      return '';
    },

    /* Code erzeugen – läuft auf dem Eltern-Gerät, braucht nur Konto-ID + Eltern-PIN */
    genCode(accountId, pin, action, value) {
      const key = keyFor(accountId, pin);
      let v = 0;
      if (action === 0 || action === 1) v = Nova.clamp(Math.round(value / 5), 0, 255);
      if (action === 5) v = value ? 1 : 0;
      const nonce = Math.floor(Math.random() * 256);
      const day = Nova.dayNumber() % 64;
      const payload = (action << 22) | (v << 14) | (day << 8) | nonce;
      const total = payload * 1048576 + mac(key, accountId, payload);
      return fmtCode(encode(total, 9));
    },

    /* Code prüfen & anwenden – läuft auf dem Gerät des Kindes */
    redeem(acc, input) {
      const code = Nova.normCode(input);
      if (!acc.st.parentKey) return { ok: false, msg: 'Für dieses Konto ist noch keine Eltern-PIN eingerichtet.' };
      if (code.length !== 9) return { ok: false, msg: 'Der Code muss 9 Zeichen lang sein.' };
      const total = decode(code);
      if (total < 0) return { ok: false, msg: 'Ungültige Zeichen im Code.' };
      const payload = Math.floor(total / 1048576), sig = total % 1048576;
      if (mac(acc.st.parentKey, acc.id, payload) !== sig) return { ok: false, msg: 'Code ist falsch oder gehört zu einem anderen Konto.' };
      const action = (payload >> 22) & 7, v = (payload >> 14) & 255, day = (payload >> 8) & 63;
      const td = Nova.dayNumber() % 64;
      if (![td, (td + 63) % 64, (td + 1) % 64].includes(day)) return { ok: false, msg: 'Dieser Code ist abgelaufen.' };
      if (acc.st.usedCodes.includes(code)) return { ok: false, msg: 'Dieser Code wurde schon benutzt.' };
      if (action > 5) return { ok: false, msg: 'Unbekannte Aktion.' };
      acc.st.usedCodes.push(code);
      if (acc.st.usedCodes.length > 300) acc.st.usedCodes.splice(0, acc.st.usedCodes.length - 300);
      const value = action === 0 || action === 1 ? v * 5 : v;
      this.apply(acc, action, value);
      return { ok: true, msg: this.describe(action, value), action, value };
    }
  };

  Nova.st = st;
})();
