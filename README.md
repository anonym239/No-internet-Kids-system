# Nova OS – Beta 0.1

**Ein komplett internetfreies System für Kinder und Jugendliche (ca. 10–14 Jahre) – für PC und Handy.**
Modern, clean und übersichtlich. Kein Server, keine Werbung, keine Datensammlung.

## Starten

| Weg | So geht's |
|---|---|
| **Direkt öffnen** | `index.html` im Browser öffnen (Doppelklick). Funktioniert sofort, ohne Internet. |
| **Als App installieren (empfohlen)** | Den Ordner über einen Webserver bereitstellen (z. B. GitHub Pages oder `python3 -m http.server`), einmal öffnen und dann *„App installieren“* (PC) bzw. *„Zum Startbildschirm hinzufügen“* (Handy) wählen. Danach läuft Nova dauerhaft offline (Service Worker). |

## Funktionen

### Konten & Anmeldung
- Mehrere Konten pro Gerät, jedes mit einer eigenen 4-stelligen PIN
- **Konto-Token**: Das komplette Konto steckt in einem Token (Text oder `.novakey`-Datei, komprimiert und mit Prüfsumme)
  - Mit dem Token stellst du dein Konto **jederzeit** wieder her: nach dem Deinstallieren, auf einem neuen Gerät oder nach dem Löschen der App-Daten
  - **Sync ohne Internet:** Gibt es das Konto auf einem Gerät schon, werden beim Import beide Stände zusammengeführt (Aufgaben, Notizen, Bilder, Highscores, Ordner …)
  - Erinnerung zur Sicherung, wenn die letzte Sicherung älter als 7 Tage ist

### Ordner
- **Spiele**, **Kreativ**, **Werkzeuge**, **System**
- Eigene Ordner erstellen, umbenennen, löschen und mit Apps füllen
- Dock mit Lieblings-Apps (lange drücken / Rechtsklick auf eine App)
- Suche, „Zuletzt verwendet“

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

## Technik
- Reines HTML, CSS und JavaScript, ohne Build-Schritt, ohne Abhängigkeiten und ohne externe Fonts
- Daten liegen lokal (`localStorage`), Token-Kompression über `CompressionStream`
- Eigene SHA-256/HMAC-Implementierung (funktioniert auch unter `file://`)
- PWA: `manifest.webmanifest` + `sw.js` (cache-first)

```
index.html
css/style.css
js/core/   sha256 · util · icons · store (Konten/Token/Sync) · screentime · shell (UI)
js/apps/   kit · games · creative · tools · system
```

## Bekannte Grenzen der Beta
- Der Speicher pro Browser ist auf ca. 5 MB begrenzt (betrifft viele Zeichnungen)
- Ohne Internet gibt es keinen automatischen Sync: Synchronisiert wird über den Token, also per Datei oder Kopieren
- Wer technisch versiert ist, kann die lokalen Daten im Browser verändern. Die Bildschirmzeit ist als Familien-Werkzeug gedacht, nicht als Sicherheitssperre
