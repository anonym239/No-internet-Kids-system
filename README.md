# Nova OS 0.4

**Ein komplett internetfreies System für Kinder und Jugendliche – für PC und Handy.**
Ruhiges, cleanes Design: Seitenleiste mit Ordnern, schlichte Symbole, Dunkel/Hell und ein Schwarz-Weiß-Modus. Wer es lebendiger mag, schaltet in den Einstellungen **Effekte** ein (Glas, Schatten, Animationen, farbige Hintergründe). Kein Server, keine Werbung, keine Datensammlung.

## Download (sofort loslegen)

Unter **[Releases](../../releases)** liegen fertige Dateien:

| Gerät | Datei | Installation |
|---|---|---|
| 🤖 Android | `Nova-OS-0.4.2.apk` | Herunterladen und öffnen. Beim ersten Mal „Installation aus unbekannten Quellen“ erlauben. |
| 🪟 Windows | `Nova-OS-Setup-0.4.2.exe` | Setup starten, Ordner wählen und fertig. Es entstehen Symbole auf dem Desktop und im Startmenü. Warnt SmartScreen, „Weitere Informationen“ → „Trotzdem ausführen“ wählen. |

Die Dateien baut GitHub Actions bei jedem Push automatisch (`.github/workflows/build.yml`).

## Starten ohne Installation

| Weg | So geht's |
|---|---|
| **Direkt öffnen** | `index.html` im Browser öffnen (Doppelklick). Funktioniert sofort, ohne Internet. |
| **Als App installieren (empfohlen)** | Den Ordner über einen Webserver bereitstellen (z. B. GitHub Pages oder `python3 -m http.server`), einmal öffnen und dann *„App installieren“* (PC) bzw. *„Zum Startbildschirm hinzufügen“* (Handy) wählen. Danach läuft Nova dauerhaft offline (Service Worker). |

## Funktionen

### Konten & Anmeldung
- **Ausführliche Einrichtung in 8 Schritten:** Vor- und Nachname, **Alter 0–100** (oder Geburtstag, dann wird das Alter genau berechnet), Kita/Schule/Ausbildung/Beruf, Klassenstufe, Schulform, Bundesland, Interessen, Lieblingsfächer, Profilfarbe, Internet-Modus sowie **PIN oder Passwort**. Bei Kindern unter 16 kann direkt eine Eltern-PIN mit einem altersgerechten Tageslimit eingerichtet werden.
- **Nova erkennt das Alter:** Daraus ergibt sich einer von 5 Erklär-Stilen, von „Ganz einfach“ (kurze Sätze, Äpfel und Bonbons) bis „Sachlich“ (Lehrbuch-Stil). Alle Erklärungen in Mathe und Deutsch passen sich daran an. In den Einstellungen lässt sich der Stil ändern.
- **Verlassen-Schutz:** Abmelden und das Beenden der App gehen nur mit dem Passwort bzw. der PIN des Kontos (oder der Eltern-PIN).
  - Windows: Klick auf X und Alt+F4 werden abgefangen. Optional gibt es einen Vollbild-Kiosk.
  - Android: Die Zurück-Taste wird abgefangen. Zusätzlich gibt es den **Nova-Schutz**: Wer Nova oder ein darüber gestartetes Spiel mit **Home** oder **Übersicht** verlässt oder Nova in der Übersicht wegwischt, wird in unter einer Sekunde zurückgeholt und muss das Passwort eingeben. Dafür braucht Nova einmalig die Berechtigungen „Nutzungszugriff“ und „Über anderen Apps einblenden“. Nova führt durch die Einrichtung. Anrufe, Notruf und Berechtigungsdialoge werden nie blockiert.
  - Ist eine Eltern-PIN eingerichtet, ist zum Verlassen und Abmelden standardmäßig **die Eltern-PIN** nötig. Das gilt auch beim Verlassen eines Spiels. Umstellbar unter Einstellungen → Internet & Schutz.
  - Läuft die Bildschirmzeit während eines echten Spiels ab, holt der Nova-Schutz Nova zurück und sperrt.
  - Optional: App fixieren (Lock Task) und Nova als Startbildschirm festlegen
