/* Nova OS – Deutsch (Lehrplan-orientiert, Klasse 1–9) */
(function () {
  'use strict';
  const Nova = window.Nova;
  const { rnd, pick, shuffle, choicesOf } = Nova.learnKit;

  /* [Nomen, Artikel, Plural, Silben] */
  const NOUNS = [
    ['Hund', 'der', 'Hunde', 'Hund'], ['Katze', 'die', 'Katzen', 'Kat-ze'], ['Haus', 'das', 'Häuser', 'Haus'], ['Baum', 'der', 'Bäume', 'Baum'],
    ['Blume', 'die', 'Blumen', 'Blu-me'], ['Auto', 'das', 'Autos', 'Au-to'], ['Tisch', 'der', 'Tische', 'Tisch'], ['Schule', 'die', 'Schulen', 'Schu-le'],
    ['Buch', 'das', 'Bücher', 'Buch'], ['Apfel', 'der', 'Äpfel', 'Ap-fel'], ['Banane', 'die', 'Bananen', 'Ba-na-ne'], ['Fenster', 'das', 'Fenster', 'Fens-ter'],
    ['Lehrer', 'der', 'Lehrer', 'Leh-rer'], ['Tomate', 'die', 'Tomaten', 'To-ma-te'], ['Fahrrad', 'das', 'Fahrräder', 'Fahr-rad'], ['Vogel', 'der', 'Vögel', 'Vo-gel'],
    ['Maus', 'die', 'Mäuse', 'Maus'], ['Kind', 'das', 'Kinder', 'Kind'], ['Stuhl', 'der', 'Stühle', 'Stuhl'], ['Sonne', 'die', 'Sonnen', 'Son-ne'],
    ['Mädchen', 'das', 'Mädchen', 'Mäd-chen'], ['Computer', 'der', 'Computer', 'Com-pu-ter'], ['Schokolade', 'die', 'Schokoladen', 'Scho-ko-la-de'], ['Telefon', 'das', 'Telefone', 'Te-le-fon'],
    ['Elefant', 'der', 'Elefanten', 'E-le-fant'], ['Zitrone', 'die', 'Zitronen', 'Zi-tro-ne'], ['Brot', 'das', 'Brote', 'Brot'], ['Fußball', 'der', 'Fußbälle', 'Fuß-ball'],
    ['Hand', 'die', 'Hände', 'Hand'], ['Krokodil', 'das', 'Krokodile', 'Kro-ko-dil'], ['Schmetterling', 'der', 'Schmetterlinge', 'Schmet-ter-ling'], ['Kartoffel', 'die', 'Kartoffeln', 'Kar-tof-fel'],
    ['Pferd', 'das', 'Pferde', 'Pferd'], ['Zug', 'der', 'Züge', 'Zug'], ['Nacht', 'die', 'Nächte', 'Nacht'], ['Spiel', 'das', 'Spiele', 'Spiel'],
    ['Zeitung', 'die', 'Zeitungen', 'Zei-tung'], ['Freiheit', 'die', 'Freiheiten', 'Frei-heit'], ['Häuschen', 'das', 'Häuschen', 'Häus-chen'], ['Frühling', 'der', 'Frühlinge', 'Früh-ling'],
    ['Ameise', 'die', 'Ameisen', 'A-mei-se'], ['Rucksack', 'der', 'Rucksäcke', 'Ruck-sack'], ['Kamel', 'das', 'Kamele', 'Ka-mel'], ['Giraffe', 'die', 'Giraffen', 'Gi-raf-fe']
  ];
  /* [Infinitiv, er/sie/es Präsens, Präteritum, Perfekt, Futur] */
  const VERBS = [
    ['spielen', 'spielt', 'spielte', 'hat gespielt'], ['laufen', 'läuft', 'lief', 'ist gelaufen'], ['essen', 'isst', 'aß', 'hat gegessen'], ['schreiben', 'schreibt', 'schrieb', 'hat geschrieben'],
    ['lesen', 'liest', 'las', 'hat gelesen'], ['gehen', 'geht', 'ging', 'ist gegangen'], ['malen', 'malt', 'malte', 'hat gemalt'], ['fahren', 'fährt', 'fuhr', 'ist gefahren'],
    ['singen', 'singt', 'sang', 'hat gesungen'], ['schwimmen', 'schwimmt', 'schwamm', 'ist geschwommen'], ['trinken', 'trinkt', 'trank', 'hat getrunken'], ['lachen', 'lacht', 'lachte', 'hat gelacht'],
    ['bauen', 'baut', 'baute', 'hat gebaut'], ['springen', 'springt', 'sprang', 'ist gesprungen'], ['finden', 'findet', 'fand', 'hat gefunden'], ['kaufen', 'kauft', 'kaufte', 'hat gekauft'],
    ['tanzen', 'tanzt', 'tanzte', 'hat getanzt'], ['schlafen', 'schläft', 'schlief', 'hat geschlafen'], ['helfen', 'hilft', 'half', 'hat geholfen'], ['kochen', 'kocht', 'kochte', 'hat gekocht']
  ];
  /* [Grundform, Komparativ, Superlativ, Gegenteil] */
  const ADJ = [
    ['groß', 'größer', 'am größten', 'klein'], ['klein', 'kleiner', 'am kleinsten', 'groß'], ['schnell', 'schneller', 'am schnellsten', 'langsam'], ['alt', 'älter', 'am ältesten', 'jung'],
    ['gut', 'besser', 'am besten', 'schlecht'], ['viel', 'mehr', 'am meisten', 'wenig'], ['warm', 'wärmer', 'am wärmsten', 'kalt'], ['hoch', 'höher', 'am höchsten', 'tief'],
    ['lang', 'länger', 'am längsten', 'kurz'], ['stark', 'stärker', 'am stärksten', 'schwach'], ['hell', 'heller', 'am hellsten', 'dunkel'], ['laut', 'lauter', 'am lautesten', 'leise'],
    ['schön', 'schöner', 'am schönsten', 'hässlich'], ['nah', 'näher', 'am nächsten', 'fern'], ['dick', 'dicker', 'am dicksten', 'dünn'], ['früh', 'früher', 'am frühesten', 'spät'],
    ['leicht', 'leichter', 'am leichtesten', 'schwer'], ['voll', 'voller', 'am vollsten', 'leer'], ['nass', 'nasser', 'am nassesten', 'trocken'], ['teuer', 'teurer', 'am teuersten', 'billig']
  ];
  const NAMES = ['Lena', 'Tim', 'Mia', 'Ben', 'Emma', 'Noah', 'Lea', 'Paul', 'Sofia', 'Elias', 'Mila', 'Finn'];
  const PRONOUNS = ['ich', 'du', 'er', 'sie', 'wir', 'ihr'];
  const PREPS = ['auf', 'unter', 'neben', 'mit', 'nach', 'vor', 'hinter', 'zwischen'];

  const articleTip = (w, a) => {
    if (/(ung|heit|keit|schaft)$/.test(w)) return 'Nomen auf -ung, -heit, -keit, -schaft haben immer „die".';
    if (/(chen|lein)$/.test(w)) return 'Verkleinerungen auf -chen und -lein haben immer „das".';
    if (/ling$/.test(w)) return 'Nomen auf -ling haben „der".';
    if (/e$/.test(w) && a === 'die') return 'Viele Nomen auf -e haben „die" (aber nicht alle!).';
    return 'Den Artikel muss man sich meistens merken – am besten immer zusammen mit dem Nomen lernen: „' + a + ' ' + w + '".';
  };

  const T = [];
  const add = (t) => T.push(t);

  add({ id: 'artikel', title: 'der, die oder das?', sub: 'Artikel', grades: [1, 3],
    intro: { 1: 'Vor jedem Nomen steht ein Begleiter: der, die oder das. Sprich laut: „der Hund", „die Katze", „das Haus".', 3: 'Nomen haben ein Geschlecht: maskulin (der), feminin (die), neutral (das). Endungen helfen: -ung/-heit/-keit → die, -chen/-lein → das.' },
    gen() { const [w, a] = pick(NOUNS); return { q: '___ ' + w, big: true, type: 'choice', answer: a, choices: ['der', 'die', 'das'],
      explain: { 1: 'Es heißt: ' + a + ' ' + w + '. Sag es dir laut vor! 🗣️', 3: 'Richtig ist „' + a + ' ' + w + '". ' + articleTip(w, a) } }; } });

  add({ id: 'silben', title: 'Silben zählen', sub: 'Klatschen hilft', grades: [1, 2],
    intro: { 1: 'Sprich das Wort langsam und klatsche bei jeder Silbe: Ba-na-ne → 3 Mal klatschen 👏👏👏.', 3: 'Jede Silbe hat einen Vokal (a, e, i, o, u) oder Doppellaut (au, ei, eu). Sprechen und klatschen hilft.' },
    gen() { const n = pick(NOUNS); const c = n[3].split('-').length; return { q: 'Wie viele Silben hat „' + n[0] + '"?', big: true, type: 'choice', answer: String(c), choices: ['1', '2', '3', '4'],
      explain: { 1: 'Klatsch mit: ' + n[3] + ' → ' + c + ' ' + (c === 1 ? 'Silbe' : 'Silben') + '.' } }; } });

  add({ id: 'gross', title: 'Groß oder klein?', sub: 'Nomen schreibt man groß', grades: [1, 3],
    intro: { 1: 'Namen für Dinge, Tiere, Menschen und Pflanzen schreibt man groß. Probe: Kannst du „der, die, das" davor sagen? Dann groß!', 3: 'Nomen (Namenwörter) und Satzanfänge werden großgeschrieben. Artikelprobe: Passt ein Artikel davor, ist es ein Nomen.' },
    gen() { const n = pick(NOUNS), v = pick(VERBS), a = pick(ADJ); const words = shuffle([n[0].toLowerCase(), v[0], a[0]]);
      return { q: 'Welches Wort schreibt man groß?', type: 'choice', answer: n[0].toLowerCase(), choices: words,
        explain: { 1: 'Man kann sagen: „' + n[1] + ' ' + n[0] + '". Darum schreibt man ' + n[0] + ' groß.', 3: '„' + n[0] + '" ist ein Nomen (Artikelprobe: ' + n[1] + ' ' + n[0] + '). „' + v[0] + '" ist ein Verb, „' + a[0] + '" ein Adjektiv.' } }; } });

  add({ id: 'plural', title: 'Einzahl & Mehrzahl', sub: 'Plural bilden', grades: [1, 3],
    intro: { 1: 'Ein Hund – viele Hunde. Bei der Mehrzahl ändert sich das Wort oft ein bisschen.', 3: 'Der Plural wird unterschiedlich gebildet: -e (Hunde), -en (Katzen), -er (Kinder), -s (Autos), oder mit Umlaut (Äpfel). Manche Wörter bleiben gleich (Fenster).' },
    gen() { const n = pick(NOUNS.filter((x) => x[0] !== x[2] || Math.random() < 0.3));
      const wrong = [n[0] + 's', n[0] + 'en', n[0] + 'e', n[0].replace(/a/, 'ä').replace(/o/, 'ö').replace(/u/, 'ü') + 'er', n[0] + 'n'];
      return { q: 'ein' + (n[1] === 'die' ? 'e' : '') + ' ' + n[0] + ' – viele …?', big: true, type: 'choice', answer: n[2], choices: choicesOf(n[2], wrong),
        explain: { 1: 'Es heißt: ein' + (n[1] === 'die' ? 'e' : '') + ' ' + n[0] + ', viele ' + n[2] + '.', 3: 'Plural von „' + n[0] + '": die ' + n[2] + '.' } }; } });

  add({ id: 'gegenteil', title: 'Gegenteile', sub: 'Wörter mit umgekehrter Bedeutung', grades: [1, 4],
    intro: { 1: 'Das Gegenteil von groß ist klein. Von heiß ist es kalt.', 3: 'Gegenteile (Antonyme) haben eine entgegengesetzte Bedeutung.' },
    gen() { const a = pick(ADJ); const wrong = shuffle(ADJ.filter((x) => x[0] !== a[0] && x[3] !== a[3]).map((x) => x[3])).slice(0, 5);
      return { q: 'Was ist das Gegenteil von „' + a[0] + '"?', big: true, type: 'choice', answer: a[3], choices: choicesOf(a[3], wrong), explain: { 1: 'Das Gegenteil von ' + a[0] + ' ist ' + a[3] + '.' } }; } });

  add({ id: 'wortarten', title: 'Wortarten', sub: 'Nomen, Verb, Adjektiv …', grades: [2, 6],
    intro: { 1: 'Nomen sind Namen für Dinge (Hund). Verben sagen, was man tut (laufen). Adjektive sagen, wie etwas ist (schnell).', 3: 'Nomen: Artikelprobe. Verben: Kann man sie beugen (ich laufe, du läufst)? Adjektive: Kann man sie steigern (schnell, schneller)?', 4: 'Wortarten: Nomen, Verb, Adjektiv, Pronomen (ich, er …), Präposition (auf, mit …), Artikel. Bestimme sie mit Artikel-, Beugungs- und Steigerungsprobe.' },
    gen(lv, gr) { const pool = [['Nomen', () => pick(NOUNS)[0]], ['Verb', () => pick(VERBS)[0]], ['Adjektiv', () => pick(ADJ)[0]]];
      if (gr >= 4) pool.push(['Pronomen', () => pick(PRONOUNS)], ['Präposition', () => pick(PREPS)]);
      const [kind, fn] = pick(pool); const w = fn();
      const why = { Nomen: 'Man kann einen Artikel davor setzen.', Verb: 'Es beschreibt eine Tätigkeit und lässt sich beugen (ich ' + w.replace(/en$/, 'e') + ').', Adjektiv: 'Es beschreibt, wie etwas ist, und lässt sich steigern.', Pronomen: 'Es steht für ein Nomen (Fürwort).', Präposition: 'Es zeigt ein Verhältnis an, z. B. einen Ort (Verhältniswort).' }[kind];
      return { q: 'Welche Wortart ist „' + w + '"?', big: true, type: 'choice', answer: kind, choices: gr >= 4 ? ['Nomen', 'Verb', 'Adjektiv', 'Pronomen', 'Präposition'] : ['Nomen', 'Verb', 'Adjektiv'],
        explain: { 1: '„' + w + '" ist ein ' + kind + '. ' + why, 4: kind + ': ' + why } }; } });

  add({ id: 'steigerung', title: 'Adjektive steigern', sub: 'groß – größer – am größten', grades: [2, 4],
    intro: { 1: 'Mit Adjektiven kann man vergleichen: Tim ist groß, Ben ist größer, Mia ist am größten.', 3: 'Steigerungsstufen: Grundstufe (Positiv), Vergleichsstufe (Komparativ, -er), Höchststufe (Superlativ, am …-sten). Achtung bei Ausnahmen: gut – besser – am besten.' },
    gen() { const a = pick(ADJ); const sup = Math.random() < 0.5; const ans = sup ? a[2] : a[1];
      const wrong = sup ? ['am ' + a[0] + 'sten', 'am ' + a[1], 'am ' + a[0] + 'esten', a[1] + 'st'] : [a[0] + 'er', 'mehr ' + a[0], a[0].replace(/a/, 'ä') + 'er', a[2]];
      return { q: a[0] + ' – ' + (sup ? a[1] + ' – ?' : '? – ' + a[2]), big: true, type: 'choice', answer: ans, choices: choicesOf(ans, wrong),
        explain: { 1: 'Richtig: ' + a[0] + ' – ' + a[1] + ' – ' + a[2] + '.', 4: 'Positiv: ' + a[0] + ', Komparativ: ' + a[1] + ', Superlativ: ' + a[2] + '.' } }; } });

  const SZ = [['Stra_e', 'ß', 'Straße'], ['Fu_ball', 'ß', 'Fußball'], ['Wa_er', 'ss', 'Wasser'], ['Hau_', 's', 'Haus'], ['Schlo_', 'ss', 'Schloss'], ['gro_', 'ß', 'groß'], ['Ta_e', 'ss', 'Tasse'],
    ['Glä_er', 's', 'Gläser'], ['hei_', 'ß', 'heiß'], ['Flu_', 'ss', 'Fluss'], ['Gru_', 'ß', 'Gruß'], ['Nu_', 'ss', 'Nuss'], ['Ro_e', 's', 'Rose'], ['Kla_e', 'ss', 'Klasse'], ['drau_en', 'ß', 'draußen'],
    ['Me_er', 'ss', 'Messer'], ['Ha_e', 's', 'Hase'], ['Fü_e', 'ß', 'Füße'], ['bi_chen', 'ss', 'bisschen'], ['Bu_', 's', 'Bus'], ['wei_', 'ß', 'weiß'], ['Ka_e', 's', 'Käse'], ['e_en', 'ss', 'essen'], ['Spa_', 'ß', 'Spaß']];
  add({ id: 'sz', title: 's, ss oder ß?', sub: 'Rechtschreibung', grades: [3, 6],
    intro: { 1: 'Hör genau hin: Summt das s (wie eine Biene)? → s. Ist der Laut davor kurz? → ss. Ist er lang oder ein Doppellaut (au, ei)? → ß.', 3: 'Nach kurzem Vokal: ss (Wasser). Nach langem Vokal oder Doppellaut (ei, au, eu): ß (Straße, heiß). Summendes, stimmhaftes s: s (Rose).' },
    gen() { const [w, a, full] = pick(SZ); const why = a === 'ss' ? 'Der Vokal davor ist kurz → ss.' : a === 'ß' ? 'Der Vokal davor ist lang oder ein Doppellaut → ß.' : 'Das s klingt summend (stimmhaft) oder es ist am Wortende verlängerbar (Haus – Häuser) → s.';
      return { q: w.replace('_', ' _ '), big: true, type: 'choice', answer: a, choices: ['s', 'ss', 'ß'], explain: { 1: 'Es heißt „' + full + '". ' + why } }; } });

  const DASS = [['Ich glaube, ___ es morgen regnet.', 'dass'], ['___ Fahrrad ist neu.', 'Das'], ['Weißt du, ___ wir heute frei haben?', 'dass'], ['Das Buch, ___ ich lese, ist spannend.', 'das'],
    ['Sie sagt, ___ sie keine Zeit hat.', 'dass'], ['Ich hoffe, ___ du kommst.', 'dass'], ['___ ist eine gute Idee!', 'Das'], ['Das Haus, ___ dort steht, ist alt.', 'das'],
    ['Es ist wichtig, ___ man Wasser trinkt.', 'dass'], ['Ich mag ___ Spiel sehr.', 'das'], ['Er freut sich, ___ die Ferien beginnen.', 'dass'], ['Das Mädchen, ___ dort singt, heißt Mia.', 'das'],
    ['Hast du gesehen, ___ es schneit?', 'dass'], ['Kennst du ___ Lied?', 'das'], ['Mama meint, ___ wir aufräumen sollen.', 'dass'], ['Das Pferd, ___ im Stall steht, ist braun.', 'das']];
  add({ id: 'dass', title: 'das oder dass?', sub: 'Die Ersatzprobe', grades: [5, 8],
    intro: { 1: 'Kannst du „dieses" oder „welches" dafür sagen? Dann schreibst du „das". Sonst „dass".', 4: 'Ersatzprobe: Lässt sich das Wort durch „dieses", „jenes" oder „welches" ersetzen, ist es Artikel/Pronomen → „das". Leitet es einen Nebensatz ein und ist nicht ersetzbar → Konjunktion „dass".' },
    gen() { const [s, a] = pick(DASS); const cap = a[0] === 'D'; const alt = a.toLowerCase() === 'das' ? (cap ? 'Dass' : 'dass') : 'das';
      return { q: s, type: 'choice', answer: a, choices: shuffle([a, alt]),
        explain: { 1: a.toLowerCase() === 'das' ? 'Hier kannst du „' + (s.includes(', ___') ? 'welches' : 'dieses') + '" einsetzen → „das".' : '„Dieses" oder „welches" passt hier nicht → „dass".', 4: a.toLowerCase() === 'das' ? 'Ersetzbar durch „dieses/welches" → Artikel bzw. Relativpronomen „das".' : 'Nicht ersetzbar, leitet einen Nebensatz ein → Konjunktion „dass".' } }; } });

  add({ id: 'zeiten', title: 'Zeitformen', sub: 'Präsens, Präteritum, Perfekt, Futur', grades: [3, 7],
    intro: { 1: 'Jetzt: Tim spielt. Früher: Tim spielte / Tim hat gespielt. Später: Tim wird spielen.', 3: 'Präsens (Gegenwart): er spielt. Präteritum (1. Vergangenheit): er spielte. Perfekt (2. Vergangenheit): er hat gespielt. Futur I (Zukunft): er wird spielen.', 4: 'Präsens, Präteritum, Perfekt (haben/sein + Partizip II), Plusquamperfekt (hatte/war + Partizip II), Futur I (werden + Infinitiv).' },
    gen(lv, gr) { const v = pick(VERBS), n = pick(NAMES);
      const forms = [['Präsens', n + ' ' + v[1] + '.'], ['Präteritum', n + ' ' + v[2] + '.'], ['Perfekt', n + ' ' + v[3] + '.'], ['Futur', n + ' wird ' + v[0] + '.']];
      if (gr >= 6) forms.push(['Plusquamperfekt', n + ' ' + v[3].replace(/^hat/, 'hatte').replace(/^ist/, 'war') + '.']);
      const [name, sent] = pick(forms);
      const why = { Präsens: 'Das passiert jetzt.', Präteritum: 'Das ist früher passiert – nur ein Wort für das Verb (' + v[2] + ').', Perfekt: 'Vergangenheit mit „hat/ist" + Partizip (' + v[3] + ').', Futur: 'Zukunft mit „wird" + Grundform.', Plusquamperfekt: 'Vorvergangenheit mit „hatte/war" + Partizip.' }[name];
      return { q: '„' + sent + '"', lead: 'In welcher Zeitform steht der Satz?', big: true, type: 'choice', answer: name, choices: forms.map((f) => f[0]), explain: { 1: name + ': ' + why } }; } });

  const SATZ = { S: ['Der Hund', 'Meine Schwester', 'Der Lehrer', 'Tim', 'Die Katze', 'Oma'], V: [['frisst', 'den Knochen'], ['liest', 'ein Buch'], ['kauft', 'einen Apfel'], ['malt', 'ein Bild'], ['sucht', 'den Schlüssel'], ['repariert', 'das Fahrrad']], Z: ['heute', 'am Morgen', 'jeden Tag', 'gerade'] };
  add({ id: 'satzglieder', title: 'Satzglieder', sub: 'Subjekt, Prädikat, Objekt', grades: [4, 7],
    intro: { 1: 'Wer tut etwas? → Subjekt. Was tut er? → Prädikat. Wen oder was? → Objekt.', 4: 'Subjekt: Wer/Was? Prädikat: Was tut …? Akkusativobjekt: Wen/Was? Dativobjekt: Wem? Adverbiale: Wann/Wo/Wie/Warum?' },
    gen() { const s = pick(SATZ.S), [v, o] = pick(SATZ.V), z = pick(SATZ.Z);
      const parts = { Subjekt: s, Prädikat: v, Objekt: o, Zeitangabe: z };
      const ask = pick(['Subjekt', 'Prädikat', 'Objekt']);
      const q = { Subjekt: 'Wer oder was?', Prädikat: 'Was tut …?', Objekt: 'Wen oder was?' }[ask];
      return { q: '„' + s + ' ' + v + ' ' + z + ' ' + o + '."', lead: 'Was ist das ' + (ask === 'Objekt' ? 'Akkusativobjekt' : ask) + '?', type: 'choice', answer: parts[ask], choices: shuffle(Object.values(parts)),
        explain: { 1: 'Frage: „' + q + '" → „' + parts[ask] + '".', 4: 'Frageprobe „' + q + '" → ' + parts[ask] + ' (' + (ask === 'Objekt' ? 'Akkusativobjekt' : ask) + ').' } }; } });

  const KASUS = [['Ich helfe *dem Mann*.', 'Dativ'], ['*Der Hund* bellt.', 'Nominativ'], ['Ich sehe *den Baum*.', 'Akkusativ'], ['Das ist das Auto *des Lehrers*.', 'Genitiv'],
    ['Wir geben *dem Kind* ein Eis.', 'Dativ'], ['Sie kauft *einen Ball*.', 'Akkusativ'], ['*Die Sonne* scheint.', 'Nominativ'], ['Er bleibt wegen *des Regens* zu Hause.', 'Genitiv'],
    ['Ich schenke *meiner Mutter* Blumen.', 'Dativ'], ['Tim liest *die Zeitung*.', 'Akkusativ'], ['Das Fahrrad *meines Bruders* ist rot.', 'Genitiv'], ['*Mein Freund* kommt morgen.', 'Nominativ'],
    ['Wir danken *dem Trainer*.', 'Dativ'], ['Ich rufe *den Arzt* an.', 'Akkusativ'], ['*Das Pferd* galoppiert.', 'Nominativ'], ['Das ist die Tasche *der Lehrerin*.', 'Genitiv']];
  add({ id: 'kasus', title: 'Die vier Fälle', sub: 'Nominativ, Genitiv, Dativ, Akkusativ', grades: [5, 8],
    intro: { 1: 'Frag nach dem Wort: Wer? → 1. Fall. Wessen? → 2. Fall. Wem? → 3. Fall. Wen? → 4. Fall.', 4: 'Kasus mit Fragewörtern bestimmen: Nominativ (Wer/Was?), Genitiv (Wessen?), Dativ (Wem?), Akkusativ (Wen/Was?).' },
    gen() { const [s, k] = pick(KASUS); const w = s.match(/\*(.+?)\*/)[1]; const fq = { Nominativ: 'Wer oder was?', Genitiv: 'Wessen?', Dativ: 'Wem?', Akkusativ: 'Wen oder was?' }[k];
      return { q: s.replace(/\*(.+?)\*/, '„$1"'), lead: 'In welchem Fall steht das markierte Wort?', type: 'choice', answer: k, choices: ['Nominativ', 'Genitiv', 'Dativ', 'Akkusativ'],
        explain: { 1: 'Frage: „' + fq + '" → „' + w + '". Das ist der ' + k + '.', 4: 'Frageprobe „' + fq + '" → ' + k + '.' } }; } });

  const KOMMA = [
    ['Ich bleibe zu Hause, weil ich krank bin.', ['Ich bleibe zu Hause weil, ich krank bin.', 'Ich bleibe zu Hause weil ich krank bin.']],
    ['Ich weiß, dass du recht hast.', ['Ich weiß dass, du recht hast.', 'Ich weiß dass du recht hast.']],
    ['Wenn es regnet, nehme ich den Bus.', ['Wenn es regnet nehme ich den Bus.', 'Wenn, es regnet nehme ich den Bus.']],
    ['Ich kaufe Äpfel, Birnen und Bananen.', ['Ich kaufe Äpfel, Birnen, und Bananen.', 'Ich kaufe, Äpfel Birnen und Bananen.']],
    ['Der Hund, der dort bellt, gehört Tim.', ['Der Hund der dort bellt gehört Tim.', 'Der Hund, der dort bellt gehört Tim.']],
    ['Obwohl es kalt ist, gehen wir raus.', ['Obwohl es kalt ist gehen wir raus.', 'Obwohl, es kalt ist gehen wir raus.']],
    ['Lena lacht, denn der Witz ist lustig.', ['Lena lacht denn, der Witz ist lustig.', 'Lena lacht denn der Witz ist lustig.']],
    ['Wir spielen Fußball, aber Ben liest.', ['Wir spielen Fußball aber, Ben liest.', 'Wir spielen Fußball aber Ben liest.']],
    ['Als ich nach Hause kam, war niemand da.', ['Als ich nach Hause kam war niemand da.', 'Als, ich nach Hause kam war niemand da.']],
    ['Er fragt, ob wir mitkommen.', ['Er fragt ob wir mitkommen.', 'Er fragt ob, wir mitkommen.']]
  ];
  add({ id: 'komma', title: 'Kommas setzen', sub: 'Aufzählungen & Nebensätze', grades: [4, 8],
    intro: { 1: 'Bei Aufzählungen kommt ein Komma zwischen die Dinge – aber nicht vor „und". Vor „weil", „dass", „wenn" kommt ein Komma.', 4: 'Kommas trennen Haupt- und Nebensätze (weil, dass, wenn, obwohl, ob, als, Relativsätze), Aufzählungen (nicht vor „und/oder") und stehen vor entgegensetzenden Konjunktionen (aber, sondern, denn).' },
    gen() { const [ok, wrong] = pick(KOMMA); return { q: 'Welcher Satz ist richtig?', type: 'choice', answer: ok, choices: shuffle([ok, ...wrong]),
      explain: { 1: 'Richtig: „' + ok + '"', 4: 'Korrekt: „' + ok + '" – das Komma trennt ' + (/und Bananen/.test(ok) ? 'die Aufzählung (nicht vor „und").' : /aber|denn/.test(ok) ? 'die beiden Hauptsätze vor „aber/denn".' : 'Haupt- und Nebensatz.') } }; } });

  const SPELL = [['Fahrrad', ['Farrad', 'Fahrad']], ['Vogel', ['Fogel', 'Vohgel']], ['Ferien', ['Ferin', 'Färien']], ['spazieren', ['spatzieren', 'spaziren']], ['Rhythmus', ['Rhytmus', 'Rythmus']],
    ['Maschine', ['Maschiene', 'Machine']], ['Theater', ['Teater', 'Theather']], ['endlich', ['entlich', 'ändlich']], ['nämlich', ['nähmlich', 'nemlich']], ['Gefühl', ['Gefül', 'Gefühll']],
    ['Geschichte', ['Geschiechte', 'Gechichte']], ['Mathematik', ['Matematik', 'Mathemathik']], ['interessant', ['interresant', 'intressant']], ['Zeitung', ['Zeidung', 'Zeitunk']],
    ['Fenster', ['Fennster', 'Venster']], ['Krankheit', ['Krankhait', 'Kranckheit']], ['Bibliothek', ['Biblothek', 'Bibliotek']], ['Standard', ['Standart', 'Schtandard']], ['tschüss', ['tschüs', 'tchüss']], ['Wiese', ['Wise', 'Wiehse']]];
  add({ id: 'rechtschreibung', title: 'Richtig geschrieben?', sub: 'Merkwörter', grades: [3, 8],
    intro: { 1: 'Manche Wörter muss man sich einfach merken. Schau sie dir genau an und sprich sie deutlich.', 4: 'Strategien: deutlich mitsprechen, verlängern (Hund – Hunde), ableiten (Gefühl – fühlen) und Merkwörter üben.' },
    gen() { const [w, wr] = pick(SPELL); return { q: 'Welches Wort ist richtig geschrieben?', type: 'choice', answer: w, choices: shuffle([w, ...wr]), explain: { 1: 'Richtig ist: ' + w + '. Schreib es dir einmal auf! ✏️', 4: 'Korrekt: „' + w + '" (Merkwort).' } }; } });

  const SYN = [['schnell', 'rasch'], ['beginnen', 'anfangen'], ['sprechen', 'reden'], ['schauen', 'gucken'], ['klug', 'schlau'], ['froh', 'fröhlich'], ['schwierig', 'schwer'], ['das Auto', 'der Wagen'],
    ['leise', 'still'], ['berühmt', 'bekannt'], ['sofort', 'gleich'], ['merkwürdig', 'seltsam'], ['ängstlich', 'furchtsam'], ['das Geschenk', 'die Gabe'], ['kaputt', 'defekt'], ['prima', 'toll']];
  add({ id: 'synonyme', title: 'Wörter mit gleicher Bedeutung', sub: 'Synonyme', grades: [4, 7],
    intro: { 1: 'Manche Wörter bedeuten fast das Gleiche: schnell und rasch.', 4: 'Synonyme sind bedeutungsgleiche oder -ähnliche Wörter. Sie machen Texte abwechslungsreicher.' },
    gen() { const [a, b] = pick(SYN); const wrong = shuffle(SYN.filter((x) => x[0] !== a).map((x) => x[1])).slice(0, 5);
      return { q: 'Was bedeutet fast dasselbe wie „' + a + '"?', type: 'choice', answer: b, choices: choicesOf(b, wrong), explain: { 1: '„' + a + '" und „' + b + '" bedeuten fast dasselbe.' } }; } });

  Nova.learnApp({ id: 'deutsch', name: 'Deutsch', icon: 'a-german', grad: ['#ef4444', '#f97316'], desc: 'Rechtschreibung, Grammatik & Wortschatz von Klasse 1 bis 9', topics: T });
})();
