# Nova OS – Hinweise für Claude

Diese Datei liest jede neue Claude-Sitzung in diesem Repo automatisch. Sie enthält die festen Wünsche des Projektinhabers.

## Feste Regeln des Inhabers
1. **Immer selbst committen und pushen.** Der Inhaber möchte nichts selbst tun müssen. Nach jeder Änderung testen, committen und auf den vorgegebenen Branch pushen.
2. **Immer über GitHub Actions bauen.** APK (Android) und Windows-Setup (.exe) werden ausschließlich von `.github/workflows/build.yml` gebaut und als GitHub-Release veröffentlicht. Nach dem Push den Workflow-Lauf prüfen und Fehler selbst beheben, bis der Lauf grün ist.
   - Lokal gibt es kein Android-SDK (`dl.google.com` ist gesperrt). Nichts lokal bauen wollen, sondern CI nutzen.
   - Bei jeder neuen Version `version` in `package.json`, `versionCode`/`versionName` in `android/app/build.gradle` und `VERSION` in `sw.js` erhöhen. Der Release-Tag lautet dann `v<version>-beta`.
3. **Sprache:** Alles auf Deutsch (UI, Texte, Commits, Antworten).
4. **Design: clean, ruhig, übersichtlich, nicht kindisch.**
   - Flache Flächen, feine 1-px-Linien, neutrale Akzentfarbe (Standard: Schwarz/Weiß), viel Weißraum
   - Keine Glas-/Blur-Effekte, keine bunten Farbverläufe in der Oberfläche, keine Emojis in UI-Texten (Ausnahme: Erklär-Stufe 1 für sehr kleine Kinder)
   - App-Symbole standardmäßig „Schlicht“ (monochrom). „Dezent“/„Bunt“ sind nur Optionen.
   - Es gibt einen **Schwarz-Weiß-Modus** (`settings.bw`)
   - Effekte (Glas/Blur, Schatten, Animationen, farbige Hintergründe) sind **optional**: Schalter „Effekte“ (`settings.fx`, CSS `:root[data-fx="1"]`), standardmäßig aus.
   - Muss auf PC **und** Handy (hoch und quer) gut aussehen. Vor dem Push mit Playwright in 1366×820, 390×844 und 844×390 prüfen.
5. **Keine Nachbauten bestimmter Spiele.** Eigene Spiele sind Genre-Spiele (Runner, Rhythmus-Jump …). Die originalen Spiele (Subway Surfers, Geometry Dash …) werden nur über die App „Echte Spiele“ einmalig aus dem Play Store installiert.

## Aufbau
- Reine Web-App (HTML/CSS/JS, kein Build-Schritt), Einstieg `index.html`
- `js/core/`: `store.js` (Konten, Token, Sync), `screentime.js` (Limits, HMAC-Codes), `persona.js` (Alter → Erklär-Stil), `native.js` (Android/Electron-Brücke), `shell.js` (UI), `onboarding.js` (Konto-Assistent)
- `js/apps/`: alle Apps, die sich mit `Nova.registerApp({...})` registrieren. Lern-Apps nutzen `Nova.learnApp`.
- `electron/`: Windows-Hülle (Schließen nur mit Passwort, blockiert jedes Netzwerk)
- `android/`: Capacitor-Projekt (ohne INTERNET-Berechtigung, `NovaKioskPlugin`)
- `scripts/build-web.js` kopiert die Web-App nach `www/` (für Electron und Capacitor)

## Testen
`python3 -m http.server` im Repo-Root starten und dann Playwright-Skripte ausführen (Konto-Assistent, alle Apps öffnen, Lern-Generatoren, Abmelden mit PIN). Die Konsole muss fehlerfrei bleiben.