- Mehrere Konten pro Gerät
- **Konto-Token**: Das komplette Konto steckt in einem Token (Text oder `.novakey`-Datei, komprimiert und mit Prüfsumme)
  - Mit dem Token stellst du dein Konto **jederzeit** wieder her: nach dem Deinstallieren, auf einem neuen Gerät oder nach dem Löschen der App-Daten
  - **Sync ohne Internet:** Gibt es das Konto auf einem Gerät schon, werden beim Import beide Stände zusammengeführt (Aufgaben, Notizen, Bilder, Highscores, Ordner …)
  - Erinnerung zur Sicherung, wenn die letzte Sicherung älter als 7 Tage ist
  - **Wo ist meine Datei?**
    - Android: App „Dateien“ → **Dokumente › Nova** (Datei `nova-<name>-<id>.novakey`). Über „Teilen…“ kann man sie zusätzlich in Google Drive speichern oder sich selbst schicken.
    - Windows: **Dokumente\Nova**
    - Browser: **Downloads**
  - **Automatische Sicherung:** Die Apps für Android und Windows schreiben bei Änderungen, beim Abmelden und beim Beenden automatisch eine aktuelle Sicherung nach *Dokumente › Nova*. Die Datei bleibt auch nach dem Deinstallieren erhalten.
  - **Wiederherstellen:** Auf dem Anmeldebildschirm „Konto wiederherstellen“ wählen, dann die Datei auswählen (am PC auch per Drag & Drop) oder den Token-Text einfügen. Gefundene Sicherungen bietet Nova direkt an.

### Ordner
- **Spiele**, **Kreativ**, **Werkzeuge**, **System**
- Eigene Ordner erstellen, umbenennen, löschen und mit Apps füllen
- Dock mit Lieblings-Apps (lange drücken / Rechtsklick auf eine App)
- Suche, „Zuletzt verwendet“

### Lernen (wie ein Lern-Trainer, für die Schule in Deutschland)
- **Mathe:** 19 Themen von Klasse 1 bis 11, von „Plus bis 20“ über Einmaleins, Brüche, Prozent und Gleichungen bis zu Pythagoras und der pq-Formel
- **Deutsch:** 15 Themen von Klasse 1 bis 9: der/die/das, Silben, Groß- und Kleinschreibung, Plural, Wortarten, s/ss/ß, das/dass, Zeitformen, Satzglieder, die vier Fälle, Kommas, Rechtschreibung, Synonyme
- Die Aufgaben werden immer neu erzeugt. Dazu gibt es Sterne, XP, eine Lern-Serie (Tage) und eine Erklärung zu jeder Aufgabe.

### Echte Spiele (optional, „einmalige Installation“)
Hat man bei der Einrichtung *Mit einmaliger Installation* gewählt, kann man in der Android-App **Subway Surfers, Geometry Dash (Lite), Temple Run 2, Hill Climb Racing, Jetpack Joyride, Fruit Ninja, Crossy Road und Minecraft** einmalig aus dem Play Store installieren. Danach startet Nova sie direkt, und sie laufen ohne Internet. Die Spielzeit wird zur Bildschirmzeit gezählt.
Bei *Komplett internetfrei* ist das gesperrt. Umschalten lässt es sich nur mit Eltern-PIN bzw. Passwort.
> Android erlaubt keine stille Installation: Der Play Store öffnet sich, dort tippt man einmal auf „Installieren“.

