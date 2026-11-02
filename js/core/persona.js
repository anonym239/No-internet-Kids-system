/* Nova OS – Persona: Das System erkennt anhand von Alter & Schulstufe,
 * wie es Dinge erklären soll (Sprache, Beispiele, Tempo). */
(function () {
  'use strict';
  const Nova = window.Nova;

  const LEVELS = [
    null,
    { id: 1, name: 'Ganz einfach', desc: 'Kurze Sätze, Beispiele mit Dingen zum Anfassen (Äpfel, Bonbons, Finger).' },
    { id: 2, name: 'Einfach', desc: 'Einfache Sprache, viele Beispiele aus dem Alltag.' },
    { id: 3, name: 'Klar & Schritt für Schritt', desc: 'Jeder Rechenweg wird in kleinen Schritten gezeigt.' },
    { id: 4, name: 'Kompakt mit Fachbegriffen', desc: 'Regeln mit den richtigen Fachwörtern, kurz auf den Punkt.' },
    { id: 5, name: 'Sachlich', desc: 'Präzise, knappe Erklärungen wie im Lehrbuch.' }
  ];

  function persona(acc) {
    const p = (acc && acc.profile) || { age: 12 };
    const age = Nova.clamp(Number(p.age) || 0, 0, 100);
    const level = age <= 7 ? 1 : age <= 10 ? 2 : age <= 13 ? 3 : age <= 17 ? 4 : 5;
    const simpleOverride = acc && acc.settings && acc.settings.simple;
    const lv = simpleOverride ? Nova.clamp(simpleOverride, 1, 5) : level;
    let grade = p.grade;
    if (!grade) grade = Nova.clamp(age - 5, 1, 13);
    const suggest = age < 3 ? 0 : age <= 5 ? 30 : age <= 9 ? 60 : age <= 12 ? 90 : age <= 15 ? 120 : age <= 17 ? 180 : 0;
    const stage = age < 6 ? 'Kita/Vorschule' : age <= 10 ? 'Grundschule' : age <= 15 ? 'Sekundarstufe I' : age <= 18 ? 'Oberstufe' : 'Erwachsen';
    return { age, level: lv, levelInfo: LEVELS[lv], grade, suggestMinutes: suggest, stage, name: acc ? acc.name : '' };
  }

  /* Wählt den passenden Text: say(acc, {1:'…', 3:'…', 5:'…'}) – nimmt die nächst-niedrigere Stufe */
  function say(acc, texts) {
    const lv = typeof acc === 'number' ? acc : persona(acc).level;
    for (let l = lv; l >= 1; l--) if (texts[l] != null) return texts[l];
    for (let l = lv; l <= 5; l++) if (texts[l] != null) return texts[l];
    return '';
  }

  function reaction(age) {
    const lv = age <= 7 ? 1 : age <= 10 ? 2 : age <= 13 ? 3 : age <= 17 ? 4 : 5;
    if (age < 3) return 'Hallo Baby! 👶 Hier sollten die Eltern alles einrichten.';
    return {
      1: 'Super! Wir erklären dir alles ganz einfach – mit kurzen Sätzen und vielen Beispielen.',
      2: 'Alles klar! Wir erklären dir alles in einfacher Sprache mit Beispielen aus dem Alltag.',
      3: 'Okay, du bist ' + age + '. Wir erklären dir alles klar und Schritt für Schritt.',
      4: 'Verstanden. Erklärungen kommen kompakt und mit den richtigen Fachbegriffen.',
      5: 'In Ordnung. Erklärungen werden sachlich und präzise formuliert.'
    }[lv];
  }

  function ageFromBirthday(iso) {
    if (!iso) return null;
    const b = new Date(iso + 'T00:00'), n = new Date();
    if (isNaN(b)) return null;
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return Nova.clamp(a, 0, 100);
  }
  function isBirthday(acc) {
    const b = acc && acc.profile && acc.profile.birthday;
    if (!b) return false;
    const n = new Date();
    return b.slice(5) === Nova.pad(n.getMonth() + 1) + '-' + Nova.pad(n.getDate());
  }

  Nova.persona = persona;
  Nova.say = say;
  Nova.personaReaction = reaction;
  Nova.ageFromBirthday = ageFromBirthday;
  Nova.isBirthday = isBirthday;
  Nova.LEVELS = LEVELS;
})();