### Apps
| Spiele | Kreativ | Werkzeuge | System |
|---|---|---|---|
| Rail Rush (3-Spuren-Endlos-Runner) | Zeichnen (Pinsel, Marker, Füllen, Undo) | Rechner (+ wissenschaftlich, Verlauf) | Einstellungen (Design, Akzentfarbe, Hintergründe, Token) |
| Pulse Dash (Rhythmus-Jump-Runner) | Pixel-Studio (16²–32², Spiegeln) | Aufgaben (Listen, Fälligkeit, wichtig) | Bildschirmzeit |
| Neon Snake | Beat-Maker (16-Step-Sequencer) | Notizen (farbig, Suche) | |
| Memory | Galerie | Timer, Stoppuhr, Lernzeit 25/5 | |
| Vier gewinnt (KI in 3 Stufen / 2 Spieler) | | Lernkarten (Vokabeltrainer) | |
| Blockbrecher | | | |

Alle Spiele sind eigene Spiele im Stil bekannter Genres und funktionieren komplett offline.

### Bildschirmzeit & Eltern-Fernsteuerung
- Tageslimit, Nachtruhe (z. B. 21:00–07:00), Wochenübersicht
- Eltern-Bereich, geschützt mit **Eltern-PIN**
- **Fernsteuerung per Code, ohne Internet:**
  1. Eltern öffnen Nova auf **ihrem eigenen** Gerät → Anmeldebildschirm → *Eltern-Fernsteuerung*
  2. Sie geben die **Konto-ID** des Kindes (steht in „Bildschirmzeit“) und die **Eltern-PIN** ein
  3. Sie wählen eine Aktion: *+ Zeit, Tageslimit, Sperren, Freigeben, Nutzung zurücksetzen, Nachtruhe an/aus*
  4. Sie erhalten einen 9-stelligen Code (z. B. `035-RNH-21Q`), den das Kind eintippt
- Codes sind mit HMAC-SHA256 signiert, gelten nur am Erstellungstag und nur **einmal**

## Selbst bauen
```bash
npm install
npm start              # Windows/PC-App (Electron) starten
npm run dist:win       # Windows-Setup bauen (dist/Nova-OS-Setup-x.y.z.exe)
npm run cap:sync       # Android-Projekt aktualisieren, danach in android/: ./gradlew assembleRelease
```
Hinweis zur Signierung: Die APK wird mit einem Beta-Schlüssel (`android/nova-beta.keystore`) signiert, der im Repo liegt. Für eine öffentliche Veröffentlichung einen eigenen Schlüssel über `NOVA_KEYSTORE*`-Umgebungsvariablen bzw. GitHub-Secrets setzen.

## Technik
- Reines HTML, CSS und JavaScript, ohne Build-Schritt, ohne Abhängigkeiten und ohne externe Fonts
- Daten liegen lokal (`localStorage`), Token-Kompression über `CompressionStream`
- Eigene SHA-256/HMAC-Implementierung (funktioniert auch unter `file://`)
- PWA: `manifest.webmanifest` + `sw.js` (cache-first)

```
index.html
electron/  Windows-Hülle (Schließen-Schutz, Kiosk, blockiert jedes Netzwerk)
android/   Android-Projekt (Capacitor; ohne INTERNET-Berechtigung; NovaKiosk- und NovaGuard-Plugin, GuardService)
css/style.css
js/core/   sha256 · util · icons · store (Konten/Token/Sync) · screentime · persona (Alter) · native · shell (UI) · onboarding
js/apps/   kit · games · storegames · learn (Mathe) · learn-de (Deutsch) · creative · tools · system
```

## Bekannte Grenzen der Beta
- Der Speicher pro Browser ist auf ca. 5 MB begrenzt (betrifft viele Zeichnungen)
- Ohne Internet gibt es keinen automatischen Sync: Synchronisiert wird über den Token, also per Datei oder Kopieren
- Ohne die zwei Berechtigungen kann eine normale Android-App Home und Übersicht nicht abfangen. Erst mit dem Nova-Schutz klappt das.
- Ein vollständiger Kiosk ohne Bestätigung ist unter Android nur mit „Geräteinhaber“-Rechten möglich. Die Beta nutzt das normale „App fixieren“.
- Wer technisch versiert ist, kann die lokalen Daten im Browser verändern. Die Bildschirmzeit ist als Familien-Werkzeug gedacht, nicht als Sicherheitssperre
